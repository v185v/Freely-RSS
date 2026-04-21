import type { QueryDefinition, QueryPredicateNode, QueryScalar, QuerySort } from "./ast.ts"
import { normalizeQueryDefinition } from "./normalize.ts"
import { assertValidQueryDefinition } from "./validate.ts"

export interface QuerySqlJoin {
  alias: string
  kind: "inner" | "left"
  on: string
  table: string
}

export interface QuerySqlPlan {
  baseAlias: string
  baseTable: string
  joins: QuerySqlJoin[]
  orderBy: string[]
  parameters: QueryScalar[]
  whereClause: string
}

class SqlPlanBuilder {
  readonly joins = new Map<string, QuerySqlJoin>()
  readonly parameters: QueryScalar[] = []

  addParameter(value: QueryScalar) {
    this.parameters.push(value)
    return "?"
  }

  ensureJoin(join: QuerySqlJoin) {
    this.joins.set(join.alias, join)
  }
}

function escapeLike(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")
}

function likePattern(value: string) {
  return `%${escapeLike(value)}%`
}

function buildInClause(
  expression: string,
  values: QueryScalar[],
  builder: SqlPlanBuilder,
  negated = false,
) {
  const placeholders = values.map((value) => builder.addParameter(value)).join(", ")
  const operator = negated ? "NOT IN" : "IN"

  return `${expression} ${operator} (${placeholders})`
}

function buildComparison(
  expression: string,
  predicate: QueryPredicateNode,
  builder: SqlPlanBuilder,
) {
  if (Array.isArray(predicate.value)) {
    if (predicate.operator === "in") {
      return buildInClause(expression, predicate.value, builder)
    }

    return buildInClause(expression, predicate.value, builder, true)
  }

  const placeholder = builder.addParameter(predicate.value)

  switch (predicate.operator) {
    case "eq":
      return `${expression} = ${placeholder}`
    case "neq":
      return `${expression} <> ${placeholder}`
    case "gt":
      return `${expression} > ${placeholder}`
    case "gte":
      return `${expression} >= ${placeholder}`
    case "lt":
      return `${expression} < ${placeholder}`
    case "lte":
      return `${expression} <= ${placeholder}`
    case "contains":
      builder.parameters[builder.parameters.length - 1] = likePattern(String(predicate.value))
      return `${expression} LIKE ${placeholder} ESCAPE '\\'`
    case "notContains":
      builder.parameters[builder.parameters.length - 1] = likePattern(String(predicate.value))
      return `${expression} NOT LIKE ${placeholder} ESCAPE '\\'`
    default:
      throw new Error(`Operator "${predicate.operator}" is not supported by SQL compilation.`)
  }
}

