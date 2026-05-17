import {
  buildQueryDefinition,
  normalizeQueryDefinition,
  predicate,
  serializeQueryDefinition,
} from "@freelyrss/shared-query"
import type {
  AIArtifactDto,
  AnnotationDto,
  ArticleDetailDto,
  ArticleListItemDto,
  FeedDto,
  FeedSummaryDto,
  FolderDto,
  SmartFolderDto,
  SubscriptionTreeNodeDto,
  TagDto,
  UserStateDto,
} from "@freelyrss/shared-types"

import { applyReaderBatchOperation } from "./batch-operations"
import {
  type ReaderCacheInventoryEntry,
  planReaderCacheCleanup,
  summarizeReaderCache,
} from "./cache-maintenance"
import { buildReaderDocumentExport } from "./html-pdf-export"
import { buildReaderMarkdownExport } from "./markdown-export"
import type {
  CreateReaderAnnotationInput,
  OpmlExportReport,
  OpmlImportReport,
  ReaderAICacheDeleteResult,
  ReaderAIInsightResult,
  ReaderAIQuestionContextScope,
  ReaderAIQuestionResult,
  ReaderAITranslationMode,
  ReaderAITranslationResult,
  ReaderBatchOperationInput,
  ReaderBatchOperationResult,
  ReaderCacheCleanupReport,
  ReaderCacheSettings,
  ReaderDocumentExportFormat,
  ReaderDocumentExportPresentation,
  ReaderDocumentExportResult,
  ReaderMarkdownExportMode,
  ReaderMarkdownExportResult,
  ReaderShellData,
  SourceRow,
} from "./types"

export const readerShellQueryKey = ["desktop-reader-shell", "mock-data"] as const

const initialCacheSettings: ReaderCacheSettings = {
  maxBytes: 2_147_483_648,
  defaultPolicy: "content",
}

const initialCacheEntries: ReaderCacheInventoryEntry[] = [
  {
    id: "cache-content-layout-shell",
    articleId: "article-layout-shell",
    attachmentId: null,
    bytes: 188_743_680,
    feedId: "feed-freelyrss",
    kind: "content",
    lastAccessedAt: "2026-04-18T09:05:00Z",
    path: "cache/content/article-layout-shell.json",
  },
  {
    id: "cache-content-source-context",
    articleId: "article-source-context",
    attachmentId: null,
    bytes: 314_572_800,
    feedId: "feed-rust-systems",
    kind: "content",
    lastAccessedAt: "2026-04-15T08:10:00Z",
    path: "cache/content/article-source-context.json",
  },
  {
    id: "cache-content-window-behavior",
    articleId: "article-window-behavior",
    attachmentId: null,
    bytes: 134_217_728,
    feedId: "feed-freelyrss",
    kind: "content",
    lastAccessedAt: "2026-04-17T04:25:00Z",
    path: "cache/content/article-window-behavior.json",
  },
  {
    id: "cache-content-midnight-dispatch",
    articleId: "article-midnight-dispatch",
    attachmentId: null,
    bytes: 146_800_640,
    feedId: "feed-night-audio",
    kind: "content",
    lastAccessedAt: "2026-04-18T02:00:00Z",
    path: "cache/content/article-midnight-dispatch.json",
  },
  {
    id: "cache-attachment-midnight-dispatch-audio",
    articleId: "article-midnight-dispatch",
    attachmentId: "attachment-midnight-dispatch-audio",
    bytes: 100_663_296,
    feedId: "feed-night-audio",
    kind: "attachment",
    lastAccessedAt: "2026-04-18T02:05:00Z",
    path: "cache/media/night-audio/dispatch-42.mp3",
  },
]

const folders: FolderDto[] = [
  {
    id: "folder-daily",
    kind: "regular",
    name: "Daily reading desk",
    parentId: null,
    sortOrder: 10,
  },
  {
    id: "folder-research",
    kind: "regular",
    name: "Research threads",
    parentId: null,
    sortOrder: 20,
  },
  {
    id: "folder-daily-core",
    kind: "regular",
    name: "Core architecture",
    parentId: "folder-daily",
    sortOrder: 10,
  },
  {
    id: "folder-podcasts",
    kind: "regular",
    name: "Podcast watchlist",
    parentId: null,
    sortOrder: 30,
  },
]

const feedDetails: FeedDto[] = [
  {
    id: "feed-freelyrss",
    title: "FreelyRSS Engineering",
    siteUrl: "https://freelyrss.dev",
    feedUrl: "https://freelyrss.dev/feed.xml",
    format: "rss",
    icon: null,
    folderId: "folder-daily-core",
    customName: null,
    sortOrder: 10,
    updateInterval: 45,
    cachePolicy: "content",
    healthStatus: "healthy",
    lastCheckedAt: "2026-04-18T09:20:00Z",
    lastSuccessAt: "2026-04-18T09:20:00Z",
    etag: '"freelyrss-step-34"',
    lastModified: "Fri, 18 Apr 2026 09:18:00 GMT",
    lastErrorKind: null,
    lastErrorMessage: null,
    lastErrorAt: null,
    consecutiveFailures: 0,
  },
  {
    id: "feed-rust-systems",
    title: "Rust Systems Weekly",
    siteUrl: "https://systems.example",
    feedUrl: "https://systems.example/feed.xml",
    format: "rss",
    icon: null,
    folderId: "folder-daily",
    customName: "Rust Systems Watch",
    sortOrder: 20,
    updateInterval: 120,
    cachePolicy: "content",
    healthStatus: "healthy",
    lastCheckedAt: "2026-04-18T08:55:00Z",
    lastSuccessAt: "2026-04-18T08:55:00Z",
    etag: '"rust-systems-20260418"',
    lastModified: "Fri, 18 Apr 2026 08:54:00 GMT",
    lastErrorKind: null,
    lastErrorMessage: null,
    lastErrorAt: null,
    consecutiveFailures: 0,
  },
  {
    id: "feed-query-notes",
    title: "Query Notes",
    siteUrl: "https://query.example",
    feedUrl: "https://query.example/feed.xml",
    format: "atom",
    icon: null,
    folderId: "folder-research",
    customName: null,
    sortOrder: 10,
    updateInterval: 90,
    cachePolicy: "metadata-only",
    healthStatus: "degraded",
    lastCheckedAt: "2026-04-18T07:40:00Z",
    lastSuccessAt: "2026-04-18T05:15:00Z",
    etag: '"query-parse-warning"',
    lastModified: "Fri, 18 Apr 2026 07:38:00 GMT",
    lastErrorKind: "parse",
    lastErrorMessage: "Latest response returned malformed XML near the channel header.",
    lastErrorAt: "2026-04-18T07:40:00Z",
    consecutiveFailures: 1,
  },
  {
    id: "feed-night-audio",
    title: "Night Audio Digest",
    siteUrl: "https://audio.example",
    feedUrl: "https://audio.example/podcast.json",
    format: "json-feed",
    icon: "https://audio.example/assets/night-audio.png",
    folderId: "folder-podcasts",
    customName: null,
    sortOrder: 10,
    updateInterval: null,
    cachePolicy: "content-and-attachments",
    healthStatus: "paused",
    lastCheckedAt: "2026-04-17T22:10:00Z",
    lastSuccessAt: "2026-04-17T22:10:00Z",
    etag: '"night-audio-paused"',
    lastModified: "Thu, 17 Apr 2026 22:10:00 GMT",
    lastErrorKind: null,
    lastErrorMessage: null,
    lastErrorAt: null,
    consecutiveFailures: 0,
  },
  {
    id: "feed-empty-holding",
    title: "Archive holding pen",
    siteUrl: "https://archive.example",
    feedUrl: "https://archive.example/empty.xml",
    format: "rss",
    icon: null,
    folderId: null,
    customName: null,
    sortOrder: 40,
    updateInterval: 240,
    cachePolicy: "metadata-only",
    healthStatus: "paused",
    lastCheckedAt: "2026-04-17T18:00:00Z",
    lastSuccessAt: "2026-04-17T18:00:00Z",
    etag: '"archive-holding-paused"',
    lastModified: "Thu, 17 Apr 2026 18:00:00 GMT",
    lastErrorKind: null,
    lastErrorMessage: null,
    lastErrorAt: null,
    consecutiveFailures: 0,
  },
]

const feedTagIdsByFeedId: Record<string, string[]> = {
  "feed-freelyrss": ["tag-product"],
  "feed-rust-systems": ["tag-ops"],
  "feed-query-notes": ["tag-search"],
  "feed-night-audio": ["tag-audio"],
  "feed-empty-holding": [],
}

const tags: TagDto[] = [
  {
    id: "tag-product",
    name: "product",
    scope: "article",
    color: "#7fe2c0",
    createdAt: "2026-04-08T00:00:00Z",
  },
  {
    id: "tag-ops",
    name: "ops",
    scope: "article",
    color: "#8eb6ff",
    createdAt: "2026-04-08T00:00:00Z",
  },
  {
    id: "tag-search",
    name: "search",
    scope: "article",
    color: "#f4b860",
    createdAt: "2026-04-08T00:00:00Z",
  },
  {
    id: "tag-audio",
    name: "audio",
    scope: "article",
    color: "#f38ba8",
    createdAt: "2026-04-08T00:00:00Z",
  },
]

