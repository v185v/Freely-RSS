use std::{
    fmt::Write as _,
    path::{Path, PathBuf},
};

use freelyrss_core_domain::{
    Article, ArticleId, Attachment, AttachmentId, Feed, FeedHealthStatus, FeedId, ModelError,
    sqlite::{FeedStore, prepare_database_connection},
};
use rusqlite::Connection;
use sha2::{Digest, Sha256};

use crate::{
    FeedEngineError, FeedRepository, NormalizedArticleRecord, NormalizedAttachmentRecord,
    NormalizedFeedBatch, NormalizedFeedRecord, PersistedFeedBatch,
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

        for (index, normalized_article) in batch.articles.into_iter().enumerate() {
            let (article, article_attachments) =
                build_article_graph(&mut store, &feed_id, normalized_article, index)?;
            articles.push(article);
            attachments.extend(article_attachments);
        }

        let report = store
            .persist_feed_graph(&feed, &articles, &attachments)
            .map_err(|error| FeedEngineError::persist(error.to_string()))?;

        Ok(PersistedFeedBatch {
            feed_id,
            stored_article_count: report.stored_article_count,
        })
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
        health_status: FeedHealthStatus::Healthy,
        last_checked_at: Some(feed.last_checked_at),
        last_success_at: Some(feed.last_success_at),
        etag: feed.etag,
        last_modified: feed.last_modified,
    }
}

fn build_article_graph(
    store: &mut FeedStore<'_>,
    feed_id: &FeedId,
    normalized_article: NormalizedArticleRecord,
    index: usize,
) -> Result<(Article, Vec<Attachment>), FeedEngineError> {
    let article_id = resolve_article_id(store, feed_id, &normalized_article, index)?;
    let attachment_records = normalized_article.attachments.clone();
    let article = build_article(feed_id, article_id.clone(), normalized_article);
    let attachments = attachment_records
        .into_iter()
        .enumerate()
        .map(|(attachment_index, attachment)| {
            build_attachment(article_id.clone(), attachment, attachment_index)
        })
        .collect::<Result<Vec<_>, _>>()?;

    Ok((article, attachments))
}

fn resolve_article_id(
    store: &mut FeedStore<'_>,
    feed_id: &FeedId,
    article: &NormalizedArticleRecord,
    index: usize,
) -> Result<ArticleId, FeedEngineError> {
    if let Some(source_guid) = article.source_guid.as_deref() {
        if let Some(article_id) = store
            .find_article_id_by_source_guid(feed_id, source_guid)
            .map_err(|error| FeedEngineError::persist(error.to_string()))?
        {
            return Ok(article_id);
        }

        return build_article_id(&[feed_id.as_str(), "source-guid", source_guid]);
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
        content_hash: None,
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

fn model_persist_error(error: ModelError) -> FeedEngineError {
    FeedEngineError::persist(error.to_string())
}

#[cfg(test)]
mod tests {
    use freelyrss_core_domain::{
        AttachmentType, FeedFormat, IsoDateTime, UrlString,
        sqlite::{DatabaseInitializationOptions, initialize_database},
    };
    use rusqlite::{Connection, params};
    use tempfile::tempdir;

    use super::*;
    use crate::{
        NormalizedArticleRecord, NormalizedAttachmentRecord, NormalizedFeedBatch,
        NormalizedFeedRecord,
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

    fn time(value: &str) -> IsoDateTime {
        IsoDateTime::try_from(value).expect("valid timestamp")
    }

    fn url(value: &str) -> UrlString {
        UrlString::try_from(value).expect("valid url")
    }
}
