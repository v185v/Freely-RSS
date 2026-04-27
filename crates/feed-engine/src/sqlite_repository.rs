use std::{
    collections::{HashMap, HashSet},
    fmt::Write as _,
    path::{Path, PathBuf},
};

use freelyrss_core_domain::{
    Article, ArticleId, Attachment, AttachmentId, CachePolicy, Feed, FeedHealthStatus, FeedId,
    IsoDateTime, ModelError, UrlString,
    sqlite::{FeedStore, prepare_database_connection},
};
use rusqlite::Connection;
use sha2::{Digest, Sha256};

use crate::{
    FailedFeedCheck, FeedEngineError, FeedRepository, NormalizedArticleRecord,
    NormalizedAttachmentRecord, NormalizedFeedBatch, NormalizedFeedRecord, NotModifiedFeed,
    PersistedFeedBatch, RecordedFeedCheck,
};

pub struct SqliteFeedRepository {
    database_path: PathBuf,
}

impl SqliteFeedRepository {
    pub fn new(database_path: impl Into<PathBuf>) -> Self {
        Self {
            database_path: database_path.into(),
        }
    }

    pub fn database_path(&self) -> &Path {
        &self.database_path
    }
}

impl FeedRepository for SqliteFeedRepository {
    fn persist(&self, batch: NormalizedFeedBatch) -> Result<PersistedFeedBatch, FeedEngineError> {
        let mut connection = Connection::open(&self.database_path)
            .map_err(|error| FeedEngineError::persist(format!("open sqlite database: {error}")))?;
        prepare_database_connection(&connection).map_err(|error| {
            FeedEngineError::persist(format!("prepare sqlite connection: {error}"))
        })?;

        let mut store = FeedStore::new(&mut connection);
        let feed_id = resolve_feed_id(&mut store, &batch.feed)?;
        let feed = build_feed(batch.feed, feed_id.clone());

        let mut articles = Vec::new();
        let mut attachments = Vec::new();
        let mut pending = PendingArticleDedupIndex::default();

        for (index, normalized_article) in batch.articles.into_iter().enumerate() {
            if let Some((article, article_attachments)) = build_article_graph(
                &mut store,
                &mut pending,
                &feed_id,
                normalized_article,
                index,
            )? {
                articles.push(article);
                attachments.extend(article_attachments);
            }
        }

        let report = store
            .persist_feed_graph(&feed, &articles, &attachments)
            .map_err(|error| FeedEngineError::persist(error.to_string()))?;

        Ok(PersistedFeedBatch {
            feed_id,
            stored_article_count: report.stored_article_count,
        })
    }

    fn record_not_modified(
        &self,
        response: NotModifiedFeed,
    ) -> Result<RecordedFeedCheck, FeedEngineError> {
        let mut connection = Connection::open(&self.database_path)
            .map_err(|error| FeedEngineError::persist(format!("open sqlite database: {error}")))?;
        prepare_database_connection(&connection).map_err(|error| {
            FeedEngineError::persist(format!("prepare sqlite connection: {error}"))
        })?;

        let mut store = FeedStore::new(&mut connection);
        let feed_id = resolve_existing_feed_id(&mut store, &response.request)?;
        let updated = store
            .record_feed_successful_check(
                &feed_id,
                &response.final_url,
                &response.fetched_at,
                response.etag.as_deref(),
                response.last_modified.as_deref(),
            )
            .map_err(|error| FeedEngineError::persist(error.to_string()))?;

        if !updated {
            return Err(FeedEngineError::persist(format!(
                "record not-modified response for missing feed {}",
                feed_id.as_str()
            )));
        }

        Ok(RecordedFeedCheck { feed_id })
    }

    fn record_failure(&self, failure: FailedFeedCheck) -> Result<(), FeedEngineError> {
        let mut connection = Connection::open(&self.database_path)
            .map_err(|error| FeedEngineError::persist(format!("open sqlite database: {error}")))?;
        prepare_database_connection(&connection).map_err(|error| {
            FeedEngineError::persist(format!("prepare sqlite connection: {error}"))
        })?;

        let mut store = FeedStore::new(&mut connection);
        let Some(feed_id) = resolve_existing_feed_id_for_failure(&mut store, &failure.request)?
        else {
            return Ok(());
        };
        let updated = store
            .record_feed_failed_check(
                &feed_id,
                &failure.checked_at,
                failure.error_kind,
                failure.error_message.as_str(),
            )
            .map_err(|error| FeedEngineError::persist(error.to_string()))?;

        if !updated {
            return Err(FeedEngineError::persist(format!(
                "record failed check for missing feed {}",
                feed_id.as_str()
            )));
        }

        Ok(())
    }
}

fn resolve_feed_id(
    store: &mut FeedStore<'_>,
    feed: &NormalizedFeedRecord,
) -> Result<FeedId, FeedEngineError> {
    if let Some(feed_id) = feed.feed_id.clone() {
        return Ok(feed_id);
    }

    if let Some(feed_id) = store
        .find_feed_id_by_url(&feed.feed_url)
        .map_err(|error| FeedEngineError::persist(error.to_string()))?
    {
        return Ok(feed_id);
    }

    build_feed_id(&[feed.feed_url.as_str()])
}

