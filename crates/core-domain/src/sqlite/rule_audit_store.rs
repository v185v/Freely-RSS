use rusqlite::{Connection, params};

use crate::{
    ArticleId, IsoDateTime, JsonBlob, RuleAudit, RuleAuditId, RuleAuditMatchResult, RuleId,
};

use super::StoreError;

pub struct RuleAuditStore<'conn> {
    connection: &'conn mut Connection,
}

impl<'conn> RuleAuditStore<'conn> {
    pub fn new(connection: &'conn mut Connection) -> Self {
        Self { connection }
    }

    pub fn record_rule_audit(&mut self, audit: &RuleAudit) -> Result<(), StoreError> {
        self.connection.execute(
            "INSERT INTO RuleAudit (
                id,
                rule_id,
                article_id,
                match_result,
                input_snapshot,
                planned_commands,
                applied_effects,
                created_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                audit.id.as_str(),
                audit.rule_id.as_str(),
                audit.article_id.as_str(),
                audit.match_result.as_str(),
                audit.input_snapshot.to_compact_string(),
                audit.planned_commands.to_compact_string(),
                audit
                    .applied_effects
                    .as_ref()
                    .map(JsonBlob::to_compact_string),
                audit.created_at.as_str(),
            ],
        )?;

        Ok(())
    }

    pub fn list_rule_audits_for_rule(
        &mut self,
        rule_id: &RuleId,
        limit: usize,
    ) -> Result<Vec<RuleAudit>, StoreError> {
        if limit == 0 {
            return Ok(Vec::new());
        }

        let limit = i64::try_from(limit).unwrap_or(i64::MAX);
        let mut statement = self.connection.prepare(
            "SELECT
                id,
                rule_id,
                article_id,
                match_result,
                input_snapshot,
                planned_commands,
                applied_effects,
                created_at
            FROM RuleAudit
            WHERE rule_id = ?1
            ORDER BY created_at DESC, id DESC
            LIMIT ?2",
        )?;

        let rows = statement.query_map(params![rule_id.as_str(), limit], |row| {
            let id: String = row.get(0)?;
            let rule_id: String = row.get(1)?;
            let article_id: String = row.get(2)?;
            let match_result: String = row.get(3)?;
            let input_snapshot: String = row.get(4)?;
            let planned_commands: String = row.get(5)?;
            let applied_effects: Option<String> = row.get(6)?;
            let created_at: String = row.get(7)?;

            Ok((
                id,
                rule_id,
                article_id,
                match_result,
                input_snapshot,
                planned_commands,
                applied_effects,
                created_at,
            ))
        })?;

        rows.into_iter()
            .map(|row| {
                let (
                    id,
                    rule_id,
                    article_id,
                    match_result,
                    input_snapshot,
                    planned_commands,
                    applied_effects,
                    created_at,
                ) = row?;

                Ok(RuleAudit {
                    id: RuleAuditId::try_from(id)?,
                    rule_id: RuleId::try_from(rule_id)?,
                    article_id: ArticleId::try_from(article_id)?,
                    match_result: RuleAuditMatchResult::try_from(match_result)?,
                    input_snapshot: JsonBlob::parse("input_snapshot", &input_snapshot)?,
                    planned_commands: JsonBlob::parse("planned_commands", &planned_commands)?,
                    applied_effects: applied_effects
                        .map(|value| JsonBlob::parse("applied_effects", &value))
                        .transpose()?,
                    created_at: IsoDateTime::try_from(created_at)?,
                })
            })
            .collect::<Result<Vec<_>, StoreError>>()
    }

    pub fn set_rule_audit_applied_effects(
        &mut self,
        audit_id: &RuleAuditId,
        applied_effects: &JsonBlob,
    ) -> Result<bool, StoreError> {
        let updated_rows = self.connection.execute(
            "UPDATE RuleAudit
            SET applied_effects = ?2
            WHERE id = ?1",
            params![audit_id.as_str(), applied_effects.to_compact_string()],
        )?;

        Ok(updated_rows > 0)
    }
}

#[cfg(test)]
mod tests {
    use rusqlite::{Connection, params};
    use serde_json::json;
    use tempfile::tempdir;

    use super::RuleAuditStore;
    use crate::{
        IsoDateTime, JsonBlob, RuleAudit, RuleAuditId, RuleAuditMatchResult, RuleId,
        sqlite::{DatabaseInitializationOptions, initialize_database, prepare_database_connection},
    };

