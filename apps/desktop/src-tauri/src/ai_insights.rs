use std::{error::Error, path::PathBuf, time::SystemTime};

use chrono::{SecondsFormat, Utc};
use freelyrss_ai_adapter::{
    AiArticleInsightRequest, AiArticleInsightSnapshot, AiArticleInsightWorkflow,
    AiProviderRegistry, MOCK_LOCAL_AI_PROVIDER_ID, MockLocalAiProvider,
};
use freelyrss_core_domain::{
    AIArtifact, AIArtifactKind, Article, ArticleId, JsonBlob,
    sqlite::{AIArtifactStore, prepare_database_connection},
};
use rusqlite::{Connection, OptionalExtension, params};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Manager};

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateArticleInsightsRequest {
    pub article_id: String,
    pub max_summary_chars: Option<usize>,
    pub max_keywords: Option<usize>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArticleInsightRunDto {
    pub artifacts: Vec<AIArtifactDto>,
    pub summary_from_cache: bool,
    pub keywords_from_cache: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AIArtifactDto {
    pub id: String,
    pub article_id: String,
    pub kind: String,
    pub provider: String,
    pub input_hash: String,
    pub result: Value,
    pub created_at: String,
}

#[tauri::command]
pub fn generate_article_insights(
    app: AppHandle,
    request: GenerateArticleInsightsRequest,
) -> Result<ArticleInsightRunDto, String> {
    generate_article_insights_at(resolve_database_path(&app)?, request, current_iso_timestamp())
        .map_err(|error| error.to_string())
}

fn generate_article_insights_at(
    database_path: PathBuf,
    request: GenerateArticleInsightsRequest,
    requested_at: impl Into<String>,
) -> Result<ArticleInsightRunDto, Box<dyn Error>> {
    if !database_path.exists() {
        return Err("FreelyRSS local database has not been initialized yet.".into());
    }

    let mut connection = Connection::open(database_path)?;
    prepare_database_connection(&connection)?;

    let article_id = ArticleId::try_from(request.article_id.as_str())?;
    let article = load_article(&connection, &article_id)?
        .ok_or_else(|| format!("Article {} was not found.", article_id.as_str()))?;
    let existing_artifacts = {
        let mut artifact_store = AIArtifactStore::new(&mut connection);
        artifact_store.list_ai_artifacts_for_article_with_kinds(
            &article_id,
            &[AIArtifactKind::Summary, AIArtifactKind::Keywords],
        )?
    };

    let mut registry = AiProviderRegistry::default();
    registry.register(Box::new(MockLocalAiProvider::default()))?;

    let mut workflow = AiArticleInsightWorkflow::new();
    for artifact in existing_artifacts {
        workflow.seed_cache(artifact);
    }

    let run = workflow.generate_summary_and_keywords(
        &registry,
        MOCK_LOCAL_AI_PROVIDER_ID,
        AiArticleInsightRequest::new(
            article_to_snapshot(&article),
            requested_at,
            request.max_summary_chars,
            request.max_keywords,
        ),
    )?;
    let artifacts = vec![run.artifacts.summary, run.artifacts.keywords];

    {
        let mut artifact_store = AIArtifactStore::new(&mut connection);
        artifact_store.upsert_ai_artifacts(&artifacts)?;
    }

    Ok(ArticleInsightRunDto {
        artifacts: artifacts.into_iter().map(artifact_to_dto).collect(),
        summary_from_cache: run.report.summary_from_cache,
        keywords_from_cache: run.report.keywords_from_cache,
    })
}

pub(crate) fn load_article(
    connection: &Connection,
    article_id: &ArticleId,
) -> Result<Option<Article>, Box<dyn Error>> {
    let row = connection
        .query_row(
            "SELECT
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
            FROM Article
            WHERE id = ?1
            LIMIT 1",
            params![article_id.as_str()],
            |row| {
                Ok(Article {
                    id: ArticleId::try_from(row.get::<_, String>(0)?).map_err(to_sql_error)?,
                    feed_id: freelyrss_core_domain::FeedId::try_from(row.get::<_, String>(1)?)
                        .map_err(to_sql_error)?,
                    source_guid: row.get(2)?,
                    title: row.get(3)?,
                    author: row.get(4)?,
                    summary: row.get(5)?,
                    content_raw: row.get(6)?,
                    content_extracted: row.get(7)?,
                    canonical_url: row
                        .get::<_, Option<String>>(8)?
                        .map(freelyrss_core_domain::UrlString::try_from)
                        .transpose()
                        .map_err(to_sql_error)?,
                    original_url: row
                        .get::<_, Option<String>>(9)?
                        .map(freelyrss_core_domain::UrlString::try_from)
                        .transpose()
                        .map_err(to_sql_error)?,
                    published_at: row
                        .get::<_, Option<String>>(10)?
                        .map(freelyrss_core_domain::IsoDateTime::try_from)
                        .transpose()
                        .map_err(to_sql_error)?,
                    fetched_at: freelyrss_core_domain::IsoDateTime::try_from(
                        row.get::<_, String>(11)?,
                    )
                    .map_err(to_sql_error)?,
                    language: row
                        .get::<_, Option<String>>(12)?
                        .map(freelyrss_core_domain::LanguageCode::try_from)
                        .transpose()
                        .map_err(to_sql_error)?,
                    thumbnail: row
                        .get::<_, Option<String>>(13)?
                        .map(freelyrss_core_domain::UrlString::try_from)
                        .transpose()
                        .map_err(to_sql_error)?,
                    word_count: row.get(14)?,
                    content_hash: row.get(15)?,
                })
            },
        )
        .optional()?;

    Ok(row)
}

fn article_to_snapshot(article: &Article) -> AiArticleInsightSnapshot {
    let content = article
        .content_extracted
        .as_deref()
        .or(article.content_raw.as_deref())
        .or(article.summary.as_deref())
        .unwrap_or("")
        .to_owned();

    AiArticleInsightSnapshot {
        article_id: article.id.to_string(),
        title: article.title.clone(),
        summary: article.summary.clone(),
        content,
        language: article.language.as_ref().map(ToString::to_string),
    }
}

pub(crate) fn artifact_to_dto(artifact: AIArtifact) -> AIArtifactDto {
    AIArtifactDto {
        id: artifact.id.to_string(),
        article_id: artifact.article_id.to_string(),
        kind: artifact.kind.as_str().to_owned(),
        provider: artifact.provider,
        input_hash: artifact.input_hash,
        result: JsonBlob::into_inner(artifact.result),
        created_at: artifact.created_at.to_string(),
    }
}

pub(crate) fn current_iso_timestamp() -> String {
    chrono::DateTime::<Utc>::from(SystemTime::now()).to_rfc3339_opts(SecondsFormat::Secs, true)
}

pub(crate) fn resolve_database_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_local_data_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|error| error.to_string())?;

    Ok(app_local_data_dir
        .join("database")
        .join("freelyrss.sqlite3"))
}