fn resolve_existing_feed_id(
    store: &mut FeedStore<'_>,
    request: &crate::FetchRequest,
) -> Result<FeedId, FeedEngineError> {
    if let Some(feed_id) = request.feed_id.clone() {
        return Ok(feed_id);
    }

    store
        .find_feed_id_by_url(&request.feed_url)
        .map_err(|error| FeedEngineError::persist(error.to_string()))?
        .ok_or_else(|| {
            FeedEngineError::persist(format!(
                "record not-modified response for unknown feed URL {}",
                request.feed_url
            ))
        })
}

fn resolve_existing_feed_id_for_failure(
    store: &mut FeedStore<'_>,
    request: &crate::FetchRequest,
) -> Result<Option<FeedId>, FeedEngineError> {
    if let Some(feed_id) = request.feed_id.clone() {
        return Ok(Some(feed_id));
    }

    store
        .find_feed_id_by_url(&request.feed_url)
        .map_err(|error| FeedEngineError::persist(error.to_string()))
}

fn build_feed(feed: NormalizedFeedRecord, feed_id: FeedId) -> Feed {
    Feed {
        id: feed_id,
        title: feed.title,
        site_url: feed.site_url,
        feed_url: feed.feed_url,
        format: feed.format,
        icon: feed.icon,
        folder_id: None,
        custom_name: None,
        sort_order: 0,
        update_interval: None,
        cache_policy: CachePolicy::Content,
        health_status: FeedHealthStatus::Healthy,
        last_checked_at: Some(feed.last_checked_at),
        last_success_at: Some(feed.last_success_at),
        etag: feed.etag,
        last_modified: feed.last_modified,
        last_error_kind: None,
        last_error_message: None,
        last_error_at: None,
        consecutive_failures: 0,
    }
}

fn build_article_graph(
    store: &mut FeedStore<'_>,
    pending: &mut PendingArticleDedupIndex,
    feed_id: &FeedId,
    normalized_article: NormalizedArticleRecord,
    index: usize,
) -> Result<Option<(Article, Vec<Attachment>)>, FeedEngineError> {
    let deduplication = ArticleDeduplicationCandidate::from_article(&normalized_article);
    let article_id = resolve_article_id(store, pending, feed_id, &deduplication, index)?;

    if pending.contains_article_id(&article_id) {
        return Ok(None);
    }

    let attachment_records = normalized_article.attachments.clone();
    let article = build_article(
        feed_id,
        article_id.clone(),
        normalized_article,
        deduplication.content_hash,
    );
    let attachments = attachment_records
        .into_iter()
        .enumerate()
        .map(|(attachment_index, attachment)| {
            build_attachment(article_id.clone(), attachment, attachment_index)
        })
        .collect::<Result<Vec<_>, _>>()?;

    pending.register(&article);

    Ok(Some((article, attachments)))
}

fn resolve_article_id(
    store: &mut FeedStore<'_>,
    pending: &PendingArticleDedupIndex,
    feed_id: &FeedId,
    article: &ArticleDeduplicationCandidate,
    index: usize,
) -> Result<ArticleId, FeedEngineError> {
    if let Some(article_id) = pending.find_matching_article_id(article) {
        return Ok(article_id);
    }

    if let Some(source_guid) = article.source_guid.as_deref()
        && let Some(article_id) = store
            .find_article_id_by_source_guid(feed_id, source_guid)
            .map_err(|error| FeedEngineError::persist(error.to_string()))?
    {
        return Ok(article_id);
    }

    if let Some(article_id) = store
        .find_article_id_by_url(
            feed_id,
            article.canonical_url.as_ref(),
            article.original_url.as_ref(),
        )
        .map_err(|error| FeedEngineError::persist(error.to_string()))?
    {
        return Ok(article_id);
    }

    if let Some(published_at) = article.published_at.as_ref()
        && let Some(article_id) = store
            .find_article_id_by_title_and_published_at(
                feed_id,
                article.title.as_str(),
                published_at,
            )
            .map_err(|error| FeedEngineError::persist(error.to_string()))?
    {
        return Ok(article_id);
    }

    if let Some(content_hash) = article.content_hash.as_deref()
        && let Some(article_id) = store
            .find_article_id_by_content_hash(feed_id, content_hash)
            .map_err(|error| FeedEngineError::persist(error.to_string()))?
    {
        return Ok(article_id);
    }

    if let Some(source_guid) = article.source_guid.as_deref() {
        return build_article_id(&[feed_id.as_str(), "source-guid", source_guid]);
    }

    if let Some(canonical_url) = article.canonical_url.as_ref() {
        return build_article_id(&[feed_id.as_str(), "canonical-url", canonical_url.as_str()]);
    }

    if let Some(original_url) = article.original_url.as_ref() {
        return build_article_id(&[feed_id.as_str(), "original-url", original_url.as_str()]);
    }

    if let Some(published_at) = article.published_at.as_ref() {
        return build_article_id(&[
            feed_id.as_str(),
            "title-published-at",
            article.title.as_str(),
            published_at.as_str(),
        ]);
    }

    if let Some(content_hash) = article.content_hash.as_deref() {
        return build_article_id(&[feed_id.as_str(), "content-hash", content_hash]);
    }

    let index_string = index.to_string();
    build_article_id(&[
        feed_id.as_str(),
        "fetched-at",
        article.fetched_at.as_str(),
        "index",
        index_string.as_str(),
        "title",
        article.title.as_str(),
    ])
}

