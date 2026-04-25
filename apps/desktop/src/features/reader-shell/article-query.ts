import {
  type QueryBuilderClause,
  type QueryDefinition,
  type QueryField,
  type QueryJsonValue,
  type QueryNode,
  type QuerySort,
  QueryTextParseError,
  assertValidQueryDefinition,
  buildQueryDefinition,
  normalizeQueryDefinition,
  parseQueryDefinitionJson,
  parseTextQuery,
  predicate,
  serializeQueryDefinition,
} from "@freelyrss/shared-query"
import type {
  ArticleDetailDto,
  ArticleListItemDto,
  FeedId,
  FolderId,
} from "@freelyrss/shared-types"

import { buildArticleSearchSnippet, extractSearchHighlightTerms } from "./search-highlighting"
import type { ReaderArticleQuery, ReaderShellData, ReaderViewFilters } from "./types"

type ArticleQueryContext = {
  article: ArticleListItemDto
  detail: ArticleDetailDto | null
}

type ParsedSearchText = {
  clauseCount: number
  message: string | null
  messageTone: "error" | "note" | null
  root: QueryNode | null
}

const EMPTY_SOURCE_SENTINEL = "__empty-source__"

const IMPORTANCE_RANKS = {
  low: 0,
  normal: 1,
  high: 2,
} as const

function getFolderFeedIds(data: ReaderShellData, folderId: FolderId): FeedId[] {
  const folderNode = data.subscriptionTree.find(
    (entry) => entry.nodeType === "folder" && entry.folder.id === folderId,
  )

  if (!folderNode || folderNode.nodeType !== "folder") {
    return []
  }

  return [
    ...folderNode.feedIds,
    ...folderNode.childFolderIds.flatMap((childFolderId) => getFolderFeedIds(data, childFolderId)),
  ]
}

function buildSourceClauses(
  data: ReaderShellData,
  sourceId: string,
): {
  clauses: QueryBuilderClause[]
  definitionOverride?: QueryDefinition
  queryMessage?: string | null
  queryMessageTone?: "error" | "note" | null
  sourceSummary: string
} {
  switch (sourceId) {
    case "view-reading":
      return {
        clauses: [predicate("readState", "reading")],
        sourceSummary: `Route scope "Continue reading" maps to articles with readState "reading".`,
      }
    case "view-starred":
      return {
        clauses: [predicate("starred", true)],
        sourceSummary: `Route scope "Starred focus" maps to articles with starred state.`,
      }
    case "view-unread":
      return {
        clauses: [predicate("readState", "read", "neq")],
        sourceSummary: `Route scope "Unread desk" maps to articles that are not fully read.`,
      }
    default: {
      const feed = data.feeds.find((entry) => entry.id === sourceId)

      if (feed) {
        return {
          clauses: [predicate("feedId", feed.id)],
          sourceSummary: `Route scope "${feed.displayTitle}" maps to a single feed id.`,
        }
      }

      const folder = data.folders.find((entry) => entry.id === sourceId)

      if (!folder) {
        const smartFolder = data.smartFolders.find((entry) => entry.id === sourceId)

        if (smartFolder) {
          try {
            return {
              clauses: [],
              definitionOverride: parseQueryDefinitionJson(
                smartFolder.queryDefinition as QueryJsonValue,
              ),
              sourceSummary: `Route scope "${smartFolder.name}" reuses its saved shared query definition.`,
            }
          } catch (error) {
            return {
              clauses: [predicate("feedId", EMPTY_SOURCE_SENTINEL)],
              queryMessage:
                error instanceof Error
                  ? `Smart folder query could not be parsed: ${error.message}`
                  : "Smart folder query could not be parsed.",
              queryMessageTone: "error",
              sourceSummary: `Route scope "${smartFolder.name}" has an invalid saved query definition.`,
            }
          }
        }

        return {
          clauses: [predicate("readState", "read", "neq")],
          sourceSummary: "Unknown route source fell back to the unread desk scope.",
        }
      }

      const feedIds = getFolderFeedIds(data, folder.id)

      if (feedIds.length === 0) {
        return {
          clauses: [predicate("feedId", EMPTY_SOURCE_SENTINEL)],
          sourceSummary: `Route scope "${folder.name}" currently resolves to no feed descendants.`,
        }
      }

      return {
        clauses: [
          feedIds.length === 1
            ? predicate("feedId", feedIds[0])
            : predicate("feedId", feedIds, "in"),
        ],
        sourceSummary: `Route scope "${folder.name}" resolves to ${feedIds.length} feed descendant(s).`,
      }
    }
  }
}

