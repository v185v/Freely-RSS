import { describe, expect, test } from "vitest"

import type { ArticleDetailDto, ArticleListItemDto, FeedDto } from "@freelyrss/shared-types"
import {
  type ReaderCacheInventoryEntry,
  planReaderCacheCleanup,
  summarizeReaderCache,
} from "./cache-maintenance"
import type { ReaderCacheSettings } from "./types"

function createCacheSettings(overrides?: Partial<ReaderCacheSettings>): ReaderCacheSettings {
  return {
    defaultPolicy: "content",
    maxBytes: 512,
    ...overrides,
  }
}

function createFeed(overrides?: Partial<FeedDto>): FeedDto {
  return {
    id: "feed-a",
    title: "Feed A",
    siteUrl: "https://example.com",
    feedUrl: "https://example.com/feed.xml",
    format: "rss",
    icon: null,
    folderId: null,
    customName: null,
    sortOrder: 10,
    updateInterval: 60,
    cachePolicy: "content-and-attachments",
    healthStatus: "healthy",
    lastCheckedAt: null,
    lastSuccessAt: null,
    etag: null,
    lastModified: null,
    lastErrorKind: null,
    lastErrorMessage: null,
    lastErrorAt: null,
    consecutiveFailures: 0,
    ...overrides,
  }
}

