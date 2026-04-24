import type { QueryDefinition } from "@freelyrss/shared-query"
import type {
  AnnotationDto,
  ArticleDetailDto,
  ArticleListItemDto,
  FeedDto,
  FeedSummaryDto,
  FolderDto,
  SmartFolderDto,
  SubscriptionTreeNodeDto,
} from "@freelyrss/shared-types"

export const DEFAULT_SOURCE_ID = "view-unread"

export type ReaderStatusFilter = "all" | "unread" | "reading" | "readLater" | "starred"

export type ReaderSortMode = "newest" | "oldest"

export type ReaderContentMode = "extracted" | "raw"

export type ReaderAnnotationKind = Extract<AnnotationDto["type"], "highlight" | "note">

export type ReaderAnnotationAnchor = {
  contentMode: Extract<ReaderContentMode, "extracted">
  endOffset: number
  paragraphIndex: number
  startOffset: number
}

export type CreateReaderAnnotationInput = {
  anchor: ReaderAnnotationAnchor
  articleId: ArticleDetailDto["article"]["id"]
  color?: AnnotationDto["color"]
  note?: AnnotationDto["note"]
  selectedText: AnnotationDto["selectedText"]
  type: ReaderAnnotationKind
}

export type ReaderThemeTone = "daylight" | "high-contrast" | "midnight"

export type ReaderBaseThemeTone = Exclude<ReaderThemeTone, "high-contrast">

export type ReaderFontFamily = "editorial" | "sans" | "technical"

export type ReaderFontScale = "compact" | "comfortable" | "large"

export type ReaderLineHeight = "tight" | "relaxed" | "airy"

export type ReaderMarginMode = "narrow" | "balanced" | "wide"

export interface ReaderPresentationSettings {
  fontFamily: ReaderFontFamily
  fontScale: ReaderFontScale
  lineHeight: ReaderLineHeight
  marginMode: ReaderMarginMode
  themeTone: ReaderThemeTone
}

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
  smartFolders: SmartFolderDto[]
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
  queryMessage: string | null
  queryMessageTone: "error" | "note" | null
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
