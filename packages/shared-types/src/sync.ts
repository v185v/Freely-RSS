import type { DeviceId, EncryptedBlobId, SyncEventId, UserId } from "./ids"
import type { ISODateTimeString, JsonValue, Nullable } from "./primitives"

export const SYNC_EVENT_ENTITY_TYPES = [
  "feed",
  "folder",
  "tag",
  "feed-tag",
  "article-tag",
  "user-state",
  "annotation",
  "rule",
  "smart-folder",
] as const
export type SyncEventEntityType = (typeof SYNC_EVENT_ENTITY_TYPES)[number]

export const SYNC_EVENT_CHANGE_TYPES = [
  "create",
  "update",
  "delete",
  "attach",
  "detach",
  "snapshot",
] as const
export type SyncEventChangeType = (typeof SYNC_EVENT_CHANGE_TYPES)[number]

export const SYNC_FIELD_BOUNDARIES = ["sync-event", "local-only", "lazy-blob"] as const
export type SyncFieldBoundary = (typeof SYNC_FIELD_BOUNDARIES)[number]

export const ENCRYPTED_BLOB_KINDS = [
  "article-content",
  "attachment-content",
  "event-batch",
  "snapshot",
] as const
export type EncryptedBlobKind = (typeof ENCRYPTED_BLOB_KINDS)[number]

export interface SyncEventPayloadDto {
  changedFields: string[]
  blobIds?: EncryptedBlobId[]
  tombstone?: boolean
  value?: JsonValue
}

export interface EncryptedSyncPayloadDto {
  algorithm: "AES-256-GCM"
  keyId: string
  nonce: string
  ciphertext: string
}

export interface SyncEventDto {
  id: SyncEventId
  entityType: SyncEventEntityType
  entityId: string
  changeType: SyncEventChangeType
  payload: SyncEventPayloadDto
  deviceId: DeviceId
  createdAt: ISODateTimeString
}

export interface EncryptedSyncEventDto {
  id: SyncEventId
  entityType: SyncEventEntityType
  entityId: string
  changeType: SyncEventChangeType
  encryptedPayload: EncryptedSyncPayloadDto
  deviceId: DeviceId
  createdAt: ISODateTimeString
}

export interface SyncFieldBoundaryDto {
  entityType: string
  fieldName: string
  boundary: SyncFieldBoundary
  reason: string
}

export interface SyncUserDto {
  id: UserId
  createdAt: ISODateTimeString
  disabledAt: Nullable<ISODateTimeString>
  primaryEmailHash: Nullable<string>
}

export interface SyncDeviceDto {
  id: DeviceId
  userId: UserId
  displayName: string
  publicKey: string
  registeredAt: ISODateTimeString
  lastSeenAt: Nullable<ISODateTimeString>
}

export interface EncryptedBlobDto {
  id: EncryptedBlobId
  userId: UserId
  kind: EncryptedBlobKind
  storageKey: string
  byteSize: number
  checksum: string
  createdAt: ISODateTimeString
  referencedByEventId: Nullable<SyncEventId>
}

export interface UserSettingsDto {
  userId: UserId
  settings: JsonValue
  version: number
  updatedAt: ISODateTimeString
}

export interface MasterKeyRecoveryKitDto {
  algorithm: "AES-256-GCM"
  keyDerivation: "PBKDF2-HMAC-SHA256:210000"
  salt: string
  nonce: string
  wrappedMasterKey: string
  masterKeyId: string
}

export const SYNC_EVENT_FIELD_BOUNDARIES = {
  feed: [
    "title",
    "siteUrl",
    "feedUrl",
    "format",
    "icon",
    "folderId",
    "customName",
    "sortOrder",
    "updateInterval",
    "cachePolicy",
  ],
  folder: ["name", "parentId", "sortOrder", "kind"],
  tag: ["name", "scope", "color"],
  feedTag: ["feedId", "tagId"],
  articleTag: ["articleId", "tagId"],
  userState: [
    "readState",
    "starred",
    "liked",
    "importance",
    "readLater",
    "readingProgress",
    "lastOpenedAt",
  ],
  annotation: ["type", "selectedText", "anchor", "note", "color", "createdAt"],
  rule: ["name", "enabled", "priority", "conditions", "actions", "scope"],
  smartFolder: ["name", "queryDefinition", "sortDefinition"],
} as const

export const LOCAL_ONLY_FIELD_BOUNDARIES = {
  feed: [
    "healthStatus",
    "lastCheckedAt",
    "lastSuccessAt",
    "etag",
    "lastModified",
    "lastErrorKind",
    "lastErrorMessage",
    "lastErrorAt",
    "consecutiveFailures",
  ],
  article: ["fetchedAt"],
  attachment: ["localCachePath"],
  ruleAudit: ["inputSnapshot", "plannedCommands", "appliedEffects", "createdAt"],
  search: ["ArticleSearch", "ArticleSearchSource"],
  taskStatus: ["mutationState", "retryLabel", "recoveryText"],
} as const

export const LAZY_BLOB_FIELD_BOUNDARIES = {
  article: ["contentRaw", "contentExtracted"],
  attachment: ["url", "mimeType", "duration", "size"],
} as const
