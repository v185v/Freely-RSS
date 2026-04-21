import type { QueryDefinition } from "@freelyrss/shared-query"
import type {
  ArticleDetailDto,
  ArticleListItemDto,
  FeedDto,
  FeedSummaryDto,
  FolderDto,
  SubscriptionTreeNodeDto,
} from "@freelyrss/shared-types"

export const DEFAULT_SOURCE_ID = "view-unread"

export type ReaderStatusFilter = "all" | "unread" | "reading" | "readLater" | "starred"

export type ReaderSortMode = "newest" | "oldest"

export type ReaderThemeTone = "high-contrast" | "midnight"

export interface SourceRow {
  description: string
  depth?: number
  eyebrow: string
  id: string
  kind: "feed" | "folder" | "view"
  meta: string
  title: string
}

export interface SourceSection {
  description: string
  rows: SourceRow[]
  title: string
}

export interface SubscriptionTreeRow extends SourceRow {
  depth: number
  hasChildren: boolean
  isCollapsed: boolean
}

export interface NavigationEntry {
  description: string
  id: string
  title: string
}

export interface OpmlImportReport {
  createdFeedCount: number
  createdFolderCount: number
  duplicateFeedCount: number
}

export interface OpmlExportReport {
  exportedFeedCount: number
  exportedFolderCount: number
  generatedAt: string
}

export interface ReaderShellData {
  articleDetails: Record<string, ArticleDetailDto>
  articles: ArticleListItemDto[]
  feedDetails: Record<string, FeedDto>
  feeds: FeedSummaryDto[]
  folders: FolderDto[]
  navigationEntries: NavigationEntry[]
  quickViewSection: SourceSection
  subscriptionTree: SubscriptionTreeNodeDto[]
  stats: {
    feedCount: number
    readingCount: number
    sourceCount: number
  }
}

export interface ReaderRouteSearch {
  articleId: string | null
  sourceId: string
}

export interface ReaderViewFilters {
  searchText: string
  sortMode: ReaderSortMode
  statusFilter: ReaderStatusFilter
}

export interface ReaderArticleQuerySummary {
  clauseCount: number
  jsonPreview: string
  sourceSummary: string
  summary: string
}

export interface ReaderArticleQuery {
  definition: QueryDefinition
  summary: ReaderArticleQuerySummary
  visibleArticles: ArticleListItemDto[]
}

export const READER_STATUS_FILTER_OPTIONS: Array<{
  label: string
  value: ReaderStatusFilter
}> = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" },
  { label: "Reading", value: "reading" },
  { label: "Read later", value: "readLater" },
  { label: "Starred", value: "starred" },
]
