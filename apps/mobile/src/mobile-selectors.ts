import type { ArticleDetailDto, ArticleId, ArticleListItemDto } from "@freelyrss/shared-types"

import type { MobileReaderSnapshotDto } from "./mobile-client"
import type { MobilePlatformSnapshot } from "./mobile-platform"

export type MobileTabId = "today" | "search" | "notes" | "podcasts"

export interface MobileHomeModel {
  activeArticleId: string | null
  articles: ArticleListItemDto[]
  noteCount: number
  offlineReadyCount: number
  podcastCount: number
  resumableAudioCount: number
  scopeMode: string
  unreadCount: number
}

export interface MobileOfflineCacheModel {
  articleCachePath: string | null
  audioCachePath: string | null
  cachedBytes: number
  canOpenOffline: boolean
  statusLabel: string
}

export interface MobileAudioPlaybackModel {
  attachmentId: string
  backgroundResumeAvailable: boolean
  canPlay: boolean
  canPlayOffline: boolean
  cachedPath: string | null
  progressPercent: number
  resumeLabel: string
  statusLabel: string
}

export interface MobileSharePayload {
  message: string
  title: string
  url: string
}

export function filterMobileArticles(
  articles: ArticleListItemDto[],
  searchText: string,
): ArticleListItemDto[] {
  const normalizedSearch = searchText.trim().toLowerCase()

  if (!normalizedSearch) {
    return articles
  }

  return articles.filter((article) => {
    const haystack =
      `${article.title} ${article.summary ?? ""} ${article.feedTitle} ${article.author ?? ""}`.toLowerCase()

    return haystack.includes(normalizedSearch)
  })
}

export function selectMobileArticlesForTab(
  articles: ArticleListItemDto[],
  activeTab: MobileTabId,
  searchText: string,
): ArticleListItemDto[] {
  const searchedArticles = filterMobileArticles(articles, searchText)

  if (activeTab === "podcasts") {
    return searchedArticles.filter((article) => article.attachmentCount > 0)
  }

  if (activeTab === "notes") {
    return searchedArticles.filter((article) => article.tagIds.includes("tag-notes"))
  }

  return searchedArticles
}

export function buildMobileHomeModel(
  snapshot: MobileReaderSnapshotDto,
  activeTab: MobileTabId,
  searchText: string,
  selectedArticleId: string | null,
): MobileHomeModel {
  const articles = selectMobileArticlesForTab(snapshot.articles, activeTab, searchText)
  const selectedArticleVisible =
    selectedArticleId !== null && articles.some((article) => article.id === selectedArticleId)
  const activeArticleId =
    selectedArticleVisible && selectedArticleId ? selectedArticleId : (articles[0]?.id ?? null)

  return {
    activeArticleId,
    articles,
    noteCount: snapshot.articles.filter((article) => article.tagIds.includes("tag-notes")).length,
    offlineReadyCount: snapshot.platformSummary.offlineArticleCount,
    podcastCount: snapshot.articles.filter((article) => article.attachmentCount > 0).length,
    resumableAudioCount: snapshot.platformSummary.resumableAudioCount,
    scopeMode: snapshot.scope.mode,
    unreadCount: snapshot.articles.filter((article) => article.state.readState !== "read").length,
  }
}

export function getPrimaryAudioAttachment(detail: ArticleDetailDto | null) {
  return detail?.attachments.find((attachment) => attachment.type === "audio") ?? null
}

function getArticleId(detail: ArticleDetailDto | null): ArticleId | null {
  return detail?.article.id ?? null
}

function formatSeconds(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = safeSeconds % 60

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

export function buildMobileOfflineCacheModel(
  detail: ArticleDetailDto | null,
  platform: MobilePlatformSnapshot,
): MobileOfflineCacheModel | null {
  const articleId = getArticleId(detail)

  if (!articleId) {
    return null
  }

  const cachedArticle = platform.cachedArticles.find(
    (article) => article.articleId === articleId && !article.stale,
  )
  const audio = getPrimaryAudioAttachment(detail)
  const cachedAudio = audio
    ? platform.cachedAttachments.find(
        (attachment) => attachment.attachmentId === audio.id && attachment.playableOffline,
      )
    : null
  const requiresAudioCache = Boolean(audio)
  const canOpenOffline = Boolean(cachedArticle && (!requiresAudioCache || cachedAudio))
  const cachedBytes = (cachedArticle?.bytes ?? 0) + (cachedAudio?.bytes ?? 0)

  return {
    articleCachePath: cachedArticle?.contentPath ?? null,
    audioCachePath: cachedAudio?.localCachePath ?? null,
    cachedBytes,
    canOpenOffline,
    statusLabel: canOpenOffline ? "Ready offline" : "Needs network",
  }
}

export function buildPrimaryAudioPlaybackModel(
  detail: ArticleDetailDto | null,
  platform: MobilePlatformSnapshot,
): MobileAudioPlaybackModel | null {
  const audio = getPrimaryAudioAttachment(detail)

  if (!audio) {
    return null
  }

  const cachedAudio = platform.cachedAttachments.find(
    (attachment) => attachment.attachmentId === audio.id && attachment.playableOffline,
  )
  const mediaSession = platform.mediaSessions.find((session) => session.attachmentId === audio.id)
  const durationSeconds = mediaSession?.durationSeconds ?? audio.duration ?? 0
  const resumePositionSeconds = mediaSession?.resumePositionSeconds ?? 0
  const progressPercent =
    durationSeconds > 0 ? Math.round((resumePositionSeconds / durationSeconds) * 100) : 0

  return {
    attachmentId: audio.id,
    backgroundResumeAvailable:
      platform.backgroundResume.enabled && mediaSession?.backgroundResume === "available",
    canPlay: Boolean(cachedAudio || audio.url),
    canPlayOffline: Boolean(cachedAudio),
    cachedPath: cachedAudio?.localCachePath ?? audio.localCachePath,
    progressPercent,
    resumeLabel: `${formatSeconds(resumePositionSeconds)} / ${formatSeconds(durationSeconds)}`,
    statusLabel: cachedAudio ? "Cached episode" : "Streaming episode",
  }
}

export function buildMobileSharePayload(
  detail: ArticleDetailDto | null,
  platform: MobilePlatformSnapshot,
): MobileSharePayload | null {
  const articleId = getArticleId(detail)

  if (!articleId) {
    return null
  }

  const shareTarget = platform.shareTargets.find((target) => target.articleId === articleId)

  if (!shareTarget) {
    return null
  }

  return {
    message: `${shareTarget.title}\n${shareTarget.url}\n\n${shareTarget.excerpt}`,
    title: shareTarget.title,
    url: shareTarget.url,
  }
}

export function getSyncedNoteText(detail: ArticleDetailDto | null) {
  const note = detail?.annotations.find((annotation) => annotation.type === "note")

  return note?.note ?? null
}
