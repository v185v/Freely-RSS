use rusqlite::{Connection, OptionalExtension, Transaction, params};

use crate::{
    Article, ArticleId, Attachment, Feed, FeedErrorKind, FeedHealthStatus, FeedId, ImportanceLevel,
    IsoDateTime, ReadState, UrlString,
};

use super::StoreError;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct FeedGraphPersistReport {
    pub stored_article_count: usize,
}

pub struct FeedStore<'conn> {
    connection: &'conn mut Connection,
}

impl<'conn> FeedStore<'conn> {
    pub fn new(connection: &'conn mut Connection) -> Self {
        Self { connection }
    }

    pub fn find_feed_id_by_url(
        &mut self,
        feed_url: &UrlString,
    ) -> Result<Option<FeedId>, StoreError> {
        let feed_id = self
            .connection
            .query_row(
                "SELECT id
                FROM Feed
                WHERE feed_url = ?1
                LIMIT 1",
                params![feed_url.as_str()],
                |row| row.get::<_, String>(0),
            )
            .optional()?;

        feed_id
            .map(FeedId::try_from)
            .transpose()
            .map_err(Into::into)
    }

    pub fn find_article_id_by_source_guid(
        &mut self,
        feed_id: &FeedId,
        source_guid: &str,
    ) -> Result<Option<ArticleId>, StoreError> {
        let article_id = self
            .connection
            .query_row(
                "SELECT id
                FROM Article
                WHERE feed_id = ?1 AND source_guid = ?2
                LIMIT 1",
                params![feed_id.as_str(), source_guid],
                |row| row.get::<_, String>(0),
            )
            .optional()?;

        article_id
            .map(ArticleId::try_from)
            .transpose()
            .map_err(Into::into)
    }

    pub fn find_article_id_by_url(
        &mut self,
        feed_id: &FeedId,
        canonical_url: Option<&UrlString>,
        original_url: Option<&UrlString>,
    ) -> Result<Option<ArticleId>, StoreError> {
        for url in [canonical_url, original_url].into_iter().flatten() {
            if let Some(article_id) = self.find_article_id_by_single_url(feed_id, url.as_str())? {
                return Ok(Some(article_id));
            }
        }

        Ok(None)
    }

    pub fn find_article_id_by_title_and_published_at(
        &mut self,
        feed_id: &FeedId,
        title: &str,
        published_at: &IsoDateTime,
    ) -> Result<Option<ArticleId>, StoreError> {
        let article_id = self
            .connection
            .query_row(
                "SELECT id
                FROM Article
                WHERE feed_id = ?1 AND title = ?2 AND published_at = ?3
                LIMIT 1",
                params![feed_id.as_str(), title, published_at.as_str()],
                |row| row.get::<_, String>(0),
            )
            .optional()?;

        article_id
            .map(ArticleId::try_from)
            .transpose()
            .map_err(Into::into)
    }

    pub fn find_article_id_by_content_hash(
        &mut self,
        feed_id: &FeedId,
        content_hash: &str,
    ) -> Result<Option<ArticleId>, StoreError> {
        let article_id = self
            .connection
            .query_row(
                "SELECT id
                FROM Article
                WHERE feed_id = ?1 AND content_hash = ?2
                LIMIT 1",
                params![feed_id.as_str(), content_hash],
                |row| row.get::<_, String>(0),
            )
            .optional()?;

        article_id
            .map(ArticleId::try_from)
            .transpose()
            .map_err(Into::into)
    }

    pub fn persist_feed_graph(
        &mut self,
        feed: &Feed,
        articles: &[Article],
        attachments: &[Attachment],
    ) -> Result<FeedGraphPersistReport, StoreError> {
        let transaction = self.connection.transaction()?;

        upsert_feed(&transaction, feed)?;

        for article in articles {
            upsert_article(&transaction, article)?;
            ensure_default_user_state(&transaction, &article.id)?;
            replace_article_attachments(&transaction, article, attachments)?;
        }

        transaction.commit()?;

        Ok(FeedGraphPersistReport {
            stored_article_count: articles.len(),
        })
    }