    #[test]
    fn records_and_lists_rule_audit_history_for_a_rule() {
        let temp_dir = tempdir().expect("tempdir");
        let database_path = temp_dir.path().join("freelyrss.sqlite3");

        initialize_database(&database_path, &DatabaseInitializationOptions::default())
            .expect("database initialization should succeed");

        let mut connection = Connection::open(&database_path).expect("open database");
        prepare_database_connection(&connection).expect("prepare connection");
        seed_rule_target_graph(&connection);

        let older_audit = build_audit(
            "rule-audit-1",
            "article-audit-target",
            RuleAuditMatchResult::Matched,
            "2026-04-23T09:00:00Z",
            None,
        );
        let newer_audit = build_audit(
            "rule-audit-2",
            "article-audit-target-2",
            RuleAuditMatchResult::NotMatched,
            "2026-04-23T09:05:00Z",
            None,
        );

        let mut store = RuleAuditStore::new(&mut connection);
        store
            .record_rule_audit(&older_audit)
            .expect("record first audit");
        store
            .record_rule_audit(&newer_audit)
            .expect("record second audit");

        let history = store
            .list_rule_audits_for_rule(&RuleId::try_from("rule-priority").expect("rule id"), 10)
            .expect("list audits");

        assert_eq!(history.len(), 2);
        assert_eq!(history[0].id.as_str(), "rule-audit-2");
        assert_eq!(history[0].article_id.as_str(), "article-audit-target-2");
        assert_eq!(history[0].match_result, RuleAuditMatchResult::NotMatched);
        assert_eq!(history[1].id.as_str(), "rule-audit-1");
        assert_eq!(history[1].match_result, RuleAuditMatchResult::Matched);
    }

    #[test]
    fn updates_applied_effects_without_rewriting_planned_commands() {
        let temp_dir = tempdir().expect("tempdir");
        let database_path = temp_dir.path().join("freelyrss.sqlite3");

        initialize_database(&database_path, &DatabaseInitializationOptions::default())
            .expect("database initialization should succeed");

        let mut connection = Connection::open(&database_path).expect("open database");
        prepare_database_connection(&connection).expect("prepare connection");
        seed_rule_target_graph(&connection);

        let audit = build_audit(
            "rule-audit-apply",
            "article-audit-target",
            RuleAuditMatchResult::Matched,
            "2026-04-23T09:10:00Z",
            None,
        );
        let applied_effects = JsonBlob::from(json!({
          "writes": [
            {
              "entity": "UserState",
              "articleId": "article-audit-target",
              "fields": {
                "starred": true
              }
            }
          ]
        }));

        let mut store = RuleAuditStore::new(&mut connection);
        store.record_rule_audit(&audit).expect("record audit");

        assert!(
            store
                .set_rule_audit_applied_effects(&audit.id, &applied_effects)
                .expect("update applied effects")
        );

        let history = store
            .list_rule_audits_for_rule(&RuleId::try_from("rule-priority").expect("rule id"), 1)
            .expect("list audits");

        assert_eq!(history.len(), 1);
        assert_eq!(history[0].planned_commands, audit.planned_commands);
        assert_eq!(history[0].applied_effects, Some(applied_effects));
    }

    fn build_audit(
        id: &str,
        article_id: &str,
        match_result: RuleAuditMatchResult,
        created_at: &str,
        applied_effects: Option<JsonBlob>,
    ) -> RuleAudit {
        RuleAudit {
            id: RuleAuditId::try_from(id).expect("audit id"),
            rule_id: RuleId::try_from("rule-priority").expect("rule id"),
            article_id: crate::ArticleId::try_from(article_id).expect("article id"),
            match_result,
            input_snapshot: JsonBlob::from(json!({
              "article": {
                "id": article_id,
                "feedId": "feed-audit"
              },
              "userState": {
                "readState": "unread",
                "starred": false,
                "liked": false,
                "readLater": false,
                "importance": "normal"
              }
            })),
            planned_commands: JsonBlob::from(json!([
              {
                "type": "updateUserState",
                "articleId": article_id,
                "changes": {
                  "starred": true
                }
              }
            ])),
            applied_effects,
            created_at: IsoDateTime::try_from(created_at).expect("created at"),
        }
    }

    fn seed_rule_target_graph(connection: &Connection) {
        connection
            .execute(
                "INSERT INTO Feed (id, title, feed_url, format) VALUES (?1, ?2, ?3, ?4)",
                params![
                    "feed-audit",
                    "Audit Feed",
                    "https://example.com/audit.xml",
                    "rss"
                ],
            )
            .expect("insert feed");
        connection
            .execute(
                "INSERT INTO Article (id, feed_id, title) VALUES (?1, ?2, ?3)",
                params!["article-audit-target", "feed-audit", "Audit article one"],
            )
            .expect("insert first article");
        connection
            .execute(
                "INSERT INTO Article (id, feed_id, title) VALUES (?1, ?2, ?3)",
                params!["article-audit-target-2", "feed-audit", "Audit article two"],
            )
            .expect("insert second article");
        connection
            .execute(
                "INSERT INTO Rule (
                    id,
                    name,
                    enabled,
                    priority,
                    conditions,
                    actions,
                    scope
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    "rule-priority",
                    "Priority rule",
                    1,
                    10,
                    "{\"version\":1,\"root\":{\"kind\":\"predicate\",\"field\":\"title\",\"operator\":\"contains\",\"value\":\"Audit\"},\"sort\":[]}",
                    "{\"starred\":true}",
                    "article"
                ],
            )
            .expect("insert rule");
    }
}