function findTag(tagId: TagDto["id"]) {
  const tag = tags.find((entry) => entry.id === tagId)

  if (!tag) {
    throw new Error(`Unknown tag id: ${tagId}`)
  }

  return tag
}

const articles: ArticleListItemDto[] = [
  {
    id: "article-layout-shell",
    feedId: "feed-freelyrss",
    feedTitle: "FreelyRSS Engineering",
    title: "Turning the desktop shell into a stable three-pane reader skeleton",
    author: "FreelyRSS",
    summary:
      "Step 15 moved the app from a package demo to a reader-shaped shell with separated source, queue, and reading contexts.",
    searchSnippet: null,
    publishedAt: "2026-04-08T08:40:00Z",
    thumbnail: null,
    estimatedReadingMinutes: 6,
    state: {
      articleId: "article-layout-shell",
      readState: "reading",
      starred: true,
      liked: false,
      importance: "high",
      readLater: true,
      readingProgress: 0.46,
      lastOpenedAt: "2026-04-08T09:00:00Z",
    },
    tagIds: ["tag-product", "tag-ops"],
    attachmentCount: 0,
  },
  {
    id: "article-source-context",
    feedId: "feed-rust-systems",
    feedTitle: "Rust Systems Watch",
    title: "Why layout state should stay separate from source and query state",
    author: "Systems Desk",
    summary:
      "Selection and context can live in the shell without turning the shell into the execution layer.",
    searchSnippet: null,
    publishedAt: "2026-04-08T06:15:00Z",
    thumbnail: null,
    estimatedReadingMinutes: 8,
    state: {
      articleId: "article-source-context",
      readState: "unread",
      starred: false,
      liked: true,
      importance: "normal",
      readLater: false,
      readingProgress: 0,
      lastOpenedAt: null,
    },
    tagIds: ["tag-ops"],
    attachmentCount: 0,
  },
  {
    id: "article-query-bridge",
    feedId: "feed-query-notes",
    feedTitle: "Query Notes",
    title: "Shared-query is ready, but the reader shell still needs a clean composition layer",
    author: "Query Notes",
    summary:
      "This placeholder article keeps Step 16 focused on state boundaries before real search and persistence arrive.",
    searchSnippet: null,
    publishedAt: "2026-04-07T22:10:00Z",
    thumbnail: null,
    estimatedReadingMinutes: 9,
    state: {
      articleId: "article-query-bridge",
      readState: "unread",
      starred: false,
      liked: false,
      importance: "normal",
      readLater: true,
      readingProgress: 0,
      lastOpenedAt: null,
    },
    tagIds: ["tag-search"],
    attachmentCount: 1,
  },
  {
    id: "article-midnight-dispatch",
    feedId: "feed-night-audio",
    feedTitle: "Night Audio Digest",
    title: "Midnight dispatch 42: attachment boundaries for podcast feeds",
    author: "Night Audio",
    summary:
      "A JSON Feed episode with a podcast enclosure and companion artwork keeps attachment presentation visible in the reader.",
    searchSnippet: null,
    publishedAt: "2026-04-06T23:20:00Z",
    thumbnail: "https://audio.example/episodes/42/cover.jpg",
    estimatedReadingMinutes: 18,
    state: {
      articleId: "article-midnight-dispatch",
      readState: "unread",
      starred: false,
      liked: true,
      importance: "normal",
      readLater: true,
      readingProgress: 0,
      lastOpenedAt: null,
    },
    tagIds: ["tag-audio"],
    attachmentCount: 2,
  },
  {
    id: "article-window-behavior",
    feedId: "feed-freelyrss",
    feedTitle: "FreelyRSS Engineering",
    title: "Making narrow-window behavior predictable before routing and async data land",
    author: "FreelyRSS",
    summary:
      "Responsive layout rules are part of the shell contract, not a cosmetic afterthought for the future reader.",
    searchSnippet: null,
    publishedAt: "2026-04-07T18:00:00Z",
    thumbnail: null,
    estimatedReadingMinutes: 5,
    state: {
      articleId: "article-window-behavior",
      readState: "read",
      starred: false,
      liked: false,
      importance: "low",
      readLater: false,
      readingProgress: 1,
      lastOpenedAt: "2026-04-08T04:20:00Z",
    },
    tagIds: ["tag-product"],
    attachmentCount: 0,
  },
]

