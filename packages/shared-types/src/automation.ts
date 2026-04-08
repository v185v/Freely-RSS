import type { AIArtifactKind } from "./enums"
import type { AIArtifactId, ArticleId, DeviceId, RuleId, SmartFolderId, SyncEventId } from "./ids"
import type { ISODateTimeString, JsonValue, Nullable } from "./primitives"

export interface RuleDto {
  id: RuleId
  name: string
  enabled: boolean
  priority: number
  conditions: JsonValue
  actions: JsonValue
  scope: string
}

export interface SmartFolderDto {
  id: SmartFolderId
  name: string
  queryDefinition: JsonValue
  sortDefinition: Nullable<JsonValue>
}

export interface AIArtifactDto {
  id: AIArtifactId
  articleId: ArticleId
  kind: AIArtifactKind
  provider: string
  inputHash: string
  result: JsonValue
  createdAt: ISODateTimeString
}

export interface SyncEventDto {
  id: SyncEventId
  entityType: string
  entityId: string
  changeType: string
  payload: JsonValue
  deviceId: DeviceId
  createdAt: ISODateTimeString
}
