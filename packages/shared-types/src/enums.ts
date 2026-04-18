export const FEED_FORMATS = ["rss", "atom", "json-feed"] as const
export type FeedFormat = (typeof FEED_FORMATS)[number]

export const FEED_HEALTH_STATUSES = ["pending", "healthy", "degraded", "error", "paused"] as const
export type FeedHealthStatus = (typeof FEED_HEALTH_STATUSES)[number]

export const FEED_ERROR_KINDS = ["network", "permission", "parse", "empty"] as const
export type FeedErrorKind = (typeof FEED_ERROR_KINDS)[number]

export const FOLDER_KINDS = ["regular", "system", "group"] as const
export type FolderKind = (typeof FOLDER_KINDS)[number]

export const TAG_SCOPES = ["feed", "article"] as const
export type TagScope = (typeof TAG_SCOPES)[number]

export const ATTACHMENT_TYPES = ["image", "audio", "video", "file"] as const
export type AttachmentType = (typeof ATTACHMENT_TYPES)[number]

export const READ_STATES = ["unread", "reading", "read"] as const
export type ReadState = (typeof READ_STATES)[number]

export const IMPORTANCE_LEVELS = ["low", "normal", "high"] as const
export type ImportanceLevel = (typeof IMPORTANCE_LEVELS)[number]

export const ANNOTATION_TYPES = ["highlight", "note", "comment"] as const
export type AnnotationType = (typeof ANNOTATION_TYPES)[number]

export const AI_ARTIFACT_KINDS = ["summary", "keywords", "translation", "question-answer"] as const
export type AIArtifactKind = (typeof AI_ARTIFACT_KINDS)[number]
