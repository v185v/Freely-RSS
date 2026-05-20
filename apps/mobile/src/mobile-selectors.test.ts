import { describe, expect, test } from "vitest"

import { fetchMobileArticleDetail, fetchMobileReaderSnapshot } from "./mobile-client"
import {
  buildMobileHomeModel,
  buildMobileOfflineCacheModel,
  buildMobileSharePayload,
  buildPrimaryAudioPlaybackModel,
  filterMobileArticles,
  getPrimaryAudioAttachment,
  getSyncedNoteText,
  selectMobileArticlesForTab,
} from "./mobile-selectors"

describe("mobile reader selectors", () => {
  test("builds a synchronized reading model with an active article", async () => {
    const snapshot = await fetchMobileReaderSnapshot()
    const model = buildMobileHomeModel(snapshot, "today", "", null)

    expect(model.scopeMode).toBe("mobile-reading-priority")
    expect(model.unreadCount).toBe(3)
    expect(model.offlineReadyCount).toBe(2)
    expect(model.resumableAudioCount).toBe(1)
    expect(model.activeArticleId).toBe("article-mobile-sync")
    expect(model.articles).toHaveLength(3)
  })

  test("searches synchronized articles without mutating the snapshot", async () => {
    const snapshot = await fetchMobileReaderSnapshot()
    const results = filterMobileArticles(snapshot.articles, "notes")

    expect(results.map((article) => article.id)).toEqual(["article-mobile-notes"])
    expect(snapshot.articles).toHaveLength(3)
  })

  test("narrows notes and podcast tabs to their mobile-first workflows", async () => {
    const snapshot = await fetchMobileReaderSnapshot()
    const noteArticles = selectMobileArticlesForTab(snapshot.articles, "notes", "")
    const podcastArticles = selectMobileArticlesForTab(snapshot.articles, "podcasts", "")

    expect(noteArticles.map((article) => article.id)).toEqual(["article-mobile-notes"])
    expect(podcastArticles.map((article) => article.id)).toEqual(["article-mobile-podcast"])
  })

  test("reads synchronized note and podcast metadata for the article page", async () => {
    const noteDetail = await fetchMobileArticleDetail("article-mobile-notes")
    const podcastDetail = await fetchMobileArticleDetail("article-mobile-podcast")

    expect(getSyncedNoteText(noteDetail)).toContain("mobile note path")
    expect(getPrimaryAudioAttachment(podcastDetail)?.duration).toBe(1320)
  })

  test("derives offline cache and resumable audio state from the mobile platform boundary", async () => {
    const snapshot = await fetchMobileReaderSnapshot()
    const podcastDetail = await fetchMobileArticleDetail("article-mobile-podcast")
    const offlineModel = buildMobileOfflineCacheModel(podcastDetail, snapshot.platform)
    const playbackModel = buildPrimaryAudioPlaybackModel(podcastDetail, snapshot.platform)

    expect(snapshot.platformSummary.missingCapabilities).toEqual([])
    expect(offlineModel?.canOpenOffline).toBe(true)
    expect(offlineModel?.audioCachePath).toBe("mobile-cache/media/article-mobile-podcast.mp3")
    expect(playbackModel?.canPlayOffline).toBe(true)
    expect(playbackModel?.backgroundResumeAvailable).toBe(true)
    expect(playbackModel?.resumeLabel).toBe("8:12 / 22:00")
  })

  test("builds a system share payload without adding a mobile write API", async () => {
    const snapshot = await fetchMobileReaderSnapshot()
    const detail = await fetchMobileArticleDetail("article-mobile-sync")
    const payload = buildMobileSharePayload(detail, snapshot.platform)

    expect(payload?.title).toBe("Mobile sync starts from a narrow reading contract")
    expect(payload?.message).toContain("https://freelyrss.dev/mobile/sync-contract")
  })
})
