export const QUERY_MATCHES = ["all", "any"] as const
export const QUERY_NODE_KINDS = ["group", "not", "predicate"] as const
export const QUERY_OPERATORS = [
  "eq",
  "neq",
  "contains",
  "notContains",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "notIn",
] as const
export const QUERY_FIELDS = [
  "anyText",
  "title",
  "author",
  "summary",
  "content",
  "feedTitle",
  "tag",
  "language",
  "publishedAt",
  "fetchedAt",
  "readState",
  "starred",
  "liked",
  "readLater",
  "importance",
  "hasAttachment",
] as const
export const QUERY_SORT_FIELDS = [
  "publishedAt",
  "fetchedAt",
  "title",
  "feedTitle",
  "importance",
] as const
export const QUERY_SORT_DIRECTIONS = ["asc", "desc"] as const
export const QUERY_SORT_NULLS = ["first", "last"] as const

export type QueryMatch = (typeof QUERY_MATCHES)[number]
export type QueryNodeKind = (typeof QUERY_NODE_KINDS)[number]
export type QueryOperator = (typeof QUERY_OPERATORS)[number]
export type QueryField = (typeof QUERY_FIELDS)[number]
export type QuerySortField = (typeof QUERY_SORT_FIELDS)[number]
export type QuerySortDirection = (typeof QUERY_SORT_DIRECTIONS)[number]
export type QuerySortNulls = (typeof QUERY_SORT_NULLS)[number]

export type QueryScalar = boolean | number | string
export type QueryValue = QueryScalar | QueryScalar[]

export interface QueryGroupNode {
  kind: "group"
  match: QueryMatch
  children: QueryNode[]
}

export interface QueryNotNode {
  kind: "not"
  child: QueryNode
}

export interface QueryPredicateNode {
  kind: "predicate"
  field: QueryField
  operator: QueryOperator
  value: QueryValue
}

export type QueryNode = QueryGroupNode | QueryNotNode | QueryPredicateNode

export interface QuerySort {
  field: QuerySortField
  direction: QuerySortDirection
  nulls: QuerySortNulls
}

export interface QueryDefinition {
  version: 1
  root: QueryNode
  sort: QuerySort[]
}
