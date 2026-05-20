import type { ArticleDetailDto, ArticleListItemDto } from "@freelyrss/shared-types"

import type { MobileReaderSnapshotDto } from "./mobile-client"

export type MobileTabId = "today" | "search" | "notes" | "podcasts"

export interface MobileHomeModel {
  activeArticleId: string | null
  articles: ArticleListItemDto[]
  noteCount: number
  podcastCount: number
  scopeMode: string
  unreadCount: number
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
    podcastCount: snapshot.articles.filter((article) => article.attachmentCount > 0).length,
    scopeMode: snapshot.scope.mode,
    unreadCount: snapshot.articles.filter((article) => article.state.readState !== "read").length,
  }
}

export function getPrimaryAudioAttachment(detail: ArticleDetailDto | null) {
  return detail?.attachments.find((attachment) => attachment.type === "audio") ?? null
}

export function getSyncedNoteText(detail: ArticleDetailDto | null) {
  const note = detail?.annotations.find((annotation) => annotation.type === "note")

  return note?.note ?? null
}
