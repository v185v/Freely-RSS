import type { FeedFormat, FeedHealthStatus } from "./enums"
import type { FeedId, FolderId, TagId } from "./ids"
import type { FolderDto } from "./organization"
import type { ISODateTimeString, Nullable, UrlString } from "./primitives"

export interface FeedDto {
  id: FeedId
  title: string
  siteUrl: Nullable<UrlString>
  feedUrl: UrlString
  format: FeedFormat
  icon: Nullable<UrlString>
  folderId: Nullable<FolderId>
  customName: Nullable<string>
  sortOrder: number
  updateInterval: Nullable<number>
  healthStatus: FeedHealthStatus
  lastCheckedAt: Nullable<ISODateTimeString>
  lastSuccessAt: Nullable<ISODateTimeString>
  etag: Nullable<string>
  lastModified: Nullable<string>
}

export interface FeedSummaryDto {
  id: FeedId
  title: string
  displayTitle: string
  siteUrl: Nullable<UrlString>
  icon: Nullable<UrlString>
  folderId: Nullable<FolderId>
  healthStatus: FeedHealthStatus
  unreadCount: number
  totalCount: number
  tagIds: TagId[]
}

export interface FolderTreeNodeDto {
  nodeType: "folder"
  folder: FolderDto
  childFolderIds: FolderId[]
  feedIds: FeedId[]
}

export interface FeedTreeNodeDto {
  nodeType: "feed"
  feed: FeedSummaryDto
}

export type SubscriptionTreeNodeDto = FeedTreeNodeDto | FolderTreeNodeDto
