import type { FolderKind, TagScope } from "./enums"
import type { ArticleId, FeedId, FolderId, TagId } from "./ids"
import type { HexColor, ISODateTimeString, Nullable } from "./primitives"

export interface FolderDto {
  id: FolderId
  name: string
  parentId: Nullable<FolderId>
  sortOrder: number
  kind: FolderKind
}

export interface TagDto {
  id: TagId
  name: string
  scope: TagScope
  color: Nullable<HexColor>
  createdAt: ISODateTimeString
}

export interface FeedTagDto {
  feedId: FeedId
  tagId: TagId
}

export interface ArticleTagDto {
  articleId: ArticleId
  tagId: TagId
}