function buildStatusClauses(filters: ReaderViewFilters) {
  const clauses: QueryBuilderClause[] = []

  switch (filters.statusFilter) {
    case "reading":
      clauses.push(predicate("readState", "reading"))
      break
    case "readLater":
      clauses.push(predicate("readLater", true))
      break
    case "starred":
      clauses.push(predicate("starred", true))
      break
    case "unread":
      clauses.push(predicate("readState", "unread"))
      break
    default:
      break
  }

  return clauses
}

function countQueryNodes(node: QueryNode): number {
  if (node.kind === "group") {
    return node.children.reduce((count, child) => count + countQueryNodes(child), 0)
  }

  if (node.kind === "not") {
    return countQueryNodes(node.child)
  }

  return 1
}

function formatQueryParseMessage(error: unknown) {
  if (error instanceof QueryTextParseError) {
    return `Queue filter could not be parsed at line ${error.range.line}, column ${error.range.column}: ${error.message}`
  }

  return error instanceof Error
    ? `Queue filter could not be parsed: ${error.message}`
    : "Queue filter could not be parsed."
}

function parseSearchTextFilter(searchText: string): ParsedSearchText {
  const trimmedSearch = searchText.trim()

  if (trimmedSearch.length === 0) {
    return {
      root: null,
      clauseCount: 0,
      message: null,
      messageTone: null,
    }
  }

  try {
    const parsed = parseTextQuery(trimmedSearch)

    return {
      root: parsed.root,
      clauseCount: countQueryNodes(parsed.root),
      message:
        parsed.sort.length > 0
          ? "Queue filter sort directives are ignored here; use the sort buttons instead."
          : null,
      messageTone: parsed.sort.length > 0 ? "note" : null,
    }
  } catch (error) {
    return {
      root: null,
      clauseCount: 0,
      message: formatQueryParseMessage(error),
      messageTone: "error",
    }
  }
}

function buildSort(filters: ReaderViewFilters): QuerySort[] {
  return [
    {
      field: "publishedAt",
      direction: filters.sortMode === "newest" ? "desc" : "asc",
      nulls: "last",
    },
  ]
}

function mergeQueryRoots(children: QueryNode[], sort: QuerySort[]): QueryDefinition {
  if (children.length === 0) {
    return buildQueryDefinition({
      clauses: [predicate("readState", "read", "neq")],
      sort,
    })
  }

  if (children.length === 1) {
    return assertValidQueryDefinition(
      normalizeQueryDefinition({
        version: 1,
        root: children[0],
        sort,
      }),
    )
  }

  return assertValidQueryDefinition(
    normalizeQueryDefinition({
      version: 1,
      root: {
        kind: "group",
        match: "all",
        children,
      },
      sort,
    }),
  )
}

function getAnyTextValue(context: ArticleQueryContext) {
  return [
    context.article.title,
    context.article.feedTitle,
    context.article.author ?? "",
    context.article.summary ?? "",
    context.detail?.article.contentExtracted ?? "",
    context.detail?.article.contentRaw ?? "",
    ...(context.detail?.tags.map((tag) => tag.name) ?? []),
  ]
    .join(" ")
    .toLowerCase()
}

