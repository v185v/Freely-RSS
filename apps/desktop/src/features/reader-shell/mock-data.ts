import type {
  ArticleDetailDto,
  ArticleListItemDto,
  FeedSummaryDto,
  FolderDto,
  SubscriptionTreeNodeDto,
  TagDto,
} from "@freelyrss/shared-types"

import type { ReaderShellData, SourceRow } from "./types"

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

const feeds: FeedSummaryDto[] = [
  {
    id: "feed-freelyrss",
    title: "FreelyRSS Engineering",
    displayTitle: "FreelyRSS Engineering",
    siteUrl: "https://freelyrss.dev",
    icon: null,
    folderId: "folder-daily-core",
    healthStatus: "healthy",
    lastErrorKind: null,
    lastErrorMessage: null,
    consecutiveFailures: 0,
    unreadCount: 6,
    totalCount: 42,
    tagIds: ["tag-product"],
  },
  {
    id: "feed-rust-systems",
    title: "Rust Systems Weekly",
    displayTitle: "Rust Systems Weekly",
    siteUrl: "https://systems.example",
    icon: null,
    folderId: "folder-daily",
    healthStatus: "healthy",
    lastErrorKind: null,
    lastErrorMessage: null,
    consecutiveFailures: 0,
    unreadCount: 3,
    totalCount: 18,
    tagIds: ["tag-ops"],
  },
  {
    id: "feed-query-notes",
    title: "Query Notes",
    displayTitle: "Query Notes",
    siteUrl: "https://query.example",
    icon: null,
    folderId: "folder-research",
    healthStatus: "degraded",
    lastErrorKind: "parse",
    lastErrorMessage: "Latest response returned malformed XML near the channel header.",
    consecutiveFailures: 1,
    unreadCount: 2,
    totalCount: 11,
    tagIds: ["tag-search"],
  },
  {
    id: "feed-night-audio",
    title: "Night Audio Digest",
    displayTitle: "Night Audio Digest",
    siteUrl: "https://audio.example",
    icon: null,
    folderId: "folder-podcasts",
    healthStatus: "paused",
    lastErrorKind: null,
    lastErrorMessage: null,
    consecutiveFailures: 0,
    unreadCount: 0,
    totalCount: 5,
    tagIds: ["tag-audio"],
  },
]

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
    feedTitle: "Rust Systems Weekly",
    title: "Why layout state should stay separate from source and query state",
    author: "Systems Desk",
    summary:
      "Selection and context can live in the shell without turning the shell into the execution layer.",
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
    id: "article-window-behavior",
    feedId: "feed-freelyrss",
    feedTitle: "FreelyRSS Engineering",
    title: "Making narrow-window behavior predictable before routing and async data land",
    author: "FreelyRSS",
    summary:
      "Responsive layout rules are part of the shell contract, not a cosmetic afterthought for the future reader.",
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
      contentRaw: null,
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
          endOffset: 69,
          path: ["article", "paragraph", 0],
          startOffset: 0,
        },
        note: "Route search params now own these selections.",
        color: "#8eb6ff",
        createdAt: "2026-04-08T08:49:00Z",
      },
    ],
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
      contentRaw: null,
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
      displayTitle: "Rust Systems Weekly",
      siteUrl: "https://systems.example",
      icon: null,
    },
    state: articles[1].state,
    tags: [findTag("tag-ops")],
    attachments: [],
    annotations: [],
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
      contentRaw: null,
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
      contentRaw: null,
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
    state: articles[3].state,
    tags: [findTag("tag-product")],
    attachments: [],
    annotations: [],
  },
}

const quickViewRows: SourceRow[] = [
  {
    id: "view-unread",
    kind: "view",
    title: "Unread desk",
    description: "Cross-source unread queue for the main reading session.",
    eyebrow: "view",
    meta: `${articles.filter((article) => article.state.readState !== "read").length} articles`,
  },
  {
    id: "view-reading",
    kind: "view",
    title: "Continue reading",
    description: "Articles already in progress, regardless of source.",
    eyebrow: "view",
    meta: `${articles.filter((article) => article.state.readState === "reading").length} articles`,
  },
  {
    id: "view-starred",
    kind: "view",
    title: "Starred focus",
    description: "Saved items to protect from cleanup and revisit later.",
    eyebrow: "view",
    meta: `${articles.filter((article) => article.state.starred).length} articles`,
  },
]

const quickViewSection = {
  title: "Quick views",
  description: "Route-backed navigation entries that do not execute real queries yet.",
  rows: quickViewRows,
}

const subscriptionTree: SubscriptionTreeNodeDto[] = [
  {
    nodeType: "folder",
    folder: folders[0],
    childFolderIds: ["folder-daily-core"],
    feedIds: ["feed-rust-systems"],
  },
  {
    nodeType: "folder",
    folder: folders[1],
    childFolderIds: [],
    feedIds: ["feed-query-notes"],
  },
  {
    nodeType: "folder",
    folder: folders[2],
    childFolderIds: [],
    feedIds: ["feed-freelyrss"],
  },
  {
    nodeType: "folder",
    folder: folders[3],
    childFolderIds: [],
    feedIds: ["feed-night-audio"],
  },
  ...feeds.map<SubscriptionTreeNodeDto>((feed) => ({
    nodeType: "feed",
    feed,
  })),
]

export async function fetchReaderShellData(): Promise<ReaderShellData> {
  return {
    articleDetails,
    articles,
    feeds,
    folders,
    navigationEntries: [
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
        id: "feed-night-audio",
        title: "Audio backlog",
        description: "An intentionally empty feed route used to validate fallback behavior.",
      },
    ],
    quickViewSection,
    subscriptionTree,
    stats: {
      feedCount: feeds.length,
      readingCount: articles.filter((article) => article.state.readState === "reading").length,
      sourceCount: quickViewRows.length + subscriptionTree.length,
    },
  }
}