function compileFieldPredicate(predicate: QueryPredicateNode, builder: SqlPlanBuilder) {
  switch (predicate.field) {
    case "anyText": {
      const value = String(predicate.value)
      const columns = [
        "article.title",
        "article.author",
        "article.summary",
        "article.content_extracted",
        "article.content_raw",
        "COALESCE(feed.custom_name, feed.title)",
      ]
      builder.ensureJoin({
        alias: "feed",
        kind: "inner",
        on: "feed.id = article.feed_id",
        table: "Feed",
      })
      const conditions = columns.map((column) => {
        const placeholder = builder.addParameter(likePattern(value))
        return `${column} LIKE ${placeholder} ESCAPE '\\'`
      })
      const joined = conditions.join(" OR ")
      return predicate.operator === "notContains" ? `NOT (${joined})` : `(${joined})`
    }
    case "feedId":
      return buildComparison("article.feed_id", predicate, builder)
    case "title":
      return buildComparison("article.title", predicate, builder)
    case "author":
      return buildComparison("article.author", predicate, builder)
    case "summary":
      return buildComparison("article.summary", predicate, builder)
    case "content":
      return buildComparison("article.content_extracted", predicate, builder)
    case "feedTitle": {
      builder.ensureJoin({
        alias: "feed",
        kind: "inner",
        on: "feed.id = article.feed_id",
        table: "Feed",
      })

      return buildComparison("COALESCE(feed.custom_name, feed.title)", predicate, builder)
    }
    case "tag": {
      const values = Array.isArray(predicate.value) ? predicate.value : [predicate.value]
      const tagCondition =
        predicate.operator === "in" || predicate.operator === "notIn"
          ? buildInClause("tag.name", values, builder)
          : buildComparison(
              "tag.name",
              {
                ...predicate,
                operator: "eq",
              },
              builder,
            )

      const existsClause = `EXISTS (
  SELECT 1
  FROM ArticleTag article_tag
  INNER JOIN Tag tag ON tag.id = article_tag.tag_id
  WHERE article_tag.article_id = article.id
    AND ${tagCondition}
)`

      return predicate.operator === "neq" || predicate.operator === "notIn"
        ? `NOT ${existsClause}`
        : existsClause
    }
    case "language":
      return buildComparison("article.language", predicate, builder)
    case "publishedAt":
      return buildComparison("article.published_at", predicate, builder)
    case "fetchedAt":
      return buildComparison("article.fetched_at", predicate, builder)
    case "readState": {
      builder.ensureJoin({
        alias: "user_state",
        kind: "left",
        on: "user_state.article_id = article.id",
        table: "UserState",
      })

      return buildComparison("COALESCE(user_state.read_state, 'unread')", predicate, builder)
    }
    case "starred":
      builder.ensureJoin({
        alias: "user_state",
        kind: "left",
        on: "user_state.article_id = article.id",
        table: "UserState",
      })
      return buildComparison("COALESCE(user_state.starred, 0)", predicate, builder)
    case "liked":
      builder.ensureJoin({
        alias: "user_state",
        kind: "left",
        on: "user_state.article_id = article.id",
        table: "UserState",
      })
      return buildComparison("COALESCE(user_state.liked, 0)", predicate, builder)
    case "readLater":
      builder.ensureJoin({
        alias: "user_state",
        kind: "left",
        on: "user_state.article_id = article.id",
        table: "UserState",
      })
      return buildComparison("COALESCE(user_state.read_later, 0)", predicate, builder)
    case "importance":
      builder.ensureJoin({
        alias: "user_state",
        kind: "left",
        on: "user_state.article_id = article.id",
        table: "UserState",
      })
      return buildComparison("COALESCE(user_state.importance, 'normal')", predicate, builder)
    case "hasAttachment": {
      const existsClause = `EXISTS (
  SELECT 1
  FROM Attachment attachment
  WHERE attachment.article_id = article.id
)`

      return predicate.value === true
        ? predicate.operator === "neq"
          ? `NOT ${existsClause}`
          : existsClause
        : predicate.operator === "neq"
          ? existsClause
          : `NOT ${existsClause}`
    }
  }
}

function compileNode(node: QueryDefinition["root"], builder: SqlPlanBuilder): string {
  if (node.kind === "group") {
    const fragments = node.children.map((child) => compileNode(child, builder))
    const delimiter = node.match === "all" ? " AND " : " OR "
    return `(${fragments.join(delimiter)})`
  }

  if (node.kind === "not") {
    return `(NOT ${compileNode(node.child, builder)})`
  }

  return `(${compileFieldPredicate(node, builder)})`
}

function sortExpression(sort: QuerySort, builder: SqlPlanBuilder) {
  switch (sort.field) {
    case "publishedAt":
      return "article.published_at"
    case "fetchedAt":
      return "article.fetched_at"
    case "title":
      return "article.title"
    case "feedTitle":
      builder.ensureJoin({
        alias: "feed",
        kind: "inner",
        on: "feed.id = article.feed_id",
        table: "Feed",
      })
      return "COALESCE(feed.custom_name, feed.title)"
    case "importance":
      builder.ensureJoin({
        alias: "user_state",
        kind: "left",
        on: "user_state.article_id = article.id",
        table: "UserState",
      })
      return "COALESCE(user_state.importance, 'normal')"
  }
}

function compileSort(sort: QuerySort, builder: SqlPlanBuilder) {
  const expression = sortExpression(sort, builder)
  const nullRank =
    sort.nulls === "last"
      ? `CASE WHEN ${expression} IS NULL THEN 1 ELSE 0 END ASC`
      : `CASE WHEN ${expression} IS NULL THEN 0 ELSE 1 END ASC`

  return [nullRank, `${expression} ${sort.direction.toUpperCase()}`]
}

export function compileQueryToSqlPlan(definition: QueryDefinition): QuerySqlPlan {
  const normalized = normalizeQueryDefinition(assertValidQueryDefinition(definition))
  const builder = new SqlPlanBuilder()
  const whereClause = compileNode(normalized.root, builder)
  const orderBy = normalized.sort.flatMap((sort) => compileSort(sort, builder))

  return {
    baseAlias: "article",
    baseTable: "Article",
    joins: [...builder.joins.values()],
    orderBy,
    parameters: builder.parameters,
    whereClause,
  }
}
