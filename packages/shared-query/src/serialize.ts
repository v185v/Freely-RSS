import type {
  QueryDefinition,
  QueryField,
  QueryMatch,
  QueryNode,
  QueryOperator,
  QueryScalar,
  QuerySort,
  QueryValue,
} from "./ast.ts"
import { QueryValidationError, type QueryValidationIssue } from "./errors.ts"
import type { QueryJsonObject, QueryJsonValue } from "./json.ts"
import { normalizeQueryDefinition } from "./normalize.ts"
import { assertValidQueryDefinition } from "./validate.ts"

function serializeNode(node: QueryNode): QueryJsonObject {
  if (node.kind === "group") {
    return {
      children: node.children.map((child) => serializeNode(child)),
      kind: node.kind,
      match: node.match,
    }
  }

  if (node.kind === "not") {
    return {
      child: serializeNode(node.child),
      kind: node.kind,
    }
  }

  return {
    field: node.field,
    kind: node.kind,
    operator: node.operator,
    value: Array.isArray(node.value) ? [...node.value] : node.value,
  }
}

function serializeSort(sort: QuerySort): QueryJsonObject {
  return {
    direction: sort.direction,
    field: sort.field,
    nulls: sort.nulls,
  }
}

function isJsonObject(value: unknown): value is QueryJsonObject {
  return value !== null && !Array.isArray(value) && typeof value === "object"
}

function pushIssue(issues: QueryValidationIssue[], path: string, code: string, message: string) {
  issues.push({ path, code, message })
}

function readString(
  issues: QueryValidationIssue[],
  path: string,
  value: QueryJsonValue | undefined,
  message: string,
) {
  if (typeof value !== "string") {
    pushIssue(issues, path, "invalid-json-string", message)
    return null
  }

  return value
}

function readScalar(
  issues: QueryValidationIssue[],
  path: string,
  value: QueryJsonValue | undefined,
) {
  if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return value as QueryScalar
  }

  pushIssue(
    issues,
    path,
    "invalid-json-scalar",
    "Query predicate values must be string, number, or boolean scalars.",
  )
  return null
}

function readValue(
  issues: QueryValidationIssue[],
  path: string,
  value: QueryJsonValue | undefined,
): QueryValue | null {
  if (Array.isArray(value)) {
    const scalars = value
      .map((entry, index) => readScalar(issues, `${path}[${index}]`, entry))
      .filter((entry): entry is QueryScalar => entry !== null)

    return scalars
  }

  return readScalar(issues, path, value)
}

function readNode(
  issues: QueryValidationIssue[],
  path: string,
  value: QueryJsonValue | undefined,
): QueryNode | null {
  if (!isJsonObject(value)) {
    pushIssue(issues, path, "invalid-json-node", "Query nodes must be JSON objects.")
    return null
  }

  const kind = readString(
    issues,
    `${path}.kind`,
    value.kind,
    "Query nodes must define a string kind.",
  )

  if (kind === "group") {
    const match = readString(
      issues,
      `${path}.match`,
      value.match,
      'Group nodes must define a string "match" value.',
    )

    if (!Array.isArray(value.children)) {
      pushIssue(
        issues,
        `${path}.children`,
        "invalid-json-children",
        "Group nodes must define a children array.",
      )
      return null
    }

    return {
      kind: "group",
      match: (match ?? "") as QueryMatch,
      children: value.children
        .map((child, index) => readNode(issues, `${path}.children[${index}]`, child))
        .filter((child): child is QueryNode => child !== null),
    }
  }

  if (kind === "not") {
    const child = readNode(issues, `${path}.child`, value.child)

    if (!child) {
      return null
    }

    return {
      kind: "not",
      child,
    }
  }

  if (kind === "predicate") {
    const field = readString(
      issues,
      `${path}.field`,
      value.field,
      "Predicate nodes must define a string field.",
    )
    const operator = readString(
      issues,
      `${path}.operator`,
      value.operator,
      "Predicate nodes must define a string operator.",
    )
    const predicateValue = readValue(issues, `${path}.value`, value.value)

    if (predicateValue === null) {
      return null
    }

    return {
      kind: "predicate",
      field: (field ?? "") as QueryField,
      operator: (operator ?? "") as QueryOperator,
      value: predicateValue,
    }
  }

  pushIssue(
    issues,
    `${path}.kind`,
    "invalid-json-node-kind",
    `Unsupported query node kind "${String(kind)}".`,
  )
  return null
}

function readSort(
  issues: QueryValidationIssue[],
  path: string,
  value: QueryJsonValue,
): QuerySort | null {
  if (!isJsonObject(value)) {
    pushIssue(issues, path, "invalid-json-sort", "Sort definitions must be JSON objects.")
    return null
  }

  const field = readString(
    issues,
    `${path}.field`,
    value.field,
    "Sort definitions must define a string field.",
  )
  const direction = readString(
    issues,
    `${path}.direction`,
    value.direction,
    "Sort definitions must define a string direction.",
  )
  const nulls = readString(
    issues,
    `${path}.nulls`,
    value.nulls,
    "Sort definitions must define a string null ordering.",
  )

  return {
    field: (field ?? "") as QuerySort["field"],
    direction: (direction ?? "") as QuerySort["direction"],
    nulls: (nulls ?? "") as QuerySort["nulls"],
  }
}

export function serializeQueryDefinition(definition: QueryDefinition): QueryJsonObject {
  const normalized = normalizeQueryDefinition(assertValidQueryDefinition(definition))

  return {
    root: serializeNode(normalized.root),
    sort: normalized.sort.map((sort) => serializeSort(sort)),
    version: normalized.version,
  }
}

export function parseQueryDefinitionJson(value: QueryJsonValue): QueryDefinition {
  const issues: QueryValidationIssue[] = []

  if (!isJsonObject(value)) {
    throw new QueryValidationError([
      {
        path: "root",
        code: "invalid-json-root",
        message: "Serialized query definitions must be JSON objects.",
      },
    ])
  }

  let version = 0

  if (typeof value.version === "number") {
    version = value.version
  } else {
    pushIssue(
      issues,
      "version",
      "invalid-json-version",
      "Serialized query definitions must define a numeric version.",
    )
  }

  const root = readNode(issues, "root", value.root)
  let sort: QuerySort[] = []

  if (Array.isArray(value.sort)) {
    sort = value.sort
      .map((entry, index) => readSort(issues, `sort[${index}]`, entry))
      .filter((entry): entry is QuerySort => entry !== null)
  } else {
    pushIssue(
      issues,
      "sort",
      "invalid-json-sort-list",
      "Serialized query definitions must define a sort array.",
    )
  }

  if (issues.length > 0 || !root) {
    throw new QueryValidationError(issues)
  }

  return normalizeQueryDefinition(
    assertValidQueryDefinition({
      version: version as QueryDefinition["version"],
      root,
      sort,
    }),
  )
}
