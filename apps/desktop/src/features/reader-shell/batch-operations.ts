import type { ArticleDetailDto, ArticleListItemDto, TagDto } from "@freelyrss/shared-types"

import type { ReaderCacheInventoryEntry } from "./cache-maintenance"
import type {
  ReaderBatchOperationInput,
  ReaderBatchOperationReport,
  ReaderBatchOperationResult,
} from "./types"

export interface ReaderBatchOperationState {
  articleDetails: Record<string, ArticleDetailDto>
  articles: ArticleListItemDto[]
  cacheEntries: ReaderCacheInventoryEntry[]
  tags: TagDto[]
}

export interface ReaderBatchOperationUpdate {
  articleDetails: Record<string, ArticleDetailDto>
  articles: ArticleListItemDto[]
  cacheEntries: ReaderCacheInventoryEntry[]
  result: ReaderBatchOperationResult
}

function cloneValue<T>(value: T): T {
  return structuredClone(value)
}

function normalizeArticleIds(articleIds: ArticleListItemDto["id"][]) {
  return Array.from(new Set(articleIds))
}

function findTagOrThrow(tags: TagDto[], tagId: TagDto["id"]) {
  const tag = tags.find((entry) => entry.id === tagId && entry.scope === "article")

  if (!tag) {
    throw new Error(`Unknown article tag id: ${tagId}`)
  }

  return tag
}

function assertKnownArticleIds(
  state: ReaderBatchOperationState,
  articleIds: ArticleListItemDto["id"][],
) {
  const knownArticleIds = new Set(state.articles.map((article) => article.id))
  const unknownArticleId = articleIds.find((articleId) => !knownArticleIds.has(articleId))

  if (unknownArticleId) {
    throw new Error(`Unknown batch article id: ${unknownArticleId}`)
  }
}

function createReport(input: {
  action: ReaderBatchOperationReport["action"]
  articleIds: ArticleListItemDto["id"][]
  changedArticleCount: number
  completedAt: string
  evictedBytes?: number
  evictedEntryCount?: number
  tagName?: string | null
}): ReaderBatchOperationReport {
  return {
    action: input.action,
    changedArticleCount: input.changedArticleCount,
    completedAt: input.completedAt,
    evictedBytes: input.evictedBytes ?? 0,
    evictedEntryCount: input.evictedEntryCount ?? 0,
    selectedArticleCount: input.articleIds.length,
    skippedArticleCount: Math.max(0, input.articleIds.length - input.changedArticleCount),
    tagName: input.tagName ?? null,
  }
}

function updateArticleStates(
  state: ReaderBatchOperationState,
  selectedArticleIds: Set<ArticleListItemDto["id"]>,
  updateState: (article: ArticleListItemDto) => ArticleListItemDto["state"],
) {
  let changedArticleCount = 0
  const nextArticles = state.articles.map((article) => {
    if (!selectedArticleIds.has(article.id)) {
      return cloneValue(article)
    }

    const nextState = updateState(article)
    const changed = JSON.stringify(nextState) !== JSON.stringify(article.state)

    if (changed) {
      changedArticleCount += 1
    }

    return {
      ...cloneValue(article),
      state: nextState,
    }
  })
  const nextStatesByArticleId = new Map(nextArticles.map((article) => [article.id, article.state]))
  const nextArticleDetails = Object.fromEntries(
    Object.entries(state.articleDetails).map(([articleId, detail]) => [
      articleId,
      selectedArticleIds.has(articleId)
        ? {
            ...cloneValue(detail),
            state: cloneValue(nextStatesByArticleId.get(articleId) ?? detail.state),
          }
        : cloneValue(detail),
    ]),
  )

  return {
    changedArticleCount,
    nextArticleDetails,
    nextArticles,
  }
}

function applyTagToArticles(
  state: ReaderBatchOperationState,
  selectedArticleIds: Set<ArticleListItemDto["id"]>,
  tag: TagDto,
) {
  let changedArticleCount = 0
  const nextArticles = state.articles.map((article) => {
    if (!selectedArticleIds.has(article.id)) {
      return cloneValue(article)
    }

    if (article.tagIds.includes(tag.id)) {
      return cloneValue(article)
    }

    changedArticleCount += 1
    return {
      ...cloneValue(article),
      tagIds: [...article.tagIds, tag.id],
    }
  })
  const nextArticleDetails = Object.fromEntries(
    Object.entries(state.articleDetails).map(([articleId, detail]) => {
      if (!selectedArticleIds.has(articleId) || detail.tags.some((entry) => entry.id === tag.id)) {
        return [articleId, cloneValue(detail)]
      }

      return [
        articleId,
        {
          ...cloneValue(detail),
          tags: [...detail.tags, cloneValue(tag)],
        },
      ]
    }),
  )

  return {
    changedArticleCount,
    nextArticleDetails,
    nextArticles,
  }
}

