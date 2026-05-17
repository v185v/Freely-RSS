use rusqlite::{Connection, params};

use crate::{AIArtifact, AIArtifactId, AIArtifactKind, ArticleId, IsoDateTime, JsonBlob};

use super::StoreError;

pub struct AIArtifactStore<'conn> {
    connection: &'conn mut Connection,
}

impl<'conn> AIArtifactStore<'conn> {
    pub fn new(connection: &'conn mut Connection) -> Self {
        Self { connection }
    }

    pub fn upsert_ai_artifact(&mut self, artifact: &AIArtifact) -> Result<(), StoreError> {
        self.connection.execute(
            "INSERT INTO AIArtifact (
                id,
                article_id,
                kind,
                provider,
                input_hash,
                result,
                created_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            ON CONFLICT(id) DO UPDATE SET
                article_id = excluded.article_id,
                kind = excluded.kind,
                provider = excluded.provider,
                input_hash = excluded.input_hash,
                result = excluded.result,
                created_at = excluded.created_at",
            params![
                artifact.id.as_str(),
                artifact.article_id.as_str(),
                artifact.kind.as_str(),
                artifact.provider.as_str(),
                artifact.input_hash.as_str(),
                artifact.result.to_compact_string(),
                artifact.created_at.as_str(),
            ],
        )?;

        Ok(())
    }

    pub fn upsert_ai_artifacts(&mut self, artifacts: &[AIArtifact]) -> Result<(), StoreError> {
        let transaction = self.connection.transaction()?;

        for artifact in artifacts {
            transaction.execute(
                "INSERT INTO AIArtifact (
                    id,
                    article_id,
                    kind,
                    provider,
                    input_hash,
                    result,
                    created_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                ON CONFLICT(id) DO UPDATE SET
                    article_id = excluded.article_id,
                    kind = excluded.kind,
                    provider = excluded.provider,
                    input_hash = excluded.input_hash,
                    result = excluded.result,
                    created_at = excluded.created_at",
                params![
                    artifact.id.as_str(),
                    artifact.article_id.as_str(),
                    artifact.kind.as_str(),
                    artifact.provider.as_str(),
                    artifact.input_hash.as_str(),
                    artifact.result.to_compact_string(),
                    artifact.created_at.as_str(),
                ],
            )?;
        }

        transaction.commit()?;

        Ok(())
    }

    pub fn list_ai_artifacts_for_article(
        &mut self,
        article_id: &ArticleId,
    ) -> Result<Vec<AIArtifact>, StoreError> {
        self.query_ai_artifacts_for_article(article_id)
    }

    pub fn list_ai_artifacts_for_article_with_kinds(
        &mut self,
        article_id: &ArticleId,
        kinds: &[AIArtifactKind],
    ) -> Result<Vec<AIArtifact>, StoreError> {
        let mut artifacts = self.query_ai_artifacts_for_article(article_id)?;

        if kinds.is_empty() {
            return Ok(artifacts);
        }

        artifacts.retain(|artifact| kinds.contains(&artifact.kind));

        Ok(artifacts)
    }

    pub fn delete_ai_artifacts_for_article(
        &mut self,
        article_id: &ArticleId,
    ) -> Result<usize, StoreError> {
        let deleted = self.connection.execute(
            "DELETE FROM AIArtifact WHERE article_id = ?1",
            params![article_id.as_str()],
        )?;

        Ok(deleted)
    }

    fn query_ai_artifacts_for_article(
        &mut self,
        article_id: &ArticleId,
    ) -> Result<Vec<AIArtifact>, StoreError> {
        let mut statement = self.connection.prepare(
            "SELECT
                id,
                article_id,
                kind,
                provider,
                input_hash,
                result,
                created_at
            FROM AIArtifact
            WHERE article_id = ?1
            ORDER BY created_at DESC, id DESC",
        )?;

        let rows = statement.query_map(params![article_id.as_str()], |row| {
            let id: String = row.get(0)?;
            let article_id: String = row.get(1)?;
            let kind: String = row.get(2)?;
            let provider: String = row.get(3)?;
            let input_hash: String = row.get(4)?;
            let result: String = row.get(5)?;
            let created_at: String = row.get(6)?;

            Ok((
                id, article_id, kind, provider, input_hash, result, created_at,
            ))
        })?;

        rows.into_iter()
            .map(|row| {
                let (id, article_id, kind, provider, input_hash, result, created_at) = row?;

                Ok(AIArtifact {
                    id: AIArtifactId::try_from(id)?,
                    article_id: ArticleId::try_from(article_id)?,
                    kind: AIArtifactKind::try_from(kind)?,
                    provider,
                    input_hash,
                    result: JsonBlob::parse("result", &result)?,
                    created_at: IsoDateTime::try_from(created_at)?,
                })
            })
            .collect::<Result<Vec<_>, StoreError>>()
    }
}

