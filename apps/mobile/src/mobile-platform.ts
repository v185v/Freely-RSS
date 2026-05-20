import type {
  ArticleId,
  AttachmentId,
  CachePath,
  ISODateTimeString,
  UrlString,
} from "@freelyrss/shared-types"

export const MOBILE_PLATFORM_CAPABILITY_IDS = [
  "offline-cache-read",
  "mobile-audio-playback",
  "background-media-resume",
  "system-share-sheet",
] as const

export type MobilePlatformCapabilityId = (typeof MOBILE_PLATFORM_CAPABILITY_IDS)[number]

export interface MobileCachedArticleRecord {
  articleId: ArticleId
  bytes: number
  cachedAt: ISODateTimeString
  contentPath: CachePath
  stale: boolean
  syncRevision: string
}

export interface MobileCachedAttachmentRecord {
  articleId: ArticleId
  attachmentId: AttachmentId
  bytes: number
  cachedAt: ISODateTimeString
  localCachePath: CachePath
  playableOffline: boolean
}

export interface MobileMediaSessionRecord {
  articleId: ArticleId
  attachmentId: AttachmentId
  backgroundResume: "available" | "unavailable"
  durationSeconds: number
  resumePositionSeconds: number
  state: "ready" | "playing" | "paused"
}

export interface MobileShareTargetRecord {
  articleId: ArticleId
  channels: readonly ["system-share-sheet"]
  excerpt: string
  title: string
  url: UrlString
}

export interface MobileBackgroundResumeState {
  enabled: boolean
  restoredAt: ISODateTimeString | null
  restoredAttachmentId: AttachmentId | null
}

export interface MobilePlatformSnapshot {
  backgroundResume: MobileBackgroundResumeState
  cachedArticles: readonly MobileCachedArticleRecord[]
  cachedAttachments: readonly MobileCachedAttachmentRecord[]
  capabilities: readonly MobilePlatformCapabilityId[]
  mediaSessions: readonly MobileMediaSessionRecord[]
  shareTargets: readonly MobileShareTargetRecord[]
}

export interface MobilePlatformSummary {
  cachedAudioCount: number
  missingCapabilities: MobilePlatformCapabilityId[]
  offlineArticleCount: number
  resumableAudioCount: number
  shareTargetCount: number
}

const cachedAt = "2026-05-20T09:12:00Z"

export const MOBILE_PLATFORM_SNAPSHOT: MobilePlatformSnapshot = {
  backgroundResume: {
    enabled: true,
    restoredAt: "2026-05-20T09:16:00Z",
    restoredAttachmentId: "attachment-mobile-podcast",
  },
  cachedArticles: [
    {
      articleId: "article-mobile-sync",
      bytes: 52_400,
      cachedAt,
      contentPath: "mobile-cache/articles/article-mobile-sync.json",
      stale: false,
      syncRevision: "sync-20260520-0910",
    },
    {
      articleId: "article-mobile-podcast",
      bytes: 31_600,
      cachedAt,
      contentPath: "mobile-cache/articles/article-mobile-podcast.json",
      stale: false,
      syncRevision: "sync-20260520-0910",
    },
  ],
  cachedAttachments: [
    {
      articleId: "article-mobile-podcast",
      attachmentId: "attachment-mobile-podcast",
      bytes: 44_200_000,
      cachedAt,
      localCachePath: "mobile-cache/media/article-mobile-podcast.mp3",
      playableOffline: true,
    },
  ],
  capabilities: MOBILE_PLATFORM_CAPABILITY_IDS,
  mediaSessions: [
    {
      articleId: "article-mobile-podcast",
      attachmentId: "attachment-mobile-podcast",
      backgroundResume: "available",
      durationSeconds: 1320,
      resumePositionSeconds: 492,
      state: "paused",
    },
  ],
  shareTargets: [
    {
      articleId: "article-mobile-sync",
      channels: ["system-share-sheet"],
      excerpt:
        "Mobile reads synchronized article state without importing desktop-only host powers.",
      title: "Mobile sync starts from a narrow reading contract",
      url: "https://freelyrss.dev/mobile/sync-contract",
    },
    {
      articleId: "article-mobile-podcast",
      channels: ["system-share-sheet"],
      excerpt: "Resume the cached episode and keep the reading queue portable.",
      title: "Podcast episodes need quick resume controls on mobile",
      url: "https://audio.example/mobile-episode",
    },
  ],
}

export function summarizeMobilePlatformReadiness(
  snapshot: MobilePlatformSnapshot = MOBILE_PLATFORM_SNAPSHOT,
): MobilePlatformSummary {
  const capabilitySet = new Set<MobilePlatformCapabilityId>(snapshot.capabilities)

  return {
    cachedAudioCount: snapshot.cachedAttachments.filter((attachment) => attachment.playableOffline)
      .length,
    missingCapabilities: MOBILE_PLATFORM_CAPABILITY_IDS.filter(
      (capability) => !capabilitySet.has(capability),
    ),
    offlineArticleCount: snapshot.cachedArticles.filter((article) => !article.stale).length,
    resumableAudioCount: snapshot.mediaSessions.filter(
      (session) => session.backgroundResume === "available" && session.resumePositionSeconds > 0,
    ).length,
    shareTargetCount: snapshot.shareTargets.length,
  }
}
