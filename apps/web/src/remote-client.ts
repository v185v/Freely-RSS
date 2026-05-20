import type { ArticleDetailDto, ArticleListItemDto, FeedSummaryDto } from "@freelyrss/shared-types"

import {
  WEB_SCOPE_CONTRACT,
  type WebScopeContract,
  type WebScopeSummary,
  summarizeWebScopeRequirements,
} from "./web-scope"

export interface WebSessionDto {
  accountEmail: string
  deviceName: string
  lastSyncedAt: string
  mode: "remote-read-only"
}

export interface WebReaderSnapshotDto {
  articles: ArticleListItemDto[]
  feeds: FeedSummaryDto[]
  scope: WebScopeContract
  scopeSummary: WebScopeSummary
  session: WebSessionDto
}

const session: WebSessionDto = {
  accountEmail: "reader@example.com",
  deviceName: "FreelyRSS Desktop",
  lastSyncedAt: "2026-05-18T08:20:00Z",
  mode: "remote-read-only",
}

const feeds: FeedSummaryDto[] = [
  {
    id: "feed-freelyrss",
    title: "FreelyRSS Engineering",
    displayTitle: "FreelyRSS Engineering",
    siteUrl: "https://freelyrss.dev",
    icon: null,
    folderId: null,
    healthStatus: "healthy",
    lastErrorKind: null,
    lastErrorMessage: null,
    consecutiveFailures: 0,
    unreadCount: 2,
    totalCount: 2,
    tagIds: ["tag-web", "tag-sync"],
  },
  {
    id: "feed-systems",
    title: "Systems Reading",
    displayTitle: "Systems Reading",
    siteUrl: "https://systems.example",
    icon: null,
    folderId: null,
    healthStatus: "healthy",
    lastErrorKind: null,
    lastErrorMessage: null,
    consecutiveFailures: 0,
    unreadCount: 1,
    totalCount: 1,
    tagIds: ["tag-search"],
  },
  {
    id: "feed-audio",
    title: "Audio Queue",
    displayTitle: "Audio Queue",
    siteUrl: "https://audio.example",
    icon: null,
    folderId: null,
    healthStatus: "paused",
    lastErrorKind: null,
    lastErrorMessage: null,
    consecutiveFailures: 0,
    unreadCount: 1,
    totalCount: 1,
    tagIds: ["tag-audio"],
  },
]

const articles: ArticleListItemDto[] = [
  {
    id: "article-web-entry",
    feedId: "feed-freelyrss",
    feedTitle: "FreelyRSS Engineering",
    title: "Web reads synchronized data without becoming the local desktop host",
    author: "FreelyRSS",
    summary:
      "The Web entry consumes remote synchronized snapshots, keeps article state visible, and avoids local feed fetching or desktop-only commands.",
    searchSnippet: null,
    publishedAt: "2026-05-18T07:45:00Z",
    thumbnail: null,
    estimatedReadingMinutes: 6,
    state: {
      articleId: "article-web-entry",
      readState: "reading",
      starred: true,
      liked: false,
      importance: "high",
      readLater: true,
      readingProgress: 0.52,
      lastOpenedAt: "2026-05-18T08:00:00Z",
    },
    tagIds: ["tag-web", "tag-sync"],
    attachmentCount: 0,
  },
  {
    id: "article-remote-search",
    feedId: "feed-systems",
    feedTitle: "Systems Reading",
    title: "Search in the browser should query synchronized indexes, not desktop SQLite",
    author: "Systems Desk",
    summary:
      "The first Web surface filters a remote snapshot so future API wiring has a narrow read contract.",
    searchSnippet: null,
    publishedAt: "2026-05-17T18:10:00Z",
    thumbnail: null,
    estimatedReadingMinutes: 8,
    state: {
      articleId: "article-remote-search",
      readState: "unread",
      starred: false,
      liked: true,
      importance: "normal",
      readLater: false,
      readingProgress: 0,
      lastOpenedAt: null,
    },
    tagIds: ["tag-search"],
    attachmentCount: 0,
  },
  {
    id: "article-audio-web",
    feedId: "feed-audio",
    feedTitle: "Audio Queue",
    title: "Podcast metadata can be inspected remotely while media cache stays local",
    author: "Audio Desk",
    summary:
      "The Web app can show synchronized enclosure metadata without promising desktop-grade offline media playback.",
    searchSnippet: null,
    publishedAt: "2026-05-16T23:30:00Z",
    thumbnail: null,
    estimatedReadingMinutes: 4,
    state: {
      articleId: "article-audio-web",
      readState: "unread",
      starred: false,
      liked: false,
      importance: "normal",
      readLater: true,
      readingProgress: 0,
      lastOpenedAt: null,
    },
    tagIds: ["tag-audio"],
    attachmentCount: 1,
  },
]