    pub fn record_feed_successful_check(
        &mut self,
        feed_id: &FeedId,
        final_feed_url: &UrlString,
        checked_at: &IsoDateTime,
        etag: Option<&str>,
        last_modified: Option<&str>,
    ) -> Result<bool, StoreError> {
        let updated_rows = self.connection.execute(
            "UPDATE Feed
            SET feed_url = ?2,
                health_status = ?3,
                last_checked_at = ?4,
                last_success_at = ?4,
                etag = ?5,
                last_modified = ?6,
                last_error_kind = NULL,
                last_error_message = NULL,
                last_error_at = NULL,
                consecutive_failures = 0
            WHERE id = ?1",
            params![
                feed_id.as_str(),
                final_feed_url.as_str(),
                FeedHealthStatus::Healthy.as_str(),
                checked_at.as_str(),
                etag,
                last_modified,
            ],
        )?;

        Ok(updated_rows > 0)
    }

    pub fn record_feed_failed_check(
        &mut self,
        feed_id: &FeedId,
        checked_at: &IsoDateTime,
        error_kind: FeedErrorKind,
        error_message: &str,
    ) -> Result<bool, StoreError> {
        let Some(current_failures) = self
            .connection
            .query_row(
                "SELECT consecutive_failures
                FROM Feed
                WHERE id = ?1
                LIMIT 1",
                params![feed_id.as_str()],
                |row| row.get::<_, i64>(0),
            )
            .optional()?
        else {
            return Ok(false);
        };

        let next_failures = current_failures + 1;
        let next_health_status = health_status_for_failure(error_kind, next_failures);
        let updated_rows = self.connection.execute(
            "UPDATE Feed
            SET health_status = ?2,
                last_checked_at = ?3,
                last_error_kind = ?4,
                last_error_message = ?5,
                last_error_at = ?3,
                consecutive_failures = ?6
            WHERE id = ?1",
            params![
                feed_id.as_str(),
                next_health_status.as_str(),
                checked_at.as_str(),
                error_kind.as_str(),
                error_message,
                next_failures,
            ],
        )?;

        Ok(updated_rows > 0)
    }

    fn find_article_id_by_single_url(
        &mut self,
        feed_id: &FeedId,
        url: &str,
    ) -> Result<Option<ArticleId>, StoreError> {
        let article_id = self
            .connection
            .query_row(
                "SELECT id
                FROM Article
                WHERE feed_id = ?1
                  AND (canonical_url = ?2 OR original_url = ?2)
                LIMIT 1",
                params![feed_id.as_str(), url],
                |row| row.get::<_, String>(0),
            )
            .optional()?;

        article_id
            .map(ArticleId::try_from)
            .transpose()
            .map_err(Into::into)
    }
}

fn upsert_feed(transaction: &Transaction<'_>, feed: &Feed) -> Result<(), rusqlite::Error> {
    transaction.execute(
        "INSERT INTO Feed (
            id,
            title,
            site_url,
            feed_url,
            format,
            icon,
            folder_id,
            custom_name,
            sort_order,
            update_interval,
            cache_policy,
            health_status,
            last_checked_at,
            last_success_at,
            etag,
            last_modified,
            last_error_kind,
            last_error_message,
            last_error_at,
            consecutive_failures
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20
        )
        ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            site_url = excluded.site_url,
            feed_url = excluded.feed_url,
            format = excluded.format,
            icon = excluded.icon,
            health_status = excluded.health_status,
            last_checked_at = excluded.last_checked_at,
            last_success_at = excluded.last_success_at,
            etag = excluded.etag,
            last_modified = excluded.last_modified,
            last_error_kind = excluded.last_error_kind,
            last_error_message = excluded.last_error_message,
            last_error_at = excluded.last_error_at,
            consecutive_failures = excluded.consecutive_failures",
        params![
            feed.id.as_str(),
            feed.title,
            feed.site_url.as_ref().map(|value| value.as_str()),
            feed.feed_url.as_str(),
            feed.format.as_str(),
            feed.icon.as_ref().map(|value| value.as_str()),
            feed.folder_id.as_ref().map(|value| value.as_str()),
            feed.custom_name,
            feed.sort_order,
            feed.update_interval,
            feed.cache_policy.as_str(),
            feed.health_status.as_str(),
            feed.last_checked_at.as_ref().map(|value| value.as_str()),
            feed.last_success_at.as_ref().map(|value| value.as_str()),
            feed.etag,
            feed.last_modified,
            feed.last_error_kind.map(|value| value.as_str()),
            feed.last_error_message,
            feed.last_error_at.as_ref().map(|value| value.as_str()),
            feed.consecutive_failures,
        ],
    )?;

    Ok(())
}

