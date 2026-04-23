use super::{
    AIArtifactId, AIArtifactKind, ArticleId, DeviceId, IsoDateTime, JsonBlob, RuleAuditId,
    RuleAuditMatchResult, RuleId, SmartFolderId, SyncEventId,
};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Rule {
    pub id: RuleId,
    pub name: String,
    pub enabled: bool,
    pub priority: i64,
    pub conditions: JsonBlob,
    pub actions: JsonBlob,
    pub scope: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SmartFolder {
    pub id: SmartFolderId,
    pub name: String,
    pub query_definition: JsonBlob,
    pub sort_definition: Option<JsonBlob>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RuleAudit {
    pub id: RuleAuditId,
    pub rule_id: RuleId,
    pub article_id: ArticleId,
    pub match_result: RuleAuditMatchResult,
    pub input_snapshot: JsonBlob,
    pub planned_commands: JsonBlob,
    pub applied_effects: Option<JsonBlob>,
    pub created_at: IsoDateTime,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AIArtifact {
    pub id: AIArtifactId,
    pub article_id: ArticleId,
    pub kind: AIArtifactKind,
    pub provider: String,
    pub input_hash: String,
    pub result: JsonBlob,
    pub created_at: IsoDateTime,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SyncEvent {
    pub id: SyncEventId,
    pub entity_type: String,
    pub entity_id: String,
    pub change_type: String,
    pub payload: JsonBlob,
    pub device_id: DeviceId,
    pub created_at: IsoDateTime,
}
