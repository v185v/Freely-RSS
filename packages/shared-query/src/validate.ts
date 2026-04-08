import {
  QUERY_MATCHES,
  QUERY_NODE_KINDS,
  QUERY_SORT_DIRECTIONS,
  QUERY_SORT_NULLS,
  type QueryDefinition,
  type QueryNode,
  type QueryPredicateNode,
} from "./ast.ts"
import { QueryValidationError, type QueryValidationIssue } from "./errors.ts"
import { QUERY_FIELD_SCHEMAS, isQueryField, isQueryOperator, isQuerySortField } from "./schema.ts"

function pushIssue(issues: QueryValidationIssue[], path: string, code: string, message: string) {
  issues.push({ path, code, message })
}

function validatePredicateValue(
  issues: QueryValidationIssue[],
  path: string,
  predicate: QueryPredicateNode,
) {
  const schema = QUERY_FIELD_SCHEMAS[predicate.field]
  const value = predicate.value

  if (Array.isArray(value)) {
    if (value.length === 0) {
      pushIssue(issues, path, "empty-list", "List predicates must provide at least one value.")
      return
    }

    if (predicate.operator !== "in" && predicate.operator !== "notIn") {
      pushIssue(
        issues,
        path,
        "unexpected-list",
        `Operator "${predicate.operator}" does not accept an array value.`,
      )
      return
    }

    if (!value.every((item) => typeof item === "string")) {
      pushIssue(
        issues,
        path,
        "invalid-list-value",
        "List predicates currently accept string values only.",
      )
      return
    }

    if (schema.values !== undefined) {
      for (const item of value) {
        if (!schema.values.includes(item)) {
          pushIssue(
            issues,
            path,
            "invalid-enum-member",
            `"${item}" is not a valid value for field "${predicate.field}".`,
          )
        }
      }
    }

    return
  }

  if (schema.kind === "boolean" && typeof value !== "boolean") {
    pushIssue(
      issues,
      path,
      "invalid-boolean",
      `Field "${predicate.field}" expects a boolean value.`,
    )
  }

  if (schema.kind === "datetime" && typeof value !== "string") {
    pushIssue(
      issues,
      path,
      "invalid-datetime",
      `Field "${predicate.field}" expects an ISO date-time string.`,
    )
  }

  if ((schema.kind === "text" || schema.kind === "enum") && typeof value !== "string") {
    pushIssue(issues, path, "invalid-string", `Field "${predicate.field}" expects a string value.`)
  }

  if (schema.values !== undefined && typeof value === "string" && !schema.values.includes(value)) {
    pushIssue(
      issues,
      path,
      "invalid-enum-value",
      `"${value}" is not a valid value for field "${predicate.field}".`,
    )
  }
}

function validateNode(issues: QueryValidationIssue[], path: string, node: QueryNode) {
  if (!QUERY_NODE_KINDS.includes(node.kind)) {
    pushIssue(issues, path, "invalid-node-kind", `Unsupported node kind "${String(node.kind)}".`)
    return
  }

  if (node.kind === "group") {
    if (!QUERY_MATCHES.includes(node.match)) {
      pushIssue(issues, path, "invalid-match", `Unsupported group match "${String(node.match)}".`)
    }

    if (node.children.length === 0) {
      pushIssue(issues, path, "empty-group", "Query groups must contain at least one child.")
    }

    node.children.forEach((child, index) => {
      validateNode(issues, `${path}.children[${index}]`, child)
    })

    return
  }

  if (node.kind === "not") {
    validateNode(issues, `${path}.child`, node.child)
    return
  }

  if (!isQueryField(node.field)) {
    pushIssue(
      issues,
      `${path}.field`,
      "invalid-field",
      `Unsupported field "${String(node.field)}".`,
    )
    return
  }

  if (!isQueryOperator(node.operator)) {
    pushIssue(
      issues,
      `${path}.operator`,
      "invalid-operator",
      `Unsupported operator "${String(node.operator)}".`,
    )
    return
  }

  const schema = QUERY_FIELD_SCHEMAS[node.field]

  if (!schema.operators.includes(node.operator)) {
    pushIssue(
      issues,
      `${path}.operator`,
      "operator-not-allowed",
      `Operator "${node.operator}" is not allowed for field "${node.field}".`,
    )
  }

  validatePredicateValue(issues, `${path}.value`, node)
}

export function validateQueryDefinition(definition: QueryDefinition) {
  const issues: QueryValidationIssue[] = []

  if (definition.version !== 1) {
    pushIssue(
      issues,
      "version",
      "unsupported-version",
      "Only query definition version 1 is supported.",
    )
  }

  validateNode(issues, "root", definition.root)

  definition.sort.forEach((sort, index) => {
    const path = `sort[${index}]`

    if (!isQuerySortField(sort.field)) {
      pushIssue(
        issues,
        `${path}.field`,
        "invalid-sort-field",
        `Unsupported sort field "${sort.field}".`,
      )
    }

    if (!QUERY_SORT_DIRECTIONS.includes(sort.direction)) {
      pushIssue(
        issues,
        `${path}.direction`,
        "invalid-sort-direction",
        `Unsupported sort direction "${sort.direction}".`,
      )
    }

    if (!QUERY_SORT_NULLS.includes(sort.nulls)) {
      pushIssue(
        issues,
        `${path}.nulls`,
        "invalid-sort-nulls",
        `Unsupported null ordering "${sort.nulls}".`,
      )
    }
  })

  return issues
}

export function assertValidQueryDefinition(definition: QueryDefinition) {
  const issues = validateQueryDefinition(definition)

  if (issues.length > 0) {
    throw new QueryValidationError(issues)
  }

  return definition
}