#[cfg(test)]
mod tests {
    use rusqlite::{Connection, params};
    use serde_json::json;
    use tempfile::tempdir;

    use super::AIArtifactStore;
    use crate::{
        AIArtifact, AIArtifactId, AIArtifactKind, ArticleId, IsoDateTime, JsonBlob,
        sqlite::{DatabaseInitializationOptions, initialize_database, prepare_database_connection},
    };

    #[test]
    fn upserts_and_lists_ai_artifacts_for_an_article() {
        let temp_dir = tempdir().expect("tempdir");
        let database_path = temp_dir.path().join("freelyrss.sqlite3");

        initialize_database(&database_path, &DatabaseInitializationOptions::default())
            .expect("database initialization should succeed");

        let mut connection = Connection::open(&database_path).expect("open database");
        prepare_database_connection(&connection).expect("prepare connection");
        seed_article(&connection);

        let mut store = AIArtifactStore::new(&mut connection);
        let summary = build_artifact(
            "ai-summary",
            AIArtifactKind::Summary,
            json!({
                "kind": "summary",
                "text": "Initial summary"
            }),
            "2026-05-16T10:00:00Z",
        );
        let keywords = build_artifact(
            "ai-keywords",
            AIArtifactKind::Keywords,
            json!({
                "kind": "keywords",
                "keywords": ["local", "reader"]
            }),
            "2026-05-16T10:01:00Z",
        );

        store
            .upsert_ai_artifacts(&[summary.clone(), keywords.clone()])
            .expect("upsert artifacts");

        let listed = store
            .list_ai_artifacts_for_article(&ArticleId::try_from("article-ai").expect("article id"))
            .expect("list artifacts");

        assert_eq!(listed.len(), 2);
        assert_eq!(listed[0].id.as_str(), "ai-keywords");
        assert_eq!(listed[1].id.as_str(), "ai-summary");

        let updated_summary = build_artifact(
            "ai-summary",
            AIArtifactKind::Summary,
            json!({
                "kind": "summary",
                "text": "Updated summary"
            }),
            "2026-05-16T10:02:00Z",
        );
        store
            .upsert_ai_artifact(&updated_summary)
            .expect("update summary");

        let summary_only = store
            .list_ai_artifacts_for_article_with_kinds(
                &ArticleId::try_from("article-ai").expect("article id"),
                &[AIArtifactKind::Summary],
            )
            .expect("list summary artifacts");

        assert_eq!(summary_only.len(), 1);
        assert_eq!(summary_only[0].id.as_str(), "ai-summary");
        assert_eq!(
            summary_only[0].result.as_value()["text"],
            serde_json::json!("Updated summary")
        );

        let deleted = store
            .delete_ai_artifacts_for_article(
                &ArticleId::try_from("article-ai").expect("article id"),
            )
            .expect("delete artifacts");
        assert_eq!(deleted, 2);
        assert!(
            store
                .list_ai_artifacts_for_article(
                    &ArticleId::try_from("article-ai").expect("article id")
                )
                .expect("list after delete")
                .is_empty()
        );
    }

    fn build_artifact(
        id: &str,
        kind: AIArtifactKind,
        result: serde_json::Value,
        created_at: &str,
    ) -> AIArtifact {
        AIArtifact {
            id: AIArtifactId::try_from(id).expect("artifact id"),
            article_id: ArticleId::try_from("article-ai").expect("article id"),
            kind,
            provider: "freelyrss.ai.mock.local".to_owned(),
            input_hash: format!("hash-{id}"),
            result: JsonBlob::from(result),
            created_at: IsoDateTime::try_from(created_at).expect("created at"),
        }
    }

    fn seed_article(connection: &Connection) {
        connection
            .execute(
                "INSERT INTO Feed (id, title, feed_url, format) VALUES (?1, ?2, ?3, ?4)",
                params!["feed-ai", "AI Feed", "https://example.com/ai.xml", "rss"],
            )
            .expect("insert feed");
        connection
            .execute(
                "INSERT INTO Article (id, feed_id, title) VALUES (?1, ?2, ?3)",
                params!["article-ai", "feed-ai", "AI article"],
            )
            .expect("insert article");
    }
}
