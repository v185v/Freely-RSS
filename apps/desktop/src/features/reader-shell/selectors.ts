import {
  buildQueryDefinition,
  predicate,
  serializeQueryDefinition,
  text,
} from "@freelyrss/shared-query"
import type { FeedId, FeedTreeNodeDto, FolderId, FolderTreeNodeDto } from "@freelyrss/shared-types"

import type {
  ReaderShellData,
  ReaderViewFilterSummary,
  ReaderViewFilters,
  SourceRow,
  SubscriptionTreeRow,
} from "./types"

function getFeedNode(data: ReaderShellData, feedId: string): FeedTreeNodeDto | null {
  const node = data.subscriptionTree.find(
    (entry): entry is FeedTreeNodeDto => entry.nodeType === "feed" && entry.feed.id === feedId,
  )

  return node ?? null
}

function getFolderNode(data: ReaderShellData, folderId: string): FolderTreeNodeDto | null {
  const node = data.subscriptionTree.find(
    (entry): entry is FolderTreeNodeDto =>
      entry.nodeType === "folder" && entry.folder.id === folderId,
  )

  return node ?? null
}

function getFeedIdsForFolder(data: ReaderShellData, folderId: FolderId): FeedId[] {
  const folderNode = getFolderNode(data, folderId)

  if (!folderNode) {
    return []
  }

  return [
    ...folderNode.feedIds,
    ...folderNode.childFolderIds.flatMap((childFolderId) =>
      getFeedIdsForFolder(data, childFolderId),
    ),
  ]
}

function getAncestorFolderIds(data: ReaderShellData, sourceId: string): FolderId[] {
  const folder = data.folders.find((entry) => entry.id === sourceId)
  if (folder) {
    return folder.parentId ? [folder.parentId, ...getAncestorFolderIds(data, folder.parentId)] : []
  }

  const feed = data.feeds.find((entry) => entry.id === sourceId)
  if (feed?.folderId) {
    return [feed.folderId, ...getAncestorFolderIds(data, feed.folderId)]
  }

  return []
}

function buildFeedSourceRow(data: ReaderShellData, feedId: FeedId): SourceRow {
  const feedNode = getFeedNode(data, feedId)

  if (!feedNode) {
    throw new Error(`Unknown feed tree node: ${feedId}`)
  }

  const feed = feedNode.feed
  const detail =
    feed.lastErrorMessage ?? feed.siteUrl ?? "No site URL or recent health detail available yet."

  return {
    id: feed.id,
    kind: "feed",
    title: feed.displayTitle,
    description: detail,
    eyebrow: feed.healthStatus,
    meta: `${feed.unreadCount}/${feed.totalCount} unread`,
  }
}

function buildFolderSourceRow(data: ReaderShellData, folderId: FolderId): SourceRow {
  const folderNode = getFolderNode(data, folderId)

  if (!folderNode) {
    throw new Error(`Unknown folder tree node: ${folderId}`)
  }

  const feedIds = getFeedIdsForFolder(data, folderId)
  const articles = data.articles.filter((article) => feedIds.includes(article.feedId))
  const unreadCount = articles.filter((article) => article.state.readState !== "read").length
  const childFolderCount = folderNode.childFolderIds.length
  const feedCount = feedIds.length

  return {
    id: folderNode.folder.id,
    kind: "folder",
    title: folderNode.folder.name,
    description:
      childFolderCount > 0
        ? `${feedCount} feeds across ${childFolderCount} nested group(s).`
        : `${feedCount} feeds grouped under this folder.`,
    eyebrow: "folder",
    meta: `${unreadCount}/${articles.length} unread`,
  }
}

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
        return getFeedIdsForFolder(data, folder.id).includes(articleFeedId)
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
  const quickView = data.quickViewSection.rows.find((row) => row.id === sourceId)
  if (quickView) {
    return quickView
  }

  if (data.folders.some((entry) => entry.id === sourceId)) {
    return buildFolderSourceRow(data, sourceId)
  }

  if (data.feeds.some((entry) => entry.id === sourceId)) {
    return buildFeedSourceRow(data, sourceId)
  }

  return null
}

export function buildSubscriptionTreeRows(
  data: ReaderShellData,
  collapsedFolderIds: string[],
  activeSourceId: string,
): SubscriptionTreeRow[] {
  const ancestorFolderIds = new Set(getAncestorFolderIds(data, activeSourceId))
  const collapsedSet = new Set(
    collapsedFolderIds.filter((folderId) => !ancestorFolderIds.has(folderId as FolderId)),
  )
  const rows: SubscriptionTreeRow[] = []
  const rootFolders = data.folders
    .filter((entry) => entry.parentId === null)
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name))

  const pushFolder = (folderId: FolderId, depth: number) => {
    const folderNode = getFolderNode(data, folderId)
    if (!folderNode) {
      return
    }

    const folderRow = buildFolderSourceRow(data, folderId)
    const isCollapsed = collapsedSet.has(folderId)

    rows.push({
      ...folderRow,
      depth,
      hasChildren: folderNode.childFolderIds.length + folderNode.feedIds.length > 0,
      isCollapsed,
    })

    if (isCollapsed) {
      return
    }

    for (const childFolderId of folderNode.childFolderIds) {
      pushFolder(childFolderId, depth + 1)
    }

    for (const feedId of folderNode.feedIds) {
      rows.push({
        ...buildFeedSourceRow(data, feedId),
        depth: depth + 1,
        hasChildren: false,
        isCollapsed: false,
      })
    }
  }

  for (const folder of rootFolders) {
    pushFolder(folder.id, 0)
  }

  for (const feed of data.feeds) {
    if (feed.folderId !== null) {
      continue
    }

    rows.push({
      ...buildFeedSourceRow(data, feed.id),
      depth: 0,
      hasChildren: false,
      isCollapsed: false,
    })
  }

  return rows
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
  return getActiveSource(data, sourceId) ?? data.quickViewSection.rows[0]
}
