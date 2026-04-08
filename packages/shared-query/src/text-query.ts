import type { QueryDefinition, QueryNode, QuerySort } from "./ast.ts"
import { normalizeQueryDefinition } from "./normalize.ts"
import { QUERY_FIELD_SCHEMAS, resolveQueryFieldAlias } from "./schema.ts"
import { assertValidQueryDefinition } from "./validate.ts"

interface ParsedToken {
  node?: QueryNode
  sort?: QuerySort
}

function tokenizeQuery(input: string) {
  const tokens: string[] = []
  let current = ""
  let inQuotes = false

  for (const character of input) {
    if (character === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (!inQuotes && /\s/u.test(character)) {
      if (current.length > 0) {
        tokens.push(current)
        current = ""
      }

      continue
    }

    current += character
  }

  if (inQuotes) {
    throw new Error("Unterminated quote in text query.")
  }

  if (current.length > 0) {
    tokens.push(current)
  }

  return tokens
}

function parseBooleanSymbol(value: string) {
  if (value === "true") {
    return true
  }

  if (value === "false") {
    return false
  }

  throw new Error(`Expected a boolean value but received "${value}".`)
}

function parseSortToken(rawValue: string): QuerySort {
  const [fieldValue, directionValue = "asc"] = rawValue.split("-", 2)

  return {
    field: fieldValue as QuerySort["field"],
    direction: directionValue as QuerySort["direction"],
    nulls: "last",
  }
}

function predicateFromPrefixedToken(prefix: string, rawValue: string): ParsedToken {
  const normalizedPrefix = prefix.toLowerCase()
  const schemaField = resolveQueryFieldAlias(normalizedPrefix)

  if (normalizedPrefix === "sort") {
    return {
      sort: parseSortToken(rawValue),
    }
  }

  if (normalizedPrefix === "after") {
    return {
      node: {
        kind: "predicate",
        field: "publishedAt",
        operator: "gte",
        value: rawValue,
      },
    }
  }

  if (normalizedPrefix === "before") {
    return {
      node: {
        kind: "predicate",
        field: "publishedAt",
        operator: "lte",
        value: rawValue,
      },
    }
  }

  if (normalizedPrefix === "is") {
    const normalizedValue = rawValue.toLowerCase()

    if (normalizedValue === "starred") {
      return {
        node: {
          kind: "predicate",
          field: "starred",
          operator: "eq",
          value: true,
        },
      }
    }

    if (normalizedValue === "liked") {
      return {
        node: {
          kind: "predicate",
          field: "liked",
          operator: "eq",
          value: true,
        },
      }
    }

    if (normalizedValue === "readlater" || normalizedValue === "read-later") {
      return {
        node: {
          kind: "predicate",
          field: "readLater",
          operator: "eq",
          value: true,
        },
      }
    }

    return {
      node: {
        kind: "predicate",
        field: "readState",
        operator: "eq",
        value: normalizedValue,
      },
    }
  }

  if (normalizedPrefix === "has") {
    if (rawValue.toLowerCase() !== "attachment") {
      throw new Error(`Unsupported has: predicate "${rawValue}".`)
    }

    return {
      node: {
        kind: "predicate",
        field: "hasAttachment",
        operator: "eq",
        value: true,
      },
    }
  }

  if (schemaField === undefined) {
    throw new Error(`Unknown query prefix "${prefix}".`)
  }

  const fieldSchema = QUERY_FIELD_SCHEMAS[schemaField]

  if (fieldSchema.kind === "boolean") {
    return {
      node: {
        kind: "predicate",
        field: schemaField,
        operator: fieldSchema.defaultOperator,
        value: parseBooleanSymbol(rawValue.toLowerCase()),
      },
    }
  }

  return {
    node: {
      kind: "predicate",
      field: schemaField,
      operator: fieldSchema.defaultOperator,
      value: rawValue,
    },
  }
}

function parseToken(rawToken: string): ParsedToken {
  const separatorIndex = rawToken.indexOf(":")

  if (separatorIndex === -1) {
    return {
      node: {
        kind: "predicate",
        field: "anyText",
        operator: "contains",
        value: rawToken,
      },
    }
  }

  const prefix = rawToken.slice(0, separatorIndex)
  const value = rawToken.slice(separatorIndex + 1)

  if (value.length === 0) {
    throw new Error(`Token "${rawToken}" is missing a value.`)
  }

  return predicateFromPrefixedToken(prefix, value)
}

export function parseTextQuery(text: string): QueryDefinition {
  const trimmed = text.trim()

  if (trimmed.length === 0) {
    throw new Error("Text queries cannot be empty.")
  }

  const tokens = tokenizeQuery(trimmed)
  const disjunctions: QueryNode[][] = [[]]
  const sort: QuerySort[] = []
  let negateNext = false

  for (const rawToken of tokens) {
    const upperToken = rawToken.toUpperCase()

    if (upperToken === "AND") {
      continue
    }

    if (upperToken === "OR") {
      disjunctions.push([])
      continue
    }

    if (upperToken === "NOT") {
      negateNext = !negateNext
      continue
    }

    const isInlineNegated = rawToken.startsWith("-")
    const token = isInlineNegated ? rawToken.slice(1) : rawToken
    const parsed = parseToken(token)

    if (parsed.sort !== undefined) {
      sort.push(parsed.sort)
      negateNext = false
      continue
    }

    if (parsed.node === undefined) {
      continue
    }

    const node =
      negateNext || isInlineNegated
        ? {
            kind: "not" as const,
            child: parsed.node,
          }
        : parsed.node

    disjunctions[disjunctions.length - 1].push(node)
    negateNext = false
  }

  const groups = disjunctions
    .filter((children) => children.length > 0)
    .map((children) =>
      children.length === 1
        ? children[0]
        : {
            kind: "group" as const,
            match: "all" as const,
            children,
          },
    )

  if (groups.length === 0) {
    throw new Error("Text queries must produce at least one predicate.")
  }

  const definition = normalizeQueryDefinition({
    version: 1,
    root:
      groups.length === 1
        ? groups[0]
        : {
            kind: "group",
            match: "any",
            children: groups,
          },
    sort,
  })

  return assertValidQueryDefinition(definition)
}
