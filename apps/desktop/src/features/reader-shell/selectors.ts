import type { FeedId, FeedTreeNodeDto, FolderId, FolderTreeNodeDto } from "@freelyrss/shared-types"

import type { ReaderShellData, SourceRow, SubscriptionTreeRow } from "./types"

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

export function resolveFeedIdsForSource(data: ReaderShellData, sourceId: string): FeedId[] {
  if (data.feeds.some((entry) => entry.id === sourceId)) {
    return [sourceId]
  }

  if (data.folders.some((entry) => entry.id === sourceId)) {
    return getFeedIdsForFolder(data, sourceId)
  }

  return []
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

  return {
    id: feed.id,
    kind: "feed",
    title: feed.displayTitle,
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

  return {
    id: folderNode.folder.id,
    kind: "folder",
    title: folderNode.folder.name,
    meta: `${unreadCount}/${articles.length} unread`,
  }
}

function buildSmartFolderSourceRow(data: ReaderShellData, smartFolderId: string): SourceRow {
  const smartFolder = data.smartFolders.find((entry) => entry.id === smartFolderId)

  if (!smartFolder) {
    throw new Error(`Unknown smart folder: ${smartFolderId}`)
  }

  return {
    id: smartFolder.id,
    kind: "view",
    title: smartFolder.name,
    meta: `${smartFolder.unreadCount}/${smartFolder.articleCount} unread`,
  }
}

export function getActiveSource(data: ReaderShellData, sourceId: string) {
  const quickView = data.quickViewSection.rows.find((row) => row.id === sourceId)
  if (quickView) {
    return quickView
  }

  if (data.smartFolders.some((entry) => entry.id === sourceId)) {
    return buildSmartFolderSourceRow(data, sourceId)
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

export function resolveSelectedArticleId(
  visibleArticles: ReaderShellData["articles"],
  selectedArticleId: string | null,
) {
  if (selectedArticleId && visibleArticles.some((article) => article.id === selectedArticleId)) {
    return selectedArticleId
  }

  return visibleArticles[0]?.id ?? null
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
