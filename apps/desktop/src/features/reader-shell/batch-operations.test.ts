import { describe, expect, test } from "vitest"

import type { ArticleDetailDto, ArticleListItemDto, TagDto } from "@freelyrss/shared-types"

import { applyReaderBatchOperation } from "./batch-operations"
import type { ReaderCacheInventoryEntry } from "./cache-maintenance"

const tags: TagDto[] = [
  {
    id: "tag-product",
    name: "product",
    scope: "article",
    color: "#7fe2c0",
    createdAt: "2026-04-30T00:00:00Z",
  },
  {
    id: "tag-audio",
    name: "audio",
    scope: "article",
    color: "#f38ba8",
    createdAt: "2026-04-30T00:00:00Z",
  },
]

function createArticle(id: string, overrides?: Partial<ArticleListItemDto>): ArticleListItemDto {
  return {
    id,
    feedId: "feed-test",
    feedTitle: "Test feed",
    title: `Article ${id}`,
    author: null,
    summary: null,
    searchSnippet: null,
    publishedAt: "2026-04-30T00:00:00Z",
    thumbnail: null,
    estimatedReadingMinutes: 1,
    state: {
      articleId: id,
      readState: "unread",
      starred: false,
      liked: false,
      importance: "normal",
      readLater: false,
      readingProgress: 0,
      lastOpenedAt: null,
    },
    tagIds: [],
    attachmentCount: 0,
    ...overrides,
  }
}

function createDetail(article: ArticleListItemDto): ArticleDetailDto {
  return {
    article: {
      id: article.id,
      feedId: article.feedId,
      sourceGuid: article.id,
      title: article.title,
      author: article.author,
      summary: article.summary,
      contentRaw: null,
      contentExtracted: `Body for ${article.title}`,
      canonicalUrl: null,
      originalUrl: null,
      publishedAt: article.publishedAt,
      fetchedAt: "2026-04-30T00:00:00Z",
      language: "en",
      thumbnail: null,
      wordCount: 4,
      contentHash: article.id,
    },
    feed: {
      id: article.feedId,
      title: article.feedTitle,
      displayTitle: article.feedTitle,
      siteUrl: null,
      icon: null,
    },
    state: article.state,
    tags: article.tagIds.map((tagId) => {
      const tag = tags.find((entry) => entry.id === tagId)

      if (!tag) {
        throw new Error(`Unknown test tag ${tagId}`)
      }

      return tag
    }),
    attachments: [],
    annotations: [],
  }
}

function createState(input?: {
  articles?: ArticleListItemDto[]
  cacheEntries?: ReaderCacheInventoryEntry[]
  details?: Record<string, ArticleDetailDto>
}) {
  const articles = input?.articles ?? [createArticle("article-a"), createArticle("article-b")]

  return {
    articleDetails:
      input?.details ??
      Object.fromEntries(articles.map((article) => [article.id, createDetail(article)])),
    articles,
    cacheEntries: input?.cacheEntries ?? [],
    tags,
  }
}

describe("reader batch operations", () => {
  test("marks only selected articles as read", () => {
    const result = applyReaderBatchOperation(
      createState(),
      {
        action: "mark-read",
        articleIds: ["article-a"],
      },
      "2026-04-30T10:00:00Z",
    )

    expect(result.articles.find((article) => article.id === "article-a")?.state).toMatchObject({
      lastOpenedAt: "2026-04-30T10:00:00Z",
      readState: "read",
      readingProgress: 1,
    })
    expect(result.articles.find((article) => article.id === "article-b")?.state.readState).toBe(
      "unread",
    )
    expect(result.result.report.changedArticleCount).toBe(1)
  })

  test("adds existing article tags without duplicating tags already present", () => {
    const articleA = createArticle("article-a", { tagIds: ["tag-product"] })
    const articleB = createArticle("article-b")
    const result = applyReaderBatchOperation(
      createState({ articles: [articleA, articleB] }),
      {
        action: "add-tag",
        articleIds: ["article-a", "article-b"],
        tagId: "tag-product",
      },
      "2026-04-30T10:00:00Z",
    )

    expect(result.articles.find((article) => article.id === "article-a")?.tagIds).toEqual([
      "tag-product",
    ])
    expect(result.articles.find((article) => article.id === "article-b")?.tagIds).toEqual([
      "tag-product",
    ])
    expect(result.articleDetails["article-b"]?.tags.map((tag) => tag.name)).toEqual(["product"])
    expect(result.result.report.changedArticleCount).toBe(1)
    expect(result.result.report.skippedArticleCount).toBe(1)
  })

  test("adds read-later state and deletes selected cache entries without touching unselected cache", () => {
    const articleA = createArticle("article-a")
    const articleB = createArticle("article-b")
    const detailA = createDetail(articleA)
    detailA.attachments = [
      {
        id: "attachment-audio",
        articleId: "article-a",
        type: "audio",
        url: "https://example.test/audio.mp3",
        mimeType: "audio/mpeg",
        duration: 90,
        size: 512,
        localCachePath: "cache/audio.mp3",
      },
    ]
    const cacheEntries: ReaderCacheInventoryEntry[] = [
      {
        id: "cache-audio",
        articleId: "article-a",
        attachmentId: "attachment-audio",
        bytes: 512,
        feedId: "feed-test",
        kind: "attachment",
        lastAccessedAt: "2026-04-30T09:00:00Z",
        path: "cache/audio.mp3",
      },
      {
        id: "cache-b",
        articleId: "article-b",
        attachmentId: null,
        bytes: 256,
        feedId: "feed-test",
        kind: "content",
        lastAccessedAt: "2026-04-30T09:00:00Z",
        path: "cache/article-b.json",
      },
    ]
    const readLater = applyReaderBatchOperation(createState({ articles: [articleA, articleB] }), {
      action: "add-read-later",
      articleIds: ["article-a"],
    })

    expect(readLater.articles.find((article) => article.id === "article-a")?.state.readLater).toBe(
      true,
    )
    expect(readLater.articles.find((article) => article.id === "article-b")?.state.readLater).toBe(
      false,
    )

    const deleted = applyReaderBatchOperation(
      createState({
        articles: [articleA, articleB],
        cacheEntries,
        details: {
          "article-a": detailA,
          "article-b": createDetail(articleB),
        },
      }),
      {
        action: "delete-cache",
        articleIds: ["article-a"],
      },
    )

    expect(deleted.cacheEntries.map((entry) => entry.id)).toEqual(["cache-b"])
    expect(deleted.articleDetails["article-a"]?.attachments[0]?.localCachePath).toBeNull()
    expect(deleted.result.report.evictedBytes).toBe(512)
    expect(deleted.result.report.evictedEntryCount).toBe(1)
  })
})