const articleDetails: Record<string, ArticleDetailDto> = {
  "article-layout-shell": {
    article: {
      id: "article-layout-shell",
      feedId: "feed-freelyrss",
      sourceGuid: "layout-shell",
      title: "Turning the desktop shell into a stable three-pane reader skeleton",
      author: "FreelyRSS",
      summary:
        "The shell now reads like an application instead of a package showcase: source context on the left, article queue in the center, reading detail on the right.",
      contentRaw: `<article class="post">
  <header>
    <h1>Turning the desktop shell into a stable three-pane reader skeleton</h1>
    <p class="dek">The shell now reads like an application instead of a package showcase.</p>
  </header>
  <section>
    <p>Route params still carry source and article identity.</p>
    <p>The shell keeps transient queue and reader controls local.</p>
  </section>
</article>`,
      contentExtracted:
        "Step 16 is about state ownership. The current source and selected article should be addressable through navigation, while temporary view filters stay local to the shell.\n\nThat split keeps the interface composable. Routing expresses where the user is. View state expresses how the current queue is being shaped. Async queries express where data is loaded from.\n\nOnce those boundaries are explicit, later data access work can arrive without collapsing everything back into a single component.",
      canonicalUrl: "https://freelyrss.dev/articles/layout-shell",
      originalUrl: "https://freelyrss.dev/articles/layout-shell",
      publishedAt: "2026-04-08T08:40:00Z",
      fetchedAt: "2026-04-08T08:45:00Z",
      language: "en",
      thumbnail: null,
      wordCount: 712,
      contentHash: "sha256:layout-shell",
    },
    feed: {
      id: "feed-freelyrss",
      title: "FreelyRSS Engineering",
      displayTitle: "FreelyRSS Engineering",
      siteUrl: "https://freelyrss.dev",
      icon: null,
    },
    state: articles[0].state,
    tags: [findTag("tag-product"), findTag("tag-ops")],
    attachments: [],
    annotations: [
      {
        id: "annotation-layout-shell",
        articleId: "article-layout-shell",
        type: "note",
        selectedText:
          "current source and selected article should be addressable through navigation",
        anchor: {
          contentMode: "extracted",
          endOffset: 114,
          paragraphIndex: 0,
          startOffset: 38,
        },
        note: "Route search params now own these selections.",
        color: "#8eb6ff",
        createdAt: "2026-04-08T08:49:00Z",
      },
    ],
    aiArtifacts: [],
  },
  "article-source-context": {
    article: {
      id: "article-source-context",
      feedId: "feed-rust-systems",
      sourceGuid: "source-context",
      title: "Why layout state should stay separate from source and query state",
      author: "Systems Desk",
      summary:
        "Selection and context can live in the shell without turning the shell into the execution layer.",
      contentRaw: `<div class="entry-content">
  <p>A common failure mode is to let the first interactive shell absorb every future concern.</p>
  <p>The result is a giant component that owns selection, filtering, fetching, and rendering rules.</p>
  <p>FreelyRSS should resist that pressure early.</p>
</div>`,
      contentExtracted:
        "A common failure mode is to let the first interactive shell absorb every future concern. The result is a giant component that owns source selection, search text, fetching, caching, and rendering rules.\n\nFreelyRSS should resist that. The desktop shell only needs enough local state to prove that the navigation boundary and the view-state boundary are stable.\n\nOnce that line is held, later phases can bring in real storage and query execution without rewriting the surface area the user sees.",
      canonicalUrl: "https://systems.example/articles/source-context",
      originalUrl: "https://systems.example/articles/source-context",
      publishedAt: "2026-04-08T06:15:00Z",
      fetchedAt: "2026-04-08T06:20:00Z",
      language: "en",
      thumbnail: null,
      wordCount: 655,
      contentHash: "sha256:source-context",
    },
    feed: {
      id: "feed-rust-systems",
      title: "Rust Systems Weekly",
      displayTitle: "Rust Systems Watch",
      siteUrl: "https://systems.example",
      icon: null,
    },
    state: articles[1].state,
    tags: [findTag("tag-ops")],
    attachments: [],
    annotations: [],
    aiArtifacts: [],
  },
  "article-query-bridge": {
    article: {
      id: "article-query-bridge",
      feedId: "feed-query-notes",
      sourceGuid: "query-bridge",
      title: "Shared-query is ready, but the reader shell still needs a clean composition layer",
      author: "Query Notes",
      summary:
        "Query semantics are centralized, but Step 16 still stops before real persistence and SQL execution.",
      contentRaw: `<section>
  <p>The shared query package can describe the filter graph before the shell becomes the execution engine.</p>
  <p>This raw body intentionally keeps more structural markup than the extracted view will.</p>
</section>`,
      contentExtracted:
        "The shell can already build a query definition for its local filter controls, but that does not mean it should pretend to be the execution engine yet.\n\nThe important part for this step is that the current filter conditions have a named source and can be inspected independently of the route state.\n\nThat keeps the next persistence step honest: the shell can pass explicit query state down instead of inventing implicit behavior.",
      canonicalUrl: "https://query.example/articles/query-bridge",
      originalUrl: "https://query.example/articles/query-bridge",
      publishedAt: "2026-04-07T22:10:00Z",
      fetchedAt: "2026-04-07T22:15:00Z",
      language: "en",
      thumbnail: null,
      wordCount: 602,
      contentHash: "sha256:query-bridge",
    },
    feed: {
      id: "feed-query-notes",
      title: "Query Notes",
      displayTitle: "Query Notes",
      siteUrl: "https://query.example",
      icon: null,
    },
    state: articles[2].state,
    tags: [findTag("tag-search")],
    attachments: [
      {
        id: "attachment-query-notes",
        articleId: "article-query-bridge",
        type: "file",
        url: "https://query.example/assets/sql-plan.json",
        mimeType: "application/json",
        duration: null,
        size: 2048,
        localCachePath: null,
      },
    ],
    annotations: [],
    aiArtifacts: [],
  },
  "article-window-behavior": {
    article: {
      id: "article-window-behavior",
      feedId: "feed-freelyrss",
      sourceGuid: "window-behavior",
      title: "Making narrow-window behavior predictable before routing and async data land",
      author: "FreelyRSS",
      summary:
        "Responsive behavior is part of the architecture contract, not merely a CSS finish pass.",
      contentRaw: `<article>
  <p>Responsive behavior still matters because route transitions should not destabilize the pane model.</p>
  <p>Empty queues should settle into a valid empty state instead of leaving stale article references behind.</p>
</article>`,
      contentExtracted:
        "Responsive behavior still matters in Step 16 because route transitions should not destabilize the pane model.\n\nIf a source changes to an empty queue, the interface should settle into a valid empty state instead of leaving a stale article reference behind.\n\nThis is the kind of small correction that prevents later routing and database work from inheriting brittle assumptions.",
      canonicalUrl: "https://freelyrss.dev/articles/window-behavior",
      originalUrl: "https://freelyrss.dev/articles/window-behavior",
      publishedAt: "2026-04-07T18:00:00Z",
      fetchedAt: "2026-04-07T18:05:00Z",
      language: "en",
      thumbnail: null,
      wordCount: 430,
      contentHash: "sha256:window-behavior",
    },
    feed: {
      id: "feed-freelyrss",
      title: "FreelyRSS Engineering",
      displayTitle: "FreelyRSS Engineering",
      siteUrl: "https://freelyrss.dev",
      icon: null,
    },
    state: articles[4].state,
    tags: [findTag("tag-product")],
    attachments: [],
    annotations: [],
    aiArtifacts: [],
  },
  "article-midnight-dispatch": {
    article: {
      id: "article-midnight-dispatch",
      feedId: "feed-night-audio",
      sourceGuid: "midnight-dispatch-42",
      title: "Midnight dispatch 42: attachment boundaries for podcast feeds",
      author: "Night Audio",
      summary:
        "The reader can now expose podcast enclosure metadata directly from the article detail shape instead of hiding attachment facts behind queue counts alone.",
      contentRaw: `<article class="episode">
  <header>
    <h1>Midnight dispatch 42: attachment boundaries for podcast feeds</h1>
    <p class="deck">Audio, artwork, and cache metadata now stay visible in the reading panel.</p>
  </header>
  <section>
    <p>This feed item includes an MP3 enclosure plus a cover image attachment.</p>
    <p>The shell still consumes one resolved article detail object instead of inventing a second media-only contract.</p>
  </section>
</article>`,
      contentExtracted:
        "This Night Audio episode exists to make podcast enclosure metadata visible in the reading panel.\n\nThe article detail already carries attachment facts such as type, mime type, duration, size, and cache path. Step 42 turns those facts into a concrete reader surface instead of leaving them buried behind attachment counts.\n\nThat keeps enclosure handling inside the article detail boundary while the feed parser and storage layers continue to own attachment discovery and persistence.",
      canonicalUrl: "https://audio.example/episodes/42",
      originalUrl: "https://audio.example/episodes/42",
      publishedAt: "2026-04-06T23:20:00Z",
      fetchedAt: "2026-04-06T23:25:00Z",
      language: "en",
      thumbnail: "https://audio.example/episodes/42/cover.jpg",
      wordCount: 824,
      contentHash: "sha256:midnight-dispatch-42",
    },
    feed: {
      id: "feed-night-audio",
      title: "Night Audio Digest",
      displayTitle: "Night Audio Digest",
      siteUrl: "https://audio.example",
      icon: "https://audio.example/assets/night-audio.png",
    },
    state: articles[3].state,
    tags: [findTag("tag-audio")],
    attachments: [
      {
        id: "attachment-midnight-dispatch-audio",
        articleId: "article-midnight-dispatch",
        type: "audio",
        url: "https://audio.example/episodes/42/dispatch-42.mp3",
        mimeType: "audio/mpeg",
        duration: 3126,
        size: 15099494,
        localCachePath: "cache/media/night-audio/dispatch-42.mp3",
      },
      {
        id: "attachment-midnight-dispatch-cover",
        articleId: "article-midnight-dispatch",
        type: "image",
        url: "https://audio.example/episodes/42/episode-42-cover.jpg",
        mimeType: "image/jpeg",
        duration: null,
        size: 248231,
        localCachePath: null,
      },
    ],
    annotations: [],
    aiArtifacts: [],
  },
}

const navigationEntries = [
  {
    id: "view-unread",
    title: "Unread desk",
    description: "Route into the cross-source unread queue.",
  },
  {
    id: "view-reading",
    title: "Continue reading",
    description: "Route into the in-progress queue.",
  },
  {
    id: "view-starred",
    title: "Starred focus",
    description: "Route into protected saved articles.",
  },
  {
    id: "feed-empty-holding",
    title: "Archive holding",
    description: "An intentionally empty feed route used to validate fallback behavior.",
  },
] as const

const DENSE_QUEUE_FEED_ID = "feed-queue-lab"
const DENSE_QUEUE_ARTICLE_COUNT = 48
const DEFAULT_READING_PROGRESS = 0.25
const DEFAULT_ANNOTATION_COLORS: Record<CreateReaderAnnotationInput["type"], string> = {
  highlight: "#f4b860",
  note: "#8eb6ff",
}

type MockReaderState = {
  articleDetails: Record<string, ArticleDetailDto>
  articles: ArticleListItemDto[]
  cacheEntries: ReaderCacheInventoryEntry[]
  cacheSettings: ReaderCacheSettings
  feedDetails: FeedDto[]
  feedTagIdsByFeedId: Record<string, string[]>
  folders: FolderDto[]
  latestCacheCleanup: ReaderCacheCleanupReport | null
}

export type MockOpmlImportResult = {
  report: OpmlImportReport
  shellData: ReaderShellData
}

export type MockOpmlExportResult = {
  opmlText: string
  report: OpmlExportReport
}

export type MockMarkdownExportResult = ReaderMarkdownExportResult

export type MockDocumentExportResult = ReaderDocumentExportResult

export type MockBatchOperationResult = {
  batchResult: ReaderBatchOperationResult
  shellData: ReaderShellData
}

export type MockArticleInsightResult = {
  insightResult: ReaderAIInsightResult
  shellData: ReaderShellData
}

export type MockArticleTranslationResult = {
  shellData: ReaderShellData
  translationResult: ReaderAITranslationResult
}

export type MockArticleQuestionResult = {
  questionResult: ReaderAIQuestionResult
  shellData: ReaderShellData
}

const ROOT_SORT_KEY = "__root__"

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim() ?? ""
  return trimmed.length > 0 ? trimmed : null
}

function normalizeFeedUrl(value: string) {
  return value.trim()
}

function getSortKey(parentId: string | null) {
  return parentId ?? ROOT_SORT_KEY
}

function createSortOrderMap(
  items: Array<{ parentId: string | null; sortOrder: number }>,
): Map<string, number> {
  const sortOrderMap = new Map<string, number>()

  for (const item of items) {
    const sortKey = getSortKey(item.parentId)
    const currentValue = sortOrderMap.get(sortKey) ?? 0
    sortOrderMap.set(sortKey, Math.max(currentValue, item.sortOrder))
  }

  return sortOrderMap
}

function takeNextSortOrder(sortOrderMap: Map<string, number>, parentId: string | null) {
  const sortKey = getSortKey(parentId)
  const nextSortOrder = (sortOrderMap.get(sortKey) ?? 0) + 10
  sortOrderMap.set(sortKey, nextSortOrder)
  return nextSortOrder
}

function slugifySegment(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return normalized.length > 0 ? normalized : "item"
}

function createUniqueId(prefix: "feed" | "folder", seed: string, existingIds: Set<string>) {
  const baseId = `${prefix}-${slugifySegment(seed)}`

  if (!existingIds.has(baseId)) {
    existingIds.add(baseId)
    return baseId
  }

  let suffix = 2

  while (existingIds.has(`${baseId}-${suffix}`)) {
    suffix += 1
  }

  const nextId = `${baseId}-${suffix}`
  existingIds.add(nextId)
  return nextId
}

