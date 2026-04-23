use crate::model::{
    AIArtifact, AIArtifactId, AIArtifactKind, Annotation, AnnotationId, AnnotationType, Article,
    ArticleId, ArticleTag, Attachment, AttachmentId, AttachmentType, CachePath, DeviceId, Feed,
    FeedErrorKind, FeedFormat, FeedHealthStatus, FeedId, FeedTag, Folder, FolderId, FolderKind,
    HexColor, ImportanceLevel, IsoDateTime, JsonBlob, LanguageCode, ModelError, ReadState, Rule,
    RuleAudit, RuleAuditId, RuleAuditMatchResult, RuleId, SmartFolder, SmartFolderId, SyncEvent,
    SyncEventId, Tag, TagId, TagScope, UrlString, UserState,
};

#[derive(Clone, Debug, PartialEq, Eq)]
struct FolderRecord {
    id: String,
    name: String,
    parent_id: Option<String>,
    sort_order: i64,
    kind: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct TagRecord {
    id: String,
    name: String,
    scope: String,
    color: Option<String>,
    created_at: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct FeedTagRecord {
    feed_id: String,
    tag_id: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct ArticleTagRecord {
    article_id: String,
    tag_id: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct FeedRecord {
    id: String,
    title: String,
    site_url: Option<String>,
    feed_url: String,
    format: String,
    icon: Option<String>,
    folder_id: Option<String>,
    custom_name: Option<String>,
    sort_order: i64,
    update_interval: Option<i64>,
    health_status: String,
    last_checked_at: Option<String>,
    last_success_at: Option<String>,
    etag: Option<String>,
    last_modified: Option<String>,
    last_error_kind: Option<String>,
    last_error_message: Option<String>,
    last_error_at: Option<String>,
    consecutive_failures: i64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct ArticleRecord {
    id: String,
    feed_id: String,
    source_guid: Option<String>,
    title: String,
    author: Option<String>,
    summary: Option<String>,
    content_raw: Option<String>,
    content_extracted: Option<String>,
    canonical_url: Option<String>,
    original_url: Option<String>,
    published_at: Option<String>,
    fetched_at: String,
    language: Option<String>,
    thumbnail: Option<String>,
    word_count: Option<i64>,
    content_hash: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct AttachmentRecord {
    id: String,
    article_id: String,
    attachment_type: String,
    url: String,
    mime_type: Option<String>,
    duration: Option<i64>,
    size: Option<i64>,
    local_cache_path: Option<String>,
}

#[derive(Clone, Debug, PartialEq)]
struct UserStateRecord {
    article_id: String,
    read_state: String,
    starred: i64,
    liked: i64,
    importance: String,
    read_later: i64,
    reading_progress: f64,
    last_opened_at: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct AnnotationRecord {
    id: String,
    article_id: String,
    annotation_type: String,
    selected_text: String,
    anchor: String,
    note: Option<String>,
    color: Option<String>,
    created_at: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct RuleRecord {
    id: String,
    name: String,
    enabled: i64,
    priority: i64,
    conditions: String,
    actions: String,
    scope: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct SmartFolderRecord {
    id: String,
    name: String,
    query_definition: String,
    sort_definition: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct RuleAuditRecord {
    id: String,
    rule_id: String,
    article_id: String,
    match_result: String,
    input_snapshot: String,
    planned_commands: String,
    applied_effects: Option<String>,
    created_at: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct AIArtifactRecord {
    id: String,
    article_id: String,
    kind: String,
    provider: String,
    input_hash: String,
    result: String,
    created_at: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct SyncEventRecord {
    id: String,
    entity_type: String,
    entity_id: String,
    change_type: String,
    payload: String,
    device_id: String,
    created_at: String,
}

impl TryFrom<FolderRecord> for Folder {
    type Error = ModelError;

    fn try_from(record: FolderRecord) -> Result<Self, Self::Error> {
        Ok(Self {
            id: FolderId::try_from(record.id)?,
            name: record.name,
            parent_id: record.parent_id.map(FolderId::try_from).transpose()?,
            sort_order: record.sort_order,
            kind: FolderKind::try_from(record.kind)?,
        })
    }
}

impl From<Folder> for FolderRecord {
    fn from(value: Folder) -> Self {
        Self {
            id: value.id.into(),
            name: value.name,
            parent_id: value.parent_id.map(Into::into),
            sort_order: value.sort_order,
            kind: value.kind.as_str().to_owned(),
        }
    }
}

impl TryFrom<TagRecord> for Tag {
    type Error = ModelError;

    fn try_from(record: TagRecord) -> Result<Self, Self::Error> {
        Ok(Self {
            id: TagId::try_from(record.id)?,
            name: record.name,
            scope: TagScope::try_from(record.scope)?,
            color: record.color.map(HexColor::try_from).transpose()?,
            created_at: IsoDateTime::try_from(record.created_at)?,
        })
    }
}

impl From<Tag> for TagRecord {
    fn from(value: Tag) -> Self {
        Self {
            id: value.id.into(),
            name: value.name,
            scope: value.scope.as_str().to_owned(),
            color: value.color.map(Into::into),
            created_at: value.created_at.into(),
        }
    }
}

impl TryFrom<FeedTagRecord> for FeedTag {
    type Error = ModelError;

    fn try_from(record: FeedTagRecord) -> Result<Self, Self::Error> {
        Ok(Self {
            feed_id: FeedId::try_from(record.feed_id)?,
            tag_id: TagId::try_from(record.tag_id)?,
        })
    }
}

impl From<FeedTag> for FeedTagRecord {
    fn from(value: FeedTag) -> Self {
        Self {
            feed_id: value.feed_id.into(),
            tag_id: value.tag_id.into(),
        }
    }
}

impl TryFrom<ArticleTagRecord> for ArticleTag {
    type Error = ModelError;

    fn try_from(record: ArticleTagRecord) -> Result<Self, Self::Error> {
        Ok(Self {
            article_id: ArticleId::try_from(record.article_id)?,
            tag_id: TagId::try_from(record.tag_id)?,
        })
    }
}

impl From<ArticleTag> for ArticleTagRecord {
    fn from(value: ArticleTag) -> Self {
        Self {
            article_id: value.article_id.into(),
            tag_id: value.tag_id.into(),
        }
    }
}

impl TryFrom<FeedRecord> for Feed {
    type Error = ModelError;

    fn try_from(record: FeedRecord) -> Result<Self, Self::Error> {
        Ok(Self {
            id: FeedId::try_from(record.id)?,
            title: record.title,
            site_url: record.site_url.map(UrlString::try_from).transpose()?,
            feed_url: UrlString::try_from(record.feed_url)?,
            format: FeedFormat::try_from(record.format)?,
            icon: record.icon.map(UrlString::try_from).transpose()?,
            folder_id: record.folder_id.map(FolderId::try_from).transpose()?,
            custom_name: record.custom_name,
            sort_order: record.sort_order,
            update_interval: record.update_interval,
            health_status: FeedHealthStatus::try_from(record.health_status)?,
            last_checked_at: record
                .last_checked_at
                .map(IsoDateTime::try_from)
                .transpose()?,
            last_success_at: record
                .last_success_at
                .map(IsoDateTime::try_from)
                .transpose()?,
            etag: record.etag,
            last_modified: record.last_modified,
            last_error_kind: record
                .last_error_kind
                .map(FeedErrorKind::try_from)
                .transpose()?,
            last_error_message: record.last_error_message,
            last_error_at: record
                .last_error_at
                .map(IsoDateTime::try_from)
                .transpose()?,
            consecutive_failures: record.consecutive_failures,
        })
    }
}

impl From<Feed> for FeedRecord {
    fn from(value: Feed) -> Self {
        Self {
            id: value.id.into(),
            title: value.title,
            site_url: value.site_url.map(Into::into),
            feed_url: value.feed_url.into(),
            format: value.format.as_str().to_owned(),
            icon: value.icon.map(Into::into),
            folder_id: value.folder_id.map(Into::into),
            custom_name: value.custom_name,
            sort_order: value.sort_order,
            update_interval: value.update_interval,
            health_status: value.health_status.as_str().to_owned(),
            last_checked_at: value.last_checked_at.map(Into::into),
            last_success_at: value.last_success_at.map(Into::into),
            etag: value.etag,
            last_modified: value.last_modified,
            last_error_kind: value.last_error_kind.map(|kind| kind.as_str().to_owned()),
            last_error_message: value.last_error_message,
            last_error_at: value.last_error_at.map(Into::into),
            consecutive_failures: value.consecutive_failures,
        }
    }
}

impl TryFrom<ArticleRecord> for Article {
    type Error = ModelError;

    fn try_from(record: ArticleRecord) -> Result<Self, Self::Error> {
        Ok(Self {
            id: ArticleId::try_from(record.id)?,
            feed_id: FeedId::try_from(record.feed_id)?,
            source_guid: record.source_guid,
            title: record.title,
            author: record.author,
            summary: record.summary,
            content_raw: record.content_raw,
            content_extracted: record.content_extracted,
            canonical_url: record.canonical_url.map(UrlString::try_from).transpose()?,
            original_url: record.original_url.map(UrlString::try_from).transpose()?,
            published_at: record.published_at.map(IsoDateTime::try_from).transpose()?,
            fetched_at: IsoDateTime::try_from(record.fetched_at)?,
            language: record.language.map(LanguageCode::try_from).transpose()?,
            thumbnail: record.thumbnail.map(UrlString::try_from).transpose()?,
            word_count: record.word_count,
            content_hash: record.content_hash,
        })
    }
}

impl From<Article> for ArticleRecord {
    fn from(value: Article) -> Self {
        Self {
            id: value.id.into(),
            feed_id: value.feed_id.into(),
            source_guid: value.source_guid,
            title: value.title,
            author: value.author,
            summary: value.summary,
            content_raw: value.content_raw,
            content_extracted: value.content_extracted,
            canonical_url: value.canonical_url.map(Into::into),
            original_url: value.original_url.map(Into::into),
            published_at: value.published_at.map(Into::into),
            fetched_at: value.fetched_at.into(),
            language: value.language.map(Into::into),
            thumbnail: value.thumbnail.map(Into::into),
            word_count: value.word_count,
            content_hash: value.content_hash,
        }
    }
}

impl TryFrom<AttachmentRecord> for Attachment {
    type Error = ModelError;

    fn try_from(record: AttachmentRecord) -> Result<Self, Self::Error> {
        Ok(Self {
            id: AttachmentId::try_from(record.id)?,
            article_id: ArticleId::try_from(record.article_id)?,
            attachment_type: AttachmentType::try_from(record.attachment_type)?,
            url: UrlString::try_from(record.url)?,
            mime_type: record.mime_type,
            duration: record.duration,
            size: record.size,
            local_cache_path: record
                .local_cache_path
                .map(CachePath::try_from)
                .transpose()?,
        })
    }
}

impl From<Attachment> for AttachmentRecord {
    fn from(value: Attachment) -> Self {
        Self {
            id: value.id.into(),
            article_id: value.article_id.into(),
            attachment_type: value.attachment_type.as_str().to_owned(),
            url: value.url.into(),
            mime_type: value.mime_type,
            duration: value.duration,
            size: value.size,
            local_cache_path: value.local_cache_path.map(Into::into),
        }
    }
}

impl TryFrom<UserStateRecord> for UserState {
    type Error = ModelError;

    fn try_from(record: UserStateRecord) -> Result<Self, Self::Error> {
        UserState {
            article_id: ArticleId::try_from(record.article_id)?,
            read_state: ReadState::try_from(record.read_state)?,
            starred: decode_bool_flag("starred", record.starred)?,
            liked: decode_bool_flag("liked", record.liked)?,
            importance: ImportanceLevel::try_from(record.importance)?,
            read_later: decode_bool_flag("read_later", record.read_later)?,
            reading_progress: record.reading_progress,
            last_opened_at: record
                .last_opened_at
                .map(IsoDateTime::try_from)
                .transpose()?,
        }
        .validate()
    }
}

impl From<UserState> for UserStateRecord {
    fn from(value: UserState) -> Self {
        Self {
            article_id: value.article_id.into(),
            read_state: value.read_state.as_str().to_owned(),
            starred: encode_bool_flag(value.starred),
            liked: encode_bool_flag(value.liked),
            importance: value.importance.as_str().to_owned(),
            read_later: encode_bool_flag(value.read_later),
            reading_progress: value.reading_progress,
            last_opened_at: value.last_opened_at.map(Into::into),
        }
    }
}

impl TryFrom<AnnotationRecord> for Annotation {
    type Error = ModelError;

    fn try_from(record: AnnotationRecord) -> Result<Self, Self::Error> {
        Ok(Self {
            id: AnnotationId::try_from(record.id)?,
            article_id: ArticleId::try_from(record.article_id)?,
            annotation_type: AnnotationType::try_from(record.annotation_type)?,
            selected_text: record.selected_text,
            anchor: JsonBlob::parse("anchor", &record.anchor)?,
            note: record.note,
            color: record.color.map(HexColor::try_from).transpose()?,
            created_at: IsoDateTime::try_from(record.created_at)?,
        })
    }
}

impl From<Annotation> for AnnotationRecord {
    fn from(value: Annotation) -> Self {
        Self {
            id: value.id.into(),
            article_id: value.article_id.into(),
            annotation_type: value.annotation_type.as_str().to_owned(),
            selected_text: value.selected_text,
            anchor: value.anchor.to_compact_string(),
            note: value.note,
            color: value.color.map(Into::into),
            created_at: value.created_at.into(),
        }
    }
}

impl TryFrom<RuleRecord> for Rule {
    type Error = ModelError;

    fn try_from(record: RuleRecord) -> Result<Self, Self::Error> {
        Ok(Self {
            id: RuleId::try_from(record.id)?,
            name: record.name,
            enabled: decode_bool_flag("enabled", record.enabled)?,
            priority: record.priority,
            conditions: JsonBlob::parse("conditions", &record.conditions)?,
            actions: JsonBlob::parse("actions", &record.actions)?,
            scope: record.scope,
        })
    }
}

impl From<Rule> for RuleRecord {
    fn from(value: Rule) -> Self {
        Self {
            id: value.id.into(),
            name: value.name,
            enabled: encode_bool_flag(value.enabled),
            priority: value.priority,
            conditions: value.conditions.to_compact_string(),
            actions: value.actions.to_compact_string(),
            scope: value.scope,
        }
    }
}

impl TryFrom<SmartFolderRecord> for SmartFolder {
    type Error = ModelError;

    fn try_from(record: SmartFolderRecord) -> Result<Self, Self::Error> {
        Ok(Self {
            id: SmartFolderId::try_from(record.id)?,
            name: record.name,
            query_definition: JsonBlob::parse("query_definition", &record.query_definition)?,
            sort_definition: record
                .sort_definition
                .map(|value| JsonBlob::parse("sort_definition", &value))
                .transpose()?,
        })
    }
}

impl From<SmartFolder> for SmartFolderRecord {
    fn from(value: SmartFolder) -> Self {
        Self {
            id: value.id.into(),
            name: value.name,
            query_definition: value.query_definition.to_compact_string(),
            sort_definition: value.sort_definition.map(|value| value.to_compact_string()),
        }
    }
}

impl TryFrom<RuleAuditRecord> for RuleAudit {
    type Error = ModelError;

    fn try_from(record: RuleAuditRecord) -> Result<Self, Self::Error> {
        Ok(Self {
            id: RuleAuditId::try_from(record.id)?,
            rule_id: RuleId::try_from(record.rule_id)?,
            article_id: ArticleId::try_from(record.article_id)?,
            match_result: RuleAuditMatchResult::try_from(record.match_result)?,
            input_snapshot: JsonBlob::parse("input_snapshot", &record.input_snapshot)?,
            planned_commands: JsonBlob::parse("planned_commands", &record.planned_commands)?,
            applied_effects: record
                .applied_effects
                .map(|value| JsonBlob::parse("applied_effects", &value))
                .transpose()?,
            created_at: IsoDateTime::try_from(record.created_at)?,
        })
    }
}

impl From<RuleAudit> for RuleAuditRecord {
    fn from(value: RuleAudit) -> Self {
        Self {
            id: value.id.into(),
            rule_id: value.rule_id.into(),
            article_id: value.article_id.into(),
            match_result: value.match_result.as_str().to_owned(),
            input_snapshot: value.input_snapshot.to_compact_string(),
            planned_commands: value.planned_commands.to_compact_string(),
            applied_effects: value.applied_effects.map(|value| value.to_compact_string()),
            created_at: value.created_at.into(),
        }
    }
}

impl TryFrom<AIArtifactRecord> for AIArtifact {
    type Error = ModelError;

    fn try_from(record: AIArtifactRecord) -> Result<Self, Self::Error> {
        Ok(Self {
            id: AIArtifactId::try_from(record.id)?,
            article_id: ArticleId::try_from(record.article_id)?,
            kind: AIArtifactKind::try_from(record.kind)?,
            provider: record.provider,
            input_hash: record.input_hash,
            result: JsonBlob::parse("result", &record.result)?,
            created_at: IsoDateTime::try_from(record.created_at)?,
        })
    }
}

impl From<AIArtifact> for AIArtifactRecord {
    fn from(value: AIArtifact) -> Self {
        Self {
            id: value.id.into(),
            article_id: value.article_id.into(),
            kind: value.kind.as_str().to_owned(),
            provider: value.provider,
            input_hash: value.input_hash,
            result: value.result.to_compact_string(),
            created_at: value.created_at.into(),
        }
    }
}

impl TryFrom<SyncEventRecord> for SyncEvent {
    type Error = ModelError;

    fn try_from(record: SyncEventRecord) -> Result<Self, Self::Error> {
        Ok(Self {
            id: SyncEventId::try_from(record.id)?,
            entity_type: record.entity_type,
            entity_id: record.entity_id,
            change_type: record.change_type,
            payload: JsonBlob::parse("payload", &record.payload)?,
            device_id: DeviceId::try_from(record.device_id)?,
            created_at: IsoDateTime::try_from(record.created_at)?,
        })
    }
}

impl From<SyncEvent> for SyncEventRecord {
    fn from(value: SyncEvent) -> Self {
        Self {
            id: value.id.into(),
            entity_type: value.entity_type,
            entity_id: value.entity_id,
            change_type: value.change_type,
            payload: value.payload.to_compact_string(),
            device_id: value.device_id.into(),
            created_at: value.created_at.into(),
        }
    }
}

fn decode_bool_flag(field: &'static str, value: i64) -> Result<bool, ModelError> {
    match value {
        0 => Ok(false),
        1 => Ok(true),
        _ => Err(ModelError::InvalidBooleanFlag { field, value }),
    }
}

fn encode_bool_flag(value: bool) -> i64 {
    if value { 1 } else { 0 }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    #[test]
    fn roundtrips_organization_records_into_domain_models() {
        let folder_record = FolderRecord {
            id: "folder-tech".into(),
            name: "Tech".into(),
            parent_id: Some("folder-root".into()),
            sort_order: 12,
            kind: "group".into(),
        };
        let tag_record = TagRecord {
            id: "tag-focus".into(),
            name: "Focus".into(),
            scope: "article".into(),
            color: Some("#ffaa00".into()),
            created_at: "2026-04-11T10:00:00Z".into(),
        };
        let feed_tag_record = FeedTagRecord {
            feed_id: "feed-rust".into(),
            tag_id: "tag-focus".into(),
        };
        let article_tag_record = ArticleTagRecord {
            article_id: "article-rust".into(),
            tag_id: "tag-focus".into(),
        };

        assert_eq!(
            FolderRecord::from(Folder::try_from(folder_record.clone()).expect("folder")),
            folder_record
        );
        assert_eq!(
            TagRecord::from(Tag::try_from(tag_record.clone()).expect("tag")),
            tag_record
        );
        assert_eq!(
            FeedTagRecord::from(FeedTag::try_from(feed_tag_record.clone()).expect("feed tag")),
            feed_tag_record
        );
        assert_eq!(
            ArticleTagRecord::from(
                ArticleTag::try_from(article_tag_record.clone()).expect("article tag")
            ),
            article_tag_record
        );
    }

    #[test]
    fn roundtrips_feed_and_article_records_into_domain_models() {
        let feed_record = FeedRecord {
            id: "feed-rust".into(),
            title: "Rust Weekly".into(),
            site_url: Some("https://example.com".into()),
            feed_url: "https://example.com/feed.xml".into(),
            format: "rss".into(),
            icon: Some("https://example.com/icon.png".into()),
            folder_id: Some("folder-tech".into()),
            custom_name: Some("Rust Weekly Custom".into()),
            sort_order: 7,
            update_interval: Some(60),
            health_status: "healthy".into(),
            last_checked_at: Some("2026-04-11T10:10:00Z".into()),
            last_success_at: Some("2026-04-11T10:00:00Z".into()),
            etag: Some("etag-1".into()),
            last_modified: Some("Fri, 11 Apr 2026 10:00:00 GMT".into()),
            last_error_kind: Some("network".into()),
            last_error_message: Some("feed request timed out".into()),
            last_error_at: Some("2026-04-11T10:09:30Z".into()),
            consecutive_failures: 2,
        };
        let article_record = ArticleRecord {
            id: "article-rust".into(),
            feed_id: "feed-rust".into(),
            source_guid: Some("guid-123".into()),
            title: "Ship the parser".into(),
            author: Some("Ada".into()),
            summary: Some("A short summary".into()),
            content_raw: Some("<p>Raw</p>".into()),
            content_extracted: Some("Extracted".into()),
            canonical_url: Some("https://example.com/articles/ship-parser".into()),
            original_url: Some("https://cdn.example.com/articles/ship-parser".into()),
            published_at: Some("2026-04-11T09:00:00Z".into()),
            fetched_at: "2026-04-11T10:00:00Z".into(),
            language: Some("en".into()),
            thumbnail: Some("https://example.com/thumb.png".into()),
            word_count: Some(480),
            content_hash: Some("hash-123".into()),
        };

        assert_eq!(
            FeedRecord::from(Feed::try_from(feed_record.clone()).expect("feed")),
            feed_record
        );
        assert_eq!(
            ArticleRecord::from(Article::try_from(article_record.clone()).expect("article")),
            article_record
        );
    }

    #[test]
    fn roundtrips_article_supporting_records_into_domain_models() {
        let attachment_record = AttachmentRecord {
            id: "attachment-audio".into(),
            article_id: "article-rust".into(),
            attachment_type: "audio".into(),
            url: "https://example.com/audio.mp3".into(),
            mime_type: Some("audio/mpeg".into()),
            duration: Some(1800),
            size: Some(4096),
            local_cache_path: Some("cache/media/audio.mp3".into()),
        };
        let user_state_record = UserStateRecord {
            article_id: "article-rust".into(),
            read_state: "reading".into(),
            starred: 1,
            liked: 0,
            importance: "high".into(),
            read_later: 1,
            reading_progress: 0.5,
            last_opened_at: Some("2026-04-11T10:30:00Z".into()),
        };
        let annotation_record = AnnotationRecord {
            id: "annotation-highlight".into(),
            article_id: "article-rust".into(),
            annotation_type: "highlight".into(),
            selected_text: "stable boundary".into(),
            anchor: "{\"start\":12,\"end\":28}".into(),
            note: Some("Keep this wording".into()),
            color: Some("#ffcc00".into()),
            created_at: "2026-04-11T10:40:00Z".into(),
        };

        assert_eq!(
            AttachmentRecord::from(
                Attachment::try_from(attachment_record.clone()).expect("attachment")
            ),
            attachment_record
        );
        assert_eq!(
            UserStateRecord::from(
                UserState::try_from(user_state_record.clone()).expect("user state")
            ),
            user_state_record
        );
        let roundtripped_annotation = AnnotationRecord::from(
            Annotation::try_from(annotation_record.clone()).expect("annotation"),
        );

        assert_eq!(roundtripped_annotation.id, annotation_record.id);
        assert_eq!(
            roundtripped_annotation.article_id,
            annotation_record.article_id
        );
        assert_eq!(
            roundtripped_annotation.annotation_type,
            annotation_record.annotation_type
        );
        assert_eq!(
            roundtripped_annotation.selected_text,
            annotation_record.selected_text
        );
        assert_eq!(roundtripped_annotation.note, annotation_record.note);
        assert_eq!(roundtripped_annotation.color, annotation_record.color);
        assert_eq!(
            roundtripped_annotation.created_at,
            annotation_record.created_at
        );
        assert_json_string_eq(&roundtripped_annotation.anchor, &annotation_record.anchor);
    }

    #[test]
    fn roundtrips_automation_records_into_domain_models() {
        let rule_record = RuleRecord {
            id: "rule-priority".into(),
            name: "Promote important items".into(),
            enabled: 1,
            priority: 10,
            conditions: "{\"op\":\"contains\",\"field\":\"title\",\"value\":\"rust\"}".into(),
            actions: "{\"starred\":true}".into(),
            scope: "article".into(),
        };
        let smart_folder_record = SmartFolderRecord {
            id: "smart-latest".into(),
            name: "Latest unread".into(),
            query_definition: "{\"op\":\"and\",\"children\":[]}".into(),
            sort_definition: Some("{\"field\":\"published_at\",\"direction\":\"desc\"}".into()),
        };
        let rule_audit_record = RuleAuditRecord {
            id: "rule-audit-1".into(),
            rule_id: "rule-priority".into(),
            article_id: "article-rust".into(),
            match_result: "matched".into(),
            input_snapshot: "{\"article\":{\"id\":\"article-rust\"}}".into(),
            planned_commands: "[{\"type\":\"updateUserState\",\"articleId\":\"article-rust\"}]"
                .into(),
            applied_effects: Some("{\"writes\":[{\"entity\":\"UserState\"}]}".into()),
            created_at: "2026-04-11T10:55:00Z".into(),
        };
        let artifact_record = AIArtifactRecord {
            id: "artifact-summary".into(),
            article_id: "article-rust".into(),
            kind: "summary".into(),
            provider: "local-model".into(),
            input_hash: "hash-456".into(),
            result: "{\"summary\":\"Short abstract\"}".into(),
            created_at: "2026-04-11T11:00:00Z".into(),
        };
        let sync_event_record = SyncEventRecord {
            id: "sync-1".into(),
            entity_type: "article".into(),
            entity_id: "article-rust".into(),
            change_type: "updated".into(),
            payload: "{\"starred\":true}".into(),
            device_id: "device-desktop".into(),
            created_at: "2026-04-11T11:05:00Z".into(),
        };

        let roundtripped_rule =
            RuleRecord::from(Rule::try_from(rule_record.clone()).expect("rule"));
        assert_eq!(roundtripped_rule.id, rule_record.id);
        assert_eq!(roundtripped_rule.name, rule_record.name);
        assert_eq!(roundtripped_rule.enabled, rule_record.enabled);
        assert_eq!(roundtripped_rule.priority, rule_record.priority);
        assert_eq!(roundtripped_rule.scope, rule_record.scope);
        assert_json_string_eq(&roundtripped_rule.conditions, &rule_record.conditions);
        assert_json_string_eq(&roundtripped_rule.actions, &rule_record.actions);

        let roundtripped_smart_folder = SmartFolderRecord::from(
            SmartFolder::try_from(smart_folder_record.clone()).expect("smart folder"),
        );
        assert_eq!(roundtripped_smart_folder.id, smart_folder_record.id);
        assert_eq!(roundtripped_smart_folder.name, smart_folder_record.name);
        assert_json_string_eq(
            &roundtripped_smart_folder.query_definition,
            &smart_folder_record.query_definition,
        );
        assert_optional_json_string_eq(
            roundtripped_smart_folder.sort_definition.as_deref(),
            smart_folder_record.sort_definition.as_deref(),
        );

        let roundtripped_rule_audit = RuleAuditRecord::from(
            RuleAudit::try_from(rule_audit_record.clone()).expect("rule audit"),
        );
        assert_eq!(roundtripped_rule_audit.id, rule_audit_record.id);
        assert_eq!(roundtripped_rule_audit.rule_id, rule_audit_record.rule_id);
        assert_eq!(
            roundtripped_rule_audit.article_id,
            rule_audit_record.article_id
        );
        assert_eq!(
            roundtripped_rule_audit.match_result,
            rule_audit_record.match_result
        );
        assert_eq!(
            roundtripped_rule_audit.created_at,
            rule_audit_record.created_at
        );
        assert_json_string_eq(
            &roundtripped_rule_audit.input_snapshot,
            &rule_audit_record.input_snapshot,
        );
        assert_json_string_eq(
            &roundtripped_rule_audit.planned_commands,
            &rule_audit_record.planned_commands,
        );
        assert_optional_json_string_eq(
            roundtripped_rule_audit.applied_effects.as_deref(),
            rule_audit_record.applied_effects.as_deref(),
        );

        let roundtripped_artifact = AIArtifactRecord::from(
            AIArtifact::try_from(artifact_record.clone()).expect("artifact"),
        );
        assert_eq!(roundtripped_artifact.id, artifact_record.id);
        assert_eq!(roundtripped_artifact.article_id, artifact_record.article_id);
        assert_eq!(roundtripped_artifact.kind, artifact_record.kind);
        assert_eq!(roundtripped_artifact.provider, artifact_record.provider);
        assert_eq!(roundtripped_artifact.input_hash, artifact_record.input_hash);
        assert_eq!(roundtripped_artifact.created_at, artifact_record.created_at);
        assert_json_string_eq(&roundtripped_artifact.result, &artifact_record.result);

        let roundtripped_sync_event = SyncEventRecord::from(
            SyncEvent::try_from(sync_event_record.clone()).expect("sync event"),
        );
        assert_eq!(roundtripped_sync_event.id, sync_event_record.id);
        assert_eq!(
            roundtripped_sync_event.entity_type,
            sync_event_record.entity_type
        );
        assert_eq!(
            roundtripped_sync_event.entity_id,
            sync_event_record.entity_id
        );
        assert_eq!(
            roundtripped_sync_event.change_type,
            sync_event_record.change_type
        );
        assert_eq!(
            roundtripped_sync_event.device_id,
            sync_event_record.device_id
        );
        assert_eq!(
            roundtripped_sync_event.created_at,
            sync_event_record.created_at
        );
        assert_json_string_eq(&roundtripped_sync_event.payload, &sync_event_record.payload);
    }

    #[test]
    fn rejects_invalid_record_values_before_they_leak_into_domain_models() {
        let invalid_user_state = UserStateRecord {
            article_id: "article-rust".into(),
            read_state: "reading".into(),
            starred: 2,
            liked: 0,
            importance: "high".into(),
            read_later: 0,
            reading_progress: 1.2,
            last_opened_at: None,
        };
        let invalid_annotation = AnnotationRecord {
            id: "annotation-invalid".into(),
            article_id: "article-rust".into(),
            annotation_type: "highlight".into(),
            selected_text: "bad".into(),
            anchor: "{bad json}".into(),
            note: None,
            color: None,
            created_at: "2026-04-11T11:10:00Z".into(),
        };
        let invalid_feed = FeedRecord {
            id: "feed-rust".into(),
            title: "Rust Weekly".into(),
            site_url: None,
            feed_url: "https://example.com/feed.xml".into(),
            format: "rdf".into(),
            icon: None,
            folder_id: None,
            custom_name: None,
            sort_order: 0,
            update_interval: None,
            health_status: "healthy".into(),
            last_checked_at: None,
            last_success_at: None,
            etag: None,
            last_modified: None,
            last_error_kind: None,
            last_error_message: None,
            last_error_at: None,
            consecutive_failures: 0,
        };

        assert!(matches!(
            UserState::try_from(invalid_user_state),
            Err(ModelError::InvalidBooleanFlag {
                field: "starred",
                value: 2,
            })
        ));
        assert!(matches!(
            Annotation::try_from(invalid_annotation),
            Err(ModelError::InvalidJson {
                field: "anchor",
                ..
            })
        ));
        assert!(matches!(
            Feed::try_from(invalid_feed),
            Err(ModelError::InvalidEnum {
                kind: "FeedFormat",
                ..
            })
        ));

        let user_state = UserState {
            article_id: ArticleId::try_from("article-rust").expect("article id"),
            read_state: ReadState::Reading,
            starred: false,
            liked: false,
            importance: ImportanceLevel::Normal,
            read_later: false,
            reading_progress: 0.75,
            last_opened_at: Some(IsoDateTime::try_from("2026-04-11T11:15:00Z").expect("datetime")),
        }
        .validate()
        .expect("valid state");

        assert_eq!(
            UserStateRecord::from(user_state),
            UserStateRecord {
                article_id: "article-rust".into(),
                read_state: "reading".into(),
                starred: 0,
                liked: 0,
                importance: "normal".into(),
                read_later: 0,
                reading_progress: 0.75,
                last_opened_at: Some("2026-04-11T11:15:00Z".into()),
            }
        );

        let blob = JsonBlob::from(json!({ "field": "value" }));
        assert_eq!(blob.to_compact_string(), "{\"field\":\"value\"}");
    }

    fn assert_json_string_eq(left: &str, right: &str) {
        let left_value: serde_json::Value = serde_json::from_str(left).expect("left json");
        let right_value: serde_json::Value = serde_json::from_str(right).expect("right json");

        assert_eq!(left_value, right_value);
    }

    fn assert_optional_json_string_eq(left: Option<&str>, right: Option<&str>) {
        match (left, right) {
            (Some(left), Some(right)) => assert_json_string_eq(left, right),
            (None, None) => {}
            _ => panic!("expected both optional json values to match"),
        }
    }
}