fn to_sql_error(error: freelyrss_core_domain::ModelError) -> rusqlite::Error {
    rusqlite::Error::ToSqlConversionFailure(Box::new(error))
}

#[cfg(test)]
mod tests {
    use super::{
        GenerateArticleInsightsRequest, generate_article_insights_at, load_article,
    };
    use freelyrss_core_domain::{
        ArticleId,
        sqlite::{DatabaseInitializationOptions, initialize_database, prepare_database_connection},
    };
    use rusqlite::{Connection, params};
    use tempfile::tempdir;

    #[test]
    fn generates_persists_and_reuses_summary_and_keyword_artifacts() {
        let temp_dir = tempdir().expect("temp dir");
        let database_path = temp_dir.path().join("article-insights.sqlite3");

        initialize_database(&database_path, &DatabaseInitializationOptions::default())
            .expect("initialize database");

        let connection = Connection::open(&database_path).expect("open database");
        prepare_database_connection(&connection).expect("prepare connection");
        seed_article(&connection);
        drop(connection);

        let first = generate_article_insights_at(
            database_path.clone(),
            GenerateArticleInsightsRequest {
                article_id: "article-ai".to_owned(),
                max_summary_chars: Some(80),
                max_keywords: Some(4),
            },
            "2026-05-16T08:30:00Z",
        )
        .expect("generate insights");

        assert_eq!(first.artifacts.len(), 2);
        assert!(!first.summary_from_cache);
        assert!(!first.keywords_from_cache);
        assert_eq!(first.artifacts[0].kind, "summary");
        assert_eq!(first.artifacts[1].kind, "keywords");

        let second = generate_article_insights_at(
            database_path.clone(),
            GenerateArticleInsightsRequest {
                article_id: "article-ai".to_owned(),
                max_summary_chars: Some(80),
                max_keywords: Some(4),
            },
            "2026-05-16T08:31:00Z",
        )
        .expect("regenerate insights");

        assert!(second.summary_from_cache);
        assert!(second.keywords_from_cache);

        let connection = Connection::open(&database_path).expect("reopen database");
        let persisted_count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM AIArtifact WHERE article_id = ?1",
                params!["article-ai"],
                |row| row.get(0),
            )
            .expect("count artifacts");

        assert_eq!(persisted_count, 2);
        assert!(
            load_article(
                &connection,
                &ArticleId::try_from("article-ai").expect("article id")
            )
            .expect("load article")
            .is_some()
        );
    }

    #[test]
    fn current_timestamp_uses_utc_iso_seconds() {
        let timestamp = super::current_iso_timestamp();

        assert_eq!(timestamp.len(), "2026-05-16T08:30:00Z".len());
        assert!(timestamp.ends_with('Z'));
        assert_eq!(timestamp.as_bytes()[4], b'-');
        assert_eq!(timestamp.as_bytes()[7], b'-');
        assert_eq!(timestamp.as_bytes()[10], b'T');
        assert_eq!(timestamp.as_bytes()[13], b':');
        assert_eq!(timestamp.as_bytes()[16], b':');
    }

    fn seed_article(connection: &Connection) {
        connection
            .execute(
                "INSERT INTO Feed (id, title, feed_url, format) VALUES (?1, ?2, ?3, ?4)",
                params![
                    "feed-ai",
                    "AI Feed",
                    "https://example.com/ai.xml",
                    "rss"
                ],
            )
            .expect("insert feed");
        connection
            .execute(
                "INSERT INTO Article (
                    id,
                    feed_id,
                    title,
                    summary,
                    content_extracted,
                    language,
                    fetched_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    "article-ai",
                    "feed-ai",
                    "Queue ownership keeps reader boundaries stable",
                    "Existing article summary",
                    "Reader work stays local and queue ownership keeps provider calls explicit.",
                    "en",
                    "2026-05-16T08:00:00Z"
                ],
            )
            .expect("insert article");
    }
}