function inferFeedFormat(
  typeAttribute: string | null | undefined,
  feedUrl: string,
): FeedDto["format"] {
  const normalizedType = typeAttribute?.trim().toLowerCase() ?? ""
  const normalizedUrl = feedUrl.toLowerCase()

  if (normalizedType.includes("atom")) {
    return "atom"
  }

  if (normalizedType.includes("json")) {
    return "json-feed"
  }

  if (normalizedUrl.endsWith(".json") || normalizedUrl.includes("jsonfeed")) {
    return "json-feed"
  }

  return "rss"
}

function parseOpmlDocument(opmlText: string) {
  const parser = new DOMParser()
  const document = parser.parseFromString(opmlText, "text/xml")

  if (document.querySelector("parsererror")) {
    throw new Error("OPML could not be parsed as XML.")
  }

  const body = document.querySelector("body")

  if (!body) {
    throw new Error("OPML document is missing a body element.")
  }

  return body
}

function escapeXmlAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

function getChildOutlines(element: Element) {
  return Array.from(element.children).filter((child) => child.tagName.toLowerCase() === "outline")
}

function findFolderByName(
  state: MockReaderState,
  folderName: string,
  parentId: FolderDto["parentId"],
) {
  const normalizedName = folderName.toLowerCase()

  return (
    state.folders.find(
      (folder) =>
        folder.parentId === parentId && folder.name.trim().toLowerCase() === normalizedName,
    ) ?? null
  )
}

function findOrCreateImportedFolder(input: {
  existingFolderIds: Set<string>
  folderName: string
  folderSortOrders: Map<string, number>
  parentId: FolderDto["parentId"]
  state: MockReaderState
}) {
  const existingFolder = findFolderByName(input.state, input.folderName, input.parentId)

  if (existingFolder) {
    return {
      created: false,
      folderId: existingFolder.id,
    }
  }

  const folderId = createUniqueId("folder", input.folderName, input.existingFolderIds)

  input.state.folders.push({
    id: folderId,
    kind: "regular",
    name: input.folderName,
    parentId: input.parentId,
    sortOrder: takeNextSortOrder(input.folderSortOrders, input.parentId),
  })

  return {
    created: true,
    folderId,
  }
}

function cloneValue<T>(value: T): T {
  return structuredClone(value)
}

function clampReadingProgress(value: number) {
  return Math.min(1, Math.max(0, Math.round(value * 100) / 100))
}

function resolveReadStateFromProgress(progress: number): UserStateDto["readState"] {
  if (progress >= 1) {
    return "read"
  }

  if (progress > 0) {
    return "reading"
  }

  return "unread"
}

function normalizeArticleState(
  currentState: UserStateDto,
  input: {
    importance?: UserStateDto["importance"]
    liked?: UserStateDto["liked"]
    readLater?: UserStateDto["readLater"]
    readingProgress?: UserStateDto["readingProgress"]
    readState?: UserStateDto["readState"]
    starred?: UserStateDto["starred"]
  },
): UserStateDto {
  const nextState: UserStateDto = {
    ...currentState,
    articleId: currentState.articleId,
    importance: input.importance ?? currentState.importance,
    liked: input.liked ?? currentState.liked,
    readLater: input.readLater ?? currentState.readLater,
    readState: input.readState ?? currentState.readState,
    readingProgress: currentState.readingProgress,
    starred: input.starred ?? currentState.starred,
  }

  if (typeof input.readingProgress === "number") {
    nextState.readingProgress = clampReadingProgress(input.readingProgress)
    nextState.readState = resolveReadStateFromProgress(nextState.readingProgress)
  } else if (input.readState) {
    switch (input.readState) {
      case "read":
        nextState.readingProgress = 1
        break
      case "unread":
        nextState.readingProgress = 0
        break
      case "reading":
        nextState.readingProgress =
          currentState.readingProgress > 0 && currentState.readingProgress < 1
            ? clampReadingProgress(currentState.readingProgress)
            : DEFAULT_READING_PROGRESS
        break
    }
  }

  if (
    typeof input.readingProgress === "number" ||
    input.readState === "reading" ||
    input.readState === "read"
  ) {
    nextState.lastOpenedAt = new Date().toISOString()
  }

  return nextState
}

function getExtractedParagraphs(content: ArticleDetailDto["article"]["contentExtracted"]) {
  return (
    content
      ?.split("\n\n")
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 0) ?? []
  )
}

function isReaderAnnotationAnchor(
  anchor: unknown,
): anchor is CreateReaderAnnotationInput["anchor"] {
  if (!anchor || typeof anchor !== "object") {
    return false
  }

  const candidate = anchor as Partial<CreateReaderAnnotationInput["anchor"]>

  return (
    candidate.contentMode === "extracted" &&
    Number.isInteger(candidate.paragraphIndex) &&
    Number.isInteger(candidate.startOffset) &&
    Number.isInteger(candidate.endOffset) &&
    (candidate.paragraphIndex ?? -1) >= 0 &&
    (candidate.startOffset ?? -1) >= 0 &&
    (candidate.endOffset ?? -1) > (candidate.startOffset ?? -1)
  )
}

function isHexColor(value: string | null): value is `#${string}` {
  return value ? /^#[\da-f]{6}$/i.test(value) : false
}

function normalizeAnnotationColor(
  type: CreateReaderAnnotationInput["type"],
  color: CreateReaderAnnotationInput["color"],
) {
  const normalizedColor = normalizeOptionalText(color)
  return isHexColor(normalizedColor) ? normalizedColor : DEFAULT_ANNOTATION_COLORS[type]
}

function createAnnotationId(
  articleId: ArticleDetailDto["article"]["id"],
  type: CreateReaderAnnotationInput["type"],
) {
  return `annotation-${slugifySegment(articleId)}-${type}-${Date.now()}`
}

function getFeedDisplayTitle(feed: FeedDto) {
  return feed.customName?.trim() ? feed.customName.trim() : feed.title
}

function buildQuickViewSection(state: MockReaderState) {
  const quickViewRows: SourceRow[] = [
    {
      id: "view-unread",
      kind: "view",
      title: "Unread desk",
      description: "Cross-source unread queue for the main reading session.",
      eyebrow: "view",
      meta: `${state.articles.filter((article) => article.state.readState !== "read").length} articles`,
    },
    {
      id: "view-reading",
      kind: "view",
      title: "Continue reading",
      description: "Articles already in progress, regardless of source.",
      eyebrow: "view",
      meta: `${state.articles.filter((article) => article.state.readState === "reading").length} articles`,
    },
    {
      id: "view-starred",
      kind: "view",
      title: "Starred focus",
      description: "Saved items to protect from cleanup and revisit later.",
      eyebrow: "view",
      meta: `${state.articles.filter((article) => article.state.starred).length} articles`,
    },
  ]

  return {
    title: "Quick views",
    description: "Route-backed navigation entries that do not execute real queries yet.",
    rows: quickViewRows,
  }
}

function buildSmartFolders(state: MockReaderState): SmartFolderDto[] {
  const smartFolders: Array<Omit<SmartFolderDto, "articleCount" | "unreadCount">> = [
    {
      id: "smart-folder-recent-unread",
      name: "Recent unread",
      queryDefinition: serializeQueryDefinition(
        normalizeQueryDefinition(
          buildQueryDefinition({
            clauses: [predicate("readState", "read", "neq"), predicate("feedId", "feed-freelyrss")],
            sort: [{ field: "publishedAt", direction: "desc", nulls: "last" }],
          }),
        ),
      ),
      sortDefinition: null,
    },
    {
      id: "smart-folder-last-7-days-unread",
      name: "Last 7 days unread",
      queryDefinition: serializeQueryDefinition({
        version: 1,
        root: {
          kind: "group",
          match: "all",
          children: [
            { kind: "predicate", field: "readState", operator: "neq", value: "read" },
            {
              kind: "predicate",
              field: "publishedAt",
              operator: "gte",
              value: "2026-04-11T00:00:00Z",
            },
          ],
        },
        sort: [{ field: "publishedAt", direction: "desc", nulls: "last" }],
      }),
      sortDefinition: null,
    },
  ]

  return smartFolders.map((folder) => {
    const matchingArticles = state.articles.filter((article) => {
      if (folder.id === "smart-folder-recent-unread") {
        return article.feedId === "feed-freelyrss" && article.state.readState !== "read"
      }

      return (
        article.state.readState !== "read" &&
        article.publishedAt !== null &&
        Date.parse(article.publishedAt) >= Date.parse("2026-04-11T00:00:00Z")
      )
    })

    return {
      ...folder,
      articleCount: matchingArticles.length,
      unreadCount: matchingArticles.filter((article) => article.state.readState === "unread")
        .length,
    }
  })
}

function buildFeedSummaries(state: MockReaderState): FeedSummaryDto[] {
  return state.feedDetails
    .slice()
    .sort(
      (left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title),
    )
    .map((feed) => {
      const relatedArticles = state.articles.filter((article) => article.feedId === feed.id)

      return {
        id: feed.id,
        title: feed.title,
        displayTitle: getFeedDisplayTitle(feed),
        siteUrl: feed.siteUrl,
        icon: feed.icon,
        folderId: feed.folderId,
        healthStatus: feed.healthStatus,
        lastErrorKind: feed.lastErrorKind,
        lastErrorMessage: feed.lastErrorMessage,
        consecutiveFailures: feed.consecutiveFailures,
        unreadCount: relatedArticles.filter((article) => article.state.readState !== "read").length,
        totalCount: relatedArticles.length,
        tagIds: cloneValue(state.feedTagIdsByFeedId[feed.id] ?? []),
      }
    })
}