fn build_article(
    feed_id: &FeedId,
    article_id: ArticleId,
    article: NormalizedArticleRecord,
    content_hash: Option<String>,
) -> Article {
    let NormalizedArticleRecord {
        source_guid,
        title,
        author,
        summary,
        content_raw,
        content_extracted,
        canonical_url,
        original_url,
        published_at,
        fetched_at,
        language,
        thumbnail,
        attachments: _,
    } = article;

    Article {
        id: article_id,
        feed_id: feed_id.clone(),
        source_guid,
        title,
        author,
        summary,
        content_raw: content_raw.clone(),
        content_extracted: content_extracted.clone(),
        canonical_url,
        original_url,
        published_at,
        fetched_at,
        language,
        thumbnail,
        word_count: derive_word_count(content_extracted.as_deref().or(content_raw.as_deref())),
        content_hash,
    }
}

fn build_attachment(
    article_id: ArticleId,
    attachment: NormalizedAttachmentRecord,
    index: usize,
) -> Result<Attachment, FeedEngineError> {
    let index_string = index.to_string();
    let attachment_id = build_attachment_id(&[
        article_id.as_str(),
        attachment.attachment_type.as_str(),
        attachment.url.as_str(),
        index_string.as_str(),
    ])?;

    Ok(Attachment {
        id: attachment_id,
        article_id,
        attachment_type: attachment.attachment_type,
        url: attachment.url,
        mime_type: attachment.mime_type,
        duration: attachment.duration,
        size: attachment.size,
        local_cache_path: None,
    })
}

fn build_feed_id(parts: &[&str]) -> Result<FeedId, FeedEngineError> {
    FeedId::try_from(format!("feed-{}", digest_key(parts))).map_err(model_persist_error)
}

fn build_article_id(parts: &[&str]) -> Result<ArticleId, FeedEngineError> {
    ArticleId::try_from(format!("article-{}", digest_key(parts))).map_err(model_persist_error)
}

fn build_attachment_id(parts: &[&str]) -> Result<AttachmentId, FeedEngineError> {
    AttachmentId::try_from(format!("attachment-{}", digest_key(parts))).map_err(model_persist_error)
}

fn digest_key(parts: &[&str]) -> String {
    let mut hasher = Sha256::new();

    for part in parts {
        hasher.update(part.as_bytes());
        hasher.update([0]);
    }

    let digest = hasher.finalize();
    let mut output = String::with_capacity(digest.len() * 2);

    for byte in digest {
        let _ = write!(&mut output, "{byte:02x}");
    }

    output
}

fn derive_word_count(content: Option<&str>) -> Option<i64> {
    let count = content?.split_whitespace().count();
    (count > 0).then_some(count as i64)
}

fn derive_content_hash(
    content_extracted: Option<&str>,
    content_raw: Option<&str>,
    summary: Option<&str>,
) -> Option<String> {
    let normalized = content_extracted
        .or(content_raw)
        .or(summary)
        .map(normalize_hash_input)?;

    (!normalized.is_empty()).then(|| digest_key(&[normalized.as_str()]))
}

