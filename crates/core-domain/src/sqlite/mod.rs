//! SQLite bootstrap and migration support for the FreelyRSS local database.

mod backup;
mod error;
mod migrations;

use std::{
    fs,
    path::{Path, PathBuf},
    time::Duration,
};

use rusqlite::{Connection, TransactionBehavior};

pub use backup::restore_database_from_backup;
pub use error::MigrationError;
pub use migrations::{EmbeddedMigration, embedded_migrations, latest_schema_version};

use self::{
    backup::create_backup,
    migrations::{
        ensure_migration_table, load_applied_migrations, pending_migrations, record_migration,
        validate_applied_migrations, validate_migration_set,
    },
};

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct DatabaseInitializationOptions {
    backup_dir: Option<PathBuf>,
}

impl DatabaseInitializationOptions {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_backup_dir(mut self, backup_dir: impl Into<PathBuf>) -> Self {
        self.backup_dir = Some(backup_dir.into());
        self
    }

    pub fn backup_dir(&self) -> Option<&Path> {
        self.backup_dir.as_deref()
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MigrationReport {
    pub database_path: PathBuf,
    pub current_version: u32,
    pub applied_versions: Vec<u32>,
    pub backup_path: Option<PathBuf>,
}

impl MigrationReport {
    pub fn is_noop(&self) -> bool {
        self.applied_versions.is_empty()
    }
}

pub fn initialize_database(
    database_path: impl AsRef<Path>,
    options: &DatabaseInitializationOptions,
) -> Result<MigrationReport, MigrationError> {
    let database_path = database_path.as_ref();
    let parent_dir =
        database_path
            .parent()
            .ok_or_else(|| MigrationError::MissingParentDirectory {
                path: database_path.to_path_buf(),
            })?;

    fs::create_dir_all(parent_dir)?;

    let mut connection = Connection::open(database_path)?;
    prepare_connection(&connection)?;

    apply_migration_set(
        &mut connection,
        database_path,
        options,
        embedded_migrations(),
    )
}

fn prepare_connection(connection: &Connection) -> Result<(), MigrationError> {
    connection.busy_timeout(Duration::from_secs(5))?;
    connection.pragma_update(None, "foreign_keys", "ON")?;
    connection.pragma_update(None, "journal_mode", "WAL")?;

    Ok(())
}

fn apply_migration_set(
    connection: &mut Connection,
    database_path: &Path,
    options: &DatabaseInitializationOptions,
    migrations: &[EmbeddedMigration],
) -> Result<MigrationReport, MigrationError> {
    validate_migration_set(migrations)?;
    ensure_migration_table(connection)?;

    let applied = load_applied_migrations(connection)?;
    validate_applied_migrations(&applied, migrations)?;

    let pending = pending_migrations(&applied, migrations);
    let backup_path = if !pending.is_empty() && !applied.is_empty() {
        options.backup_dir().map(|backup_dir| {
            create_backup(
                connection,
                database_path,
                backup_dir,
                applied
                    .last()
                    .map(|migration| migration.version)
                    .unwrap_or(0),
                pending
                    .last()
                    .map(|migration| migration.version)
                    .unwrap_or(0),
            )
        })
    } else {
        None
    }
    .transpose()?;

    let mut applied_versions = Vec::with_capacity(pending.len());

    for migration in pending {
        let transaction = connection.transaction_with_behavior(TransactionBehavior::Immediate)?;
        transaction.execute_batch(migration.sql)?;
        record_migration(&transaction, migration)?;
        transaction.commit()?;
        applied_versions.push(migration.version);
    }

    let current_version = load_applied_migrations(connection)?
        .last()
        .map(|migration| migration.version)
        .unwrap_or(0);

    Ok(MigrationReport {
        database_path: database_path.to_path_buf(),
        current_version,
        applied_versions,
        backup_path,
    })
}

#[cfg(test)]
mod tests {
    use std::fs;

    use rusqlite::{Connection, ErrorCode, params};
    use tempfile::tempdir;

    use super::*;

    #[test]
    fn initializes_an_empty_database() {
        let temp_dir = tempdir().expect("tempdir");
        let database_path = temp_dir.path().join("freelyrss.sqlite3");

        let report = initialize_database(&database_path, &DatabaseInitializationOptions::default())
            .expect("database initialization should succeed");

        assert_eq!(report.current_version, latest_schema_version());
        assert_eq!(report.applied_versions, vec![1, 2, 3, 4]);
        assert!(database_path.exists());

        let connection = Connection::open(&database_path).expect("open database");
        let recorded_version: u32 = connection
            .query_row(
                "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1",
                [],
                |row| row.get(0),
            )
            .expect("bootstrap migration should be recorded");
        let bootstrap_value: String = connection
            .query_row(
                "SELECT value FROM app_metadata WHERE key = 'schema.bootstrap'",
                [],
                |row| row.get(0),
            )
            .expect("bootstrap metadata should be present");

        assert_eq!(recorded_version, 4);
        assert_eq!(bootstrap_value, "ready");
    }

    #[test]
    fn initializes_all_core_business_tables_with_expected_columns() {
        let temp_dir = tempdir().expect("tempdir");
        let database_path = temp_dir.path().join("freelyrss.sqlite3");

        initialize_database(&database_path, &DatabaseInitializationOptions::default())
            .expect("database initialization should succeed");

        let connection = Connection::open(&database_path).expect("open database");
        let expected_tables = [
            (
                "Folder",
                vec!["id", "name", "parent_id", "sort_order", "kind"],
            ),
            ("Tag", vec!["id", "name", "scope", "color", "created_at"]),
            (
                "Feed",
                vec![
                    "id",
                    "title",
                    "site_url",
                    "feed_url",
                    "format",
                    "icon",
                    "folder_id",
                    "custom_name",
                    "sort_order",
                    "update_interval",
                    "health_status",
                    "last_checked_at",
                    "last_success_at",
                    "etag",
                    "last_modified",
                ],
            ),
            (
                "Article",
                vec![
                    "id",
                    "feed_id",
                    "source_guid",
                    "title",
                    "author",
                    "summary",
                    "content_raw",
                    "content_extracted",
                    "canonical_url",
                    "original_url",
                    "published_at",
                    "fetched_at",
                    "language",
                    "thumbnail",
                    "word_count",
                    "content_hash",
                ],
            ),
            ("FeedTag", vec!["feed_id", "tag_id"]),
            ("ArticleTag", vec!["article_id", "tag_id"]),
            (
                "Attachment",
                vec![
                    "id",
                    "article_id",
                    "type",
                    "url",
                    "mime_type",
                    "duration",
                    "size",
                    "local_cache_path",
                ],
            ),
            (
                "UserState",
                vec![
                    "article_id",
                    "read_state",
                    "starred",
                    "liked",
                    "importance",
                    "read_later",
                    "reading_progress",
                    "last_opened_at",
                ],
            ),
            (
                "Annotation",
                vec![
                    "id",
                    "article_id",
                    "type",
                    "selected_text",
                    "anchor",
                    "note",
                    "color",
                    "created_at",
                ],
            ),
            (
                "Rule",
                vec![
                    "id",
                    "name",
                    "enabled",
                    "priority",
                    "conditions",
                    "actions",
                    "scope",
                ],
            ),
            (
                "SmartFolder",
                vec!["id", "name", "query_definition", "sort_definition"],
            ),
            (
                "AIArtifact",
                vec![
                    "id",
                    "article_id",
                    "kind",
                    "provider",
                    "input_hash",
                    "result",
                    "created_at",
                ],
            ),
            (
                "SyncEvent",
                vec![
                    "id",
                    "entity_type",
                    "entity_id",
                    "change_type",
                    "payload",
                    "device_id",
                    "created_at",
                ],
            ),
        ];

        for (table, expected_columns) in expected_tables {
            let actual_columns = table_columns(&connection, table);
            assert_eq!(
                actual_columns, expected_columns,
                "table {table} should expose the schema columns defined in architecture.md"
            );
        }
    }

    #[test]
    fn initializes_expected_indexes_for_core_business_tables() {
        let temp_dir = tempdir().expect("tempdir");
        let database_path = temp_dir.path().join("freelyrss.sqlite3");

        initialize_database(&database_path, &DatabaseInitializationOptions::default())
            .expect("database initialization should succeed");

        let connection = Connection::open(&database_path).expect("open database");
        let expected_indexes = [
            IndexExpectation {
                table: "Tag",
                name: "ux_tag_scope_name",
                unique: true,
                partial: false,
                columns: &["scope", "name"],
            },
            IndexExpectation {
                table: "Feed",
                name: "ux_feed_feed_url",
                unique: true,
                partial: false,
                columns: &["feed_url"],
            },
            IndexExpectation {
                table: "Folder",
                name: "idx_folder_parent_id_sort_order",
                unique: false,
                partial: false,
                columns: &["parent_id", "sort_order"],
            },
            IndexExpectation {
                table: "Feed",
                name: "idx_feed_folder_id_sort_order",
                unique: false,
                partial: false,
                columns: &["folder_id", "sort_order"],
            },
            IndexExpectation {
                table: "Feed",
                name: "idx_feed_health_status_last_checked_at",
                unique: false,
                partial: false,
                columns: &["health_status", "last_checked_at"],
            },
            IndexExpectation {
                table: "Article",
                name: "idx_article_feed_id_source_guid",
                unique: false,
                partial: true,
                columns: &["feed_id", "source_guid"],
            },
            IndexExpectation {
                table: "Article",
                name: "idx_article_feed_id_published_at",
                unique: false,
                partial: false,
                columns: &["feed_id", "published_at"],
            },
            IndexExpectation {
                table: "Article",
                name: "idx_article_fetched_at",
                unique: false,
                partial: false,
                columns: &["fetched_at"],
            },
            IndexExpectation {
                table: "Attachment",
                name: "idx_attachment_article_id",
                unique: false,
                partial: false,
                columns: &["article_id"],
            },
            IndexExpectation {
                table: "Annotation",
                name: "idx_annotation_article_id_created_at",
                unique: false,
                partial: false,
                columns: &["article_id", "created_at"],
            },
            IndexExpectation {
                table: "UserState",
                name: "idx_user_state_read_state_article_id",
                unique: false,
                partial: false,
                columns: &["read_state", "article_id"],
            },
            IndexExpectation {
                table: "UserState",
                name: "idx_user_state_starred_article_id",
                unique: false,
                partial: false,
                columns: &["starred", "article_id"],
            },
            IndexExpectation {
                table: "UserState",
                name: "idx_user_state_liked_article_id",
                unique: false,
                partial: false,
                columns: &["liked", "article_id"],
            },
            IndexExpectation {
                table: "UserState",
                name: "idx_user_state_read_later_article_id",
                unique: false,
                partial: false,
                columns: &["read_later", "article_id"],
            },
            IndexExpectation {
                table: "UserState",
                name: "idx_user_state_importance_article_id",
                unique: false,
                partial: false,
                columns: &["importance", "article_id"],
            },
            IndexExpectation {
                table: "FeedTag",
                name: "idx_feed_tag_tag_id_feed_id",
                unique: false,
                partial: false,
                columns: &["tag_id", "feed_id"],
            },
            IndexExpectation {
                table: "ArticleTag",
                name: "idx_article_tag_tag_id_article_id",
                unique: false,
                partial: false,
                columns: &["tag_id", "article_id"],
            },
            IndexExpectation {
                table: "AIArtifact",
                name: "idx_ai_artifact_article_id_created_at",
                unique: false,
                partial: false,
                columns: &["article_id", "created_at"],
            },
            IndexExpectation {
                table: "SyncEvent",
                name: "idx_sync_event_entity_created_at",
                unique: false,
                partial: false,
                columns: &["entity_type", "entity_id", "created_at"],
            },
            IndexExpectation {
                table: "SyncEvent",
                name: "idx_sync_event_device_created_at",
                unique: false,
                partial: false,
                columns: &["device_id", "created_at"],
            },
        ];

        for expected_index in expected_indexes {
            let actual_indexes = table_indexes(&connection, expected_index.table);
            let actual_index = actual_indexes
                .iter()
                .find(|index| index.name == expected_index.name)
                .unwrap_or_else(|| {
                    panic!(
                        "table {} should expose index {} but only had {:?}",
                        expected_index.table, expected_index.name, actual_indexes
                    )
                });

            assert_eq!(
                actual_index.unique, expected_index.unique,
                "index {} should have the expected uniqueness",
                expected_index.name
            );
            assert_eq!(
                actual_index.partial, expected_index.partial,
                "index {} should have the expected partial-index flag",
                expected_index.name
            );
            assert_eq!(
                actual_index.columns, expected_index.columns,
                "index {} should expose the columns defined for Step 20",
                expected_index.name
            );
        }
    }

    #[test]
    fn initializes_article_search_structures() {
        let temp_dir = tempdir().expect("tempdir");
        let database_path = temp_dir.path().join("freelyrss.sqlite3");

        initialize_database(&database_path, &DatabaseInitializationOptions::default())
            .expect("database initialization should succeed");

        let connection = Connection::open(&database_path).expect("open database");
        let expected_columns = vec![
            "article_id",
            "feed_id",
            "title",
            "summary",
            "content",
            "author",
            "feed_title",
            "tag_names",
        ];
        let expected_triggers = [
            "article_search_after_article_insert",
            "article_search_after_article_update",
            "article_search_after_article_delete",
            "article_search_after_feed_label_update",
            "article_search_after_article_tag_insert",
            "article_search_after_article_tag_delete",
            "article_search_after_article_tag_update",
            "article_search_after_article_tag_scope_update",
        ];

        assert_eq!(
            table_columns(&connection, "ArticleSearch"),
            expected_columns
        );
        assert_schema_object_exists(&connection, "view", "ArticleSearchSource");
        assert_schema_object_exists(&connection, "table", "ArticleSearch");

        for trigger_name in expected_triggers {
            assert_schema_object_exists(&connection, "trigger", trigger_name);
        }
    }

    #[test]
    fn backfills_article_search_rows_when_upgrading_from_v3_to_v4() {
        let temp_dir = tempdir().expect("tempdir");
        let database_path = temp_dir.path().join("freelyrss.sqlite3");
        let backup_dir = temp_dir.path().join("backups");
        let mut connection = Connection::open(&database_path).expect("open database");

        prepare_connection(&connection).expect("prepare connection");
        apply_migration_set(
            &mut connection,
            &database_path,
            &DatabaseInitializationOptions::default(),
            &embedded_migrations()[..3],
        )
        .expect("apply v1-v3 migrations");

        insert_feed(
            &connection,
            "feed-upgrade",
            "Upgrade Feed",
            "https://example.com/upgrade.xml",
        );
        insert_article(
            &connection,
            "article-upgrade",
            "feed-upgrade",
            "Upgrade-safe search",
            Some("This article should be backfilled into FTS on migration."),
            Some("Backfill content for migration verification."),
            Some("Upgrade Author"),
        );
        connection
            .execute(
                "INSERT INTO Tag (id, name, scope) VALUES (?1, ?2, ?3)",
                params!["tag-upgrade", "migration", "article"],
            )
            .expect("insert tag");
        connection
            .execute(
                "INSERT INTO ArticleTag (article_id, tag_id) VALUES (?1, ?2)",
                params!["article-upgrade", "tag-upgrade"],
            )
            .expect("link article tag");

        let report = apply_migration_set(
            &mut connection,
            &database_path,
            &DatabaseInitializationOptions::new().with_backup_dir(&backup_dir),
            embedded_migrations(),
        )
        .expect("apply v4 migration");

        assert_eq!(report.current_version, 4);
        assert_eq!(report.applied_versions, vec![4]);
        assert!(report.backup_path.is_some());
        assert_eq!(
            match_article_search(&connection, "backfill"),
            vec!["article-upgrade"]
        );
        assert_eq!(
            match_article_search(&connection, "migration"),
            vec!["article-upgrade"]
        );
        assert_eq!(
            match_article_search(&connection, "\"Upgrade Feed\""),
            vec!["article-upgrade"]
        );
    }

    #[test]
    fn keeps_article_search_index_in_sync_for_article_feed_and_tag_changes() {
        let temp_dir = tempdir().expect("tempdir");
        let database_path = temp_dir.path().join("freelyrss.sqlite3");

        initialize_database(&database_path, &DatabaseInitializationOptions::default())
            .expect("database initialization should succeed");

        let connection = Connection::open(&database_path).expect("open database");
        prepare_connection(&connection).expect("prepare connection");

        insert_feed(
            &connection,
            "feed-search",
            "Systems Digest",
            "https://example.com/systems.xml",
        );
        insert_article(
            &connection,
            "article-search",
            "feed-search",
            "SQLite launch plan",
            Some("A brief note about search indexing."),
            Some("This article explains tokenizer choices and ranking strategy."),
            Some("Ada Lovelace"),
        );

        assert_eq!(
            match_article_search(&connection, "launch"),
            vec!["article-search"]
        );
        assert_eq!(
            match_article_search(&connection, "tokenizer"),
            vec!["article-search"]
        );
        assert_eq!(
            match_article_search(&connection, "\"Systems Digest\""),
            vec!["article-search"]
        );

        connection
            .execute(
                "UPDATE Article SET title = ?1, content_extracted = ?2 WHERE id = ?3",
                params![
                    "SQLite release plan",
                    "This updated copy focuses on snippet assembly.",
                    "article-search"
                ],
            )
            .expect("update article");

        assert!(match_article_search(&connection, "launch").is_empty());
        assert_eq!(
            match_article_search(&connection, "snippet"),
            vec!["article-search"]
        );

        connection
            .execute(
                "UPDATE Feed SET custom_name = ?1 WHERE id = ?2",
                params!["Infra notebook", "feed-search"],
            )
            .expect("update feed label");
        assert!(match_article_search(&connection, "\"Systems Digest\"").is_empty());
        assert_eq!(
            match_article_search(&connection, "\"Infra notebook\""),
            vec!["article-search"]
        );

        connection
            .execute(
                "INSERT INTO Tag (id, name, scope) VALUES (?1, ?2, ?3)",
                params!["tag-search", "opslabel", "article"],
            )
            .expect("insert tag");
        connection
            .execute(
                "INSERT INTO ArticleTag (article_id, tag_id) VALUES (?1, ?2)",
                params!["article-search", "tag-search"],
            )
            .expect("link article tag");
        assert_eq!(
            match_article_search(&connection, "opslabel"),
            vec!["article-search"]
        );

        connection
            .execute(
                "UPDATE Tag SET name = ?1 WHERE id = ?2",
                params!["signalmark", "tag-search"],
            )
            .expect("rename tag");
        assert!(match_article_search(&connection, "opslabel").is_empty());
        assert_eq!(
            match_article_search(&connection, "signalmark"),
            vec!["article-search"]
        );

        connection
            .execute(
                "DELETE FROM ArticleTag WHERE article_id = ?1 AND tag_id = ?2",
                params!["article-search", "tag-search"],
            )
            .expect("delete article tag");
        assert!(match_article_search(&connection, "signalmark").is_empty());

        connection
            .execute(
                "DELETE FROM Article WHERE id = ?1",
                params!["article-search"],
            )
            .expect("delete article");
        assert!(match_article_search(&connection, "snippet").is_empty());
        assert!(match_article_search(&connection, "\"Infra notebook\"").is_empty());
    }

    #[test]
    fn rejects_duplicate_unique_values_and_invalid_business_records() {
        let temp_dir = tempdir().expect("tempdir");
        let database_path = temp_dir.path().join("freelyrss.sqlite3");

        initialize_database(&database_path, &DatabaseInitializationOptions::default())
            .expect("database initialization should succeed");

        let connection = Connection::open(&database_path).expect("open database");
        prepare_connection(&connection).expect("prepare connection");

        connection
            .execute(
                "INSERT INTO Feed (id, title, feed_url, format) VALUES (?1, ?2, ?3, ?4)",
                params!["feed-1", "Feed One", "https://example.com/feed.xml", "rss"],
            )
            .expect("insert first feed");

        let duplicate_feed = connection.execute(
            "INSERT INTO Feed (id, title, feed_url, format) VALUES (?1, ?2, ?3, ?4)",
            params!["feed-2", "Feed Two", "https://example.com/feed.xml", "rss"],
        );
        assert_constraint_violation(duplicate_feed);

        connection
            .execute(
                "INSERT INTO Tag (id, name, scope) VALUES (?1, ?2, ?3)",
                params!["tag-1", "Focus", "article"],
            )
            .expect("insert first tag");

        let duplicate_tag = connection.execute(
            "INSERT INTO Tag (id, name, scope) VALUES (?1, ?2, ?3)",
            params!["tag-2", "Focus", "article"],
        );
        assert_constraint_violation(duplicate_tag);

        connection
            .execute(
                "INSERT INTO Tag (id, name, scope) VALUES (?1, ?2, ?3)",
                params!["tag-3", "Focus", "feed"],
            )
            .expect("same tag name should be allowed in a different scope");

        let invalid_feed_folder = connection.execute(
            "INSERT INTO Feed (id, title, feed_url, format, folder_id) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                "feed-3",
                "Broken Folder Feed",
                "https://example.com/broken.xml",
                "rss",
                "missing-folder"
            ],
        );
        assert_constraint_violation(invalid_feed_folder);

        connection
            .execute(
                "INSERT INTO Article (id, feed_id, title) VALUES (?1, ?2, ?3)",
                params!["article-1", "feed-1", "Hello world"],
            )
            .expect("insert article");

        let invalid_user_state = connection.execute(
            "INSERT INTO UserState (article_id, read_state) VALUES (?1, ?2)",
            params!["article-1", "archived"],
        );
        assert_constraint_violation(invalid_user_state);
    }

    #[test]
    fn repeated_initialization_is_idempotent() {
        let temp_dir = tempdir().expect("tempdir");
        let database_path = temp_dir.path().join("freelyrss.sqlite3");
        let options =
            DatabaseInitializationOptions::new().with_backup_dir(temp_dir.path().join("backups"));

        initialize_database(&database_path, &options).expect("first initialization");

        let second_report =
            initialize_database(&database_path, &options).expect("second initialization");

        assert!(second_report.is_noop());
        assert_eq!(second_report.current_version, latest_schema_version());
        assert!(second_report.backup_path.is_none());
    }

    #[test]
    fn creates_backup_before_applying_pending_migrations() {
        let temp_dir = tempdir().expect("tempdir");
        let database_path = temp_dir.path().join("freelyrss.sqlite3");
        let backup_dir = temp_dir.path().join("backups");
        let mut connection = Connection::open(&database_path).expect("open database");

        prepare_connection(&connection).expect("prepare connection");

        let bootstrap_only = [EmbeddedMigration {
            version: 1,
            name: "bootstrap_metadata",
            sql: embedded_migrations()[0].sql,
        }];
        apply_migration_set(
            &mut connection,
            &database_path,
            &DatabaseInitializationOptions::default(),
            &bootstrap_only,
        )
        .expect("bootstrap migration");

        let next_migrations = [
            bootstrap_only[0],
            EmbeddedMigration {
                version: 2,
                name: "add_test_table",
                sql: "CREATE TABLE test_records (id INTEGER PRIMARY KEY) STRICT;",
            },
        ];

        let report = apply_migration_set(
            &mut connection,
            &database_path,
            &DatabaseInitializationOptions::new().with_backup_dir(&backup_dir),
            &next_migrations,
        )
        .expect("second migration should succeed");

        let backup_path = report.backup_path.expect("backup path should be created");
        assert!(backup_path.exists());

        let backup_connection = Connection::open(&backup_path).expect("open backup");
        let backup_has_test_table: bool = backup_connection
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'test_records')",
                [],
                |row| row.get(0),
            )
            .expect("query backup schema");