function buildSubscriptionTree(
  state: MockReaderState,
  feeds: FeedSummaryDto[],
): SubscriptionTreeNodeDto[] {
  const folderNodes = state.folders
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name))
    .map<SubscriptionTreeNodeDto>((folder) => ({
      nodeType: "folder",
      folder,
      childFolderIds: state.folders
        .filter((entry) => entry.parentId === folder.id)
        .slice()
        .sort(
          (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
        )
        .map((entry) => entry.id),
      feedIds: feeds
        .filter((feed) => feed.folderId === folder.id)
        .slice()
        .sort((left, right) => left.displayTitle.localeCompare(right.displayTitle))
        .map((feed) => feed.id),
    }))

  return [
    ...folderNodes,
    ...feeds.map<SubscriptionTreeNodeDto>((feed) => ({
      nodeType: "feed",
      feed,
    })),
  ]
}

function createEmptyMockReaderState(): MockReaderState {
  return {
    articleDetails: {},
    articles: [],
    cacheEntries: [],
    cacheSettings: cloneValue(initialCacheSettings),
    feedDetails: [],
    feedTagIdsByFeedId: {},
    folders: [],
    latestCacheCleanup: null,
  }
}

function padDenseQueueArticleNumber(index: number) {
  return String(index).padStart(2, "0")
}

function createDenseQueueFeed(): FeedDto {
  return {
    id: DENSE_QUEUE_FEED_ID,
    title: "Queue Virtualization Lab",
    siteUrl: "https://queue.example",
    feedUrl: "https://queue.example/feed.xml",
    format: "rss",
    icon: null,
    folderId: "folder-research",
    customName: null,
    sortOrder: 20,
    updateInterval: 30,
    cachePolicy: "content",
    healthStatus: "healthy",
    lastCheckedAt: "2026-04-21T08:20:00Z",
    lastSuccessAt: "2026-04-21T08:20:00Z",
    etag: '"queue-virtualization-lab"',
    lastModified: "Tue, 21 Apr 2026 08:18:00 GMT",
    lastErrorKind: null,
    lastErrorMessage: null,
    lastErrorAt: null,
    consecutiveFailures: 0,
  }
}

function createDenseQueueFixtures(feed: FeedDto) {
  const generatedArticles: ArticleListItemDto[] = []
  const generatedDetails: Record<string, ArticleDetailDto> = {}

  for (let index = 1; index <= DENSE_QUEUE_ARTICLE_COUNT; index += 1) {
    const paddedIndex = padDenseQueueArticleNumber(index)
    const articleId = `article-queue-window-${paddedIndex}`
    const publishedAt = new Date(
      Date.UTC(2026, 3, 21, 8, 0, 0) - (index - 1) * 45 * 60 * 1000,
    ).toISOString()
    const title = `Queue window article ${paddedIndex}`
    const state: ArticleListItemDto["state"] = {
      articleId,
      readState: index % 7 === 0 ? "read" : index % 5 === 0 ? "reading" : "unread",
      starred: index % 9 === 0,
      liked: index % 6 === 0,
      importance: index % 8 === 0 ? "high" : index % 3 === 0 ? "low" : "normal",
      readLater: index % 4 === 0,
      readingProgress: index % 5 === 0 ? 0.28 : index % 7 === 0 ? 1 : 0,
      lastOpenedAt: index % 5 === 0 ? publishedAt : null,
    }

    generatedArticles.push({
      id: articleId,
      feedId: feed.id,
      feedTitle: feed.title,
      title,
      author: "Queue Systems Desk",
      summary: `Virtualization sample ${paddedIndex} keeps the middle pane focused on a render window instead of mounting the full queue.`,
      searchSnippet: null,
      publishedAt,
      thumbnail: null,
      estimatedReadingMinutes: 4 + (index % 5),
      state,
      tagIds: ["tag-product"],
      attachmentCount: index % 6 === 0 ? 1 : 0,
    })

    generatedDetails[articleId] = {
      article: {
        id: articleId,
        feedId: feed.id,
        sourceGuid: `queue-window-${paddedIndex}`,
        title,
        author: "Queue Systems Desk",
        summary: `Virtualization sample ${paddedIndex} keeps the queue efficient without changing the route-backed query contract.`,
        contentRaw: null,
        contentExtracted: `This Step 38 fixture exists to prove that long queues should render through a bounded window.\n\nArticle ${paddedIndex} remains query-visible, but the desktop shell should only mount the rows near the current scroll offset.\n\nThat keeps queue rendering separate from query composition and durable storage concerns.`,
        canonicalUrl: `https://queue.example/articles/${paddedIndex}`,
        originalUrl: `https://queue.example/articles/${paddedIndex}`,
        publishedAt,
        fetchedAt: publishedAt,
        language: "en",
        thumbnail: null,
        wordCount: 540 + index * 3,
        contentHash: `sha256:queue-window-${paddedIndex}`,
      },
      feed: {
        id: feed.id,
        title: feed.title,
        displayTitle: getFeedDisplayTitle(feed),
        siteUrl: feed.siteUrl,
        icon: feed.icon,
      },
      state,
      tags: [findTag("tag-product")],
      attachments:
        index % 6 === 0
          ? [
              {
                id: `attachment-queue-window-${paddedIndex}`,
                articleId,
                type: "file",
                url: `https://queue.example/assets/${paddedIndex}.json`,
                mimeType: "application/json",
                duration: null,
                size: 1024 + index,
                localCachePath: null,
              },
            ]
          : [],
      annotations: [],
      aiArtifacts: [],
    }
  }

  return {
    articleDetails: generatedDetails,
    articles: generatedArticles,
  }
}

function getSortedFolders(state: MockReaderState, parentId: FolderDto["parentId"]) {
  return state.folders
    .filter((folder) => folder.parentId === parentId)
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name))
}

function getSortedFeeds(state: MockReaderState, folderId: FeedDto["folderId"]) {
  return state.feedDetails
    .filter((feed) => feed.folderId === folderId)
    .slice()
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder ||
        getFeedDisplayTitle(left).localeCompare(getFeedDisplayTitle(right)),
    )
}

function hasExportableDescendantFeed(state: MockReaderState, folderId: FolderDto["id"]): boolean {
  if (getSortedFeeds(state, folderId).length > 0) {
    return true
  }

  return getSortedFolders(state, folderId).some((folder) =>
    hasExportableDescendantFeed(state, folder.id),
  )
}

function buildOutlineAttributes(attributes: Array<[string, string | null]>) {
  return attributes
    .filter((entry): entry is [string, string] => entry[1] !== null)
    .map(([key, value]) => `${key}="${escapeXmlAttribute(value)}"`)
    .join(" ")
}

function formatOpmlFeedType(format: FeedDto["format"]) {
  if (format === "json-feed") {
    return "json"
  }

  return format
}

function buildFeedOutline(feed: FeedDto, indentLevel: number) {
  const indent = "  ".repeat(indentLevel)
  const attributes = buildOutlineAttributes([
    ["text", getFeedDisplayTitle(feed)],
    ["title", feed.title],
    ["type", formatOpmlFeedType(feed.format)],
    ["xmlUrl", feed.feedUrl],
    ["htmlUrl", feed.siteUrl],
  ])

  return `${indent}<outline ${attributes} />`
}

function buildFolderOutline(
  state: MockReaderState,
  folder: FolderDto,
  indentLevel: number,
  report: OpmlExportReport,
): string | null {
  const childFolderOutlines = getSortedFolders(state, folder.id)
    .map((childFolder) => buildFolderOutline(state, childFolder, indentLevel + 1, report))
    .filter((outline): outline is string => outline !== null)
  const childFeedOutlines = getSortedFeeds(state, folder.id).map((feed) =>
    buildFeedOutline(feed, indentLevel + 1),
  )

  if (childFolderOutlines.length === 0 && childFeedOutlines.length === 0) {
    return null
  }

  report.exportedFolderCount += 1

  const indent = "  ".repeat(indentLevel)
  const attributes = buildOutlineAttributes([
    ["text", folder.name],
    ["title", folder.name],
  ])
  const children = [...childFolderOutlines, ...childFeedOutlines].join("\n")

  return `${indent}<outline ${attributes}>\n${children}\n${indent}</outline>`
}

