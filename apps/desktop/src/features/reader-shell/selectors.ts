import {
  buildQueryDefinition,
  predicate,
  serializeQueryDefinition,
  text,
} from "@freelyrss/shared-query"

import type {
  ReaderShellData,
  ReaderViewFilterSummary,
  ReaderViewFilters,
  SourceRow,
} from "./types"

function matchesSource(data: ReaderShellData, sourceId: string, articleFeedId: string) {
  switch (sourceId) {
    case "view-unread":
    case "view-reading":
    case "view-starred":
      return true
    default: {
      const feed = data.feeds.find((entry) => entry.id === sourceId)
      if (feed) {
        return feed.id === articleFeedId
      }

      const folder = data.folders.find((entry) => entry.id === sourceId)
      if (folder) {
        return data.feeds.some(
          (entry) => entry.folderId === folder.id && entry.id === articleFeedId,
        )
      }

      return false
    }
  }
}

function matchesRouteView(sourceId: string, article: ReaderShellData["articles"][number]) {
  switch (sourceId) {
    case "view-reading":
      return article.state.readState === "reading"
    case "view-starred":
      return article.state.starred
    case "view-unread":
      return article.state.readState !== "read"
    default:
      return true
  }
}

function matchesStatusFilter(
  statusFilter: ReaderViewFilters["statusFilter"],
  article: ReaderShellData["articles"][number],
) {
  switch (statusFilter) {
    case "all":
      return true
    case "reading":
      return article.state.readState === "reading"
    case "readLater":
      return article.state.readLater
    case "starred":
      return article.state.starred
    case "unread":
      return article.state.readState === "unread"
  }
}

function matchesSearchText(searchText: string, article: ReaderShellData["articles"][number]) {
  const trimmed = searchText.trim().toLowerCase()

  if (trimmed.length === 0) {
    return true
  }

  const haystack = [article.title, article.feedTitle, article.author ?? "", article.summary ?? ""]
    .join(" ")
    .toLowerCase()

  return haystack.includes(trimmed)
}

function compareDates(
  sortMode: ReaderViewFilters["sortMode"],
  left: string | null,
  right: string | null,
) {
  const leftValue = left ? Date.parse(left) : 0
  const rightValue = right ? Date.parse(right) : 0

  return sortMode === "newest" ? rightValue - leftValue : leftValue - rightValue
}

export function getActiveSource(data: ReaderShellData, sourceId: string) {
  return data.sourceSections.flatMap((section) => section.rows).find((row) => row.id === sourceId)
}

export function getVisibleArticles(
  data: ReaderShellData,
  sourceId: string,
  filters: ReaderViewFilters,
) {
  return data.articles
    .slice()
    .filter((article) => matchesSource(data, sourceId, article.feedId))
    .filter((article) => matchesRouteView(sourceId, article))
    .filter((article) => matchesStatusFilter(filters.statusFilter, article))
    .filter((article) => matchesSearchText(filters.searchText, article))
    .sort((left, right) =>
      compareDates(filters.sortMode, left.publishedAt ?? null, right.publishedAt ?? null),
    )
}

export function resolveSelectedArticleId(
  visibleArticles: ReaderShellData["articles"],
  selectedArticleId: string | null,
) {
  if (selectedArticleId && visibleArticles.some((article) => article.id === selectedArticleId)) {
    return selectedArticleId
  }

  return visibleArticles[0]?.id ?? null
}

export function buildViewFilterSummary(filters: ReaderViewFilters): ReaderViewFilterSummary {
  const clauses = []

  if (filters.searchText.trim().length > 0) {
    clauses.push(text(filters.searchText.trim()))
  }

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

  if (clauses.length === 0) {
    return {
      conditionCount: 0,
      jsonPreview: null,
      summary: `No additional view filters. Local sort mode is ${filters.sortMode}.`,
    }
  }

  const definition = buildQueryDefinition({
    clauses,
    sort: [
      {
        field: "publishedAt",
        direction: filters.sortMode === "newest" ? "desc" : "asc",
        nulls: "last",
      },
    ],
  })

  return {
    conditionCount: clauses.length,
    jsonPreview: JSON.stringify(serializeQueryDefinition(definition), null, 2),
    summary: `${clauses.length} shell-owned filter condition(s) are active. Local sort mode is ${filters.sortMode}.`,
  }
}

export function formatArticleMeta(article: ReaderShellData["articles"][number]) {
  const progress =
    article.state.readState === "reading"
      ? ` · ${Math.round(article.state.readingProgress * 100)}%`
      : ""
  const readingTime =
    article.estimatedReadingMinutes === null
      ? "No estimate"
      : `${article.estimatedReadingMinutes} min`

  return `${article.state.readState} · ${readingTime}${progress}`
}

export function formatReaderProgress(progress: number) {
  return `${Math.round(progress * 100)}%`
}

export function findSourceRow(data: ReaderShellData, sourceId: string): SourceRow {
  return getActiveSource(data, sourceId) ?? data.sourceSections[0]?.rows[0]
}
