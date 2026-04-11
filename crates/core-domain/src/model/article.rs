use super::{
    AnnotationId, AnnotationType, ArticleId, AttachmentId, AttachmentType, CachePath, FeedId,
    HexColor, ImportanceLevel, IsoDateTime, JsonBlob, LanguageCode, ModelError, ReadState,
    UrlString,
};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Article {
    pub id: ArticleId,
    pub feed_id: FeedId,
    pub source_guid: Option<String>,
    pub title: String,
    pub author: Option<String>,
    pub summary: Option<String>,
    pub content_raw: Option<String>,
    pub content_extracted: Option<String>,
    pub canonical_url: Option<UrlString>,
    pub original_url: Option<UrlString>,
    pub published_at: Option<IsoDateTime>,
    pub fetched_at: IsoDateTime,
    pub language: Option<LanguageCode>,
    pub thumbnail: Option<UrlString>,
    pub word_count: Option<i64>,
    pub content_hash: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Attachment {
    pub id: AttachmentId,
    pub article_id: ArticleId,
    pub attachment_type: AttachmentType,
    pub url: UrlString,
    pub mime_type: Option<String>,
    pub duration: Option<i64>,
    pub size: Option<i64>,
    pub local_cache_path: Option<CachePath>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct UserState {
    pub article_id: ArticleId,
    pub read_state: ReadState,
    pub starred: bool,
    pub liked: bool,
    pub importance: ImportanceLevel,
    pub read_later: bool,
    pub reading_progress: f64,
    pub last_opened_at: Option<IsoDateTime>,
}

impl UserState {
    pub fn validate(self) -> Result<Self, ModelError> {
        if !(0.0..=1.0).contains(&self.reading_progress) {
            return Err(ModelError::InvalidReadingProgress {
                value: self.reading_progress,
            });
        }

        Ok(self)
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Annotation {
    pub id: AnnotationId,
    pub article_id: ArticleId,
    pub annotation_type: AnnotationType,
    pub selected_text: String,
    pub anchor: JsonBlob,
    pub note: Option<String>,
    pub color: Option<HexColor>,
    pub created_at: IsoDateTime,
}