function buildOpmlDocument(state: MockReaderState): MockOpmlExportResult {
  const report: OpmlExportReport = {
    exportedFeedCount: state.feedDetails.length,
    exportedFolderCount: 0,
    generatedAt: new Date().toISOString(),
  }
  const bodyLines = [
    ...getSortedFolders(state, null)
      .filter((folder) => hasExportableDescendantFeed(state, folder.id))
      .map((folder) => buildFolderOutline(state, folder, 2, report))
      .filter((outline): outline is string => outline !== null),
    ...getSortedFeeds(state, null).map((feed) => buildFeedOutline(feed, 2)),
  ]
  const headTitle = `FreelyRSS subscriptions (${report.exportedFeedCount} feeds)`
  const opmlText = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>${escapeXmlAttribute(headTitle)}</title>
    <dateCreated>${escapeXmlAttribute(report.generatedAt)}</dateCreated>
  </head>
  <body>
${bodyLines.join("\n")}
  </body>
</opml>`

  return {
    opmlText,
    report,
  }
}

function buildCacheStatus(state: MockReaderState) {
  const summary = summarizeReaderCache({
    articleDetails: state.articleDetails,
    articles: state.articles,
    cacheSettings: state.cacheSettings,
    entries: state.cacheEntries,
    feedDetails: state.feedDetails,
  })

  return {
    ...summary,
    latestCleanup: cloneValue(state.latestCacheCleanup),
  }
}

function buildReaderShellSnapshot(state: MockReaderState): ReaderShellData {
  const feeds = buildFeedSummaries(state)
  const quickViewSection = buildQuickViewSection(state)
  const smartFolders = buildSmartFolders(state)
  const subscriptionTree = buildSubscriptionTree(state, feeds)

  return {
    articleDetails: cloneValue(state.articleDetails),
    articles: cloneValue(state.articles),
    cacheStatus: buildCacheStatus(state),
    cacheSettings: cloneValue(state.cacheSettings),
    feedDetails: Object.fromEntries(
      state.feedDetails.map((feed) => [feed.id, cloneValue(feed)]),
    ) as Record<string, FeedDto>,
    feeds,
    folders: cloneValue(state.folders),
    navigationEntries: navigationEntries.map((entry) => ({ ...entry })),
    quickViewSection,
    smartFolders,
    subscriptionTree,
    tags: cloneValue(tags),
    stats: {
      feedCount: feeds.length,
      readingCount: state.articles.filter((article) => article.state.readState === "reading")
        .length,
      sourceCount: quickViewSection.rows.length + smartFolders.length + subscriptionTree.length,
    },
  }
}

function createInitialMockReaderState(): MockReaderState {
  return {
    articleDetails: cloneValue(articleDetails),
    articles: cloneValue(articles),
    cacheEntries: cloneValue(initialCacheEntries),
    cacheSettings: cloneValue(initialCacheSettings),
    feedDetails: cloneValue(feedDetails),
    feedTagIdsByFeedId: cloneValue(feedTagIdsByFeedId),
    folders: cloneValue(folders),
    latestCacheCleanup: null,
  }
}

function createDenseQueueMockReaderState(): MockReaderState {
  const baseState = createInitialMockReaderState()
  const denseQueueFeed = createDenseQueueFeed()
  const denseQueueFixtures = createDenseQueueFixtures(denseQueueFeed)

  baseState.feedDetails.push(denseQueueFeed)
  baseState.feedTagIdsByFeedId[denseQueueFeed.id] = ["tag-product"]
  baseState.articles = [...denseQueueFixtures.articles, ...baseState.articles]
  baseState.articleDetails = {
    ...baseState.articleDetails,
    ...denseQueueFixtures.articleDetails,
  }

  return baseState
}

function findFeedOrThrow(feedId: FeedDto["id"]) {
  const feed = mockReaderState.feedDetails.find((entry) => entry.id === feedId)

  if (!feed) {
    throw new Error(`Unknown feed id: ${feedId}`)
  }

  return feed
}

function findArticleStateOrThrow(articleId: ArticleListItemDto["id"]) {
  const article = mockReaderState.articles.find((entry) => entry.id === articleId)

  if (!article) {
    throw new Error(`Unknown article id: ${articleId}`)
  }

  return article.state
}

function findArticleDetailOrThrow(articleId: ArticleDetailDto["article"]["id"]) {
  const detail = mockReaderState.articleDetails[articleId]

  if (!detail) {
    throw new Error(`Unknown article detail id: ${articleId}`)
  }

  return detail
}

function replaceFeed(nextFeed: FeedDto) {
  mockReaderState.feedDetails = mockReaderState.feedDetails.map((feed) =>
    feed.id === nextFeed.id ? nextFeed : feed,
  )
}

function replaceArticleState(nextState: UserStateDto) {
  let articleFound = false
  let detailFound = false

  mockReaderState.articles = mockReaderState.articles.map((article) => {
    if (article.id !== nextState.articleId) {
      return article
    }

    articleFound = true
    return {
      ...article,
      state: cloneValue(nextState),
    }
  })

  mockReaderState.articleDetails = Object.fromEntries(
    Object.entries(mockReaderState.articleDetails).map(([articleId, detail]) => {
      if (articleId !== nextState.articleId) {
        return [articleId, detail]
      }

      detailFound = true
      return [
        articleId,
        {
          ...detail,
          state: cloneValue(nextState),
        },
      ]
    }),
  )

  if (!articleFound || !detailFound) {
    throw new Error(
      `Article state could not be synchronized for article id: ${nextState.articleId}`,
    )
  }
}

function replaceArticleAnnotations(
  articleId: ArticleDetailDto["article"]["id"],
  nextAnnotations: AnnotationDto[],
) {
  const detail = findArticleDetailOrThrow(articleId)

  mockReaderState.articleDetails = {
    ...mockReaderState.articleDetails,
    [articleId]: {
      ...detail,
      annotations: cloneValue(nextAnnotations),
    },
  }
}

function replaceArticleAIArtifacts(
  articleId: ArticleDetailDto["article"]["id"],
  nextArtifacts: AIArtifactDto[],
) {
  const detail = findArticleDetailOrThrow(articleId)

  mockReaderState.articleDetails = {
    ...mockReaderState.articleDetails,
    [articleId]: {
      ...detail,
      aiArtifacts: cloneValue(nextArtifacts),
    },
  }
}

function buildMockAIArtifact(input: {
  articleId: ArticleDetailDto["article"]["id"]
  createdAt: string
  kind: AIArtifactDto["kind"]
  result: AIArtifactDto["result"]
  suffix?: string
}): AIArtifactDto {
  const fingerprint = JSON.stringify(input.result).length
  const suffix = input.suffix ? `-${input.suffix}` : ""

  return {
    id: `ai-artifact-${input.kind}-${input.articleId}${suffix}`,
    articleId: input.articleId,
    kind: input.kind,
    provider: "freelyrss.ai.mock.local",
    inputHash: `mock:${input.kind}:${input.articleId}:${fingerprint}${suffix}`,
    result: input.result,
    createdAt: input.createdAt,
  }
}

function buildMockSummaryText(detail: ArticleDetailDto) {
  const source =
    detail.article.summary ??
    detail.article.contentExtracted ??
    detail.article.contentRaw ??
    detail.article.title
  const normalized = source.replace(/\s+/g, " ").trim()
  const excerpt = normalized.slice(0, 180)

  return `Mock summary for ${detail.article.id}: ${excerpt}`
}

function extractMockKeywords(content: string, limit: number) {
  const keywords: string[] = []

  for (const token of content.split(/\s+/)) {
    const normalized = token.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, "").toLowerCase()

    if (normalized.length < 4 || keywords.includes(normalized)) {
      continue
    }

    keywords.push(normalized)

    if (keywords.length >= limit) {
      break
    }
  }

  return keywords
}

function buildArticlePlainText(detail: ArticleDetailDto) {
  return (
    detail.article.contentExtracted ??
    detail.article.contentRaw ??
    detail.article.summary ??
    detail.article.title
  ).trim()
}

function buildMockTranslationText(text: string, targetLanguage: string) {
  return `[${targetLanguage}] ${text.trim()}`
}

function normalizeQuestionContextScope(scope: ReaderAIQuestionContextScope) {
  switch (scope) {
    case "currentFeed":
      return "current-feed"
    case "currentSearchResult":
      return "current-search-result"
    default:
      return "current-article"
  }
}

function resolveMockQuestionContexts(input: {
  allowedArticleIds: ArticleDetailDto["article"]["id"][]
  articleId: ArticleDetailDto["article"]["id"]
  contextScope: ReaderAIQuestionContextScope
}) {
  const activeDetail = findArticleDetailOrThrow(input.articleId)
  const scope = normalizeQuestionContextScope(input.contextScope)

  if (input.contextScope === "currentArticle") {
    return [
      {
        id: activeDetail.article.id,
        title: activeDetail.article.title,
        content: buildArticlePlainText(activeDetail),
        scope,
      },
    ]
  }

  const allowedIds =
    input.contextScope === "currentFeed"
      ? mockReaderState.articles
          .filter((article) => article.feedId === activeDetail.article.feedId)
          .map((article) => article.id)
      : input.allowedArticleIds

  const contexts = allowedIds
    .map((articleId) => {
      const detail = mockReaderState.articleDetails[articleId]

      if (!detail) {
        return null
      }

      return {
        id: detail.article.id,
        title: detail.article.title,
        content: buildArticlePlainText(detail),
        scope,
      }
    })
    .filter((context): context is NonNullable<typeof context> => Boolean(context))
    .slice(0, 6)

  if (contexts.length === 0) {
    throw new Error("The selected AI question scope has no approved article context.")
  }

  return contexts
}

function createQuestionSuffix(scope: ReaderAIQuestionContextScope, question: string) {
  return `${scope}-${question
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 40)}`
}

function clearAttachmentCachePaths(attachmentIds: Set<string>) {
  if (attachmentIds.size === 0) {
    return
  }

  mockReaderState.articleDetails = Object.fromEntries(
    Object.entries(mockReaderState.articleDetails).map(([articleId, detail]) => [
      articleId,
      {
        ...detail,
        attachments: detail.attachments.map((attachment) =>
          attachmentIds.has(attachment.id) ? { ...attachment, localCachePath: null } : attachment,
        ),
      },
    ]),
  )
}

function syncFeedPresentation(nextFeed: FeedDto) {
  const displayTitle = getFeedDisplayTitle(nextFeed)

  mockReaderState.articles = mockReaderState.articles.map((article) =>
    article.feedId === nextFeed.id ? { ...article, feedTitle: displayTitle } : article,
  )

  mockReaderState.articleDetails = Object.fromEntries(
    Object.entries(mockReaderState.articleDetails).map(([articleId, detail]) => [
      articleId,
      detail.feed.id === nextFeed.id
        ? {
            ...detail,
            feed: {
              ...detail.feed,
              title: nextFeed.title,
              displayTitle,
              siteUrl: nextFeed.siteUrl,
              icon: nextFeed.icon,
            },
          }
        : detail,
    ]),
  )
}

let mockReaderState = createInitialMockReaderState()

export function resetMockReaderShellState(options?: {
  mode?: "default" | "dense-queue" | "empty"
}) {
  switch (options?.mode) {
    case "dense-queue":
      mockReaderState = createDenseQueueMockReaderState()
      break
    case "empty":
      mockReaderState = createEmptyMockReaderState()
      break
    default:
      mockReaderState = createInitialMockReaderState()
      break
  }
}

export async function fetchReaderShellData(): Promise<ReaderShellData> {
  return buildReaderShellSnapshot(mockReaderState)
}

export async function updateMockFeed(input: {
  cachePolicy: FeedDto["cachePolicy"]
  customName: string | null
  feedId: FeedDto["id"]
  icon: string | null
  title: string
  updateInterval: number | null
}): Promise<ReaderShellData> {
  const currentFeed = findFeedOrThrow(input.feedId)
  const normalizedTitle = input.title.trim()

  if (normalizedTitle.length === 0) {
    throw new Error("Source title cannot be empty.")
  }

  const nextFeed: FeedDto = {
    ...currentFeed,
    cachePolicy: input.cachePolicy,
    title: normalizedTitle,
    customName: input.customName,
    updateInterval: input.updateInterval,
    icon: input.icon,
  }

  replaceFeed(nextFeed)
  syncFeedPresentation(nextFeed)

  return buildReaderShellSnapshot(mockReaderState)
}

export async function updateMockCacheSettings(
  settings: ReaderCacheSettings,
): Promise<ReaderShellData> {
  mockReaderState.cacheSettings = cloneValue(settings)

  return buildReaderShellSnapshot(mockReaderState)
}

export async function runMockCacheCleanup(): Promise<ReaderShellData> {
  const cleanupPlan = planReaderCacheCleanup({
    articleDetails: mockReaderState.articleDetails,
    articles: mockReaderState.articles,
    cacheSettings: mockReaderState.cacheSettings,
    entries: mockReaderState.cacheEntries,
    feedDetails: mockReaderState.feedDetails,
  })
  const evictedEntryIds = new Set(cleanupPlan.evictedEntries.map((entry) => entry.id))
  const evictedAttachmentIds = new Set(
    cleanupPlan.evictedEntries
      .map((entry) => entry.attachmentId)
      .filter((attachmentId): attachmentId is string => attachmentId !== null),
  )

  mockReaderState.cacheEntries = mockReaderState.cacheEntries.filter(
    (entry) => !evictedEntryIds.has(entry.id),
  )
  clearAttachmentCachePaths(evictedAttachmentIds)
  mockReaderState.latestCacheCleanup = cloneValue(cleanupPlan.report)

  return buildReaderShellSnapshot(mockReaderState)
}

export async function refreshMockFeed(feedId: FeedDto["id"]): Promise<ReaderShellData> {
  const currentFeed = findFeedOrThrow(feedId)
  const now = new Date().toISOString()

  if (currentFeed.id === "feed-empty-holding") {
    throw new Error(
      "Archive holding pen refresh failed because the source returned no feed items. Check the feed URL or keep the source paused before retrying.",
    )
  }

  const nextFeed: FeedDto = {
    ...currentFeed,
    healthStatus: "healthy",
    lastCheckedAt: now,
    lastSuccessAt: now,
    lastModified: now,
    etag: `mock-${feedId}-${Date.now()}`,
    lastErrorKind: null,
    lastErrorMessage: null,
    lastErrorAt: null,
    consecutiveFailures: 0,
  }

  replaceFeed(nextFeed)

  return buildReaderShellSnapshot(mockReaderState)
}

export async function updateMockArticleState(input: {
  articleId: ArticleListItemDto["id"]
  importance?: UserStateDto["importance"]
  liked?: UserStateDto["liked"]
  readLater?: UserStateDto["readLater"]
  readingProgress?: UserStateDto["readingProgress"]
  readState?: UserStateDto["readState"]
  starred?: UserStateDto["starred"]
}): Promise<ReaderShellData> {
  const currentState = findArticleStateOrThrow(input.articleId)
  const nextState = normalizeArticleState(currentState, input)

  replaceArticleState(nextState)

  return buildReaderShellSnapshot(mockReaderState)
}

export async function runMockBatchOperation(
  input: ReaderBatchOperationInput,
): Promise<MockBatchOperationResult> {
  const update = applyReaderBatchOperation(
    {
      articleDetails: mockReaderState.articleDetails,
      articles: mockReaderState.articles,
      cacheEntries: mockReaderState.cacheEntries,
      tags,
    },
    input,
  )

  mockReaderState.articles = update.articles
  mockReaderState.articleDetails = update.articleDetails
  mockReaderState.cacheEntries = update.cacheEntries

  return {
    batchResult: update.result,
    shellData: buildReaderShellSnapshot(mockReaderState),
  }
}

export async function createMockAnnotation(
  input: CreateReaderAnnotationInput,
): Promise<ReaderShellData> {
  const detail = findArticleDetailOrThrow(input.articleId)
  const selectedText = input.selectedText.trim()

  if (selectedText.length === 0) {
    throw new Error("Select extracted article text before creating an annotation.")
  }

  if (!isReaderAnnotationAnchor(input.anchor)) {
    throw new Error("Annotation anchors must target one extracted paragraph with valid offsets.")
  }

  const paragraphs = getExtractedParagraphs(detail.article.contentExtracted)
  const paragraphText = paragraphs[input.anchor.paragraphIndex]

  if (!paragraphText) {
    throw new Error("The selected paragraph is no longer available for this article.")
  }

  if (input.anchor.endOffset > paragraphText.length) {
    throw new Error("The selected text range falls outside the current extracted paragraph.")
  }

  const anchoredText = paragraphText.slice(input.anchor.startOffset, input.anchor.endOffset)

  if (anchoredText !== selectedText) {
    throw new Error("The selected text no longer matches the current extracted article body.")
  }

  const note = normalizeOptionalText(input.note)

  if (input.type === "note" && !note) {
    throw new Error("Notes require text in the annotation note field.")
  }

  const nextAnnotation: AnnotationDto = {
    id: createAnnotationId(input.articleId, input.type),
    articleId: input.articleId,
    type: input.type,
    selectedText,
    anchor: cloneValue(input.anchor),
    note,
    color: normalizeAnnotationColor(input.type, input.color),
    createdAt: new Date().toISOString(),
  }

  replaceArticleAnnotations(input.articleId, [...detail.annotations, nextAnnotation])

  return buildReaderShellSnapshot(mockReaderState)
}

export async function generateMockArticleInsights(
  articleId: ArticleDetailDto["article"]["id"],
): Promise<MockArticleInsightResult> {
  const detail = findArticleDetailOrThrow(articleId)
  const existingSummary = detail.aiArtifacts.find((artifact) => artifact.kind === "summary")
  const existingKeywords = detail.aiArtifacts.find((artifact) => artifact.kind === "keywords")
  const now = new Date().toISOString()
  const content = [
    detail.article.title,
    detail.article.summary ?? "",
    detail.article.contentExtracted ?? detail.article.contentRaw ?? "",
  ]
    .join(" ")
    .trim()
  const summaryArtifact =
    existingSummary ??
    buildMockAIArtifact({
      articleId,
      createdAt: now,
      kind: "summary",
      result: {
        kind: "summary",
        text: buildMockSummaryText(detail),
      },
    })
  const keywordArtifact =
    existingKeywords ??
    buildMockAIArtifact({
      articleId,
      createdAt: now,
      kind: "keywords",
      result: {
        kind: "keywords",
        keywords: extractMockKeywords(content, 6),
      },
    })
  const otherArtifacts = detail.aiArtifacts.filter(
    (artifact) => artifact.kind !== "summary" && artifact.kind !== "keywords",
  )
  const nextArtifacts = [summaryArtifact, keywordArtifact, ...otherArtifacts]

  replaceArticleAIArtifacts(articleId, nextArtifacts)

  return {
    insightResult: {
      artifacts: cloneValue([summaryArtifact, keywordArtifact]),
      summaryFromCache: Boolean(existingSummary),
      keywordsFromCache: Boolean(existingKeywords),
    },
    shellData: buildReaderShellSnapshot(mockReaderState),
  }
}

export async function generateMockArticleTranslation(input: {
  articleId: ArticleDetailDto["article"]["id"]
  mode: ReaderAITranslationMode
  selectedText?: string | null
  targetLanguage: string
}): Promise<MockArticleTranslationResult> {
  const detail = findArticleDetailOrThrow(input.articleId)
  const now = new Date().toISOString()
  const sourceText =
    input.mode === "selection" && input.selectedText?.trim()
      ? input.selectedText.trim()
      : buildArticlePlainText(detail)

  if (sourceText.length === 0) {
    throw new Error("The selected article has no text available for translation.")
  }

  const targetLanguage = input.targetLanguage.trim() || "zh-Hans"
  const existingTranslation = detail.aiArtifacts.find(
    (artifact) =>
      artifact.kind === "translation" &&
      artifact.result &&
      typeof artifact.result === "object" &&
      !Array.isArray(artifact.result) &&
      artifact.result.text === buildMockTranslationText(sourceText, targetLanguage),
  )
  const translationArtifact =
    existingTranslation ??
    buildMockAIArtifact({
      articleId: input.articleId,
      createdAt: now,
      kind: "translation",
      suffix: `${input.mode}-${targetLanguage}`,
      result: {
        kind: "translation",
        mode: input.mode,
        text: buildMockTranslationText(sourceText, targetLanguage),
        targetLanguage,
      },
    })
  const nextArtifacts = [
    translationArtifact,
    ...detail.aiArtifacts.filter((artifact) => artifact.id !== translationArtifact.id),
  ]

  replaceArticleAIArtifacts(input.articleId, nextArtifacts)

  return {
    translationResult: {
      artifact: cloneValue(translationArtifact),
      fromCache: Boolean(existingTranslation),
    },
    shellData: buildReaderShellSnapshot(mockReaderState),
  }
}

export async function answerMockArticleQuestion(input: {
  allowedArticleIds: ArticleDetailDto["article"]["id"][]
  articleId: ArticleDetailDto["article"]["id"]
  contextScope: ReaderAIQuestionContextScope
  question: string
}): Promise<MockArticleQuestionResult> {
  const detail = findArticleDetailOrThrow(input.articleId)
  const question = input.question.trim()

  if (question.length === 0) {
    throw new Error("Enter a question before asking the article context.")
  }

  const contexts = resolveMockQuestionContexts(input)
  const citedContextIds = contexts.map((context) => context.id)
  const contextScope = normalizeQuestionContextScope(input.contextScope)
  const existingAnswer = detail.aiArtifacts.find(
    (artifact) =>
      artifact.kind === "question-answer" &&
      artifact.result &&
      typeof artifact.result === "object" &&
      !Array.isArray(artifact.result) &&
      artifact.result.question === question &&
      artifact.result.contextScope === contextScope,
  )
  const answerArtifact =
    existingAnswer ??
    buildMockAIArtifact({
      articleId: input.articleId,
      createdAt: new Date().toISOString(),
      kind: "question-answer",
      suffix: createQuestionSuffix(input.contextScope, question),
      result: {
        kind: "question-answer",
        question,
        contextScope,
        citedContextIds,
        text: `Mock answer using ${contexts.length} context item(s): ${question}`,
      },
    })
  const nextArtifacts = [
    answerArtifact,
    ...detail.aiArtifacts.filter((artifact) => artifact.id !== answerArtifact.id),
  ]

  replaceArticleAIArtifacts(input.articleId, nextArtifacts)

  return {
    questionResult: {
      artifact: cloneValue(answerArtifact),
      citedContextIds,
      contextScope,
      fromCache: Boolean(existingAnswer),
    },
    shellData: buildReaderShellSnapshot(mockReaderState),
  }
}

export async function deleteMockArticleAiCache(
  articleId: ArticleDetailDto["article"]["id"],
): Promise<{
  cacheDeleteResult: ReaderAICacheDeleteResult
  shellData: ReaderShellData
}> {
  const detail = findArticleDetailOrThrow(articleId)
  const deletedArtifactCount = detail.aiArtifacts.length

  replaceArticleAIArtifacts(articleId, [])

  return {
    cacheDeleteResult: {
      articleId,
      deletedArtifactCount,
    },
    shellData: buildReaderShellSnapshot(mockReaderState),
  }
}

export async function importMockOpml(opmlText: string): Promise<MockOpmlImportResult> {
  const body = parseOpmlDocument(opmlText)
  const report: OpmlImportReport = {
    createdFeedCount: 0,
    createdFolderCount: 0,
    duplicateFeedCount: 0,
  }
  const knownFeedUrls = new Set(
    mockReaderState.feedDetails.map((feed) => normalizeFeedUrl(feed.feedUrl)),
  )
  const existingFeedIds = new Set(mockReaderState.feedDetails.map((feed) => feed.id))
  const existingFolderIds = new Set(mockReaderState.folders.map((folder) => folder.id))
  const folderSortOrders = createSortOrderMap(
    mockReaderState.folders.map((folder) => ({
      parentId: folder.parentId,
      sortOrder: folder.sortOrder,
    })),
  )
  const feedSortOrders = createSortOrderMap(
    mockReaderState.feedDetails.map((feed) => ({
      parentId: feed.folderId,
      sortOrder: feed.sortOrder,
    })),
  )

  const importOutline = (outline: Element, resolveParentId: () => FolderDto["parentId"]) => {
    const feedUrl = normalizeOptionalText(outline.getAttribute("xmlUrl"))

    if (feedUrl) {
      const normalizedFeedUrl = normalizeFeedUrl(feedUrl)

      if (knownFeedUrls.has(normalizedFeedUrl)) {
        report.duplicateFeedCount += 1
        return
      }

      const title =
        normalizeOptionalText(outline.getAttribute("title")) ??
        normalizeOptionalText(outline.getAttribute("text")) ??
        normalizedFeedUrl
      const parentId = resolveParentId()
      const feedId = createUniqueId("feed", title, existingFeedIds)

      mockReaderState.feedDetails.push({
        id: feedId,
        title,
        siteUrl: normalizeOptionalText(outline.getAttribute("htmlUrl")),
        feedUrl: normalizedFeedUrl,
        format: inferFeedFormat(outline.getAttribute("type"), normalizedFeedUrl),
        icon: null,
        folderId: parentId,
        customName: null,
        sortOrder: takeNextSortOrder(feedSortOrders, parentId),
        updateInterval: null,
        cachePolicy: mockReaderState.cacheSettings.defaultPolicy,
        healthStatus: "pending",
        lastCheckedAt: null,
        lastSuccessAt: null,
        etag: null,
        lastModified: null,
        lastErrorKind: null,
        lastErrorMessage: null,
        lastErrorAt: null,
        consecutiveFailures: 0,
      })
      mockReaderState.feedTagIdsByFeedId[feedId] = []
      knownFeedUrls.add(normalizedFeedUrl)
      report.createdFeedCount += 1
      return
    }

    const childOutlines = getChildOutlines(outline)
    if (childOutlines.length === 0) {
      return
    }

    const folderName =
      normalizeOptionalText(outline.getAttribute("text")) ??
      normalizeOptionalText(outline.getAttribute("title"))
    let cachedParentId: FolderDto["parentId"] | undefined

    const resolveFolderId = () => {
      if (!folderName) {
        return resolveParentId()
      }

      if (cachedParentId !== undefined) {
        return cachedParentId
      }

      const importedFolder = findOrCreateImportedFolder({
        state: mockReaderState,
        folderName,
        parentId: resolveParentId(),
        folderSortOrders,
        existingFolderIds,
      })

      if (importedFolder.created) {
        report.createdFolderCount += 1
      }

      cachedParentId = importedFolder.folderId
      return cachedParentId
    }

    for (const childOutline of childOutlines) {
      importOutline(childOutline, resolveFolderId)
    }
  }

  for (const outline of getChildOutlines(body)) {
    importOutline(outline, () => null)
  }

  if (report.createdFeedCount === 0 && report.duplicateFeedCount === 0) {
    throw new Error("OPML import did not contain any feed outlines with xmlUrl attributes.")
  }

  return {
    report,
    shellData: buildReaderShellSnapshot(mockReaderState),
  }
}

export async function exportMockOpml(): Promise<MockOpmlExportResult> {
  return buildOpmlDocument(mockReaderState)
}

export async function exportMockMarkdown(input: {
  articleIds: ArticleDetailDto["article"]["id"][]
  mode: ReaderMarkdownExportMode
  title?: string
}): Promise<MockMarkdownExportResult> {
  const details = input.articleIds.map((articleId) => findArticleDetailOrThrow(articleId))

  return buildReaderMarkdownExport({
    details,
    mode: input.mode,
    title: input.title,
  })
}

export async function exportMockDocument(input: {
  articleIds: ArticleDetailDto["article"]["id"][]
  format: ReaderDocumentExportFormat
  mode: ReaderMarkdownExportMode
  presentation: ReaderDocumentExportPresentation
  title?: string
}): Promise<MockDocumentExportResult> {
  const details = input.articleIds.map((articleId) => findArticleDetailOrThrow(articleId))

  return buildReaderDocumentExport({
    details,
    format: input.format,
    mode: input.mode,
    presentation: input.presentation,
    title: input.title,
  })
}
