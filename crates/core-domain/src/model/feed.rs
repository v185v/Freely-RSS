use super::{FeedFormat, FeedHealthStatus, FeedId, FolderId, IsoDateTime, UrlString};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Feed {
    pub id: FeedId,
    pub title: String,
    pub site_url: Option<UrlString>,
    pub feed_url: UrlString,
    pub format: FeedFormat,
    pub icon: Option<UrlString>,
    pub folder_id: Option<FolderId>,
    pub custom_name: Option<String>,
    pub sort_order: i64,
    pub update_interval: Option<i64>,
    pub health_status: FeedHealthStatus,
    pub last_checked_at: Option<IsoDateTime>,
    pub last_success_at: Option<IsoDateTime>,
    pub etag: Option<String>,
    pub last_modified: Option<String>,
}
