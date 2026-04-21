import {
  QUERY_FIELDS,
  QUERY_OPERATORS,
  QUERY_SORT_FIELDS,
  type QueryField,
  type QueryOperator,
  type QuerySortField,
} from "./ast.ts"

export const READ_STATE_VALUES = ["unread", "reading", "read"] as const
export const IMPORTANCE_VALUES = ["low", "normal", "high"] as const

export type QueryFieldKind = "boolean" | "datetime" | "enum" | "text"

export interface QueryFieldSchema {
  kind: QueryFieldKind
  defaultOperator: QueryOperator
  label: string
  operators: QueryOperator[]
  values?: readonly string[]
}

export const QUERY_FIELD_SCHEMAS: Record<QueryField, QueryFieldSchema> = {
  anyText: {
    kind: "text",
    defaultOperator: "contains",
    label: "Any text",
    operators: ["contains", "notContains"],
  },
  feedId: {
    kind: "text",
    defaultOperator: "eq",
    label: "Feed id",
    operators: ["eq", "neq", "in", "notIn"],
  },
  title: {
    kind: "text",
    defaultOperator: "contains",
    label: "Title",
    operators: ["contains", "notContains", "eq", "neq", "in", "notIn"],
  },
  author: {
    kind: "text",
    defaultOperator: "contains",
    label: "Author",
    operators: ["contains", "notContains", "eq", "neq", "in", "notIn"],
  },
  summary: {
    kind: "text",
    defaultOperator: "contains",
    label: "Summary",
    operators: ["contains", "notContains", "eq", "neq", "in", "notIn"],
  },
  content: {
    kind: "text",
    defaultOperator: "contains",
    label: "Content",
    operators: ["contains", "notContains", "eq", "neq"],
  },
  feedTitle: {
    kind: "text",
    defaultOperator: "contains",
    label: "Feed title",
    operators: ["contains", "notContains", "eq", "neq", "in", "notIn"],
  },
  tag: {
    kind: "text",
    defaultOperator: "eq",
    label: "Tag",
    operators: ["eq", "neq", "in", "notIn"],
  },
  language: {
    kind: "text",
    defaultOperator: "eq",
    label: "Language",
    operators: ["eq", "neq", "in", "notIn"],
  },
  publishedAt: {
    kind: "datetime",
    defaultOperator: "gte",
    label: "Published at",
    operators: ["eq", "neq", "gt", "gte", "lt", "lte"],
  },
  fetchedAt: {
    kind: "datetime",
    defaultOperator: "gte",
    label: "Fetched at",
    operators: ["eq", "neq", "gt", "gte", "lt", "lte"],
  },
  readState: {
    kind: "enum",
    defaultOperator: "eq",
    label: "Read state",
    operators: ["eq", "neq", "in", "notIn"],
    values: READ_STATE_VALUES,
  },
  starred: {
    kind: "boolean",
    defaultOperator: "eq",
    label: "Starred",
    operators: ["eq", "neq"],
  },
  liked: {
    kind: "boolean",
    defaultOperator: "eq",
    label: "Liked",
    operators: ["eq", "neq"],
  },
  readLater: {
    kind: "boolean",
    defaultOperator: "eq",
    label: "Read later",
    operators: ["eq", "neq"],
  },
  importance: {
    kind: "enum",
    defaultOperator: "eq",
    label: "Importance",
    operators: ["eq", "neq", "in", "notIn"],
    values: IMPORTANCE_VALUES,
  },
  hasAttachment: {
    kind: "boolean",
    defaultOperator: "eq",
    label: "Has attachment",
    operators: ["eq", "neq"],
  },
}

export const QUERY_FIELD_ALIASES: Record<string, QueryField> = {
  author: "author",
  content: "content",
  feed: "feedTitle",
  feedid: "feedId",
  hasattachment: "hasAttachment",
  importance: "importance",
  lang: "language",
  language: "language",
  published: "publishedAt",
  publishedat: "publishedAt",
  readlater: "readLater",
  source: "feedTitle",
  state: "readState",
  summary: "summary",
  tag: "tag",
  text: "anyText",
  title: "title",
}

export function isQueryField(value: string): value is QueryField {
  return QUERY_FIELDS.includes(value as QueryField)
}

export function isQueryOperator(value: string): value is QueryOperator {
  return QUERY_OPERATORS.includes(value as QueryOperator)
}

export function isQuerySortField(value: string): value is QuerySortField {
  return QUERY_SORT_FIELDS.includes(value as QuerySortField)
}

export function resolveQueryFieldAlias(alias: string) {
  return QUERY_FIELD_ALIASES[alias.trim().toLowerCase()]
}
