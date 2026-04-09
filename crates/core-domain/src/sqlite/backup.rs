use std::{
    fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

use rusqlite::Connection;

use super::error::MigrationError;

pub(crate) fn create_backup(
    connection: &Connection,
    database_path: &Path,
    backup_dir: &Path,
    current_version: u32,
    target_version: u32,
) -> Result<PathBuf, MigrationError> {
    fs::create_dir_all(backup_dir)?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let database_stem = database_path
        .file_stem()
        .and_then(|stem| stem.to_str())
        .unwrap_or("freelyrss");
    let backup_path = backup_dir.join(format!(
        "{database_stem}-schema-v{current_version}-to-v{target_version}-{timestamp}.sqlite3"
    ));
    let escaped_backup_path = quote_sql_string(&backup_path);

    connection.execute_batch(&format!("VACUUM INTO {escaped_backup_path}"))?;

    Ok(backup_path)
}

pub fn restore_database_from_backup(
    database_path: impl AsRef<Path>,
    backup_path: impl AsRef<Path>,
) -> Result<(), MigrationError> {
    let database_path = database_path.as_ref();
    let backup_path = backup_path.as_ref();
    let parent_dir =
        database_path
            .parent()
            .ok_or_else(|| MigrationError::MissingParentDirectory {
                path: database_path.to_path_buf(),
            })?;

    fs::create_dir_all(parent_dir)?;

    if database_path.exists() {
        fs::remove_file(database_path)?;
    }

    for suffix in ["-wal", "-shm"] {
        let sidecar = sidecar_path(database_path, suffix);

        if sidecar.exists() {
            fs::remove_file(sidecar)?;
        }
    }

    fs::copy(backup_path, database_path)?;

    Ok(())
}

fn quote_sql_string(path: &Path) -> String {
    let escaped = path.to_string_lossy().replace('\'', "''");
    format!("'{escaped}'")
}

fn sidecar_path(database_path: &Path, suffix: &str) -> PathBuf {
    let file_name = database_path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("database");

    database_path.with_file_name(format!("{file_name}{suffix}"))
}