fn normalize_hash_input(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn model_persist_error(error: ModelError) -> FeedEngineError {
    FeedEngineError::persist(error.to_string())
}

struct ArticleDeduplicationCandidate {
    source_guid: Option<String>,
    title: String,
    canonical_url: Option<UrlString>,
    original_url: Option<UrlString>,
    published_at: Option<IsoDateTime>,
    fetched_at: IsoDateTime,
    content_hash: Option<String>,
}

impl ArticleDeduplicationCandidate {
    fn from_article(article: &NormalizedArticleRecord) -> Self {
        Self {
            source_guid: article.source_guid.clone(),
            title: article.title.clone(),
            canonical_url: article.canonical_url.clone(),
            original_url: article.original_url.clone(),
            published_at: article.published_at.clone(),
            fetched_at: article.fetched_at.clone(),
            content_hash: derive_content_hash(
                article.content_extracted.as_deref(),
                article.content_raw.as_deref(),
                article.summary.as_deref(),
            ),
        }
    }
}

#[derive(Default)]
struct PendingArticleDedupIndex {
    article_ids: HashSet<ArticleId>,
    by_source_guid: HashMap<String, ArticleId>,
    by_url: HashMap<UrlString, ArticleId>,
    by_title_and_published_at: HashMap<(String, IsoDateTime), ArticleId>,
    by_content_hash: HashMap<String, ArticleId>,
}

impl PendingArticleDedupIndex {
    fn contains_article_id(&self, article_id: &ArticleId) -> bool {
        self.article_ids.contains(article_id)
    }

    fn find_matching_article_id(
        &self,
        article: &ArticleDeduplicationCandidate,
    ) -> Option<ArticleId> {
        if let Some(source_guid) = article.source_guid.as_deref()
            && let Some(article_id) = self.by_source_guid.get(source_guid)
        {
            return Some(article_id.clone());
        }

        for url in [&article.canonical_url, &article.original_url]
            .into_iter()
            .flatten()
        {
            if let Some(article_id) = self.by_url.get(url) {
                return Some(article_id.clone());
            }
        }

        if let Some(published_at) = article.published_at.as_ref()
            && let Some(article_id) = self
                .by_title_and_published_at
                .get(&(article.title.clone(), published_at.clone()))
        {
            return Some(article_id.clone());
        }

        if let Some(content_hash) = article.content_hash.as_deref()
            && let Some(article_id) = self.by_content_hash.get(content_hash)
        {
            return Some(article_id.clone());
        }

        None
    }

    fn register(&mut self, article: &Article) {
        let article_id = article.id.clone();
        self.article_ids.insert(article_id.clone());

        if let Some(source_guid) = article.source_guid.clone() {
            self.by_source_guid
                .entry(source_guid)
                .or_insert(article_id.clone());
        }

        for url in [&article.canonical_url, &article.original_url]
            .into_iter()
            .flatten()
        {
            self.by_url.entry(url.clone()).or_insert(article_id.clone());
        }

        if let Some(published_at) = article.published_at.clone() {
            self.by_title_and_published_at
                .entry((article.title.clone(), published_at))
                .or_insert(article_id.clone());
        }

        if let Some(content_hash) = article.content_hash.clone() {
            self.by_content_hash
                .entry(content_hash)
                .or_insert(article_id);
        }
    }
}

#[cfg(test)]
mod tests {
    use std::{fs, path::PathBuf};

    use freelyrss_core_domain::{
        AttachmentType, FeedErrorKind, FeedFormat, IsoDateTime, UrlString,
        sqlite::{DatabaseInitializationOptions, initialize_database},
    };
    use rusqlite::{Connection, params};
    use tempfile::tempdir;

    use super::*;
    use crate::{
        DefaultFeedNormalizer, DefaultFeedParser, FailedFeedCheck, FeedNormalizer, FeedParser,
        FetchRequest, FetchedFeed, NormalizeContext, NormalizedArticleRecord,
        NormalizedAttachmentRecord, NormalizedFeedBatch, NormalizedFeedRecord, NotModifiedFeed,
        ParsedSource,
    };

    #[test]
    fn persists_new_feed_graph_and_initializes_default_user_state() {
        let temp_dir = tempdir().expect("tempdir");
        let database_path = temp_dir.path().join("freelyrss.sqlite3");
        initialize_database(&database_path, &DatabaseInitializationOptions::default())
            .expect("initialize database");

        let repository = SqliteFeedRepository::new(&database_path);
        let result = repository
            .persist(sample_batch(
                None,
                "entry-1",
                "First entry",
                "https://example.com/audio-1.mp3",
            ))
            .expect("persist feed graph");

        let connection = Connection::open(&database_path).expect("open database");
        let feed_row = connection
            .query_row(
                "SELECT title, feed_url, format, health_status, last_checked_at, last_success_at
                FROM Feed
                WHERE id = ?1",
                params![result.feed_id.as_str()],
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                        row.get::<_, String>(3)?,
                        row.get::<_, String>(4)?,
                        row.get::<_, String>(5)?,
                    ))
                },
            )
            .expect("read feed row");
        let article_row = connection
            .query_row(
                "SELECT feed_id, source_guid, title, word_count
                FROM Article
                LIMIT 1",
                [],
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, Option<String>>(1)?,
                        row.get::<_, String>(2)?,
                        row.get::<_, Option<i64>>(3)?,
                    ))
                },
            )
            .expect("read article row");
        let attachment_url: String = connection
            .query_row("SELECT url FROM Attachment LIMIT 1", [], |row| row.get(0))
            .expect("read attachment");
        let user_state_row = connection
            .query_row(
                "SELECT read_state, starred, liked, importance, read_later, reading_progress
                FROM UserState
                LIMIT 1",
                [],
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, i64>(1)?,
                        row.get::<_, i64>(2)?,
                        row.get::<_, String>(3)?,
                        row.get::<_, i64>(4)?,
                        row.get::<_, f64>(5)?,
                    ))
                },
            )
            .expect("read user state");

        assert_eq!(result.stored_article_count, 1);
        assert_eq!(feed_row.0, "Example Feed");
        assert_eq!(feed_row.1, "https://example.com/feed.xml");
        assert_eq!(feed_row.2, "rss");
        assert_eq!(feed_row.3, "healthy");
        assert_eq!(feed_row.4, "2026-04-16T10:00:00Z");
        assert_eq!(feed_row.5, "2026-04-16T10:00:00Z");
        assert_eq!(article_row.0, result.feed_id.as_str());
        assert_eq!(article_row.1.as_deref(), Some("entry-1"));
        assert_eq!(article_row.2, "First entry");
        assert_eq!(article_row.3, Some(3));
        assert_eq!(attachment_url, "https://example.com/audio-1.mp3");
        assert_eq!(
            user_state_row,
            ("unread".into(), 0, 0, "normal".into(), 0, 0.0)
        );
    }

    #[test]
    fn reuses_existing_feed_and_article_identity_without_overwriting_user_state_fields() {
        let temp_dir = tempdir().expect("tempdir");
        let database_path = temp_dir.path().join("freelyrss.sqlite3");
        initialize_database(&database_path, &DatabaseInitializationOptions::default())
            .expect("initialize database");

        let repository = SqliteFeedRepository::new(&database_path);
        let first_result = repository
            .persist(sample_batch(
                None,
                "entry-1",
                "First entry",
                "https://example.com/audio-1.mp3",
            ))
            .expect("first persist");

        let connection = Connection::open(&database_path).expect("open database");
        let article_id: String = connection
            .query_row("SELECT id FROM Article LIMIT 1", [], |row| row.get(0))
            .expect("read initial article id");
        connection
            .execute(
                "UPDATE Feed
                SET custom_name = ?1, sort_order = ?2, update_interval = ?3
                WHERE id = ?4",
                params!["Pinned feed", 9, 45, first_result.feed_id.as_str()],
            )
            .expect("preserve user feed fields");
        connection
            .execute(
                "UPDATE UserState
                SET read_state = ?1, starred = 1, reading_progress = 0.8
                WHERE article_id = ?2",
                params!["read", article_id],
            )
            .expect("seed user state");

        drop(connection);

        let second_result = repository
            .persist(sample_batch(
                None,
                "entry-1",
                "Updated entry",
                "https://example.com/audio-2.mp3",
            ))
            .expect("second persist");

        let connection = Connection::open(&database_path).expect("reopen database");
        let feed_row = connection
            .query_row(
                "SELECT id, custom_name, sort_order, update_interval, title
                FROM Feed
                WHERE feed_url = ?1",
                params!["https://example.com/feed.xml"],
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, Option<String>>(1)?,
                        row.get::<_, i64>(2)?,
                        row.get::<_, Option<i64>>(3)?,
                        row.get::<_, String>(4)?,
                    ))
                },
            )
            .expect("read updated feed row");
        let article_row = connection
            .query_row(
                "SELECT id, title
                FROM Article
                WHERE feed_id = ?1",
                params![second_result.feed_id.as_str()],
                |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
            )
            .expect("read updated article row");
        let user_state_row = connection
            .query_row(
                "SELECT read_state, starred, reading_progress
                FROM UserState
                WHERE article_id = ?1",
                params![article_row.0.as_str()],
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, i64>(1)?,
                        row.get::<_, f64>(2)?,
                    ))
                },
            )
            .expect("read preserved user state");
        let attachment_rows: Vec<String> = {
            let mut statement = connection
                .prepare("SELECT url FROM Attachment ORDER BY url ASC")
                .expect("prepare attachment query");
            let rows = statement
                .query_map([], |row| row.get::<_, String>(0))
                .expect("query attachments");

            rows.collect::<Result<Vec<_>, _>>()
                .expect("collect attachments")
        };
        let article_count: i64 = connection
            .query_row("SELECT COUNT(*) FROM Article", [], |row| row.get(0))
            .expect("count articles");

        assert_eq!(second_result.feed_id, first_result.feed_id);
        assert_eq!(feed_row.0, first_result.feed_id.as_str());
        assert_eq!(feed_row.1.as_deref(), Some("Pinned feed"));
        assert_eq!(feed_row.2, 9);
        assert_eq!(feed_row.3, Some(45));
        assert_eq!(feed_row.4, "Example Feed");
        assert_eq!(article_row.0, article_id);
        assert_eq!(article_row.1, "Updated entry");
        assert_eq!(user_state_row, ("read".into(), 1, 0.8));
        assert_eq!(attachment_rows, vec!["https://example.com/audio-2.mp3"]);
        assert_eq!(article_count, 1);
    }

    #[test]
    fn records_not_modified_checks_without_rewriting_existing_articles() {
        let temp_dir = tempdir().expect("tempdir");
        let database_path = temp_dir.path().join("freelyrss.sqlite3");
        initialize_database(&database_path, &DatabaseInitializationOptions::default())
            .expect("initialize database");

        let repository = SqliteFeedRepository::new(&database_path);
        let first_result = repository
            .persist(sample_batch(
                None,
                "entry-1",
                "First entry",
                "https://example.com/audio-1.mp3",
            ))
            .expect("seed initial feed graph");

        let recorded = repository
            .record_not_modified(NotModifiedFeed {
                request: FetchRequest {
                    feed_id: Some(first_result.feed_id.clone()),
                    feed_url: url("https://example.com/feed.xml"),
                    etag: Some("\"etag-v2\"".into()),
                    last_modified: Some("Wed, 16 Apr 2026 10:00:00 GMT".into()),
                },
                final_url: url("https://cdn.example.com/feed.xml"),
                status_code: 304,
                fetched_at: time("2026-04-16T11:15:00Z"),
                etag: Some("\"etag-v3\"".into()),
                last_modified: Some("Wed, 16 Apr 2026 11:00:00 GMT".into()),
            })
            .expect("record not-modified poll");

        let connection = Connection::open(&database_path).expect("open database");
        let feed_row = connection
            .query_row(
                "SELECT feed_url, health_status, last_checked_at, last_success_at, etag, last_modified
                FROM Feed
                WHERE id = ?1",
                params![recorded.feed_id.as_str()],
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                        row.get::<_, String>(3)?,
                        row.get::<_, Option<String>>(4)?,
                        row.get::<_, Option<String>>(5)?,
                    ))
                },
            )
            .expect("read updated feed");
        let article_count: i64 = connection
            .query_row("SELECT COUNT(*) FROM Article", [], |row| row.get(0))
            .expect("count articles");
        let attachment_count: i64 = connection
            .query_row("SELECT COUNT(*) FROM Attachment", [], |row| row.get(0))
            .expect("count attachments");

        assert_eq!(recorded.feed_id, first_result.feed_id);
        assert_eq!(feed_row.0, "https://cdn.example.com/feed.xml");
        assert_eq!(feed_row.1, "healthy");
        assert_eq!(feed_row.2, "2026-04-16T11:15:00Z");
        assert_eq!(feed_row.3, "2026-04-16T11:15:00Z");
        assert_eq!(feed_row.4.as_deref(), Some("\"etag-v3\""));
        assert_eq!(feed_row.5.as_deref(), Some("Wed, 16 Apr 2026 11:00:00 GMT"));
        assert_eq!(article_count, 1);
        assert_eq!(attachment_count, 1);
    }

    #[test]
    fn records_failed_checks_with_error_details_and_degraded_health() {
        let temp_dir = tempdir().expect("tempdir");
        let database_path = temp_dir.path().join("freelyrss.sqlite3");
        initialize_database(&database_path, &DatabaseInitializationOptions::default())
            .expect("initialize database");

        let repository = SqliteFeedRepository::new(&database_path);
        let first_result = repository
            .persist(sample_batch(
                None,
                "entry-1",
                "First entry",
                "https://example.com/audio-1.mp3",
            ))
            .expect("seed initial feed graph");

        repository
            .record_failure(FailedFeedCheck {
                request: FetchRequest {
                    feed_id: Some(first_result.feed_id.clone()),
                    feed_url: url("https://example.com/feed.xml"),
                    etag: None,
                    last_modified: None,
                },
                final_url: Some(url("https://example.com/feed.xml")),
                checked_at: time("2026-04-18T09:45:00Z"),
                error_kind: FeedErrorKind::Parse,
                error_message: "feed XML could not be parsed: malformed token".into(),
            })
            .expect("record failed check");

        let connection = Connection::open(&database_path).expect("open database");
        let feed_row = connection
            .query_row(
                "SELECT health_status, last_checked_at, last_success_at, last_error_kind, last_error_message, last_error_at, consecutive_failures
                FROM Feed
                WHERE id = ?1",
                params![first_result.feed_id.as_str()],
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                        row.get::<_, Option<String>>(3)?,
                        row.get::<_, Option<String>>(4)?,
                        row.get::<_, Option<String>>(5)?,
                        row.get::<_, i64>(6)?,
                    ))
                },
            )
            .expect("read failed feed row");

        assert_eq!(feed_row.0, "degraded");
        assert_eq!(feed_row.1, "2026-04-18T09:45:00Z");
        assert_eq!(feed_row.2, "2026-04-16T10:00:00Z");
        assert_eq!(feed_row.3.as_deref(), Some("parse"));
        assert_eq!(
            feed_row.4.as_deref(),
            Some("feed XML could not be parsed: malformed token")
        );
        assert_eq!(feed_row.5.as_deref(), Some("2026-04-18T09:45:00Z"));
        assert_eq!(feed_row.6, 1);
    }

    #[test]
    fn escalates_repeated_failures_to_error_and_clears_diagnostics_after_success() {
        let temp_dir = tempdir().expect("tempdir");
        let database_path = temp_dir.path().join("freelyrss.sqlite3");
        initialize_database(&database_path, &DatabaseInitializationOptions::default())
            .expect("initialize database");

        let repository = SqliteFeedRepository::new(&database_path);
        let first_result = repository
            .persist(sample_batch(
                None,
                "entry-1",
                "First entry",
                "https://example.com/audio-1.mp3",
            ))
            .expect("seed initial feed graph");

        for checked_at in [
            "2026-04-18T09:45:00Z",
            "2026-04-18T10:00:00Z",
            "2026-04-18T10:15:00Z",
        ] {
            repository
                .record_failure(FailedFeedCheck {
                    request: FetchRequest {
                        feed_id: Some(first_result.feed_id.clone()),
                        feed_url: url("https://example.com/feed.xml"),
                        etag: None,
                        last_modified: None,
                    },
                    final_url: None,
                    checked_at: time(checked_at),
                    error_kind: FeedErrorKind::Network,
                    error_message:
                        "feed request exhausted retries for https://example.com/feed.xml".into(),
                })
                .expect("record network failure");
        }

        let connection = Connection::open(&database_path).expect("open database");
        let failed_row = connection
            .query_row(
                "SELECT health_status, last_error_kind, consecutive_failures
                FROM Feed
                WHERE id = ?1",
                params![first_result.feed_id.as_str()],
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, Option<String>>(1)?,
                        row.get::<_, i64>(2)?,
                    ))
                },
            )
            .expect("read failed feed row");
        drop(connection);

        assert_eq!(failed_row.0, "error");
        assert_eq!(failed_row.1.as_deref(), Some("network"));
        assert_eq!(failed_row.2, 3);

        repository
            .persist(sample_batch(
                Some(first_result.feed_id.clone()),
                "entry-1",
                "Recovered entry",
                "https://example.com/audio-2.mp3",
            ))
            .expect("persist recovered feed graph");

        let connection = Connection::open(&database_path).expect("reopen database");
        let recovered_row = connection
            .query_row(
                "SELECT health_status, last_error_kind, last_error_message, last_error_at, consecutive_failures
                FROM Feed
                WHERE id = ?1",
                params![first_result.feed_id.as_str()],
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, Option<String>>(1)?,
                        row.get::<_, Option<String>>(2)?,
                        row.get::<_, Option<String>>(3)?,
                        row.get::<_, i64>(4)?,
                    ))
                },
            )
            .expect("read recovered feed row");

        assert_eq!(recovered_row.0, "healthy");
        assert_eq!(recovered_row.1, None);
        assert_eq!(recovered_row.2, None);
        assert_eq!(recovered_row.3, None);
        assert_eq!(recovered_row.4, 0);
    }

    #[test]
    fn deduplicates_duplicate_fixture_articles_by_url_without_dropping_distinct_items() {
        let temp_dir = tempdir().expect("tempdir");
        let database_path = temp_dir.path().join("freelyrss.sqlite3");
        initialize_database(&database_path, &DatabaseInitializationOptions::default())
            .expect("initialize database");

        let repository = SqliteFeedRepository::new(&database_path);
        let parser = DefaultFeedParser;
        let normalizer = DefaultFeedNormalizer;
        let fetched = fetched_fixture("rss/rss-2-duplicates-and-missing-fields.xml");
        let parsed = expect_feed(parser.parse(&fetched).expect("fixture should parse"));
        let batch = normalizer
            .normalize(parsed, &NormalizeContext::from_fetched_feed(&fetched))
            .expect("fixture should normalize");

        let result = repository
            .persist(batch)
            .expect("persist duplicate fixture");

        let connection = Connection::open(&database_path).expect("open database");
        let article_rows: Vec<(Option<String>, String)> = {
            let mut statement = connection
                .prepare(
                    "SELECT source_guid, title
                    FROM Article
                    ORDER BY title ASC",
                )
                .expect("prepare article query");
            let rows = statement
                .query_map([], |row| {
                    Ok((row.get::<_, Option<String>>(0)?, row.get::<_, String>(1)?))
                })
                .expect("query articles");

            rows.collect::<Result<Vec<_>, _>>()
                .expect("collect article rows")
        };

        assert_eq!(result.stored_article_count, 2);
        assert_eq!(article_rows.len(), 2);
        assert!(article_rows.contains(&(
            Some("duplicate-source-guid".into()),
            "Duplicate story from the primary source".into(),
        )));
        assert!(article_rows.contains(&(None, "Sparse article without optional fields".into())));
        assert!(
            !article_rows
                .iter()
                .any(|(_, title)| title == "Duplicate story mirrored by the archive")
        );
    }

    #[test]
    fn reuses_existing_article_identity_by_title_and_published_at_when_guid_and_urls_are_missing() {
        let temp_dir = tempdir().expect("tempdir");
        let database_path = temp_dir.path().join("freelyrss.sqlite3");
        initialize_database(&database_path, &DatabaseInitializationOptions::default())
            .expect("initialize database");

        let repository = SqliteFeedRepository::new(&database_path);
        repository
            .persist(sample_batch_with_article(sample_article(
                SampleArticleInput {
                    title: "Repeated title",
                    published_at: Some("2026-04-16T09:30:00Z"),
                    content_raw: Some("<p>First copy</p>"),
                    content_extracted: Some("First copy"),
                    summary: Some("First summary"),
                    ..SampleArticleInput::default()
                },
            )))
            .expect("persist first article");

        let connection = Connection::open(&database_path).expect("open database");
        let article_id: String = connection
            .query_row("SELECT id FROM Article LIMIT 1", [], |row| row.get(0))
            .expect("read initial article id");
        drop(connection);

        repository
            .persist(sample_batch_with_article(sample_article(
                SampleArticleInput {
                    title: "Repeated title",
                    published_at: Some("2026-04-16T09:30:00Z"),
                    content_raw: Some("<p>Updated copy</p>"),
                    content_extracted: Some("Updated copy"),
                    summary: Some("Updated summary"),
                    ..SampleArticleInput::default()
                },
            )))
            .expect("persist second article");

        let connection = Connection::open(&database_path).expect("reopen database");
        let article_row = connection
            .query_row(
                "SELECT id, content_extracted
                FROM Article
                LIMIT 1",
                [],
                |row| Ok((row.get::<_, String>(0)?, row.get::<_, Option<String>>(1)?)),
            )
            .expect("read updated article");
        let article_count: i64 = connection
            .query_row("SELECT COUNT(*) FROM Article", [], |row| row.get(0))
            .expect("count articles");

        assert_eq!(article_row.0, article_id);
        assert_eq!(article_row.1.as_deref(), Some("Updated copy"));
        assert_eq!(article_count, 1);
    }

    #[test]
    fn reuses_existing_article_identity_by_content_hash_when_other_dedup_fields_are_missing() {
        let temp_dir = tempdir().expect("tempdir");
        let database_path = temp_dir.path().join("freelyrss.sqlite3");
        initialize_database(&database_path, &DatabaseInitializationOptions::default())
            .expect("initialize database");

        let repository = SqliteFeedRepository::new(&database_path);
        repository
            .persist(sample_batch_with_article(sample_article(
                SampleArticleInput {
                    title: "Original title",
                    content_raw: Some("<p>Shared body content for hash dedup.</p>"),
                    content_extracted: Some("Shared body content for hash dedup."),
                    ..SampleArticleInput::default()
                },
            )))
            .expect("persist first article");

        let connection = Connection::open(&database_path).expect("open database");
        let article_id: String = connection
            .query_row("SELECT id FROM Article LIMIT 1", [], |row| row.get(0))
            .expect("read initial article id");
        drop(connection);

        repository
            .persist(sample_batch_with_article(sample_article(
                SampleArticleInput {
                    title: "Mirrored title",
                    content_raw: Some("<div>Shared body content for hash dedup.</div>"),
                    content_extracted: Some("Shared body content for hash dedup."),
                    summary: Some("Mirror summary"),
                    ..SampleArticleInput::default()
                },
            )))
            .expect("persist mirrored article");

        let connection = Connection::open(&database_path).expect("reopen database");
        let article_row = connection
            .query_row(
                "SELECT id, title, content_hash
                FROM Article
                LIMIT 1",
                [],
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, Option<String>>(2)?,
                    ))
                },
            )
            .expect("read updated article");
        let article_count: i64 = connection
            .query_row("SELECT COUNT(*) FROM Article", [], |row| row.get(0))
            .expect("count articles");

        assert_eq!(article_row.0, article_id);
        assert_eq!(article_row.1, "Mirrored title");
        assert!(article_row.2.is_some());
        assert_eq!(article_count, 1);
    }

    fn sample_batch(
        feed_id: Option<FeedId>,
        source_guid: &str,
        title: &str,
        attachment_url: &str,
    ) -> NormalizedFeedBatch {
        NormalizedFeedBatch {
            feed: NormalizedFeedRecord {
                feed_id,
                title: "Example Feed".into(),
                site_url: Some(url("https://example.com")),
                feed_url: url("https://example.com/feed.xml"),
                format: FeedFormat::Rss,
                icon: Some(url("https://example.com/icon.png")),
                etag: Some("\"etag-v2\"".into()),
                last_modified: Some("Wed, 16 Apr 2026 10:00:00 GMT".into()),
                last_checked_at: time("2026-04-16T10:00:00Z"),
                last_success_at: time("2026-04-16T10:00:00Z"),
            },
            articles: vec![NormalizedArticleRecord {
                source_guid: Some(source_guid.into()),
                title: title.into(),
                author: Some("FreelyRSS".into()),
                summary: Some("Step 29 persistence".into()),
                content_raw: Some("<p>Step 29 persistence</p>".into()),
                content_extracted: Some("Step 29 persistence".into()),
                canonical_url: Some(url("https://example.com/articles/1")),
                original_url: Some(url("https://example.com/articles/1?utm=feed")),
                published_at: Some(time("2026-04-16T09:30:00Z")),
                fetched_at: time("2026-04-16T10:00:00Z"),
                language: None,
                thumbnail: Some(url("https://example.com/thumb.png")),
                attachments: vec![NormalizedAttachmentRecord {
                    attachment_type: AttachmentType::Audio,
                    url: url(attachment_url),
                    mime_type: Some("audio/mpeg".into()),
                    duration: Some(120),
                    size: Some(4096),
                }],
            }],
        }
    }

    fn sample_batch_with_article(article: NormalizedArticleRecord) -> NormalizedFeedBatch {
        NormalizedFeedBatch {
            feed: NormalizedFeedRecord {
                feed_id: None,
                title: "Example Feed".into(),
                site_url: Some(url("https://example.com")),
                feed_url: url("https://example.com/feed.xml"),
                format: FeedFormat::Rss,
                icon: Some(url("https://example.com/icon.png")),
                etag: Some("\"etag-v2\"".into()),
                last_modified: Some("Wed, 16 Apr 2026 10:00:00 GMT".into()),
                last_checked_at: time("2026-04-16T10:00:00Z"),
                last_success_at: time("2026-04-16T10:00:00Z"),
            },
            articles: vec![article],
        }
    }

    #[derive(Clone, Copy, Debug, Default)]
    struct SampleArticleInput<'a> {
        source_guid: Option<&'a str>,
        title: &'a str,
        canonical_url: Option<&'a str>,
        original_url: Option<&'a str>,
        published_at: Option<&'a str>,
        content_raw: Option<&'a str>,
        content_extracted: Option<&'a str>,
        summary: Option<&'a str>,
    }

    fn sample_article(input: SampleArticleInput<'_>) -> NormalizedArticleRecord {
        NormalizedArticleRecord {
            source_guid: input.source_guid.map(str::to_owned),
            title: input.title.into(),
            author: Some("FreelyRSS".into()),
            summary: input.summary.map(str::to_owned),
            content_raw: input.content_raw.map(str::to_owned),
            content_extracted: input.content_extracted.map(str::to_owned),
            canonical_url: input.canonical_url.map(url),
            original_url: input.original_url.map(url),
            published_at: input.published_at.map(time),
            fetched_at: time("2026-04-16T10:00:00Z"),
            language: None,
            thumbnail: Some(url("https://example.com/thumb.png")),
            attachments: Vec::new(),
        }
    }

    fn fetched_fixture(relative_path: &str) -> FetchedFeed {
        FetchedFeed {
            request: FetchRequest {
                feed_id: Some(feed_id("feed-rss")),
                feed_url: url("https://example.com/feeds/original.xml"),
                etag: Some("\"etag-v1\"".to_owned()),
                last_modified: Some("Fri, 10 Apr 2026 23:00:00 GMT".to_owned()),
            },
            final_url: url("https://example.com/feeds/current.xml"),
            status_code: 200,
            content_type: Some("application/rss+xml".to_owned()),
            body: fs::read(fixture_path(relative_path)).expect("fixture should be readable"),
            fetched_at: time("2026-04-11T12:30:00Z"),
            etag: Some("\"etag-v2\"".to_owned()),
            last_modified: Some("Sat, 11 Apr 2026 12:00:00 GMT".to_owned()),
        }
    }

    fn fixture_path(relative_path: &str) -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("tests")
            .join("fixtures")
            .join(relative_path)
    }

    fn expect_feed(parsed: ParsedSource) -> crate::ParsedFeedDocument {
        match parsed {
            ParsedSource::Feed(parsed) => parsed,
            ParsedSource::Discovery(discovery) => {
                panic!("expected parsed feed document, got discovery result: {discovery:?}")
            }
        }
    }

    fn feed_id(value: &str) -> FeedId {
        FeedId::try_from(value).expect("valid feed id")
    }

    fn time(value: &str) -> IsoDateTime {
        IsoDateTime::try_from(value).expect("valid timestamp")
    }

    fn url(value: &str) -> UrlString {
        UrlString::try_from(value).expect("valid url")
    }
}