function createArticle(overrides?: Partial<ArticleListItemDto>): ArticleListItemDto {
  return {
    id: "article-a",
    feedId: "feed-a",
    feedTitle: "Feed A",
    title: "Article A",
    author: null,
    summary: null,
    searchSnippet: null,
    publishedAt: "2026-04-27T00:00:00Z",
    thumbnail: null,
    estimatedReadingMinutes: 5,
    state: {
      articleId: "article-a",
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

function createDetail(overrides?: Partial<ArticleDetailDto>): ArticleDetailDto {
  return {
    article: {
      id: "article-a",
      feedId: "feed-a",
      sourceGuid: "article-a",
      title: "Article A",
      author: null,
      summary: null,
      contentRaw: null,
      contentExtracted: "Example content",
      canonicalUrl: "https://example.com/articles/a",
      originalUrl: "https://example.com/articles/a",
      publishedAt: "2026-04-27T00:00:00Z",
      fetchedAt: "2026-04-27T00:00:00Z",
      language: "en",
      thumbnail: null,
      wordCount: 100,
      contentHash: "sha256:a",
    },
    feed: {
      id: "feed-a",
      title: "Feed A",
      displayTitle: "Feed A",
      siteUrl: "https://example.com",
      icon: null,
    },
    state: createArticle().state,
    tags: [],
    attachments: [],
    annotations: [],
    aiArtifacts: [],
    ...overrides,
  }
}

function createEntry(overrides?: Partial<ReaderCacheInventoryEntry>): ReaderCacheInventoryEntry {
  return {
    id: "cache-a",
    articleId: "article-a",
    attachmentId: null,
    bytes: 100,
    feedId: "feed-a",
    kind: "content",
    lastAccessedAt: "2026-04-27T00:00:00Z",
    path: "cache/content/article-a.json",
    ...overrides,
  }
}

describe("cache maintenance planning", () => {
  test("reclaims policy-mismatch entries before applying LRU pressure", () => {
    const feeds = [
      createFeed({
        id: "feed-protected",
        title: "Protected feed",
        feedUrl: "https://protected.example/feed.xml",
        cachePolicy: "metadata-only",
      }),
      createFeed({
        id: "feed-queue",
        title: "Queue feed",
        feedUrl: "https://queue.example/feed.xml",
        cachePolicy: "content-and-attachments",
      }),
    ]
    const articles = [
      createArticle({
        id: "article-protected",
        feedId: "feed-protected",
        title: "Protected policy mismatch",
        state: {
          articleId: "article-protected",
          readState: "unread",
          starred: false,
          liked: false,
          importance: "normal",
          readLater: true,
          readingProgress: 0,
          lastOpenedAt: null,
        },
      }),
      createArticle({
        id: "article-queue",
        feedId: "feed-queue",
        title: "Queue candidate",
      }),
    ]
    const articleDetails = {
      "article-protected": createDetail({
        article: { ...createDetail().article, id: "article-protected", feedId: "feed-protected" },
        feed: {
          ...createDetail().feed,
          id: "feed-protected",
          title: "Protected feed",
          displayTitle: "Protected feed",
          siteUrl: "https://protected.example",
        },
        state: articles[0].state,
        attachments: [
          {
            id: "attachment-protected",
            articleId: "article-protected",
            type: "audio",
            url: "https://protected.example/audio.mp3",
            mimeType: "audio/mpeg",
            duration: 60,
            size: 10,
            localCachePath: "cache/media/protected/audio.mp3",
          },
        ],
      }),
      "article-queue": createDetail({
        article: { ...createDetail().article, id: "article-queue", feedId: "feed-queue" },
        feed: {
          ...createDetail().feed,
          id: "feed-queue",
          title: "Queue feed",
          displayTitle: "Queue feed",
          siteUrl: "https://queue.example",
        },
        state: articles[1].state,
      }),
    }
    const entries = [
      createEntry({
        id: "cache-protected-attachment",
        articleId: "article-protected",
        attachmentId: "attachment-protected",
        bytes: 180,
        feedId: "feed-protected",
        kind: "attachment",
        lastAccessedAt: "2026-04-26T08:00:00Z",
        path: "cache/media/protected/audio.mp3",
      }),
      createEntry({
        id: "cache-queue-content",
        articleId: "article-queue",
        bytes: 220,
        feedId: "feed-queue",
        kind: "content",
        lastAccessedAt: "2026-04-20T08:00:00Z",
        path: "cache/content/article-queue.json",
      }),
    ]

    const summary = summarizeReaderCache({
      articleDetails,
      articles,
      cacheSettings: createCacheSettings({ maxBytes: 500 }),
      entries,
      feedDetails: feeds,
    })
    const plan = planReaderCacheCleanup(
      {
        articleDetails,
        articles,
        cacheSettings: createCacheSettings({ maxBytes: 500 }),
        entries,
        feedDetails: feeds,
      },
      "2026-04-27T09:00:00Z",
    )

    expect(summary.cleanupCandidates[0]).toMatchObject({
      articleId: "article-protected",
      reason: "policy-mismatch",
    })
    expect(plan.evictedEntries).toEqual([
      {
        attachmentId: "attachment-protected",
        id: "cache-protected-attachment",
      },
    ])
    expect(plan.report.policyMismatchEntryCount).toBe(1)
    expect(plan.report.lruEntryCount).toBe(0)
    expect(plan.report.stillOverBudgetBytes).toBe(0)
  })

  test("uses LRU for allowed entries while preserving protected note-bearing articles", () => {
    const feed = createFeed()
    const protectedArticle = createArticle({
      id: "article-protected",
      title: "Protected article",
      state: {
        articleId: "article-protected",
        readState: "reading",
        starred: false,
        liked: false,
        importance: "normal",
        readLater: false,
        readingProgress: 0.25,
        lastOpenedAt: "2026-04-27T09:00:00Z",
      },
    })
    const oldestArticle = createArticle({
      id: "article-oldest",
      title: "Oldest candidate",
      state: {
        articleId: "article-oldest",
        readState: "read",
        starred: false,
        liked: false,
        importance: "normal",
        readLater: false,
        readingProgress: 1,
        lastOpenedAt: "2026-04-10T09:00:00Z",
      },
    })
    const newerArticle = createArticle({
      id: "article-newer",
      title: "Newer candidate",
      state: {
        articleId: "article-newer",
        readState: "unread",
        starred: false,
        liked: false,
        importance: "normal",
        readLater: false,
        readingProgress: 0,
        lastOpenedAt: null,
      },
    })
    const articles = [protectedArticle, oldestArticle, newerArticle]
    const articleDetails = {
      "article-protected": createDetail({
        article: { ...createDetail().article, id: "article-protected", title: "Protected article" },
        state: protectedArticle.state,
        annotations: [
          {
            id: "annotation-protected",
            articleId: "article-protected",
            type: "note",
            selectedText: "Protected note",
            anchor: { paragraphIndex: 0, startOffset: 0, endOffset: 5 },
            note: "Keep this cached",
            color: "#8eb6ff",
            createdAt: "2026-04-27T09:00:00Z",
          },
        ],
      }),
      "article-oldest": createDetail({
        article: { ...createDetail().article, id: "article-oldest", title: "Oldest candidate" },
        state: oldestArticle.state,
      }),
      "article-newer": createDetail({
        article: { ...createDetail().article, id: "article-newer", title: "Newer candidate" },
        state: newerArticle.state,
      }),
    }
    const entries = [
      createEntry({
        id: "cache-protected",
        articleId: "article-protected",
        bytes: 150,
        lastAccessedAt: "2026-04-27T09:00:00Z",
        path: "cache/content/article-protected.json",
      }),
      createEntry({
        id: "cache-oldest",
        articleId: "article-oldest",
        bytes: 200,
        lastAccessedAt: "2026-04-10T09:00:00Z",
        path: "cache/content/article-oldest.json",
      }),
      createEntry({
        id: "cache-newer",
        articleId: "article-newer",
        bytes: 120,
        lastAccessedAt: "2026-04-20T09:00:00Z",
        path: "cache/content/article-newer.json",
      }),
    ]

    const summary = summarizeReaderCache({
      articleDetails,
      articles,
      cacheSettings: createCacheSettings({ maxBytes: 300 }),
      entries,
      feedDetails: [feed],
    })
    const plan = planReaderCacheCleanup(
      {
        articleDetails,
        articles,
        cacheSettings: createCacheSettings({ maxBytes: 300 }),
        entries,
        feedDetails: [feed],
      },
      "2026-04-27T10:00:00Z",
    )

    expect(summary.protectedArticleCount).toBe(1)
    expect(summary.cleanupCandidates.map((candidate) => candidate.articleId)).toEqual([
      "article-oldest",
      "article-newer",
    ])
    expect(plan.evictedEntries).toEqual([
      {
        attachmentId: null,
        id: "cache-oldest",
      },
    ])
    expect(plan.report.lruEntryCount).toBe(1)
    expect(plan.report.policyMismatchEntryCount).toBe(0)
    expect(plan.report.remainingBytes).toBe(270)
  })
})
