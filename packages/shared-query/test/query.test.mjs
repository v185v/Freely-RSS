import assert from "node:assert/strict"
import test from "node:test"

import {
  buildQueryDefinition,
  compileQueryToSqlPlan,
  parseQueryDefinitionJson,
  parseTextQuery,
  predicate,
  serializeQueryDefinition,
  text,
  validateQueryDefinition,
} from "../src/index.ts"

test("visual builder and text query normalize to the same AST", () => {
  const builderDefinition = buildQueryDefinition({
    clauses: [
      predicate("readState", "unread"),
      predicate("tag", "product"),
      predicate("feedTitle", "FreelyRSS Engineering"),
      predicate("publishedAt", "2026-04-08T00:00:00Z"),
      text("offline first"),
    ],
    sort: [
      {
        direction: "desc",
        field: "publishedAt",
        nulls: "last",
      },
    ],
  })

  const textDefinition = parseTextQuery(
    'is:unread tag:product source:"FreelyRSS Engineering" after:2026-04-08T00:00:00Z "offline first" sort:publishedAt-desc',
  )

  assert.deepEqual(textDefinition, builderDefinition)
})

test("serialized query definitions round-trip through JSON", () => {
  const definition = buildQueryDefinition({
    clauses: [predicate("starred", true), text("reader state")],
  })

  const serialized = serializeQueryDefinition(definition)
  const parsed = parseQueryDefinitionJson(serialized)

  assert.deepEqual(parsed, definition)
})

test("SQL compilation produces joins, parameters, and order by clauses", () => {
  const definition = parseTextQuery(
    'is:reading source:"FreelyRSS Engineering" tag:ops has:attachment sort:importance-desc',
  )

  const plan = compileQueryToSqlPlan(definition)

  assert.equal(plan.baseTable, "Article")
  assert.equal(plan.baseAlias, "article")
  assert.ok(plan.whereClause.includes("COALESCE(feed.custom_name, feed.title)"))
  assert.ok(plan.whereClause.includes("ArticleTag"))
  assert.ok(plan.whereClause.includes("Attachment"))
  assert.deepEqual(plan.joins.map((join) => join.alias).sort(), ["feed", "user_state"])
  assert.deepEqual(plan.parameters, ["reading", "%FreelyRSS Engineering%", "ops"])
  assert.ok(plan.orderBy.some((entry) => entry.includes("user_state.importance")))
})

test("feed id predicates compile directly against the article table", () => {
  const definition = buildQueryDefinition({
    clauses: [predicate("feedId", "feed-freelyrss")],
  })

  const plan = compileQueryToSqlPlan(definition)

  assert.ok(plan.whereClause.includes("article.feed_id = ?"))
  assert.deepEqual(plan.parameters, ["feed-freelyrss"])
})

test("invalid predicates surface validation issues", () => {
  const issues = validateQueryDefinition({
    version: 1,
    root: {
      kind: "predicate",
      field: "starred",
      operator: "contains",
      value: "yes",
    },
    sort: [],
  })

  assert.equal(issues.length, 2)
  assert.deepEqual(issues.map((issue) => issue.code).sort(), [
    "invalid-boolean",
    "operator-not-allowed",
  ])
})
