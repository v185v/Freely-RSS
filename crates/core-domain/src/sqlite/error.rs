use std::path::PathBuf;

use crate::ModelError;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum MigrationError {
    #[error("failed to create or access database path: {0}")]
    Io(#[from] std::io::Error),
    #[error("sqlite migration error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("embedded migration sequence is invalid: expected version {expected}, found {found}")]
    InvalidEmbeddedMigrationSequence { expected: u32, found: u32 },
    #[error("applied migration history is invalid: expected version {expected}, found {found}")]
    InvalidAppliedMigrationSequence { expected: u32, found: u32 },
    #[error("database contains an unknown applied migration version {version}")]
    UnknownAppliedMigrationVersion { version: u32 },
    #[error("database migration {version} name mismatch: expected `{expected}`, found `{found}`")]
    AppliedMigrationNameMismatch {
        version: u32,
        expected: &'static str,
        found: String,
    },
    #[error("database path `{path}` does not have a parent directory")]
    MissingParentDirectory { path: PathBuf },
}

#[derive(Debug, Error)]
pub enum StoreError {
    #[error("sqlite store error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("invalid stored model data: {0}")]
    Model(#[from] ModelError),
    #[error("sync classifier returned a non-event boundary for {operation}")]
    NonEventSyncBoundary { operation: &'static str },
}
