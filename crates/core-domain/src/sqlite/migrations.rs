use rusqlite::{Connection, Transaction, params};

use super::error::MigrationError;

pub const SCHEMA_MIGRATIONS_TABLE: &str = "schema_migrations";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct EmbeddedMigration {
    pub version: u32,
    pub name: &'static str,
    pub sql: &'static str,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AppliedMigration {
    pub version: u32,
    pub name: String,
}

const EMBEDDED_MIGRATIONS: [EmbeddedMigration; 1] = [EmbeddedMigration {
    version: 1,
    name: "bootstrap_metadata",
    sql: r#"
CREATE TABLE IF NOT EXISTS app_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

INSERT INTO app_metadata (key, value)
VALUES ('schema.bootstrap', 'ready')
ON CONFLICT(key) DO NOTHING;
"#,
}];

pub fn embedded_migrations() -> &'static [EmbeddedMigration] {
    &EMBEDDED_MIGRATIONS
}

pub fn latest_schema_version() -> u32 {
    embedded_migrations()
        .last()
        .map(|migration| migration.version)
        .unwrap_or_default()
}

pub(crate) fn ensure_migration_table(connection: &Connection) -> Result<(), rusqlite::Error> {
    connection.execute_batch(
        r#"
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;
"#,
    )
}

pub(crate) fn load_applied_migrations(
    connection: &Connection,
) -> Result<Vec<AppliedMigration>, rusqlite::Error> {
    let mut statement = connection.prepare(&format!(
        "SELECT version, name FROM {SCHEMA_MIGRATIONS_TABLE} ORDER BY version ASC"
    ))?;

    let rows = statement.query_map([], |row| {
        Ok(AppliedMigration {
            version: row.get(0)?,
            name: row.get(1)?,
        })
    })?;

    rows.collect()
}

pub(crate) fn validate_migration_set(
    migrations: &[EmbeddedMigration],
) -> Result<(), MigrationError> {
    for (index, migration) in migrations.iter().enumerate() {
        let expected = (index as u32) + 1;

        if migration.version != expected {
            return Err(MigrationError::InvalidEmbeddedMigrationSequence {
                expected,
                found: migration.version,
            });
        }
    }

    Ok(())
}

pub(crate) fn validate_applied_migrations(
    applied: &[AppliedMigration],
    migrations: &[EmbeddedMigration],
) -> Result<(), MigrationError> {
    for (index, applied_migration) in applied.iter().enumerate() {
        let expected_version = (index as u32) + 1;

        if applied_migration.version != expected_version {
            return Err(MigrationError::InvalidAppliedMigrationSequence {
                expected: expected_version,
                found: applied_migration.version,
            });
        }

        let expected_migration = migrations
            .iter()
            .find(|migration| migration.version == applied_migration.version)
            .ok_or(MigrationError::UnknownAppliedMigrationVersion {
                version: applied_migration.version,
            })?;

        if expected_migration.name != applied_migration.name {
            return Err(MigrationError::AppliedMigrationNameMismatch {
                version: applied_migration.version,
                expected: expected_migration.name,
                found: applied_migration.name.clone(),
            });
        }
    }

    Ok(())
}

pub(crate) fn pending_migrations<'a>(
    applied: &[AppliedMigration],
    migrations: &'a [EmbeddedMigration],
) -> Vec<&'a EmbeddedMigration> {
    let current_version = applied
        .last()
        .map(|migration| migration.version)
        .unwrap_or(0);

    migrations
        .iter()
        .filter(|migration| migration.version > current_version)
        .collect()
}

pub(crate) fn record_migration(
    transaction: &Transaction<'_>,
    migration: &EmbeddedMigration,
) -> Result<(), rusqlite::Error> {
    transaction.execute(
        &format!("INSERT INTO {SCHEMA_MIGRATIONS_TABLE} (version, name) VALUES (?1, ?2)"),
        params![migration.version, migration.name],
    )?;

    Ok(())
}
