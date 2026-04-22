import type { QueryDefinition, QueryNode, QueryOperator, QuerySort } from "./ast.ts"
import { QueryTextParseError } from "./errors.ts"
import { normalizeQueryDefinition } from "./normalize.ts"
import { QUERY_FIELD_SCHEMAS, resolveQueryFieldAlias } from "./schema.ts"
import { assertValidQueryDefinition } from "./validate.ts"

type QueryTextTokenKind = "and" | "lparen" | "not" | "or" | "rparen" | "term"

interface QueryTextToken {
  end: number
  kind: QueryTextTokenKind
  start: number
  value: string
}

interface QueryTextParserState {
  index: number
  input: string
  sort: QuerySort[]
  tokens: QueryTextToken[]
}

interface ParsedToken {
  node?: QueryNode
  sort?: QuerySort
}

type QueryTextOperatorSymbol = "!=" | "!~" | "<" | "<=" | "=" | ">" | ">=" | ":" | "~"

const QUERY_TEXT_OPERATOR_SYMBOLS: QueryTextOperatorSymbol[] = [
  ">=",
  "<=",
  "!=",
  "!~",
  "=",
  ">",
  "<",
  "~",
  ":",
]

function raiseParseError(
  input: string,
  start: number,
  end: number,
  code: string,
  message: string,
): never {
  throw new QueryTextParseError(input, start, end, code, message)
}

function tokenizeQuery(input: string) {
  const tokens: QueryTextToken[] = []
  let index = 0

  while (index < input.length) {
    const character = input[index]

    if (/\s/u.test(character)) {
      index += 1
      continue
    }

    if (character === "(") {
      tokens.push({
        kind: "lparen",
        start: index,
        end: index + 1,
        value: character,
      })
      index += 1
      continue
    }

    if (character === ")") {
      tokens.push({
        kind: "rparen",
        start: index,
        end: index + 1,
        value: character,
      })
      index += 1
      continue
    }

    const start = index
    let value = ""
    let quoted = false

    while (index < input.length) {
      const current = input[index]

      if (current === "(" || current === ")" || /\s/u.test(current)) {
        break
      }

      if (current === '"') {
        quoted = true
        index += 1

        while (index < input.length) {
          const quotedCharacter = input[index]

          if (quotedCharacter === "\\") {
            if (index + 1 >= input.length) {
              raiseParseError(
                input,
                start,
                input.length,
                "unterminated-escape",
                "Quoted query text cannot end with a trailing escape.",
              )
            }

            value += input[index + 1]
            index += 2
            continue
          }

          if (quotedCharacter === '"') {
            index += 1
            break
          }

          value += quotedCharacter
          index += 1
        }

        if (index > input.length || input[index - 1] !== '"') {
          raiseParseError(
            input,
            start,
            input.length,
            "unterminated-quote",
            "Unterminated quote in text query.",
          )
        }

        continue
      }

      value += current
      index += 1
    }

    const upperValue = value.toUpperCase()
    const kind: QueryTextTokenKind =
      quoted || (upperValue !== "AND" && upperValue !== "OR" && upperValue !== "NOT")
        ? "term"
        : upperValue === "AND"
          ? "and"
          : upperValue === "OR"
            ? "or"
            : "not"

    tokens.push({
      kind,
      start,
      end: index,
      value,
    })
  }

  return tokens
}

function peekToken(state: QueryTextParserState) {
  return state.tokens[state.index] ?? null
}

function consumeToken(state: QueryTextParserState) {
  const token = peekToken(state)

  if (token) {
    state.index += 1
  }

  return token
}

function mergeNodes(nodes: QueryNode[], match: "all" | "any") {
  if (nodes.length === 0) {
    return null
  }

  if (nodes.length === 1) {
    return nodes[0]
  }

  return {
    kind: "group" as const,
    match,
    children: nodes,
  }
}

function isOperandStart(token: QueryTextToken | null) {
  return token?.kind === "lparen" || token?.kind === "not" || token?.kind === "term"
}

function parseBooleanSymbol(input: string, start: number, end: number, value: string) {
  const normalizedValue = value.toLowerCase()

  if (normalizedValue === "true") {
    return true
  }

  if (normalizedValue === "false") {
    return false
  }

  raiseParseError(
    input,
    start,
    end,
    "invalid-boolean",
    `Expected a boolean value but received "${value}".`,
  )
}

