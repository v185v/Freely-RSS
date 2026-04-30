import type { QueryDefinition } from "@freelyrss/shared-query"
import type {
  AnnotationDto,
  ArticleDetailDto,
  ArticleListItemDto,
  CachePolicy,
  FeedDto,
  FeedSummaryDto,
  FolderDto,
  SmartFolderDto,
  SubscriptionTreeNodeDto,
  TagDto,
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

export interface ReaderCacheSettings {
  defaultPolicy: CachePolicy
  maxBytes: number
}

export type ReaderCacheEntryKind = "attachment" | "content"

export type ReaderCacheCleanupReason = "lru" | "policy-mismatch"

export interface ReaderCacheCleanupCandidate {
  articleId: ArticleListItemDto["id"]
  articleTitle: string
  bytes: number
  kind: ReaderCacheEntryKind
  path: string
  reason: ReaderCacheCleanupReason
}

export interface ReaderCacheCleanupReport {
  completedAt: string
  evictedBytes: number
  evictedEntryCount: number
  lruEntryCount: number
  policyMismatchEntryCount: number
  protectedArticleCount: number
  remainingBytes: number
  stillOverBudgetBytes: number
}

export interface ReaderCacheStatus {
  cleanupCandidates: ReaderCacheCleanupCandidate[]
  entryCount: number
  evictableBytes: number
  latestCleanup: ReaderCacheCleanupReport | null
  limitBytes: number
  overBudgetBytes: number
  policyMismatchBytes: number
  protectedArticleCount: number
  protectedBytes: number
  totalBytes: number
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

export type ReaderMarkdownExportMode = "batch" | "single"

export interface ReaderMarkdownExportReport {
  annotationCount: number
  exportedArticleCount: number
  generatedAt: string
  mode: ReaderMarkdownExportMode
  title: string
}

export interface ReaderMarkdownExportResult {
  articleIds: ArticleDetailDto["article"]["id"][]
  fileName: string
  markdownText: string
  report: ReaderMarkdownExportReport
}

export type ReaderDocumentExportFormat = "html" | "pdf"

export type ReaderDocumentExportMode = ReaderMarkdownExportMode

export interface ReaderDocumentExportPresentation extends ReaderPresentationSettings {
  contentMode: ReaderContentMode
}

export interface ReaderDocumentExportReport {
  annotationCount: number
  attachmentCount: number
  contentMode: ReaderContentMode
  exportedArticleCount: number
  format: ReaderDocumentExportFormat
  generatedAt: string
  mode: ReaderDocumentExportMode
  presentationSummary: string
  themeTone: ReaderThemeTone
  title: string
}

export interface ReaderDocumentExportResult {
  articleIds: ArticleDetailDto["article"]["id"][]
  documentText: string
  fileName: string
  report: ReaderDocumentExportReport
}

export type ReaderBatchOperationAction = "add-read-later" | "add-tag" | "delete-cache" | "mark-read"

export type ReaderBatchOperationCommand =
  | {
      action: "add-read-later"
    }
  | {
      action: "add-tag"
      tagId: TagDto["id"]
    }
  | {
      action: "delete-cache"
    }
  | {
      action: "mark-read"
    }

export type ReaderBatchOperationInput = ReaderBatchOperationCommand & {
  articleIds: ArticleListItemDto["id"][]
}

export interface ReaderBatchOperationReport {
  action: ReaderBatchOperationAction
  changedArticleCount: number
  completedAt: string
  evictedBytes: number
  evictedEntryCount: number
  selectedArticleCount: number
  skippedArticleCount: number
  tagName: string | null
}

export interface ReaderBatchOperationResult {
  articleIds: ArticleListItemDto["id"][]
  report: ReaderBatchOperationReport
}

export type ReaderTaskStatusKind =
  | "batch-operation"
  | "cache-cleanup"
  | "document-export"
  | "markdown-export"
  | "opml-export"
  | "opml-import"
  | "source-refresh"

export type ReaderTaskStatusState = "completed" | "failed" | "idle" | "running"

export interface ReaderTaskStatusEntry {
  detail: string
  id: ReaderTaskStatusKind
  recovery: string
  retryLabel: string | null
  scope: string
  status: ReaderTaskStatusState
  title: string
  updatedAt: string | null
}

export interface ReaderTaskStatusSummary {
  completedCount: number
  failedCount: number
  headline: string
  idleCount: number
  runningCount: number
}

export interface ReaderShellData {
  articleDetails: Record<string, ArticleDetailDto>
  articles: ArticleListItemDto[]
  cacheStatus: ReaderCacheStatus
  cacheSettings: ReaderCacheSettings
  feedDetails: Record<string, FeedDto>
  feeds: FeedSummaryDto[]
  folders: FolderDto[]
  navigationEntries: NavigationEntry[]
  quickViewSection: SourceSection
  smartFolders: SmartFolderDto[]
  subscriptionTree: SubscriptionTreeNodeDto[]
  tags: TagDto[]
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
  executionMode: "durable" | "memory"
  searchHighlightTerms: string[]
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
