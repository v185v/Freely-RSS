import type {
  ArticleDetailDto,
  ArticleListItemDto,
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

export interface ReaderShellData {
  articleDetails: Record<string, ArticleDetailDto>
  articles: ArticleListItemDto[]
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

export interface ReaderViewFilterSummary {
  conditionCount: number
  jsonPreview: string | null
  summary: string
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
