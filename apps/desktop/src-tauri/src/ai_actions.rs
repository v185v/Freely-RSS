use std::{error::Error, path::PathBuf};

use freelyrss_ai_adapter::{
    AiArticleActionWorkflow, AiArticleQuestionRequest, AiArticleTranslationRequest,
    AiContextDocument, AiContextScope, AiProviderRegistry, AiTranslationMode,
    MOCK_LOCAL_AI_PROVIDER_ID, MockLocalAiProvider,
};
use freelyrss_core_domain::{
    AIArtifact, AIArtifactKind, Article, ArticleId, FeedId,
    sqlite::{AIArtifactStore, prepare_database_connection},
};
use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::ai_insights::{
    AIArtifactDto, artifact_to_dto, current_iso_timestamp, load_article, resolve_database_path,
};

const DEFAULT_TRANSLATION_TARGET_LANGUAGE: &str = "zh-Hans";
const DEFAULT_CONTEXT_LIMIT: usize = 6;

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum GenerateArticleTranslationMode {
    FullArticle,
    Selection,
}

impl From<GenerateArticleTranslationMode> for AiTranslationMode {
    fn from(value: GenerateArticleTranslationMode) -> Self {
        match value {
            GenerateArticleTranslationMode::FullArticle => Self::FullArticle,
            GenerateArticleTranslationMode::Selection => Self::Selection,
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateArticleTranslationRequest {
    pub article_id: String,
    pub mode: GenerateArticleTranslationMode,
    pub selected_text: Option<String>,
    pub target_language: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArticleTranslationRunDto {
    pub artifact: AIArtifactDto,
    pub from_cache: bool,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum QuestionContextScopeDto {
    Article,
    Feed,
    SearchResult,
}

impl QuestionContextScopeDto {
    fn to_context_scope(self) -> AiContextScope {
        match self {
            Self::Article => AiContextScope::CurrentArticle,
            Self::Feed => AiContextScope::CurrentFeed,
            Self::SearchResult => AiContextScope::CurrentSearchResult,
        }
    }

    fn as_str(self) -> &'static str {
        self.to_context_scope().as_str()
    }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateArticleQuestionRequest {
    pub article_id: String,
    pub question: String,
    pub context_scope: QuestionContextScopeDto,
    #[serde(default)]
    pub allowed_article_ids: Vec<String>,
    pub language: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArticleQuestionRunDto {
    pub artifact: AIArtifactDto,
    pub from_cache: bool,
    pub context_scope: String,
    pub cited_context_ids: Vec<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteArticleAiCacheRequest {
    pub article_id: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteArticleAiCacheDto {
    pub article_id: String,
    pub deleted_artifact_count: usize,
}

#[tauri::command]
pub fn generate_article_translation(
    app: AppHandle,
    request: GenerateArticleTranslationRequest,
) -> Result<ArticleTranslationRunDto, String> {
    generate_article_translation_at(resolve_database_path(&app)?, request, current_iso_timestamp())
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn answer_article_question(
    app: AppHandle,
    request: GenerateArticleQuestionRequest,
) -> Result<ArticleQuestionRunDto, String> {
    answer_article_question_at(resolve_database_path(&app)?, request, current_iso_timestamp())
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn delete_article_ai_cache(
    app: AppHandle,
    request: DeleteArticleAiCacheRequest,
) -> Result<DeleteArticleAiCacheDto, String> {
    delete_article_ai_cache_at(resolve_database_path(&app)?, request)
        .map_err(|error| error.to_string())
}

fn generate_article_translation_at(
    database_path: PathBuf,
    request: GenerateArticleTranslationRequest,
    requested_at: impl Into<String>,
) -> Result<ArticleTranslationRunDto, Box<dyn Error>> {
    if !database_path.exists() {
        return Err("FreelyRSS local database has not been initialized yet.".into());
    }

    let mut connection = Connection::open(database_path)?;
    prepare_database_connection(&connection)?;

    let article_id = ArticleId::try_from(request.article_id.as_str())?;
    let article = load_article(&connection, &article_id)?
        .ok_or_else(|| format!("Article {} was not found.", article_id.as_str()))?;
    let translation_text = resolve_translation_text(&article, &request)?;
    let target_language = request
        .target_language
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(DEFAULT_TRANSLATION_TARGET_LANGUAGE)
        .to_owned();

    let existing_artifacts = {
        let mut artifact_store = AIArtifactStore::new(&mut connection);
        artifact_store.list_ai_artifacts_for_article_with_kinds(
            &article_id,
            &[AIArtifactKind::Translation],
        )?
    };

    let mut registry = AiProviderRegistry::default();
    registry.register(Box::new(MockLocalAiProvider::default()))?;

    let mut workflow = AiArticleActionWorkflow::new();
    for artifact in existing_artifacts {
        workflow.seed_cache(artifact);
    }

    let run = workflow.translate_article_text(
        &registry,
        MOCK_LOCAL_AI_PROVIDER_ID,
        AiArticleTranslationRequest::new(
            article.id.to_string(),
            requested_at,
            translation_text,
            article.language.as_ref().map(ToString::to_string),
            target_language,
            request.mode.into(),
        ),
    )?;
    let artifact = run.artifact;

    {
        let mut artifact_store = AIArtifactStore::new(&mut connection);
        artifact_store.upsert_ai_artifact(&artifact)?;
    }

    Ok(ArticleTranslationRunDto {
        artifact: artifact_to_dto(artifact),
        from_cache: run.report.from_cache,
    })
}

fn answer_article_question_at(
    database_path: PathBuf,
    request: GenerateArticleQuestionRequest,
    requested_at: impl Into<String>,
) -> Result<ArticleQuestionRunDto, Box<dyn Error>> {
    if !database_path.exists() {
        return Err("FreelyRSS local database has not been initialized yet.".into());
    }

    let mut connection = Connection::open(database_path)?;
    prepare_database_connection(&connection)?;

    let article_id = ArticleId::try_from(request.article_id.as_str())?;
    let article = load_article(&connection, &article_id)?
        .ok_or_else(|| format!("Article {} was not found.", article_id.as_str()))?;
    let contexts = load_question_contexts(&connection, &article, &request)?;

    let existing_artifacts = {
        let mut artifact_store = AIArtifactStore::new(&mut connection);
        artifact_store.list_ai_artifacts_for_article_with_kinds(
            &article_id,
            &[AIArtifactKind::QuestionAnswer],
        )?
    };

    let mut registry = AiProviderRegistry::default();
    registry.register(Box::new(MockLocalAiProvider::default()))?;

    let mut workflow = AiArticleActionWorkflow::new();
    for artifact in existing_artifacts {
        workflow.seed_cache(artifact);
    }

    let context_scope = request.context_scope.to_context_scope();
    let run = workflow.answer_limited_question(
        &registry,
        MOCK_LOCAL_AI_PROVIDER_ID,
        AiArticleQuestionRequest::new(
            article.id.to_string(),
            requested_at,
            request.question,
            contexts,
            context_scope,
            request.language.or_else(|| article.language.as_ref().map(ToString::to_string)),
        ),
    )?;
    let cited_context_ids = extract_cited_context_ids(&run.artifact);
    let artifact = run.artifact;

    {
        let mut artifact_store = AIArtifactStore::new(&mut connection);
        artifact_store.upsert_ai_artifact(&artifact)?;
    }

    Ok(ArticleQuestionRunDto {
        artifact: artifact_to_dto(artifact),
        from_cache: run.report.from_cache,
        context_scope: request.context_scope.as_str().to_owned(),
        cited_context_ids,
    })
}

fn delete_article_ai_cache_at(
    database_path: PathBuf,
    request: DeleteArticleAiCacheRequest,
) -> Result<DeleteArticleAiCacheDto, Box<dyn Error>> {
    if !database_path.exists() {
        return Err("FreelyRSS local database has not been initialized yet.".into());
    }

    let mut connection = Connection::open(database_path)?;
    prepare_database_connection(&connection)?;

    let article_id = ArticleId::try_from(request.article_id.as_str())?;
    let deleted_artifact_count = {
        let mut artifact_store = AIArtifactStore::new(&mut connection);
        artifact_store.delete_ai_artifacts_for_article(&article_id)?
    };

    Ok(DeleteArticleAiCacheDto {
        article_id: article_id.to_string(),
        deleted_artifact_count,
    })
}

fn resolve_translation_text(
    article: &Article,
    request: &GenerateArticleTranslationRequest,
) -> Result<String, Box<dyn Error>> {
    let text = match request.mode {
        GenerateArticleTranslationMode::FullArticle => article_text(article),
        GenerateArticleTranslationMode::Selection => request
            .selected_text
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(ToOwned::to_owned)
            .ok_or("Selection translation requires selected text.")?,
    };

    if text.trim().is_empty() {
        return Err("Article has no text available for translation.".into());
    }

    Ok(text)
}

fn load_question_contexts(
    connection: &Connection,
    article: &Article,
    request: &GenerateArticleQuestionRequest,
) -> Result<Vec<AiContextDocument>, Box<dyn Error>> {
    match request.context_scope {
        QuestionContextScopeDto::Article => Ok(vec![article_to_context(
            article,
            AiContextScope::CurrentArticle,
        )?]),
        QuestionContextScopeDto::Feed => {
            load_feed_contexts(connection, &article.feed_id, AiContextScope::CurrentFeed)
        }
        QuestionContextScopeDto::SearchResult => {
            load_search_result_contexts(connection, &request.allowed_article_ids)
        }
    }
}

fn load_feed_contexts(
    connection: &Connection,
    feed_id: &FeedId,
    scope: AiContextScope,
) -> Result<Vec<AiContextDocument>, Box<dyn Error>> {
    let mut statement = connection.prepare(
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
        WHERE feed_id = ?1
        ORDER BY published_at DESC, fetched_at DESC, id ASC
        LIMIT ?2",
    )?;

    let rows = statement.query_map(
        params![feed_id.as_str(), DEFAULT_CONTEXT_LIMIT as i64],
        map_article_row,
    )?;

    rows.into_iter()
        .map(|row| article_to_context(&row?, scope))
        .collect()
}

fn load_search_result_contexts(
    connection: &Connection,
    allowed_article_ids: &[String],
) -> Result<Vec<AiContextDocument>, Box<dyn Error>> {
    let mut contexts = Vec::new();

    for article_id in allowed_article_ids
        .iter()
        .map(|article_id| article_id.trim())
        .filter(|article_id| !article_id.is_empty())
        .take(DEFAULT_CONTEXT_LIMIT)
    {
        let article_id = ArticleId::try_from(article_id)?;
        if let Some(article) = load_article(connection, &article_id)? {
            contexts.push(article_to_context(
                &article,
                AiContextScope::CurrentSearchResult,
            )?);
        }
    }

    if contexts.is_empty() {
        return Err("Current filtered-result question answering requires approved article ids.".into());
    }

    Ok(contexts)
}

fn article_to_context(
    article: &Article,
    scope: AiContextScope,
) -> Result<AiContextDocument, Box<dyn Error>> {
    let content = article_text(article);

    if content.trim().is_empty() {
        return Err(format!("Article {} has no question context text.", article.id).into());
    }

    Ok(AiContextDocument {
        id: article.id.to_string(),
        scope,
        title: article.title.clone(),
        content,
    })
}

fn article_text(article: &Article) -> String {
    article
        .content_extracted
        .as_deref()
        .or(article.content_raw.as_deref())
        .or(article.summary.as_deref())
        .unwrap_or("")
        .trim()
        .to_owned()
}

fn extract_cited_context_ids(artifact: &AIArtifact) -> Vec<String> {
    artifact
        .result
        .as_value()
        .get("citedContextIds")
        .and_then(|value| value.as_array())
        .map(|values| {
            values
                .iter()
                .filter_map(|value| value.as_str().map(ToOwned::to_owned))
                .collect()
        })
        .unwrap_or_default()
}

fn map_article_row(row: &rusqlite::Row<'_>) -> Result<Article, rusqlite::Error> {
    Ok(Article {
        id: ArticleId::try_from(row.get::<_, String>(0)?).map_err(to_sql_error)?,
        feed_id: FeedId::try_from(row.get::<_, String>(1)?).map_err(to_sql_error)?,
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
        fetched_at: freelyrss_core_domain::IsoDateTime::try_from(row.get::<_, String>(11)?)
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
}

fn to_sql_error(error: freelyrss_core_domain::ModelError) -> rusqlite::Error {
    rusqlite::Error::ToSqlConversionFailure(Box::new(error))
}

#[cfg(test)]
mod tests {
    use super::{
        GenerateArticleQuestionRequest, GenerateArticleTranslationMode,
        GenerateArticleTranslationRequest, QuestionContextScopeDto, answer_article_question_at,
        generate_article_translation_at,
    };
    use freelyrss_core_domain::sqlite::{
        DatabaseInitializationOptions, initialize_database, prepare_database_connection,
    };
    use rusqlite::{Connection, params};
    use tempfile::tempdir;

    #[test]
    fn translates_selection_and_reuses_persisted_artifact_cache() {
        let temp_dir = tempdir().expect("temp dir");
        let database_path = temp_dir.path().join("article-actions.sqlite3");

        initialize_database(&database_path, &DatabaseInitializationOptions::default())
            .expect("initialize database");
        seed_articles(&database_path);

        let first = generate_article_translation_at(
            database_path.clone(),
            GenerateArticleTranslationRequest {
                article_id: "article-ai".to_owned(),
                mode: GenerateArticleTranslationMode::Selection,
                selected_text: Some("Reader work stays local".to_owned()),
                target_language: Some("zh-Hans".to_owned()),
            },
            "2026-05-17T02:00:00Z",
        )
        .expect("translate selection");

        assert_eq!(first.artifact.kind, "translation");
        assert!(!first.from_cache);
        assert_eq!(
            first.artifact.result["text"],
            serde_json::json!("[zh-Hans] Reader work stays local")
        );

        let second = generate_article_translation_at(
            database_path,
            GenerateArticleTranslationRequest {
                article_id: "article-ai".to_owned(),
                mode: GenerateArticleTranslationMode::Selection,
                selected_text: Some("Reader work stays local".to_owned()),
                target_language: Some("zh-Hans".to_owned()),
            },
            "2026-05-17T02:01:00Z",
        )
        .expect("reuse translation");

        assert!(second.from_cache);
        assert_eq!(second.artifact.id, first.artifact.id);
    }

    #[test]
    fn question_context_is_limited_to_current_article() {
        let temp_dir = tempdir().expect("temp dir");
        let database_path = temp_dir.path().join("article-question.sqlite3");

        initialize_database(&database_path, &DatabaseInitializationOptions::default())
            .expect("initialize database");
        seed_articles(&database_path);

        let run = answer_article_question_at(
            database_path,
            GenerateArticleQuestionRequest {
                article_id: "article-ai".to_owned(),
                question: "Where does reader work stay?".to_owned(),
                context_scope: QuestionContextScopeDto::Article,
                allowed_article_ids: vec!["article-other".to_owned()],
                language: Some("en".to_owned()),
            },
            "2026-05-17T02:05:00Z",
        )
        .expect("answer question");

        assert_eq!(run.artifact.kind, "question-answer");
        assert_eq!(run.context_scope, "current-article");
        assert_eq!(run.cited_context_ids, vec!["article-ai"]);
        assert_eq!(
            run.artifact.result["citedContextIds"],
            serde_json::json!(["article-ai"])
        );
    }

    #[test]
    fn deletes_article_ai_artifact_cache() {
        let temp_dir = tempdir().expect("temp dir");
        let database_path = temp_dir.path().join("article-ai-cache.sqlite3");

        initialize_database(&database_path, &DatabaseInitializationOptions::default())
            .expect("initialize database");
        seed_articles(&database_path);

        generate_article_translation_at(
            database_path.clone(),
            GenerateArticleTranslationRequest {
                article_id: "article-ai".to_owned(),
                mode: GenerateArticleTranslationMode::Selection,
                selected_text: Some("Reader work stays local".to_owned()),
                target_language: Some("zh-Hans".to_owned()),
            },
            "2026-05-17T02:10:00Z",
        )
        .expect("seed translation cache");

        let deleted = super::delete_article_ai_cache_at(
            database_path,
            super::DeleteArticleAiCacheRequest {
                article_id: "article-ai".to_owned(),
            },
        )
        .expect("delete ai cache");

        assert_eq!(deleted.article_id, "article-ai");
        assert_eq!(deleted.deleted_artifact_count, 1);
    }

    fn seed_articles(database_path: &std::path::Path) {
        let connection = Connection::open(database_path).expect("open database");
        prepare_database_connection(&connection).expect("prepare connection");
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
                "INSERT INTO Feed (id, title, feed_url, format) VALUES (?1, ?2, ?3, ?4)",
                params![
                    "feed-other",
                    "Other Feed",
                    "https://example.com/other.xml",
                    "rss"
                ],
            )
            .expect("insert other feed");
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
                    "2026-05-17T01:00:00Z"
                ],
            )
            .expect("insert article");
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
                    "article-other",
                    "feed-other",
                    "Remote source should not leak",
                    "Other source summary",
                    "Other feed content must not appear in current article answers.",
                    "en",
                    "2026-05-17T01:05:00Z"
                ],
            )
            .expect("insert other article");
    }
}