export const remoteArticleDetails: Record<string, ArticleDetailDto> = {
  "article-web-entry": {
    article: {
      id: "article-web-entry",
      feedId: "feed-freelyrss",
      sourceGuid: "web-entry",
      title: "Web reads synchronized data without becoming the local desktop host",
      author: "FreelyRSS",
      summary: articles[0].summary,
      contentRaw: null,
      contentExtracted:
        "The Web entry is a remote access surface. It should read synchronized article snapshots and user state after account login, while the desktop remains responsible for local-first storage, feed fetching, cache policy, and Tauri-only operations.\n\nThat boundary keeps the browser useful without smuggling local SQLite commands into the remote app. Search, source filters, and article opening can be modeled as read operations against synchronized data.\n\nLater steps can add lightweight state changes through the sync API, but this first shell deliberately proves the read-only contract.",
      canonicalUrl: "https://freelyrss.dev/notes/web-read-entry",
      originalUrl: "https://freelyrss.dev/notes/web-read-entry",
      publishedAt: "2026-05-18T07:45:00Z",
      fetchedAt: "2026-05-18T07:50:00Z",
      language: "en",
      thumbnail: null,
      wordCount: 540,
      contentHash: "sha256:web-entry",
    },
    feed: {
      id: "feed-freelyrss",
      title: "FreelyRSS Engineering",
      displayTitle: "FreelyRSS Engineering",
      siteUrl: "https://freelyrss.dev",
      icon: null,
    },
    state: articles[0].state,
    tags: [
      {
        id: "tag-web",
        name: "web",
        scope: "article",
        color: "#8eb6ff",
        createdAt: session.lastSyncedAt,
      },
      {
        id: "tag-sync",
        name: "sync",
        scope: "article",
        color: "#7fe2c0",
        createdAt: session.lastSyncedAt,
      },
    ],
    attachments: [],
    annotations: [],
    aiArtifacts: [],
  },
  "article-remote-search": {
    article: {
      id: "article-remote-search",
      feedId: "feed-systems",
      sourceGuid: "remote-search",
      title: "Search in the browser should query synchronized indexes, not desktop SQLite",
      author: "Systems Desk",
      summary: articles[1].summary,
      contentRaw: null,
      contentExtracted:
        "Remote Web search is a contract with the sync service, not a shortcut to the desktop local database. The browser can shape a query, show results, and open detail snapshots without owning migrations, FTS tables, or local cache directories.\n\nThis mock implementation keeps that boundary visible by using a remote client facade and a read-only snapshot. It gives the UI a real path to evolve toward an API response without coupling to Tauri.",
      canonicalUrl: "https://systems.example/remote-search",
      originalUrl: "https://systems.example/remote-search",
      publishedAt: "2026-05-17T18:10:00Z",
      fetchedAt: "2026-05-17T18:20:00Z",
      language: "en",
      thumbnail: null,
      wordCount: 480,
      contentHash: "sha256:remote-search",
    },
    feed: {
      id: "feed-systems",
      title: "Systems Reading",
      displayTitle: "Systems Reading",
      siteUrl: "https://systems.example",
      icon: null,
    },
    state: articles[1].state,
    tags: [
      {
        id: "tag-search",
        name: "search",
        scope: "article",
        color: "#f4b860",
        createdAt: session.lastSyncedAt,
      },
    ],
    attachments: [],
    annotations: [],
    aiArtifacts: [],
  },
  "article-audio-web": {
    article: {
      id: "article-audio-web",
      feedId: "feed-audio",
      sourceGuid: "audio-web",
      title: "Podcast metadata can be inspected remotely while media cache stays local",
      author: "Audio Desk",
      summary: articles[2].summary,
      contentRaw: null,
      contentExtracted:
        "A Web reader can expose episode metadata, source context, and reading state from synchronized data. It should not imply that the browser owns desktop media cache eviction or offline attachment storage.\n\nKeeping that promise narrow lets audio workflows arrive later without turning this read-only entry into a second desktop client.",
      canonicalUrl: "https://audio.example/episodes/web-cache-boundary",
      originalUrl: "https://audio.example/episodes/web-cache-boundary",
      publishedAt: "2026-05-16T23:30:00Z",
      fetchedAt: "2026-05-16T23:45:00Z",
      language: "en",
      thumbnail: null,
      wordCount: 310,
      contentHash: "sha256:audio-web",
    },
    feed: {
      id: "feed-audio",
      title: "Audio Queue",
      displayTitle: "Audio Queue",
      siteUrl: "https://audio.example",
      icon: null,
    },
    state: articles[2].state,
    tags: [
      {
        id: "tag-audio",
        name: "audio",
        scope: "article",
        color: "#f38ba8",
        createdAt: session.lastSyncedAt,
      },
    ],
    attachments: [
      {
        id: "attachment-audio-web",
        articleId: "article-audio-web",
        type: "audio",
        url: "https://audio.example/episodes/web-cache-boundary.mp3",
        mimeType: "audio/mpeg",
        duration: 1500,
        size: 58_720_000,
        localCachePath: null,
      },
    ],
    annotations: [],
    aiArtifacts: [],
  },
}

function cloneValue<T>(value: T): T {
  return structuredClone(value)
}

export async function fetchRemoteReaderSnapshot(): Promise<WebReaderSnapshotDto> {
  return cloneValue({
    articles,
    feeds,
    scope: WEB_SCOPE_CONTRACT,
    scopeSummary: summarizeWebScopeRequirements(),
    session,
  })
}

export async function fetchRemoteArticleDetail(articleId: string): Promise<ArticleDetailDto> {
  const detail = remoteArticleDetails[articleId]

  if (!detail) {
    throw new Error(`Remote article snapshot was not found: ${articleId}`)
  }

  return cloneValue(detail)
}
