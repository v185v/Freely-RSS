import type {
  AnnotationDto,
  ArticleDetailDto,
  ArticleListItemDto,
  FeedSummaryDto,
} from "@freelyrss/shared-types"

import {
  MOBILE_PLATFORM_SNAPSHOT,
  type MobilePlatformSnapshot,
  type MobilePlatformSummary,
  summarizeMobilePlatformReadiness,
} from "./mobile-platform"
import {
  MOBILE_SCOPE_CONTRACT,
  type MobileScopeContract,
  type MobileScopeSummary,
  summarizeMobileScopeRequirements,
} from "./mobile-scope"

export interface MobileSessionDto {
  accountEmail: string
  deviceName: string
  lastSyncedAt: string
  mode: "mobile-sync"
}

export interface MobileReaderSnapshotDto {
  articles: ArticleListItemDto[]
  feeds: FeedSummaryDto[]
  platform: MobilePlatformSnapshot
  platformSummary: MobilePlatformSummary
  scope: MobileScopeContract
  scopeSummary: MobileScopeSummary
  session: MobileSessionDto
}

const syncedAt = "2026-05-20T09:10:00Z"

const session: MobileSessionDto = {
  accountEmail: "reader@example.com",
  deviceName: "FreelyRSS Phone",
  lastSyncedAt: syncedAt,
  mode: "mobile-sync",
}

