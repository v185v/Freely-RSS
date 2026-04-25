use std::{error::Error, path::PathBuf};

use freelyrss_core_domain::sqlite::{
    prepare_database_connection, ArticleSearchReadFilter, ArticleSearchSort, ArticleSearchStore,
};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadReaderQueueRequest {
    pub feed_ids: Vec<String>,
    pub search_text: String,
    pub sort_mode: ReaderSortMode,
    pub status_filter: ReaderStatusFilter,
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ReaderSortMode {
    Newest,
    Oldest,
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ReaderStatusFilter {
    All,
    Unread,
    Reading,
    ReadLater,
    Starred,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReaderQueueArticleDto {
    pub id: String,
    pub feed_id: String,
    pub feed_title: String,
    pub title: String,
    pub author: Option<String>,
    pub summary: Option<String>,
    pub published_at: Option<String>,
    pub thumbnail: Option<String>,
    pub estimated_reading_minutes: Option<i64>,
    pub state: ReaderQueueArticleStateDto,
    pub tag_ids: Vec<String>,
    pub attachment_count: usize,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReaderQueueArticleStateDto {
    pub article_id: String,
    pub read_state: String,
    pub starred: bool,
    pub liked: bool,
    pub importance: String,
    pub read_later: bool,
    pub reading_progress: f64,
    pub last_opened_at: Option<String>,
}

#[tauri::command]
pub fn load_reader_queue_articles(
    app: AppHandle,
    request: LoadReaderQueueRequest,
) -> Result<Vec<ReaderQueueArticleDto>, String> {
    load_reader_queue_articles_at(resolve_database_path(&app)?, request).map_err(|error| error.to_string())
}

fn load_reader_queue_articles_at(
    database_path: PathBuf,
    request: LoadReaderQueueRequest,
) -> Result<Vec<ReaderQueueArticleDto>, Box<dyn Error>> {
    if !database_path.exists() {
        return Ok(Vec::new());
    }

    let mut connection = Connection::open(database_path)?;
    prepare_database_connection(&connection)?;

    let mut store = ArticleSearchStore::new(&mut connection);
    let feed_ids = request.feed_ids.iter().map(String::as_str).collect::<Vec<_>>();
    let items = store.list_articles(
        Some(request.search_text.as_str()).filter(|value| !value.trim().is_empty()),
        &feed_ids,
        map_status_filter(request.status_filter),
        map_sort_mode(request.sort_mode),
    )?;

    Ok(items
        .into_iter()
        .map(|item| {
            let estimated_reading_minutes = item.article.word_count.map(|word_count| {
                let minutes = ((word_count as f64) / 180.0).ceil() as i64;
                minutes.max(1)
            });

            ReaderQueueArticleDto {
                id: item.article.id.to_string(),
                feed_id: item.article.feed_id.to_string(),
                feed_title: item.feed_display_title,
                title: item.article.title,
                author: item.article.author,
                summary: item.article.summary,
                published_at: item.article.published_at.map(Into::into),
                thumbnail: item.article.thumbnail.map(Into::into),
                estimated_reading_minutes,
                state: ReaderQueueArticleStateDto {
                    article_id: item.article.id.to_string(),
                    read_state: item.read_state.as_str().to_owned(),
                    starred: item.starred,
                    liked: false,
                    importance: item.importance.as_str().to_owned(),
                    read_later: item.read_later,
                    reading_progress: default_reading_progress(item.read_state),
                    last_opened_at: None,
                },
                tag_ids: load_tag_ids(&connection, item.article.id.as_str()).unwrap_or_default(),
                attachment_count: item.attachment_count,
            }
        })
        .collect())
}

fn load_tag_ids(connection: &Connection, article_id: &str) -> Result<Vec<String>, rusqlite::Error> {
    let mut statement = connection.prepare(
        "SELECT tag_id
        FROM ArticleTag
        WHERE article_id = ?1
        ORDER BY tag_id ASC",
    )?;
    let rows = statement.query_map([article_id], |row| row.get::<_, String>(0))?;

    rows.collect()
}

fn default_reading_progress(read_state: freelyrss_core_domain::ReadState) -> f64 {
    match read_state {
        freelyrss_core_domain::ReadState::Unread => 0.0,
        freelyrss_core_domain::ReadState::Reading => 0.5,
        freelyrss_core_domain::ReadState::Read => 1.0,
    }
}

fn map_status_filter(value: ReaderStatusFilter) -> ArticleSearchReadFilter {
    match value {
        ReaderStatusFilter::All => ArticleSearchReadFilter::All,
        ReaderStatusFilter::Unread => ArticleSearchReadFilter::Unread,
        ReaderStatusFilter::Reading => ArticleSearchReadFilter::Reading,
        ReaderStatusFilter::ReadLater => ArticleSearchReadFilter::ReadLater,
        ReaderStatusFilter::Starred => ArticleSearchReadFilter::Starred,
    }
}

fn map_sort_mode(value: ReaderSortMode) -> ArticleSearchSort {
    match value {
        ReaderSortMode::Newest => ArticleSearchSort::Newest,
        ReaderSortMode::Oldest => ArticleSearchSort::Oldest,
    }
}

fn resolve_database_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_local_data_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|error| error.to_string())?;

    Ok(app_local_data_dir.join("database").join("freelyrss.sqlite3"))
}

#[cfg(test)]
mod tests {
    use super::{LoadReaderQueueRequest, ReaderSortMode, ReaderStatusFilter, load_reader_queue_articles_at};
    use freelyrss_core_domain::sqlite::{DatabaseInitializationOptions, initialize_database};
    use rusqlite::{Connection, params};
    use tempfile::tempdir;

    #[test]
    fn returns_step52_queue_articles_from_sqlite() {
        let temp_dir = tempdir().expect("temp dir");
        let database_path = temp_dir.path().join("reader-queue.sqlite3");

        initialize_database(&database_path, &DatabaseInitializationOptions::default())
            .expect("initialize database");

        let connection = Connection::open(&database_path).expect("open database");
        connection
            .execute(
                "INSERT INTO Feed (id, title, feed_url, format) VALUES (?1, ?2, ?3, ?4)",
                params!["feed-search", "Search Lab", "https://example.com/feed.xml", "rss"],
            )
            .expect("insert feed");
        connection
            .execute(
                "INSERT INTO Article (
                    id, feed_id, title, summary, content_extracted, published_at, word_count
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    "article-search",
                    "feed-search",
                    "SQLite queue boundary",
                    "Search summary",
                    "Queue retrieval remains inside step 52.",
                    "2026-04-24T12:00:00Z",
                    540_i64
                ],
            )
            .expect("insert article");
        connection
            .execute(
                "INSERT INTO UserState (
                    article_id, read_state, starred, liked, importance, read_later, reading_progress, last_opened_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![
                    "article-search",
                    "reading",
                    1,
                    0,
                    "high",
                    1,
                    0.5_f64,
                    Option::<String>::None
                ],
            )
            .expect("insert user state");
        drop(connection);

        let items = load_reader_queue_articles_at(
            database_path,
            LoadReaderQueueRequest {
                feed_ids: vec!["feed-search".into()],
                search_text: "queue".into(),
                sort_mode: ReaderSortMode::Newest,
                status_filter: ReaderStatusFilter::Reading,
            },
        )
        .expect("load queue articles");

        assert_eq!(items.len(), 1);
        assert_eq!(items[0].id, "article-search");
        assert_eq!(items[0].feed_title, "Search Lab");
        assert_eq!(items[0].state.read_state, "reading");
        assert_eq!(items[0].estimated_reading_minutes, Some(3));
    }
}
