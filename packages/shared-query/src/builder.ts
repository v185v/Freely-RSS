import type {
  QueryDefinition,
  QueryField,
  QueryMatch,
  QueryNode,
  QueryOperator,
  QuerySort,
  QueryValue,
} from "./ast.ts"
import { normalizeQueryDefinition } from "./normalize.ts"
import { QUERY_FIELD_SCHEMAS } from "./schema.ts"
import { assertValidQueryDefinition } from "./validate.ts"

export interface QueryBuilderPredicateClause {
  kind: "predicate"
  field: QueryField
  operator?: QueryOperator
  value: QueryValue
}

export interface QueryBuilderTextClause {
  kind: "text"
  text: string
}

export interface QueryBuilderGroupClause {
  kind: "group"
  match: QueryMatch
  clauses: QueryBuilderClause[]
}

export interface QueryBuilderNotClause {
  kind: "not"
  clause: QueryBuilderClause
}

export type QueryBuilderClause =
  | QueryBuilderGroupClause
  | QueryBuilderNotClause
  | QueryBuilderPredicateClause
  | QueryBuilderTextClause

export interface QueryBuilderDefinition {
  clauses: QueryBuilderClause[]
  match?: QueryMatch
  sort?: QuerySort[]
}

export function predicate(
  field: QueryField,
  value: QueryValue,
  operator?: QueryOperator,
): QueryBuilderPredicateClause {
  return {
    kind: "predicate",
    field,
    operator,
    value,
  }
}

export function text(textValue: string): QueryBuilderTextClause {
  return {
    kind: "text",
    text: textValue,
  }
}

export function allOf(...clauses: QueryBuilderClause[]): QueryBuilderGroupClause {
  return {
    kind: "group",
    match: "all",
    clauses,
  }
}

export function anyOf(...clauses: QueryBuilderClause[]): QueryBuilderGroupClause {
  return {
    kind: "group",
    match: "any",
    clauses,
  }
}

export function notOf(clause: QueryBuilderClause): QueryBuilderNotClause {
  return {
    kind: "not",
    clause,
  }
}

function clauseToNode(clause: QueryBuilderClause): QueryNode {
  if (clause.kind === "group") {
    return {
      kind: "group",
      match: clause.match,
      children: clause.clauses.map(clauseToNode),
    }
  }

  if (clause.kind === "not") {
    return {
      kind: "not",
      child: clauseToNode(clause.clause),
    }
  }

  if (clause.kind === "text") {
    return {
      kind: "predicate",
      field: "anyText",
      operator: "contains",
      value: clause.text,
    }
  }

  return {
    kind: "predicate",
    field: clause.field,
    operator: clause.operator ?? QUERY_FIELD_SCHEMAS[clause.field].defaultOperator,
    value: clause.value,
  }
}

export function buildQueryDefinition(input: QueryBuilderDefinition): QueryDefinition {
  const root: QueryNode =
    input.clauses.length === 1
      ? clauseToNode(input.clauses[0])
      : {
          kind: "group",
          match: input.match ?? "all",
          children: input.clauses.map(clauseToNode),
        }

  const definition = normalizeQueryDefinition({
    version: 1,
    root,
    sort: input.sort ?? [],
  })

  return assertValidQueryDefinition(definition)
}