function readFieldValue(context: ArticleQueryContext, field: QueryField) {
  switch (field) {
    case "anyText":
      return getAnyTextValue(context)
    case "feedId":
      return context.article.feedId
    case "title":
      return context.article.title
    case "author":
      return context.article.author
    case "summary":
      return context.article.summary
    case "content":
      return context.detail?.article.contentExtracted ?? context.detail?.article.contentRaw ?? null
    case "feedTitle":
      return context.article.feedTitle
    case "tag":
      return context.detail?.tags.map((tag) => tag.name) ?? []
    case "language":
      return context.detail?.article.language ?? null
    case "publishedAt":
      return context.article.publishedAt
    case "fetchedAt":
      return context.detail?.article.fetchedAt ?? null
    case "readState":
      return context.article.state.readState
    case "starred":
      return context.article.state.starred
    case "liked":
      return context.article.state.liked
    case "readLater":
      return context.article.state.readLater
    case "importance":
      return context.article.state.importance
    case "hasAttachment":
      return context.article.attachmentCount > 0
    default:
      throw new Error(`Unsupported query field at execution time: ${field}`)
  }
}

function compareScalar(left: string | number | boolean, right: string | number | boolean) {
  if (typeof left === "number" && typeof right === "number") {
    return left - right
  }

  if (typeof left === "boolean" && typeof right === "boolean") {
    return Number(left) - Number(right)
  }

  return String(left).localeCompare(String(right))
}

function normalizeDateValue(value: string | null) {
  if (value === null) {
    return null
  }

  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? null : timestamp
}

function normalizeSortValue(context: ArticleQueryContext, sort: QuerySort) {
  switch (sort.field) {
    case "publishedAt":
      return normalizeDateValue(context.article.publishedAt)
    case "fetchedAt":
      return normalizeDateValue(context.detail?.article.fetchedAt ?? null)
    case "title":
      return context.article.title
    case "feedTitle":
      return context.article.feedTitle
    case "importance":
      return IMPORTANCE_RANKS[context.article.state.importance]
  }
}

function matchArrayPredicate(values: string[], operator: string, rawValue: string | string[]) {
  const expectedValues = Array.isArray(rawValue) ? rawValue : [rawValue]
  const hasMatch = values.some((value) => expectedValues.includes(value))

  return operator === "neq" || operator === "notIn" || operator === "notContains"
    ? !hasMatch
    : hasMatch
}

function matchScalarPredicate(
  actualValue: string | number | boolean,
  operator: string,
  rawValue: string | number | boolean | string[],
) {
  if (Array.isArray(rawValue)) {
    const hasMatch = rawValue.includes(String(actualValue))
    return operator === "notIn" ? !hasMatch : hasMatch
  }

  switch (operator) {
    case "eq":
      return actualValue === rawValue
    case "neq":
      return actualValue !== rawValue
    case "contains":
      return String(actualValue).toLowerCase().includes(String(rawValue).toLowerCase())
    case "notContains":
      return !String(actualValue).toLowerCase().includes(String(rawValue).toLowerCase())
    case "gt":
      return compareScalar(actualValue, rawValue) > 0
    case "gte":
      return compareScalar(actualValue, rawValue) >= 0
    case "lt":
      return compareScalar(actualValue, rawValue) < 0
    case "lte":
      return compareScalar(actualValue, rawValue) <= 0
    case "in":
      return false
    case "notIn":
      return false
    default:
      throw new Error(`Unsupported operator at execution time: ${operator}`)
  }
}

function matchesPredicate(
  context: ArticleQueryContext,
  predicateNode: Extract<QueryNode, { kind: "predicate" }>,
) {
  const actualValue = readFieldValue(context, predicateNode.field)

  if (Array.isArray(actualValue)) {
    return matchArrayPredicate(
      actualValue,
      predicateNode.operator,
      predicateNode.value as string | string[],
    )
  }

  if (actualValue === null) {
    return predicateNode.operator === "neq" || predicateNode.operator === "notContains"
  }

  if (predicateNode.field === "publishedAt" || predicateNode.field === "fetchedAt") {
    const actualTimestamp = normalizeDateValue(String(actualValue))
    const expectedTimestamp = Array.isArray(predicateNode.value)
      ? predicateNode.value
      : normalizeDateValue(String(predicateNode.value))

    if (
      actualTimestamp === null ||
      expectedTimestamp === null ||
      Array.isArray(expectedTimestamp)
    ) {
      return false
    }

    return matchScalarPredicate(actualTimestamp, predicateNode.operator, expectedTimestamp)
  }

  return matchScalarPredicate(
    actualValue as string | number | boolean,
    predicateNode.operator,
    predicateNode.value as string | number | boolean | string[],
  )
}