const feeds: FeedSummaryDto[] = [
  {
    id: "feed-mobile-desk",
    title: "Mobile Reading Desk",
    displayTitle: "Mobile Reading Desk",
    siteUrl: "https://freelyrss.dev",
    icon: null,
    folderId: null,
    healthStatus: "healthy",
    lastErrorKind: null,
    lastErrorMessage: null,
    consecutiveFailures: 0,
    unreadCount: 2,
    totalCount: 2,
    tagIds: ["tag-mobile"],
  },
  {
    id: "feed-audio",
    title: "Audio Queue",
    displayTitle: "Audio Queue",
    siteUrl: "https://audio.example",
    icon: null,
    folderId: null,
    healthStatus: "healthy",
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
    id: "article-mobile-sync",
    feedId: "feed-mobile-desk",
    feedTitle: "Mobile Reading Desk",
    title: "Mobile sync starts from a narrow reading contract",
    author: "FreelyRSS",
    summary:
      "The mobile shell signs into synchronized data, searches the article queue, and opens a focused reading page without importing desktop-only host powers.",
    searchSnippet: null,
    publishedAt: "2026-05-20T08:00:00Z",
    thumbnail: null,
    estimatedReadingMinutes: 5,
    state: {
      articleId: "article-mobile-sync",
      readState: "reading",
      starred: true,
      liked: false,
      importance: "high",
      readLater: true,
      readingProgress: 0.64,
      lastOpenedAt: "2026-05-20T08:35:00Z",
    },
    tagIds: ["tag-mobile", "tag-sync"],
    attachmentCount: 0,
  },
  {
    id: "article-mobile-notes",
    feedId: "feed-mobile-desk",
    feedTitle: "Mobile Reading Desk",
    title: "Notes stay lightweight on the first mobile surface",
    author: "Notes Team",
    summary:
      "Mobile note capture should record synchronized annotations while complex rule administration remains on desktop.",
    searchSnippet: null,
    publishedAt: "2026-05-19T18:20:00Z",
    thumbnail: null,
    estimatedReadingMinutes: 4,
    state: {
      articleId: "article-mobile-notes",
      readState: "unread",
      starred: false,
      liked: true,
      importance: "normal",
      readLater: false,
      readingProgress: 0,
      lastOpenedAt: null,
    },
    tagIds: ["tag-notes"],
    attachmentCount: 0,
  },
  {
    id: "article-mobile-podcast",
    feedId: "feed-audio",
    feedTitle: "Audio Queue",
    title: "Podcast episodes need quick resume controls on mobile",
    author: "Audio Desk",
    summary:
      "The first mobile shell exposes synchronized audio metadata and a play-ready episode card without owning desktop cache eviction.",
    searchSnippet: null,
    publishedAt: "2026-05-18T22:15:00Z",
    thumbnail: null,
    estimatedReadingMinutes: 3,
    state: {
      articleId: "article-mobile-podcast",
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

const syncedAnnotations: AnnotationDto[] = [
  {
    id: "annotation-mobile-note",
    articleId: "article-mobile-notes",
    type: "note",
    selectedText: "record synchronized annotations",
    anchor: {
      paragraph: 1,
      quote: "record synchronized annotations",
    },
    note: "Keep the first mobile note path short and sync-backed.",
    color: "#f4b860",
    createdAt: syncedAt,
  },
]

const articleDetails: Record<string, ArticleDetailDto> = {
  "article-mobile-sync": {
    article: {
      id: "article-mobile-sync",
      feedId: "feed-mobile-desk",
      sourceGuid: "mobile-sync",
      title: "Mobile sync starts from a narrow reading contract",
      author: "FreelyRSS",
      summary: articles[0].summary,
      contentRaw: null,
      contentExtracted:
        "Mobile should feel immediate, but it should not become a second desktop host. The first shell signs into the synchronized account and reads remote snapshots that already contain article state, note metadata, tags, and audio enclosure metadata.\n\nThat path keeps the phone focused on reading, search, notes, and episode consumption. Local feed fetching, OPML administration, rule editing, AI generation, Webhook dispatch, and desktop SQLite access stay behind later explicit boundaries.",
      canonicalUrl: "https://freelyrss.dev/mobile/sync-contract",
      originalUrl: "https://freelyrss.dev/mobile/sync-contract",
      publishedAt: "2026-05-20T08:00:00Z",
      fetchedAt: "2026-05-20T08:05:00Z",
      language: "en",
      thumbnail: null,
      wordCount: 420,
      contentHash: "sha256:mobile-sync",
    },
    feed: {
      id: "feed-mobile-desk",
      title: "Mobile Reading Desk",
      displayTitle: "Mobile Reading Desk",
      siteUrl: "https://freelyrss.dev",
      icon: null,
    },
    state: articles[0].state,
    tags: [
      {
        id: "tag-mobile",
        name: "mobile",
        scope: "article",
        color: "#7fe2c0",
        createdAt: syncedAt,
      },
      {
        id: "tag-sync",
        name: "sync",
        scope: "article",
        color: "#8eb6ff",
        createdAt: syncedAt,
      },
    ],
    attachments: [],
    annotations: [],
    aiArtifacts: [],
  },
  "article-mobile-notes": {
    article: {
      id: "article-mobile-notes",
      feedId: "feed-mobile-desk",
      sourceGuid: "mobile-notes",
      title: "Notes stay lightweight on the first mobile surface",
      author: "Notes Team",
      summary: articles[1].summary,
      contentRaw: null,
      contentExtracted:
        "The mobile note path should be available near the reading surface and backed by synchronized annotation records. It does not need to expose the desktop rule editor, batch actions, or export systems to be useful.\n\nA small capture area is enough for the first shell: users can see synchronized notes, type a draft, and keep reading without leaving the article.",
      canonicalUrl: "https://freelyrss.dev/mobile/notes",
      originalUrl: "https://freelyrss.dev/mobile/notes",
      publishedAt: "2026-05-19T18:20:00Z",
      fetchedAt: "2026-05-19T18:25:00Z",
      language: "en",
      thumbnail: null,
      wordCount: 360,
      contentHash: "sha256:mobile-notes",
    },
    feed: {
      id: "feed-mobile-desk",
      title: "Mobile Reading Desk",
      displayTitle: "Mobile Reading Desk",
      siteUrl: "https://freelyrss.dev",
      icon: null,
    },
    state: articles[1].state,
    tags: [
      {
        id: "tag-notes",
        name: "notes",
        scope: "article",
        color: "#f4b860",
        createdAt: syncedAt,
      },
    ],
    attachments: [],
    annotations: syncedAnnotations,
    aiArtifacts: [],
  },
  "article-mobile-podcast": {
    article: {
      id: "article-mobile-podcast",
      feedId: "feed-audio",
      sourceGuid: "mobile-podcast",
      title: "Podcast episodes need quick resume controls on mobile",
      author: "Audio Desk",
      summary: articles[2].summary,
      contentRaw: null,
      contentExtracted:
        "Audio is a natural mobile workflow. The first mobile shell can show episode metadata, duration, source, and a play-ready card while leaving background playback, cache pinning, and platform media controls for the next implementation step.",
      canonicalUrl: "https://audio.example/mobile-episode",
      originalUrl: "https://audio.example/mobile-episode",
      publishedAt: "2026-05-18T22:15:00Z",
      fetchedAt: "2026-05-18T22:30:00Z",
      language: "en",
      thumbnail: null,
      wordCount: 240,
      contentHash: "sha256:mobile-podcast",
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
        createdAt: syncedAt,
      },
    ],
    attachments: [
      {
        id: "attachment-mobile-podcast",
        articleId: "article-mobile-podcast",
        type: "audio",
        url: "https://audio.example/mobile-episode.mp3",
        mimeType: "audio/mpeg",
        duration: 1320,
        size: 44_200_000,
        localCachePath: "mobile-cache/media/article-mobile-podcast.mp3",
      },
    ],
    annotations: [],
    aiArtifacts: [],
  },
}

function cloneValue<T>(value: T): T {
  return structuredClone(value)
}

export async function fetchMobileReaderSnapshot(): Promise<MobileReaderSnapshotDto> {
  return cloneValue({
    articles,
    feeds,
    platform: MOBILE_PLATFORM_SNAPSHOT,
    platformSummary: summarizeMobilePlatformReadiness(),
    scope: MOBILE_SCOPE_CONTRACT,
    scopeSummary: summarizeMobileScopeRequirements(),
    session,
  })
}

export async function fetchMobileArticleDetail(articleId: string): Promise<ArticleDetailDto> {
  const detail = articleDetails[articleId]

  if (!detail) {
    throw new Error(`Mobile article snapshot was not found: ${articleId}`)
  }

  return cloneValue(detail)
}
