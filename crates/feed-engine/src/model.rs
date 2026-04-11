use freelyrss_core_domain::{
    AttachmentType, FeedFormat, FeedId, IsoDateTime, LanguageCode, UrlString,
};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct FetchRequest {
    pub feed_id: Option<FeedId>,
    pub feed_url: UrlString,
    pub etag: Option<String>,
    pub last_modified: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct FetchedFeed {
    pub request: FetchRequest,
    pub final_url: UrlString,
    pub status_code: u16,
    pub content_type: Option<String>,
    pub body: Vec<u8>,
    pub fetched_at: IsoDateTime,
    pub etag: Option<String>,
    pub last_modified: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ParsedFeedDocument {
    pub format: FeedFormat,
    pub title: Option<String>,
    pub site_url: Option<UrlString>,
    pub icon: Option<UrlString>,
    pub articles: Vec<ParsedArticle>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ParsedArticle {
    pub source_guid: Option<String>,
    pub title: Option<String>,
    pub author: Option<String>,
    pub summary: Option<String>,
    pub content_raw: Option<String>,
    pub content_extracted: Option<String>,
    pub canonical_url: Option<UrlString>,
    pub original_url: Option<UrlString>,
    pub published_at: Option<IsoDateTime>,
    pub language: Option<LanguageCode>,
    pub thumbnail: Option<UrlString>,
    pub attachments: Vec<ParsedAttachment>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ParsedAttachment {
    pub attachment_type: AttachmentType,
    pub url: UrlString,
    pub mime_type: Option<String>,
    pub duration: Option<i64>,
    pub size: Option<i64>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct NormalizeContext {
    pub feed_id: Option<FeedId>,
    pub requested_url: UrlString,
    pub final_url: UrlString,
    pub content_type: Option<String>,
    pub fetched_at: IsoDateTime,
    pub etag: Option<String>,
    pub last_modified: Option<String>,
}

impl NormalizeContext {
    pub fn from_fetched_feed(fetched: &FetchedFeed) -> Self {
        Self {
            feed_id: fetched.request.feed_id.clone(),
            requested_url: fetched.request.feed_url.clone(),
            final_url: fetched.final_url.clone(),
            content_type: fetched.content_type.clone(),
            fetched_at: fetched.fetched_at.clone(),
            etag: fetched.etag.clone(),
            last_modified: fetched.last_modified.clone(),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct NormalizedFeedBatch {
    pub feed: NormalizedFeedRecord,
    pub articles: Vec<NormalizedArticleRecord>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct NormalizedFeedRecord {
    pub feed_id: Option<FeedId>,
    pub title: String,
    pub site_url: Option<UrlString>,
    pub feed_url: UrlString,
    pub format: FeedFormat,
    pub icon: Option<UrlString>,
    pub etag: Option<String>,
    pub last_modified: Option<String>,
    pub last_checked_at: IsoDateTime,
    pub last_success_at: IsoDateTime,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct NormalizedArticleRecord {
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
    pub attachments: Vec<NormalizedAttachmentRecord>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct NormalizedAttachmentRecord {
    pub attachment_type: AttachmentType,
    pub url: UrlString,
    pub mime_type: Option<String>,
    pub duration: Option<i64>,
    pub size: Option<i64>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PersistedFeedBatch {
    pub feed_id: FeedId,
    pub stored_article_count: usize,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct FetchRunReport {
    pub feed_id: FeedId,
    pub requested_url: UrlString,
    pub final_url: UrlString,
    pub format: FeedFormat,
    pub response_status_code: u16,
    pub fetched_at: IsoDateTime,
    pub parsed_article_count: usize,
    pub normalized_article_count: usize,
    pub stored_article_count: usize,
}
