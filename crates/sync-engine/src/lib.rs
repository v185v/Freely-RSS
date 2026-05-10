//! Sync engine primitives for FreelyRSS.

mod batch;
mod error;
mod merge;
mod replay;
mod retry;

pub use batch::{SyncCursor, SyncEventBatch, SyncEventEnvelope, SyncEventKey, package_event_batch};
pub use error::SyncEngineError;
pub use merge::{MergedEntity, SyncMergeOutcome, SyncMergeState, merge_event_batch};
pub use replay::{SyncReplayOutcome, SyncReplayState, replay_event_batch};
pub use retry::{
    RetryDisposition, RetryFailureReport, RetryPolicy, RetryState, record_sync_failure,
    record_sync_success,
};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum SyncEventEntityType {
    Feed,
    Folder,
    Tag,
    FeedTag,
    ArticleTag,
    UserState,
    Annotation,
    Rule,
    SmartFolder,
}

impl SyncEventEntityType {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Feed => "feed",
            Self::Folder => "folder",
            Self::Tag => "tag",
            Self::FeedTag => "feed-tag",
            Self::ArticleTag => "article-tag",
            Self::UserState => "user-state",
            Self::Annotation => "annotation",
            Self::Rule => "rule",
            Self::SmartFolder => "smart-folder",
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum SyncEventChangeType {
    Create,
    Update,
    Delete,
    Attach,
    Detach,
    Snapshot,
}

impl SyncEventChangeType {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Create => "create",
            Self::Update => "update",
            Self::Delete => "delete",
            Self::Attach => "attach",
            Self::Detach => "detach",
            Self::Snapshot => "snapshot",
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum EncryptedBlobKind {
    ArticleContent,
    AttachmentContent,
    EventBatch,
    Snapshot,
}

impl EncryptedBlobKind {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::ArticleContent => "article-content",
            Self::AttachmentContent => "attachment-content",
            Self::EventBatch => "event-batch",
            Self::Snapshot => "snapshot",
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum SyncFieldBoundary {
    SyncEvent,
    LocalOnly,
    LazyBlob,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum SyncDataEntityType {
    Feed,
    Article,
    Attachment,
    Folder,
    Tag,
    FeedTag,
    ArticleTag,
    UserState,
    Annotation,
    Rule,
    SmartFolder,
    RuleAudit,
    SearchIndex,
    TaskStatus,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum FeedSyncField {
    Title,
    SiteUrl,
    FeedUrl,
    Format,
    Icon,
    FolderId,
    CustomName,
    SortOrder,
    UpdateInterval,
    CachePolicy,
}

impl FeedSyncField {
    pub const fn as_payload_field(self) -> &'static str {
        match self {
            Self::Title => "title",
            Self::SiteUrl => "site_url",
            Self::FeedUrl => "feed_url",
            Self::Format => "format",
            Self::Icon => "icon",
            Self::FolderId => "folder_id",
            Self::CustomName => "custom_name",
            Self::SortOrder => "sort_order",
            Self::UpdateInterval => "update_interval",
            Self::CachePolicy => "cache_policy",
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum UserStateSyncField {
    ReadState,
    Starred,
    Liked,
    Importance,
    ReadLater,
    ReadingProgress,
    LastOpenedAt,
}

impl UserStateSyncField {
    pub const fn as_payload_field(self) -> &'static str {
        match self {
            Self::ReadState => "read_state",
            Self::Starred => "starred",
            Self::Liked => "liked",
            Self::Importance => "importance",
            Self::ReadLater => "read_later",
            Self::ReadingProgress => "reading_progress",
            Self::LastOpenedAt => "last_opened_at",
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum AnnotationSyncField {
    Type,
    SelectedText,
    Anchor,
    Note,
    Color,
    CreatedAt,
}

impl AnnotationSyncField {
    pub const fn as_payload_field(self) -> &'static str {
        match self {
            Self::Type => "type",
            Self::SelectedText => "selected_text",
            Self::Anchor => "anchor",
            Self::Note => "note",
            Self::Color => "color",
            Self::CreatedAt => "created_at",
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SyncEventBoundary {
    pub entity_type: SyncEventEntityType,
    pub entity_id: String,
    pub change_type: SyncEventChangeType,
    pub payload_fields: Vec<&'static str>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct LocalOnlyBoundary {
    pub entity_type: SyncDataEntityType,
    pub entity_id: String,
    pub reason: &'static str,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct LazyBlobBoundary {
    pub owner_entity_type: SyncDataEntityType,
    pub owner_entity_id: String,
    pub blob_kind: EncryptedBlobKind,
    pub referenced_fields: Vec<&'static str>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum SyncBoundaryDecision {
    Event(SyncEventBoundary),
    LocalOnly(LocalOnlyBoundary),
    LazyBlob(LazyBlobBoundary),
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum SyncChange {
    UpdateFeed {
        feed_id: String,
        fields: Vec<FeedSyncField>,
    },
    UpdateUserState {
        article_id: String,
        fields: Vec<UserStateSyncField>,
    },
    CreateAnnotation {
        annotation_id: String,
    },
    UpdateAnnotation {
        annotation_id: String,
        fields: Vec<AnnotationSyncField>,
    },
    DeleteAnnotation {
        annotation_id: String,
    },
    AttachArticleTag {
        article_id: String,
        tag_id: String,
    },
    DetachArticleTag {
        article_id: String,
        tag_id: String,
    },
    AttachFeedTag {
        feed_id: String,
        tag_id: String,
    },
    DetachFeedTag {
        feed_id: String,
        tag_id: String,
    },
    UpdateArticleContentBlob {
        article_id: String,
    },
    MaterializeArticleContentCache {
        article_id: String,
    },
    EvictArticleContentCache {
        article_id: String,
    },
    RefreshFeedDiagnostics {
        feed_id: String,
    },
}

pub fn classify_field(entity_type: SyncDataEntityType, field_name: &str) -> SyncFieldBoundary {
    if field_in(field_name, sync_event_fields(entity_type)) {
        SyncFieldBoundary::SyncEvent
    } else if field_in(field_name, lazy_blob_fields(entity_type)) {
        SyncFieldBoundary::LazyBlob
    } else {
        SyncFieldBoundary::LocalOnly
    }
}

pub fn classify_change(change: SyncChange) -> SyncBoundaryDecision {
    match change {
        SyncChange::UpdateFeed { feed_id, fields } => {
            SyncBoundaryDecision::Event(SyncEventBoundary {
                entity_type: SyncEventEntityType::Feed,
                entity_id: feed_id,
                change_type: SyncEventChangeType::Update,
                payload_fields: fields
                    .into_iter()
                    .map(FeedSyncField::as_payload_field)
                    .collect(),
            })
        }
        SyncChange::UpdateUserState { article_id, fields } => {
            SyncBoundaryDecision::Event(SyncEventBoundary {
                entity_type: SyncEventEntityType::UserState,
                entity_id: article_id,
                change_type: SyncEventChangeType::Update,
                payload_fields: fields
                    .into_iter()
                    .map(UserStateSyncField::as_payload_field)
                    .collect(),
            })
        }
        SyncChange::CreateAnnotation { annotation_id } => {
            SyncBoundaryDecision::Event(SyncEventBoundary {
                entity_type: SyncEventEntityType::Annotation,
                entity_id: annotation_id,
                change_type: SyncEventChangeType::Create,
                payload_fields: annotation_sync_fields().to_vec(),
            })
        }
        SyncChange::UpdateAnnotation {
            annotation_id,
            fields,
        } => SyncBoundaryDecision::Event(SyncEventBoundary {
            entity_type: SyncEventEntityType::Annotation,
            entity_id: annotation_id,
            change_type: SyncEventChangeType::Update,
            payload_fields: fields
                .into_iter()
                .map(AnnotationSyncField::as_payload_field)
                .collect(),
        }),
        SyncChange::DeleteAnnotation { annotation_id } => {
            SyncBoundaryDecision::Event(SyncEventBoundary {
                entity_type: SyncEventEntityType::Annotation,
                entity_id: annotation_id,
                change_type: SyncEventChangeType::Delete,
                payload_fields: Vec::new(),
            })
        }
        SyncChange::AttachArticleTag { article_id, tag_id } => {
            SyncBoundaryDecision::Event(SyncEventBoundary {
                entity_type: SyncEventEntityType::ArticleTag,
                entity_id: relation_entity_id(&article_id, &tag_id),
                change_type: SyncEventChangeType::Attach,
                payload_fields: vec!["article_id", "tag_id"],
            })
        }
        SyncChange::DetachArticleTag { article_id, tag_id } => {
            SyncBoundaryDecision::Event(SyncEventBoundary {
                entity_type: SyncEventEntityType::ArticleTag,
                entity_id: relation_entity_id(&article_id, &tag_id),
                change_type: SyncEventChangeType::Detach,
                payload_fields: vec!["article_id", "tag_id"],
            })
        }
        SyncChange::AttachFeedTag { feed_id, tag_id } => {
            SyncBoundaryDecision::Event(SyncEventBoundary {
                entity_type: SyncEventEntityType::FeedTag,
                entity_id: relation_entity_id(&feed_id, &tag_id),
                change_type: SyncEventChangeType::Attach,
                payload_fields: vec!["feed_id", "tag_id"],
            })
        }
        SyncChange::DetachFeedTag { feed_id, tag_id } => {
            SyncBoundaryDecision::Event(SyncEventBoundary {
                entity_type: SyncEventEntityType::FeedTag,
                entity_id: relation_entity_id(&feed_id, &tag_id),
                change_type: SyncEventChangeType::Detach,
                payload_fields: vec!["feed_id", "tag_id"],
            })
        }
        SyncChange::UpdateArticleContentBlob { article_id } => {
            SyncBoundaryDecision::LazyBlob(LazyBlobBoundary {
                owner_entity_type: SyncDataEntityType::Article,
                owner_entity_id: article_id,
                blob_kind: EncryptedBlobKind::ArticleContent,
                referenced_fields: vec!["content_raw", "content_extracted"],
            })
        }
        SyncChange::MaterializeArticleContentCache { article_id }
        | SyncChange::EvictArticleContentCache { article_id } => {
            SyncBoundaryDecision::LocalOnly(LocalOnlyBoundary {
                entity_type: SyncDataEntityType::Article,
                entity_id: article_id,
                reason: "article body cache materialization is device-local; synced body bytes use encrypted lazy blobs",
            })
        }
        SyncChange::RefreshFeedDiagnostics { feed_id } => {
            SyncBoundaryDecision::LocalOnly(LocalOnlyBoundary {
                entity_type: SyncDataEntityType::Feed,
                entity_id: feed_id,
                reason: "feed health, cache validators, and fetch errors describe this device's last fetch attempt",
            })
        }
    }
}

pub const fn sync_event_fields(entity_type: SyncDataEntityType) -> &'static [&'static str] {
    match entity_type {
        SyncDataEntityType::Feed => &[
            "title",
            "site_url",
            "feed_url",
            "format",
            "icon",
            "folder_id",
            "custom_name",
            "sort_order",
            "update_interval",
            "cache_policy",
        ],
        SyncDataEntityType::Folder => &["name", "parent_id", "sort_order", "kind"],
        SyncDataEntityType::Tag => &["name", "scope", "color"],
        SyncDataEntityType::FeedTag => &["feed_id", "tag_id"],
        SyncDataEntityType::ArticleTag => &["article_id", "tag_id"],
        SyncDataEntityType::UserState => &[
            "read_state",
            "starred",
            "liked",
            "importance",
            "read_later",
            "reading_progress",
            "last_opened_at",
        ],
        SyncDataEntityType::Annotation => annotation_sync_fields(),
        SyncDataEntityType::Rule => &[
            "name",
            "enabled",
            "priority",
            "conditions",
            "actions",
            "scope",
        ],
        SyncDataEntityType::SmartFolder => &["name", "query_definition", "sort_definition"],
        SyncDataEntityType::Article
        | SyncDataEntityType::Attachment
        | SyncDataEntityType::RuleAudit
        | SyncDataEntityType::SearchIndex
        | SyncDataEntityType::TaskStatus => &[],
    }
}

pub const fn local_only_fields(entity_type: SyncDataEntityType) -> &'static [&'static str] {
    match entity_type {
        SyncDataEntityType::Feed => &[
            "health_status",
            "last_checked_at",
            "last_success_at",
            "etag",
            "last_modified",
            "last_error_kind",
            "last_error_message",
            "last_error_at",
            "consecutive_failures",
        ],
        SyncDataEntityType::Article => &["fetched_at"],
        SyncDataEntityType::Attachment => &["local_cache_path"],
        SyncDataEntityType::RuleAudit => &[
            "input_snapshot",
            "planned_commands",
            "applied_effects",
            "created_at",
        ],
        SyncDataEntityType::SearchIndex => &["ArticleSearch", "ArticleSearchSource"],
        SyncDataEntityType::TaskStatus => &["mutation_state", "retry_label", "recovery_text"],
        SyncDataEntityType::Folder
        | SyncDataEntityType::Tag
        | SyncDataEntityType::FeedTag
        | SyncDataEntityType::ArticleTag
        | SyncDataEntityType::UserState
        | SyncDataEntityType::Annotation
        | SyncDataEntityType::Rule
        | SyncDataEntityType::SmartFolder => &[],
    }
}

pub const fn lazy_blob_fields(entity_type: SyncDataEntityType) -> &'static [&'static str] {
    match entity_type {
        SyncDataEntityType::Article => &["content_raw", "content_extracted"],
        SyncDataEntityType::Attachment => &["url", "mime_type", "duration", "size"],
        SyncDataEntityType::Feed
        | SyncDataEntityType::Folder
        | SyncDataEntityType::Tag
        | SyncDataEntityType::FeedTag
        | SyncDataEntityType::ArticleTag
        | SyncDataEntityType::UserState
        | SyncDataEntityType::Annotation
        | SyncDataEntityType::Rule
        | SyncDataEntityType::SmartFolder
        | SyncDataEntityType::RuleAudit
        | SyncDataEntityType::SearchIndex
        | SyncDataEntityType::TaskStatus => &[],
    }
}

const fn annotation_sync_fields() -> &'static [&'static str] {
    &[
        "type",
        "selected_text",
        "anchor",
        "note",
        "color",
        "created_at",
    ]
}

fn field_in(field_name: &str, candidates: &[&str]) -> bool {
    candidates.contains(&field_name)
}

fn relation_entity_id(left_id: &str, right_id: &str) -> String {
    format!("{left_id}:{right_id}")
}

#[cfg(test)]
mod tests {
    use super::{
        AnnotationSyncField, EncryptedBlobKind, FeedSyncField, SyncBoundaryDecision, SyncChange,
        SyncDataEntityType, SyncEventChangeType, SyncEventEntityType, SyncFieldBoundary,
        UserStateSyncField, classify_change, classify_field,
    };

    #[test]
    fn feed_folder_change_is_sync_event_payload() {
        let decision = classify_change(SyncChange::UpdateFeed {
            feed_id: "feed-rust".to_owned(),
            fields: vec![FeedSyncField::FolderId],
        });

        let SyncBoundaryDecision::Event(event) = decision else {
            panic!("feed folder changes must become sync events");
        };

        assert_eq!(event.entity_type, SyncEventEntityType::Feed);
        assert_eq!(event.entity_id, "feed-rust");
        assert_eq!(event.change_type, SyncEventChangeType::Update);
        assert_eq!(event.payload_fields, ["folder_id"]);
    }

    #[test]
    fn article_state_change_is_sync_event_payload() {
        let decision = classify_change(SyncChange::UpdateUserState {
            article_id: "article-1".to_owned(),
            fields: vec![
                UserStateSyncField::ReadState,
                UserStateSyncField::ReadingProgress,
            ],
        });

        let SyncBoundaryDecision::Event(event) = decision else {
            panic!("user state changes must become sync events");
        };

        assert_eq!(event.entity_type, SyncEventEntityType::UserState);
        assert_eq!(event.entity_type.as_str(), "user-state");
        assert_eq!(event.entity_id, "article-1");
        assert_eq!(event.change_type, SyncEventChangeType::Update);
        assert_eq!(event.payload_fields, ["read_state", "reading_progress"]);
    }

    #[test]
    fn annotation_change_is_sync_event_payload() {
        let decision = classify_change(SyncChange::UpdateAnnotation {
            annotation_id: "annotation-1".to_owned(),
            fields: vec![AnnotationSyncField::Anchor, AnnotationSyncField::Note],
        });

        let SyncBoundaryDecision::Event(event) = decision else {
            panic!("annotation changes must become sync events");
        };

        assert_eq!(event.entity_type, SyncEventEntityType::Annotation);
        assert_eq!(event.entity_id, "annotation-1");
        assert_eq!(event.change_type, SyncEventChangeType::Update);
        assert_eq!(event.payload_fields, ["anchor", "note"]);
    }

    #[test]
    fn body_cache_materialization_stays_local() {
        let decision = classify_change(SyncChange::MaterializeArticleContentCache {
            article_id: "article-1".to_owned(),
        });

        let SyncBoundaryDecision::LocalOnly(local) = decision else {
            panic!("device cache materialization must stay local");
        };

        assert_eq!(local.entity_type, SyncDataEntityType::Article);
        assert_eq!(local.entity_id, "article-1");
        assert!(local.reason.contains("device-local"));
    }

    #[test]
    fn article_body_bytes_are_lazy_encrypted_blobs() {
        let decision = classify_change(SyncChange::UpdateArticleContentBlob {
            article_id: "article-1".to_owned(),
        });

        let SyncBoundaryDecision::LazyBlob(blob) = decision else {
            panic!("article body bytes must not be inlined into sync events");
        };

        assert_eq!(blob.owner_entity_type, SyncDataEntityType::Article);
        assert_eq!(blob.owner_entity_id, "article-1");
        assert_eq!(blob.blob_kind, EncryptedBlobKind::ArticleContent);
        assert_eq!(blob.blob_kind.as_str(), "article-content");
        assert_eq!(blob.referenced_fields, ["content_raw", "content_extracted"]);
    }

    #[test]
    fn field_classification_separates_event_local_and_lazy_boundaries() {
        assert_eq!(
            classify_field(SyncDataEntityType::UserState, "read_state"),
            SyncFieldBoundary::SyncEvent
        );
        assert_eq!(
            classify_field(SyncDataEntityType::Feed, "last_error_message"),
            SyncFieldBoundary::LocalOnly
        );
        assert_eq!(
            classify_field(SyncDataEntityType::Article, "content_extracted"),
            SyncFieldBoundary::LazyBlob
        );
        assert_eq!(
            classify_field(SyncDataEntityType::TaskStatus, "mutation_state"),
            SyncFieldBoundary::LocalOnly
        );
    }
}
