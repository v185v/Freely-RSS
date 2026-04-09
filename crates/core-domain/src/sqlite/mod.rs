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

    use rusqlite::Connection;
    use tempfile::tempdir;

    use super::*;

    #[test]
    fn initializes_an_empty_database() {
        let temp_dir = tempdir().expect("tempdir");
        let database_path = temp_dir.path().join("freelyrss.sqlite3");

        let report = initialize_database(&database_path, &DatabaseInitializationOptions::default())
            .expect("database initialization should succeed");

        assert_eq!(report.current_version, latest_schema_version());
        assert_eq!(report.applied_versions, vec![1]);
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

        assert_eq!(recorded_version, 1);
        assert_eq!(bootstrap_value, "ready");
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
}
