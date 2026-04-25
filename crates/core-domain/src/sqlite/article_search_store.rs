use rusqlite::{Connection, params_from_iter};

use crate::{Article, ArticleId, FeedId, ImportanceLevel, IsoDateTime, LanguageCode, ReadState};

use super::StoreError;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ArticleSearchHit {
    pub article_id: ArticleId,
    pub snippet: String,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ArticleSearchReadFilter {
    All,
    Unread,
    Reading,
    ReadLater,
    Starred,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ArticleSearchSort {
    Newest,
    Oldest,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ArticleSearchListItem {
    pub article: Article,
    pub feed_display_title: String,
    pub attachment_count: usize,
    pub importance: ImportanceLevel,
    pub read_later: bool,
    pub read_state: ReadState,
    pub starred: bool,
}

pub struct ArticleSearchStore<'conn> {
    connection: &'conn mut Connection,
}

impl<'conn> ArticleSearchStore<'conn> {
    pub fn new(connection: &'conn mut Connection) -> Self {
        Self { connection }
    }

    pub fn search_article_ids(
        &mut self,
        query_text: &str,
        feed_ids: &[&str],
    ) -> Result<Vec<ArticleId>, StoreError> {
        let trimmed_query = query_text.trim();

        if trimmed_query.is_empty() {
            return Ok(Vec::new());
        }

        let mut sql = String::from(
            "SELECT article_id
            FROM ArticleSearch
            WHERE ArticleSearch MATCH ?1",
        );

        if !feed_ids.is_empty() {
            sql.push_str(" AND feed_id IN (");
            sql.push_str(&vec!["?"; feed_ids.len()].join(", "));
            sql.push(')');
        }

        sql.push_str(" ORDER BY rank, article_id ASC");

        let mut parameters = Vec::with_capacity(1 + feed_ids.len());
        parameters.push(trimmed_query);
        parameters.extend(feed_ids.iter().copied());

        let mut statement = self.connection.prepare(&sql)?;
        let rows =
            statement.query_map(params_from_iter(parameters), |row| row.get::<_, String>(0))?;

        rows.into_iter()
            .map(|row| Ok(ArticleId::try_from(row?)?))
            .collect()
    }

    pub fn search_with_snippets(
        &mut self,
        query_text: &str,
        feed_ids: &[&str],
    ) -> Result<Vec<ArticleSearchHit>, StoreError> {
        let trimmed_query = query_text.trim();

        if trimmed_query.is_empty() {
            return Ok(Vec::new());
        }

        let mut sql = String::from(
            "SELECT
                article_id,
                snippet(ArticleSearch, 3, '<mark>', '</mark>', ' ... ', 18) AS snippet
            FROM ArticleSearch
            WHERE ArticleSearch MATCH ?1",
        );

        if !feed_ids.is_empty() {
            sql.push_str(" AND feed_id IN (");
            sql.push_str(&vec!["?"; feed_ids.len()].join(", "));
            sql.push(')');
        }

        sql.push_str(" ORDER BY rank, article_id ASC");

        let mut parameters = Vec::with_capacity(1 + feed_ids.len());
        parameters.push(trimmed_query);
        parameters.extend(feed_ids.iter().copied());

        let mut statement = self.connection.prepare(&sql)?;
        let rows = statement.query_map(params_from_iter(parameters), |row| {
            let article_id: String = row.get(0)?;
            let snippet: String = row.get(1)?;

            Ok((article_id, snippet))
        })?;

        rows.into_iter()
            .map(|row| {
                let (article_id, snippet) = row?;

                Ok(ArticleSearchHit {
                    article_id: ArticleId::try_from(article_id)?,
                    snippet,
                })
            })
            .collect()
    }

    pub fn list_articles(
        &mut self,
        query_text: Option<&str>,
        feed_ids: &[&str],
        read_filter: ArticleSearchReadFilter,
        sort: ArticleSearchSort,
    ) -> Result<Vec<ArticleSearchListItem>, StoreError> {
        let trimmed_query = query_text.map(str::trim).filter(|value| !value.is_empty());
        let mut sql = String::from(
            "SELECT
                article.id,
                article.feed_id,
                article.source_guid,
                article.title,
                article.author,
                article.summary,
                article.content_raw,
                article.content_extracted,
                article.published_at,
                article.fetched_at,
                article.language,
                article.word_count,
                article.content_hash,
                COALESCE(feed.custom_name, feed.title) AS feed_display_title,
                COALESCE(user_state.read_state, 'unread') AS read_state,
                COALESCE(user_state.starred, 0) AS starred,
                COALESCE(user_state.importance, 'normal') AS importance,
                COALESCE(user_state.read_later, 0) AS read_later,
                (
                    SELECT COUNT(*)
                    FROM Attachment attachment
                    WHERE attachment.article_id = article.id
                ) AS attachment_count
            FROM Article article
            INNER JOIN Feed feed ON feed.id = article.feed_id
            LEFT JOIN UserState user_state ON user_state.article_id = article.id",
        );

        if trimmed_query.is_some() {
            sql.push_str(
                "
            INNER JOIN ArticleSearch ON ArticleSearch.rowid = article.rowid",
            );
        }

        sql.push_str("\nWHERE 1 = 1");

        let mut parameters: Vec<String> = Vec::new();

        if let Some(query_text) = trimmed_query {
            sql.push_str("\n  AND ArticleSearch MATCH ?");
            parameters.push(query_text.to_owned());
        }

        if !feed_ids.is_empty() {
            sql.push_str("\n  AND article.feed_id IN (");
            sql.push_str(&vec!["?"; feed_ids.len()].join(", "));
            sql.push(')');
            parameters.extend(feed_ids.iter().map(|value| (*value).to_owned()));
        }

        match read_filter {
            ArticleSearchReadFilter::All => {}
            ArticleSearchReadFilter::Unread => {
                sql.push_str("\n  AND COALESCE(user_state.read_state, 'unread') = 'unread'");
            }
            ArticleSearchReadFilter::Reading => {
                sql.push_str("\n  AND COALESCE(user_state.read_state, 'unread') = 'reading'");
            }
            ArticleSearchReadFilter::ReadLater => {
                sql.push_str("\n  AND COALESCE(user_state.read_later, 0) = 1");
            }
            ArticleSearchReadFilter::Starred => {
                sql.push_str("\n  AND COALESCE(user_state.starred, 0) = 1");
            }
        }

        match sort {
            ArticleSearchSort::Newest => {
                sql.push_str(
                    "\nORDER BY
                        CASE WHEN article.published_at IS NULL THEN 1 ELSE 0 END ASC,
                        article.published_at DESC,
                        article.title ASC",
                );
            }
            ArticleSearchSort::Oldest => {
                sql.push_str(
                    "\nORDER BY
                        CASE WHEN article.published_at IS NULL THEN 1 ELSE 0 END ASC,
                        article.published_at ASC,
                        article.title ASC",
                );
            }
        }

        let mut statement = self.connection.prepare(&sql)?;
        let rows = statement.query_map(params_from_iter(parameters.iter()), |row| {
            Ok((
                Article {
                    id: ArticleId::try_from(row.get::<_, String>(0)?)
                        .map_err(to_from_sql_conversion_failure)?,
                    feed_id: FeedId::try_from(row.get::<_, String>(1)?)
                        .map_err(to_from_sql_conversion_failure)?,
                    source_guid: row.get(2)?,
                    title: row.get(3)?,
                    author: row.get(4)?,
                    summary: row.get(5)?,
                    content_raw: row.get(6)?,
                    content_extracted: row.get(7)?,
                    canonical_url: None,
                    original_url: None,
                    published_at: row
                        .get::<_, Option<String>>(8)?
                        .map(IsoDateTime::try_from)
                        .transpose()
                        .map_err(to_from_sql_conversion_failure)?,
                    fetched_at: IsoDateTime::try_from(row.get::<_, String>(9)?)
                        .map_err(to_from_sql_conversion_failure)?,
                    language: row
                        .get::<_, Option<String>>(10)?
                        .map(LanguageCode::try_from)
                        .transpose()
                        .map_err(to_from_sql_conversion_failure)?,
                    thumbnail: None,
                    word_count: row.get(11)?,
                    content_hash: row.get(12)?,
                },
                row.get::<_, String>(13)?,
                ReadState::try_from(row.get::<_, String>(14)?)
                    .map_err(to_from_sql_conversion_failure)?,
                row.get::<_, i64>(15)? != 0,
                ImportanceLevel::try_from(row.get::<_, String>(16)?)
                    .map_err(to_from_sql_conversion_failure)?,
                row.get::<_, i64>(17)? != 0,
                row.get::<_, i64>(18)?,
            ))
        })?;

        rows.into_iter()
            .map(|row| {
                let (
                    article,
                    feed_display_title,
                    read_state,
                    starred,
                    importance,
                    read_later,
                    attachment_count,
                ) = row?;

                Ok(ArticleSearchListItem {
                    article,
                    feed_display_title,
                    attachment_count: usize::try_from(attachment_count)
                        .expect("attachment counts should be non-negative"),
                    importance,
                    read_later,
                    read_state,
                    starred,
                })
            })
            .collect()
    }
}

fn to_from_sql_conversion_failure(error: crate::ModelError) -> rusqlite::Error {
    rusqlite::Error::FromSqlConversionFailure(0, rusqlite::types::Type::Text, Box::new(error))
}

#[cfg(test)]
mod tests {
    use rusqlite::{Connection, params};
    use tempfile::tempdir;

    use super::{ArticleSearchReadFilter, ArticleSearchSort, ArticleSearchStore};
    use crate::{
        ImportanceLevel, ReadState,
        sqlite::{DatabaseInitializationOptions, initialize_database},
    };

    #[test]
    fn returns_ranked_article_ids_and_snippets() {
        let temp_dir = tempdir().expect("temp dir");
        let database_path = temp_dir.path().join("article-search-store.sqlite3");

        initialize_database(&database_path, &DatabaseInitializationOptions::default())
            .expect("initialize database");

        let mut connection = Connection::open(&database_path).expect("open database");

        insert_feed(
            &connection,
            "feed-search",
            "Search Lab",
            "https://example.com/search.xml",
        );
        insert_article(
            &connection,
            "article-exact",
            "feed-search",
            "SQLite snippet ranking",
            Some("Precise ranking matters."),
            Some("This article explains SQLite snippet ranking and tokenizer choices."),
            Some("2026-04-24T10:00:00Z"),
        );
        insert_article(
            &connection,
            "article-broad",
            "feed-search",
            "Search tokenizer overview",
            Some("Ranking appears once."),
            Some("Tokenizer tradeoffs matter when building full text search."),
            Some("2026-04-23T10:00:00Z"),
        );

        let mut store = ArticleSearchStore::new(&mut connection);
        let ids = store
            .search_article_ids("ranking", &[])
            .expect("search article ids");

        assert_eq!(
            ids.into_iter()
                .map(|id| id.into_inner())
                .collect::<Vec<_>>(),
            vec!["article-exact".to_string(), "article-broad".to_string()]
        );

        let hits = store
            .search_with_snippets("ranking", &[])
            .expect("search with snippets");

        assert_eq!(hits.len(), 2);
        assert_eq!(hits[0].article_id.as_str(), "article-exact");
        assert!(hits[0].snippet.contains("<mark>ranking</mark>"));
    }

    #[test]
    fn narrows_search_to_feed_scope_when_requested() {
        let temp_dir = tempdir().expect("temp dir");
        let database_path = temp_dir.path().join("article-search-scope.sqlite3");

        initialize_database(&database_path, &DatabaseInitializationOptions::default())
            .expect("initialize database");

        let mut connection = Connection::open(&database_path).expect("open database");

        insert_feed(
            &connection,
            "feed-alpha",
            "Alpha",
            "https://example.com/alpha.xml",
        );
        insert_feed(
            &connection,
            "feed-beta",
            "Beta",
            "https://example.com/beta.xml",
        );
        insert_article(
            &connection,
            "article-alpha",
            "feed-alpha",
            "Ranking alpha",
            None,
            Some("Alpha article about ranking."),
            Some("2026-04-24T10:00:00Z"),
        );
        insert_article(
            &connection,
            "article-beta",
            "feed-beta",
            "Ranking beta",
            None,
            Some("Beta article about ranking."),
            Some("2026-04-23T10:00:00Z"),
        );

        let mut store = ArticleSearchStore::new(&mut connection);
        let ids = store
            .search_article_ids("ranking", &["feed-beta"])
            .expect("scoped search");

        assert_eq!(
            ids.into_iter()
                .map(|id| id.into_inner())
                .collect::<Vec<_>>(),
            vec!["article-beta".to_string()]
        );
    }

    #[test]
    fn lists_articles_with_full_text_and_state_filters() {
        let temp_dir = tempdir().expect("temp dir");
        let database_path = temp_dir.path().join("article-search-list.sqlite3");

        initialize_database(&database_path, &DatabaseInitializationOptions::default())
            .expect("initialize database");

        let mut connection = Connection::open(&database_path).expect("open database");

        insert_feed(
            &connection,
            "feed-search",
            "Search Lab",
            "https://example.com/search.xml",
        );
        insert_article(
            &connection,
            "article-reading",
            "feed-search",
            "SQLite ranking signals",
            Some("Reading article"),
            Some("Ranking and snippet quality both matter."),
            Some("2026-04-24T11:00:00Z"),
        );
        insert_article(
            &connection,
            "article-unread",
            "feed-search",
            "Tokenizer choices",
            Some("Unread article"),
            Some("Tokenizer tuning matters for search quality."),
            Some("2026-04-23T11:00:00Z"),
        );
        connection
            .execute(
                "INSERT INTO UserState (
                    article_id,
                    read_state,
                    starred,
                    liked,
                    importance,
                    read_later,
                    reading_progress,
                    last_opened_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![
                    "article-reading",
                    "reading",
                    1,
                    0,
                    "high",
                    1,
                    0.6_f64,
                    Option::<String>::None
                ],
            )
            .expect("insert user state");

        let mut store = ArticleSearchStore::new(&mut connection);
        let reading_items = store
            .list_articles(
                Some("ranking"),
                &[],
                ArticleSearchReadFilter::Reading,
                ArticleSearchSort::Newest,
            )
            .expect("list reading articles");

        assert_eq!(reading_items.len(), 1);
        assert_eq!(reading_items[0].article.id.as_str(), "article-reading");
        assert_eq!(reading_items[0].feed_display_title, "Search Lab");
        assert!(reading_items[0].starred);
        assert!(reading_items[0].read_later);
        assert_eq!(reading_items[0].importance, ImportanceLevel::High);

        let unread_items = store
            .list_articles(
                Some("search"),
                &[],
                ArticleSearchReadFilter::Unread,
                ArticleSearchSort::Newest,
            )
            .expect("list unread articles");

        assert_eq!(unread_items.len(), 1);
        assert_eq!(unread_items[0].article.id.as_str(), "article-unread");
        assert_eq!(unread_items[0].read_state, ReadState::Unread);
    }

    fn insert_feed(connection: &Connection, id: &str, title: &str, feed_url: &str) {
        connection
            .execute(
                "INSERT INTO Feed (id, title, feed_url, format) VALUES (?1, ?2, ?3, ?4)",
                params![id, title, feed_url, "rss"],
            )
            .expect("insert feed");
    }

    fn insert_article(
        connection: &Connection,
        id: &str,
        feed_id: &str,
        title: &str,
        summary: Option<&str>,
        content_extracted: Option<&str>,
        published_at: Option<&str>,
    ) {
        connection
            .execute(
                "INSERT INTO Article (
                    id,
                    feed_id,
                    title,
                    summary,
                    content_extracted,
                    published_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![id, feed_id, title, summary, content_extracted, published_at],
            )
            .expect("insert article");
    }
}