        assert!(!backup_has_test_table);
    }

    #[test]
    fn failed_migration_rolls_back_its_transaction() {
        let temp_dir = tempdir().expect("tempdir");
        let database_path = temp_dir.path().join("freelyrss.sqlite3");
        let mut connection = Connection::open(&database_path).expect("open database");

        prepare_connection(&connection).expect("prepare connection");

        let migrations = [
            EmbeddedMigration {
                version: 1,
                name: "bootstrap_metadata",
                sql: embedded_migrations()[0].sql,
            },
            EmbeddedMigration {
                version: 2,
                name: "broken_migration",
                sql: "CREATE TABLE broken_records (id INTEGER PRIMARY KEY); THIS IS NOT VALID SQL;",
            },
        ];

        let error = apply_migration_set(
            &mut connection,
            &database_path,
            &DatabaseInitializationOptions::default(),
            &migrations,
        )
        .expect_err("broken migration should fail");

        assert!(matches!(error, MigrationError::Sqlite(_)));

        let broken_table_exists: bool = connection
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'broken_records')",
                [],
                |row| row.get(0),
            )
            .expect("query broken table");
        let applied_versions: Vec<u32> = load_applied_migrations(&connection)
            .expect("read applied migrations")
            .into_iter()
            .map(|migration| migration.version)
            .collect();

        assert!(!broken_table_exists);
        assert_eq!(applied_versions, vec![1]);
    }

    #[test]
    fn restores_database_from_backup_snapshot() {
        let temp_dir = tempdir().expect("tempdir");
        let database_path = temp_dir.path().join("freelyrss.sqlite3");
        let backup_path = temp_dir.path().join("backups").join("snapshot.sqlite3");
        let backup_parent = backup_path.parent().expect("backup parent");

        fs::create_dir_all(backup_parent).expect("create backup directory");

        let original = Connection::open(&database_path).expect("open database");
        original
            .execute_batch("CREATE TABLE restore_test (value TEXT); INSERT INTO restore_test (value) VALUES ('before');")
            .expect("seed database");
        original
            .execute_batch(&format!(
                "VACUUM INTO '{}'",
                backup_path.to_string_lossy().replace('\'', "''")
            ))
            .expect("create backup snapshot");
        original
            .execute("DELETE FROM restore_test", [])
            .expect("mutate original database");
        drop(original);

        restore_database_from_backup(&database_path, &backup_path).expect("restore database");

        let restored = Connection::open(&database_path).expect("open restored database");
        let restored_value: String = restored
            .query_row("SELECT value FROM restore_test LIMIT 1", [], |row| {
                row.get(0)
            })
            .expect("read restored row");

        assert_eq!(restored_value, "before");
    }

    #[derive(Clone, Debug, PartialEq, Eq)]
    struct TableIndex {
        name: String,
        unique: bool,
        partial: bool,
        columns: Vec<String>,
    }

    #[derive(Clone, Copy, Debug, PartialEq, Eq)]
    struct IndexExpectation {
        table: &'static str,
        name: &'static str,
        unique: bool,
        partial: bool,
        columns: &'static [&'static str],
    }

    fn table_columns(connection: &Connection, table_name: &str) -> Vec<String> {
        let pragma = format!("PRAGMA table_info('{table_name}')");
        let mut statement = connection
            .prepare(&pragma)
            .expect("prepare table info query");
        let rows = statement
            .query_map([], |row| row.get(1))
            .expect("read table columns");

        rows.collect::<Result<Vec<String>, _>>()
            .expect("collect table columns")
    }

    fn table_indexes(connection: &Connection, table_name: &str) -> Vec<TableIndex> {
        let pragma = format!("PRAGMA index_list('{table_name}')");
        let mut statement = connection
            .prepare(&pragma)
            .expect("prepare index list query");
        let rows = statement
            .query_map([], |row| {
                let name: String = row.get(1)?;
                let unique = row.get::<_, i64>(2)? != 0;
                let partial = row.get::<_, i64>(4)? != 0;

                Ok(TableIndex {
                    columns: index_columns(connection, &name),
                    name,
                    unique,
                    partial,
                })
            })
            .expect("read index list");

        rows.collect::<Result<Vec<TableIndex>, _>>()
            .expect("collect index list")
    }

    fn index_columns(connection: &Connection, index_name: &str) -> Vec<String> {
        let pragma = format!("PRAGMA index_info('{index_name}')");
        let mut statement = connection
            .prepare(&pragma)
            .expect("prepare index info query");
        let rows = statement
            .query_map([], |row| row.get(2))
            .expect("read index columns");

        rows.collect::<Result<Vec<String>, _>>()
            .expect("collect index columns")
    }

    fn assert_schema_object_exists(connection: &Connection, object_type: &str, object_name: &str) {
        let exists: bool = connection
            .query_row(
                "SELECT EXISTS(
                    SELECT 1
                    FROM sqlite_master
                    WHERE type = ?1 AND name = ?2
                )",
                params![object_type, object_name],
                |row| row.get(0),
            )
            .expect("query sqlite_master");

        assert!(
            exists,
            "schema object {object_type}:{object_name} should exist after initialization"
        );
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
        author: Option<&str>,
    ) {
        connection
            .execute(
                "INSERT INTO Article (
                    id,
                    feed_id,
                    title,
                    summary,
                    content_extracted,
                    author
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![id, feed_id, title, summary, content_extracted, author],
            )
            .expect("insert article");
    }

    fn match_article_search(connection: &Connection, query: &str) -> Vec<String> {
        let mut statement = connection
            .prepare(
                "SELECT article_id
                FROM ArticleSearch
                WHERE ArticleSearch MATCH ?1
                ORDER BY article_id ASC",
            )
            .expect("prepare article search query");
        let rows = statement
            .query_map(params![query], |row| row.get(0))
            .expect("execute article search query");

        rows.collect::<Result<Vec<String>, _>>()
            .expect("collect article search rows")
    }

    fn assert_constraint_violation(result: rusqlite::Result<usize>) {
        let error = result.expect_err("operation should violate a constraint");

        match error {
            rusqlite::Error::SqliteFailure(sqlite_error, _) => {
                assert_eq!(sqlite_error.code, ErrorCode::ConstraintViolation);
            }
            other => panic!("expected sqlite constraint violation, got {other:?}"),
        }
    }
}