function parseSortToken(input: string, start: number, end: number, rawValue: string): QuerySort {
  if (rawValue.length === 0) {
    raiseParseError(
      input,
      start,
      end,
      "missing-sort-field",
      "Sort directives must include a sort field.",
    )
  }

  const [fieldValue, directionValue = "asc"] = rawValue.split("-", 2)

  return {
    field: fieldValue as QuerySort["field"],
    direction: directionValue as QuerySort["direction"],
    nulls: "last",
  }
}

function resolveOperator(
  symbol: QueryTextOperatorSymbol,
  defaultOperator: QueryOperator,
): QueryOperator {
  switch (symbol) {
    case ":":
      return defaultOperator
    case "=":
      return "eq"
    case "!=":
      return "neq"
    case "~":
      return "contains"
    case "!~":
      return "notContains"
    case ">":
      return "gt"
    case ">=":
      return "gte"
    case "<":
      return "lt"
    case "<=":
      return "lte"
  }
}

function splitExplicitFieldToken(value: string) {
  for (const symbol of QUERY_TEXT_OPERATOR_SYMBOLS) {
    const symbolIndex = value.indexOf(symbol)

    if (symbolIndex <= 0) {
      continue
    }

    return {
      prefix: value.slice(0, symbolIndex),
      rawValue: value.slice(symbolIndex + symbol.length),
      symbol,
      symbolIndex,
    }
  }

  return null
}