function deleteSelectedCache(
  state: ReaderBatchOperationState,
  selectedArticleIds: Set<ArticleListItemDto["id"]>,
) {
  const evictedEntries = state.cacheEntries.filter((entry) =>
    selectedArticleIds.has(entry.articleId),
  )
  const evictedAttachmentIds = new Set(
    evictedEntries
      .map((entry) => entry.attachmentId)
      .filter((attachmentId): attachmentId is string => attachmentId !== null),
  )
  const articleIdsWithEvictedEntries = new Set(evictedEntries.map((entry) => entry.articleId))
  const nextCacheEntries = state.cacheEntries
    .filter((entry) => !selectedArticleIds.has(entry.articleId))
    .map((entry) => cloneValue(entry))
  const nextArticleDetails = Object.fromEntries(
    Object.entries(state.articleDetails).map(([articleId, detail]) => [
      articleId,
      selectedArticleIds.has(articleId)
        ? {
            ...cloneValue(detail),
            attachments: detail.attachments.map((attachment) =>
              evictedAttachmentIds.has(attachment.id)
                ? {
                    ...cloneValue(attachment),
                    localCachePath: null,
                  }
                : cloneValue(attachment),
            ),
          }
        : cloneValue(detail),
    ]),
  )

  return {
    changedArticleCount: articleIdsWithEvictedEntries.size,
    evictedBytes: evictedEntries.reduce((sum, entry) => sum + Math.max(0, entry.bytes), 0),
    evictedEntryCount: evictedEntries.length,
    nextArticleDetails,
    nextCacheEntries,
  }
}

export function applyReaderBatchOperation(
  state: ReaderBatchOperationState,
  input: ReaderBatchOperationInput,
  completedAt = new Date().toISOString(),
): ReaderBatchOperationUpdate {
  const articleIds = normalizeArticleIds(input.articleIds)

  if (articleIds.length === 0) {
    throw new Error("Select at least one visible article before running a batch operation.")
  }

  assertKnownArticleIds(state, articleIds)

  const selectedArticleIds = new Set(articleIds)
  let nextArticles = state.articles.map((article) => cloneValue(article))
  let nextArticleDetails = cloneValue(state.articleDetails)
  let nextCacheEntries = state.cacheEntries.map((entry) => cloneValue(entry))
  let report: ReaderBatchOperationReport

  switch (input.action) {
    case "mark-read": {
      const update = updateArticleStates(state, selectedArticleIds, (article) => ({
        ...cloneValue(article.state),
        lastOpenedAt: article.state.readState === "read" ? article.state.lastOpenedAt : completedAt,
        readState: "read",
        readingProgress: 1,
      }))

      nextArticles = update.nextArticles
      nextArticleDetails = update.nextArticleDetails
      report = createReport({
        action: input.action,
        articleIds,
        changedArticleCount: update.changedArticleCount,
        completedAt,
      })
      break
    }
    case "add-read-later": {
      const update = updateArticleStates(state, selectedArticleIds, (article) => ({
        ...cloneValue(article.state),
        readLater: true,
      }))

      nextArticles = update.nextArticles
      nextArticleDetails = update.nextArticleDetails
      report = createReport({
        action: input.action,
        articleIds,
        changedArticleCount: update.changedArticleCount,
        completedAt,
      })
      break
    }
    case "add-tag": {
      const tag = findTagOrThrow(state.tags, input.tagId)
      const update = applyTagToArticles(state, selectedArticleIds, tag)

      nextArticles = update.nextArticles
      nextArticleDetails = update.nextArticleDetails
      report = createReport({
        action: input.action,
        articleIds,
        changedArticleCount: update.changedArticleCount,
        completedAt,
        tagName: tag.name,
      })
      break
    }
    case "delete-cache": {
      const update = deleteSelectedCache(state, selectedArticleIds)

      nextArticleDetails = update.nextArticleDetails
      nextCacheEntries = update.nextCacheEntries
      report = createReport({
        action: input.action,
        articleIds,
        changedArticleCount: update.changedArticleCount,
        completedAt,
        evictedBytes: update.evictedBytes,
        evictedEntryCount: update.evictedEntryCount,
      })
      break
    }
  }

  return {
    articleDetails: nextArticleDetails,
    articles: nextArticles,
    cacheEntries: nextCacheEntries,
    result: {
      articleIds,
      report,
    },
  }
}