fn health_status_for_failure(
    error_kind: FeedErrorKind,
    consecutive_failures: i64,
) -> FeedHealthStatus {
    if matches!(error_kind, FeedErrorKind::Permission) || consecutive_failures >= 3 {
        FeedHealthStatus::Error
    } else {
        FeedHealthStatus::Degraded
    }
}

fn upsert_article(transaction: &Transaction<'_>, article: &Article) -> Result<(), rusqlite::Error> {
    transaction.execute(
        "INSERT INTO Article (
            id,
            feed_id,
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
            word_count,
            content_hash
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16
        )
        ON CONFLICT(id) DO UPDATE SET
            source_guid = excluded.source_guid,
            title = excluded.title,
            author = excluded.author,
            summary = excluded.summary,
            content_raw = excluded.content_raw,
            content_extracted = excluded.content_extracted,
            canonical_url = excluded.canonical_url,
            original_url = excluded.original_url,
            published_at = excluded.published_at,
            fetched_at = excluded.fetched_at,
            language = excluded.language,
            thumbnail = excluded.thumbnail,
            word_count = excluded.word_count,
            content_hash = excluded.content_hash",
        params![
            article.id.as_str(),
            article.feed_id.as_str(),
            article.source_guid,
            article.title,
            article.author,
            article.summary,
            article.content_raw,
            article.content_extracted,
            article.canonical_url.as_ref().map(|value| value.as_str()),
            article.original_url.as_ref().map(|value| value.as_str()),
            article.published_at.as_ref().map(|value| value.as_str()),
            article.fetched_at.as_str(),
            article.language.as_ref().map(|value| value.as_str()),
            article.thumbnail.as_ref().map(|value| value.as_str()),
            article.word_count,
            article.content_hash,
        ],
    )?;

    Ok(())
}

fn ensure_default_user_state(
    transaction: &Transaction<'_>,
    article_id: &ArticleId,
) -> Result<(), rusqlite::Error> {
    transaction.execute(
        "INSERT INTO UserState (
            article_id,
            read_state,
            starred,
            liked,
            importance,
            read_later,
            reading_progress,
            last_opened_at
        ) VALUES (?1, ?2, 0, 0, ?3, 0, 0.0, NULL)
        ON CONFLICT(article_id) DO NOTHING",
        params![
            article_id.as_str(),
            ReadState::Unread.as_str(),
            ImportanceLevel::Normal.as_str(),
        ],
    )?;

    Ok(())
}

fn replace_article_attachments(
    transaction: &Transaction<'_>,
    article: &Article,
    attachments: &[Attachment],
) -> Result<(), rusqlite::Error> {
    transaction.execute(
        "DELETE FROM Attachment WHERE article_id = ?1",
        params![article.id.as_str()],
    )?;

    for attachment in attachments
        .iter()
        .filter(|attachment| attachment.article_id == article.id)
    {
        transaction.execute(
            "INSERT INTO Attachment (
                id,
                article_id,
                type,
                url,
                mime_type,
                duration,
                size,
                local_cache_path
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                attachment.id.as_str(),
                attachment.article_id.as_str(),
                attachment.attachment_type.as_str(),
                attachment.url.as_str(),
                attachment.mime_type,
                attachment.duration,
                attachment.size,
                attachment
                    .local_cache_path
                    .as_ref()
                    .map(|value| value.as_str()),
            ],
        )?;
    }

    Ok(())
}