function predicateFromPrefixedToken(
  input: string,
  tokenStart: number,
  tokenEnd: number,
  prefix: string,
  operatorSymbol: QueryTextOperatorSymbol,
  rawValue: string,
): ParsedToken {
  const normalizedPrefix = prefix.toLowerCase()
  const prefixStart = tokenStart
  const prefixEnd = tokenStart + prefix.length
  const valueStart = prefixEnd + operatorSymbol.length

  if (rawValue.length === 0) {
    raiseParseError(
      input,
      valueStart,
      tokenEnd,
      "missing-value",
      `Token "${input.slice(tokenStart, tokenEnd)}" is missing a value.`,
    )
  }

  if (normalizedPrefix === "sort") {
    return {
      sort: parseSortToken(input, valueStart, tokenEnd, rawValue),
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
      raiseParseError(
        input,
        valueStart,
        tokenEnd,
        "unsupported-has-predicate",
        `Unsupported has: predicate "${rawValue}".`,
      )
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

  const schemaField = resolveQueryFieldAlias(normalizedPrefix)

  if (schemaField === undefined) {
    if (
      operatorSymbol === ":" &&
      (rawValue.startsWith("//") || (prefix.length === 1 && rawValue.startsWith("\\")))
    ) {
      return {
        node: {
          kind: "predicate",
          field: "anyText",
          operator: "contains",
          value: input.slice(tokenStart, tokenEnd),
        },
      }
    }

    raiseParseError(
      input,
      prefixStart,
      prefixEnd,
      "unknown-prefix",
      `Unknown query prefix "${prefix}".`,
    )
  }

  const fieldSchema = QUERY_FIELD_SCHEMAS[schemaField]
  const operator = resolveOperator(operatorSymbol, fieldSchema.defaultOperator)
  const value =
    fieldSchema.kind === "boolean"
      ? parseBooleanSymbol(input, valueStart, tokenEnd, rawValue)
      : rawValue

  return {
    node: {
      kind: "predicate",
      field: schemaField,
      operator,
      value,
    },
  }
}

function parseToken(
  input: string,
  tokenStart: number,
  tokenEnd: number,
  rawValue: string,
): ParsedToken {
  if (rawValue.length === 0) {
    raiseParseError(input, tokenStart, tokenEnd, "empty-token", "Text query terms cannot be empty.")
  }

  const explicitField = splitExplicitFieldToken(rawValue)

  if (!explicitField) {
    return {
      node: {
        kind: "predicate",
        field: "anyText",
        operator: "contains",
        value: rawValue,
      },
    }
  }

  return predicateFromPrefixedToken(
    input,
    tokenStart,
    tokenEnd,
    explicitField.prefix,
    explicitField.symbol,
    explicitField.rawValue,
  )
}

function parsePrimary(state: QueryTextParserState): QueryNode | null {
  const token = consumeToken(state)

  if (!token) {
    return null
  }

  if (token.kind === "lparen") {
    const innerNode = parseOrExpression(state)
    const closingToken = consumeToken(state)

    if (!closingToken || closingToken.kind !== "rparen") {
      raiseParseError(
        state.input,
        token.start,
        token.end,
        "unterminated-group",
        "Text query groups must end with a closing parenthesis.",
      )
    }

    if (!innerNode) {
      raiseParseError(
        state.input,
        token.start,
        closingToken.end,
        "empty-group",
        "Text query groups must contain at least one predicate.",
      )
    }

    return innerNode
  }

  if (token.kind !== "term") {
    state.index -= 1
    return null
  }

  const isInlineNegated = token.value.startsWith("-") && token.value.length > 1
  const value = isInlineNegated ? token.value.slice(1) : token.value
  const valueStart = isInlineNegated ? token.start + 1 : token.start
  const parsed = parseToken(state.input, valueStart, token.end, value)

  if (parsed.sort) {
    if (isInlineNegated) {
      raiseParseError(
        state.input,
        token.start,
        token.end,
        "invalid-negated-sort",
        "Sort directives cannot be negated.",
      )
    }

    state.sort.push(parsed.sort)
    return null
  }

  if (!parsed.node) {
    return null
  }

  return isInlineNegated
    ? {
        kind: "not",
        child: parsed.node,
      }
    : parsed.node
}

function parseUnaryExpression(state: QueryTextParserState): QueryNode | null {
  let negateCount = 0
  let firstNegationToken: QueryTextToken | null = null

  while (peekToken(state)?.kind === "not") {
    const negationToken = consumeToken(state)
    firstNegationToken ??= negationToken
    negateCount += 1
  }

  const node = parsePrimary(state)

  if (!node) {
    if (negateCount > 0 && firstNegationToken) {
      raiseParseError(
        state.input,
        firstNegationToken.start,
        firstNegationToken.end,
        "missing-negated-expression",
        "NOT must be followed by a predicate or group.",
      )
    }

    return null
  }

  return negateCount % 2 === 0
    ? node
    : {
        kind: "not",
        child: node,
      }
}

function parseAndExpression(state: QueryTextParserState): QueryNode | null {
  const nodes: QueryNode[] = []

  while (isOperandStart(peekToken(state))) {
    const node = parseUnaryExpression(state)

    if (node) {
      nodes.push(node)
    }

    if (peekToken(state)?.kind === "and") {
      consumeToken(state)
    }
  }

  return mergeNodes(nodes, "all")
}

function parseOrExpression(state: QueryTextParserState): QueryNode | null {
  const nodes: QueryNode[] = []
  let leftNode = parseAndExpression(state)

  if (leftNode) {
    nodes.push(leftNode)
  }

  while (peekToken(state)?.kind === "or") {
    const operatorToken = consumeToken(state)

    if (!leftNode && operatorToken) {
      raiseParseError(
        state.input,
        operatorToken.start,
        operatorToken.end,
        "missing-left-expression",
        "OR must follow a predicate or group.",
      )
    }

    const rightNode = parseAndExpression(state)

    if (!rightNode && operatorToken) {
      raiseParseError(
        state.input,
        operatorToken.start,
        operatorToken.end,
        "missing-right-expression",
        "OR must be followed by a predicate or group.",
      )
    }

    if (rightNode) {
      nodes.push(rightNode)
      leftNode = rightNode
    }
  }

  return mergeNodes(nodes, "any")
}

export function parseTextQuery(text: string): QueryDefinition {
  const trimmed = text.trim()

  if (trimmed.length === 0) {
    raiseParseError(text, 0, 0, "empty-query", "Text queries cannot be empty.")
  }

  const state: QueryTextParserState = {
    input: trimmed,
    index: 0,
    sort: [],
    tokens: tokenizeQuery(trimmed),
  }
  const root = parseOrExpression(state)
  const trailingToken = peekToken(state)

  if (trailingToken) {
    raiseParseError(
      trimmed,
      trailingToken.start,
      trailingToken.end,
      "unexpected-token",
      `Unexpected token "${trailingToken.value}".`,
    )
  }

  if (!root) {
    raiseParseError(
      trimmed,
      0,
      trimmed.length,
      "missing-predicate",
      "Text queries must produce at least one predicate.",
    )
  }

  const definition = normalizeQueryDefinition({
    version: 1,
    root,
    sort: state.sort,
  })

  return assertValidQueryDefinition(definition)
}