function matchesNode(context: ArticleQueryContext, node: QueryNode): boolean {
  if (node.kind === "group") {
    return node.match === "all"
      ? node.children.every((child) => matchesNode(context, child))
      : node.children.some((child) => matchesNode(context, child))
  }

  if (node.kind === "not") {
    return !matchesNode(context, node.child)
  }

  return matchesPredicate(context, node)
}

function compareContexts(left: ArticleQueryContext, right: ArticleQueryContext, sort: QuerySort) {
  const leftValue = normalizeSortValue(left, sort)
  const rightValue = normalizeSortValue(right, sort)

  if (leftValue === null && rightValue === null) {
    return 0
  }

  if (leftValue === null) {
    return sort.nulls === "first" ? -1 : 1
  }

  if (rightValue === null) {
    return sort.nulls === "first" ? 1 : -1
  }

  const direction = sort.direction === "asc" ? 1 : -1
  return compareScalar(leftValue, rightValue) * direction
}

export function executeReaderArticleQuery(data: ReaderShellData, definition: QueryDefinition) {
  return data.articles
    .map<ArticleQueryContext>((article) => ({
      article,
      detail: data.articleDetails[article.id] ?? null,
    }))
    .filter((context) => matchesNode(context, definition.root))
    .sort((left, right) => {
      for (const sort of definition.sort) {
        const comparison = compareContexts(left, right, sort)

        if (comparison !== 0) {
          return comparison
        }
      }

      return left.article.title.localeCompare(right.article.title)
    })
    .map((context) => context.article)
}

export function planReaderArticleQuery(
  data: ReaderShellData,
  sourceId: string,
  filters: ReaderViewFilters,
) {
  const source = buildSourceClauses(data, sourceId)
  const statusClauses = buildStatusClauses(filters)
  const parsedSearchText = parseSearchTextFilter(filters.searchText)
  const searchHighlightTerms = extractSearchHighlightTerms(parsedSearchText.root)
  const sort = buildSort(filters)
  const sourceRoot =
    source.definitionOverride?.root ??
    buildQueryDefinition({
      clauses: source.clauses,
      sort,
    }).root
  const statusRoot =
    statusClauses.length === 0
      ? null
      : buildQueryDefinition({
          clauses: statusClauses,
          sort,
        }).root
  const definition = mergeQueryRoots(
    [sourceRoot, statusRoot, parsedSearchText.root].filter(
      (node): node is QueryNode => node !== null,
    ),
    sort,
  )
  const sortSummary = filters.sortMode === "newest" ? "newest first" : "oldest first"
  const shellFilterCount = statusClauses.length + parsedSearchText.clauseCount
  const clauseCount = source.clauses.length + shellFilterCount

  return {
    definition,
    searchHighlightTerms,
    summary: {
      clauseCount,
      jsonPreview: JSON.stringify(serializeQueryDefinition(definition), null, 2),
      queryMessage: source.queryMessage ?? parsedSearchText.message,
      queryMessageTone: source.queryMessageTone ?? parsedSearchText.messageTone,
      sourceSummary: source.sourceSummary,
      summary: `${source.sourceSummary} Shell filters contribute ${shellFilterCount} clause(s); sort is ${sortSummary}.`,
    },
  }
}

export function buildReaderArticleQuery(
  data: ReaderShellData,
  sourceId: string,
  filters: ReaderViewFilters,
): ReaderArticleQuery {
  const { definition, searchHighlightTerms, summary } = planReaderArticleQuery(
    data,
    sourceId,
    filters,
  )
  const visibleArticles = executeReaderArticleQuery(data, definition).map((article) => ({
    ...article,
    searchSnippet: buildArticleSearchSnippet(
      article,
      data.articleDetails[article.id] ?? null,
      searchHighlightTerms,
    ),
  }))

  return {
    definition,
    executionMode: "memory",
    searchHighlightTerms,
    summary,
    visibleArticles,
  }
}
