import type { AIArtifactDto } from "./automation"
import type { AnnotationType, AttachmentType, ImportanceLevel, ReadState } from "./enums"
import type { AnnotationId, ArticleId, AttachmentId, FeedId, TagId } from "./ids"
import type { TagDto } from "./organization"
import type {
  CachePath,
  HexColor,
  ISODateTimeString,
  JsonValue,
  LanguageCode,
  Nullable,
  UrlString,
} from "./primitives"

export interface ArticleDto {
  id: ArticleId
  feedId: FeedId
  sourceGuid: Nullable<string>
  title: string
  author: Nullable<string>
  summary: Nullable<string>
  contentRaw: Nullable<string>
  contentExtracted: Nullable<string>
  canonicalUrl: Nullable<UrlString>
  originalUrl: Nullable<UrlString>
  publishedAt: Nullable<ISODateTimeString>
  fetchedAt: ISODateTimeString
  language: Nullable<LanguageCode>
  thumbnail: Nullable<UrlString>
  wordCount: Nullable<number>
  contentHash: Nullable<string>
}

export interface AttachmentDto {
  id: AttachmentId
  articleId: ArticleId
  type: AttachmentType
  url: UrlString
  mimeType: Nullable<string>
  duration: Nullable<number>
  size: Nullable<number>
  localCachePath: Nullable<CachePath>
}

export interface UserStateDto {
  articleId: ArticleId
  readState: ReadState
  starred: boolean
  liked: boolean
  importance: ImportanceLevel
  readLater: boolean
  readingProgress: number
  lastOpenedAt: Nullable<ISODateTimeString>
}

export interface AnnotationDto {
  id: AnnotationId
  articleId: ArticleId
  type: AnnotationType
  selectedText: string
  anchor: JsonValue
  note: Nullable<string>
  color: Nullable<HexColor>
  createdAt: ISODateTimeString
}

export interface ArticleListItemDto {
  id: ArticleId
  feedId: FeedId
  feedTitle: string
  title: string
  author: Nullable<string>
  summary: Nullable<string>
  searchSnippet: Nullable<string>
  publishedAt: Nullable<ISODateTimeString>
  thumbnail: Nullable<UrlString>
  estimatedReadingMinutes: Nullable<number>
  state: UserStateDto
  tagIds: TagId[]
  attachmentCount: number
}

export interface ArticleDetailDto {
  article: ArticleDto
  feed: {
    id: FeedId
    title: string
    displayTitle: string
    siteUrl: Nullable<UrlString>
    icon: Nullable<UrlString>
  }
  state: UserStateDto
  tags: TagDto[]
  attachments: AttachmentDto[]
  annotations: AnnotationDto[]
  aiArtifacts: AIArtifactDto[]
}
