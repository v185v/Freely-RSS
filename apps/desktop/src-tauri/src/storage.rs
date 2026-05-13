use std::{
    error::Error,
    fs,
    path::{Path, PathBuf},
};

use freelyrss_core_domain::sqlite::{
    initialize_database, DatabaseInitializationOptions, MigrationReport,
};
use tauri::{App, Manager, Runtime};

const DATABASE_DIRECTORY_NAME: &str = "database";
const DATABASE_FILE_NAME: &str = "freelyrss.sqlite3";
const DATABASE_BACKUP_DIRECTORY_NAME: &str = "backups";
const CACHE_DIRECTORY_NAME: &str = "cache";
const CONTENT_CACHE_DIRECTORY_NAME: &str = "content";
const MEDIA_CACHE_DIRECTORY_NAME: &str = "media";
const EXPORTS_DIRECTORY_NAME: &str = "exports";
const LOGS_DIRECTORY_NAME: &str = "logs";

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DesktopDatabasePaths {
    pub root_dir: PathBuf,
    pub database_path: PathBuf,
    pub backup_dir: PathBuf,
}

impl DesktopDatabasePaths {
    pub fn from_app_local_data_dir(app_local_data_dir: PathBuf) -> Self {
        let root_dir = app_local_data_dir.join(DATABASE_DIRECTORY_NAME);
        let database_path = root_dir.join(DATABASE_FILE_NAME);
        let backup_dir = root_dir.join(DATABASE_BACKUP_DIRECTORY_NAME);

        Self {
            root_dir,
            database_path,
            backup_dir,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DesktopStoragePaths {
    pub app_data_dir: PathBuf,
    pub database: DesktopDatabasePaths,
    pub cache_root_dir: PathBuf,
    pub content_cache_dir: PathBuf,
    pub media_cache_dir: PathBuf,
    pub exports_dir: PathBuf,
    pub logs_dir: PathBuf,
}

impl DesktopStoragePaths {
    pub fn from_app_local_data_dir(app_local_data_dir: PathBuf) -> Self {
        let database = DesktopDatabasePaths::from_app_local_data_dir(app_local_data_dir.clone());
        let cache_root_dir = app_local_data_dir.join(CACHE_DIRECTORY_NAME);
        let content_cache_dir = cache_root_dir.join(CONTENT_CACHE_DIRECTORY_NAME);
        let media_cache_dir = cache_root_dir.join(MEDIA_CACHE_DIRECTORY_NAME);
        let exports_dir = app_local_data_dir.join(EXPORTS_DIRECTORY_NAME);
        let logs_dir = app_local_data_dir.join(LOGS_DIRECTORY_NAME);

        Self {
            app_data_dir: app_local_data_dir,
            database,
            cache_root_dir,
            content_cache_dir,
            media_cache_dir,
            exports_dir,
            logs_dir,
        }
    }

    fn ensure_directory_layout(&self) -> Result<(), std::io::Error> {
        for directory in self.managed_directories() {
            fs::create_dir_all(directory)?;
        }

        Ok(())
    }

    fn managed_directories(&self) -> [&Path; 7] {
        [
            self.database.root_dir.as_path(),
            self.database.backup_dir.as_path(),
            self.cache_root_dir.as_path(),
            self.content_cache_dir.as_path(),
            self.media_cache_dir.as_path(),
            self.exports_dir.as_path(),
            self.logs_dir.as_path(),
        ]
    }
}

fn initialize_local_storage_at(
    storage_paths: &DesktopStoragePaths,
) -> Result<MigrationReport, Box<dyn Error>> {
    storage_paths.ensure_directory_layout()?;
    let options = DatabaseInitializationOptions::new()
        .with_backup_dir(storage_paths.database.backup_dir.clone());

    initialize_database(&storage_paths.database.database_path, &options).map_err(Into::into)
}

pub fn initialize_local_storage<R: Runtime>(
    app: &mut App<R>,
) -> Result<MigrationReport, Box<dyn Error>> {
    let app_local_data_dir = app.path().app_local_data_dir()?;
    let storage_paths = DesktopStoragePaths::from_app_local_data_dir(app_local_data_dir);

    initialize_local_storage_at(&storage_paths)
}

pub fn setup_local_storage<R: Runtime>(app: &mut App<R>) -> Result<(), Box<dyn Error>> {
    let _report = initialize_local_storage(app)?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use std::{fs, path::PathBuf};

    use freelyrss_core_domain::sqlite::latest_schema_version;
    use tempfile::tempdir;

    use super::{initialize_local_storage_at, DesktopDatabasePaths, DesktopStoragePaths};

    #[test]
    fn derives_database_paths_from_app_local_data_dir() {
        let base_dir = PathBuf::from("C:/freelyrss");
        let paths = DesktopDatabasePaths::from_app_local_data_dir(base_dir.clone());

        assert_eq!(paths.root_dir, base_dir.join("database"));
        assert_eq!(
            paths.database_path,
            base_dir.join("database").join("freelyrss.sqlite3")
        );
        assert_eq!(paths.backup_dir, base_dir.join("database").join("backups"));
    }

    #[test]
    fn derives_storage_paths_from_app_local_data_dir() {
        let base_dir = PathBuf::from("C:/freelyrss");
        let paths = DesktopStoragePaths::from_app_local_data_dir(base_dir.clone());

        assert_eq!(paths.app_data_dir, base_dir);
        assert_eq!(
            paths.database,
            DesktopDatabasePaths {
                root_dir: PathBuf::from("C:/freelyrss").join("database"),
                database_path: PathBuf::from("C:/freelyrss")
                    .join("database")
                    .join("freelyrss.sqlite3"),
                backup_dir: PathBuf::from("C:/freelyrss")
                    .join("database")
                    .join("backups"),
            }
        );
        assert_eq!(
            paths.cache_root_dir,
            PathBuf::from("C:/freelyrss").join("cache")
        );
        assert_eq!(
            paths.content_cache_dir,
            PathBuf::from("C:/freelyrss").join("cache").join("content")
        );
        assert_eq!(
            paths.media_cache_dir,
            PathBuf::from("C:/freelyrss").join("cache").join("media")
        );
        assert_eq!(
            paths.exports_dir,
            PathBuf::from("C:/freelyrss").join("exports")
        );
        assert_eq!(paths.logs_dir, PathBuf::from("C:/freelyrss").join("logs"));
    }

    #[test]
    fn creates_expected_storage_directories() {
        let temp_dir = tempdir().expect("tempdir");
        let storage_paths =
            DesktopStoragePaths::from_app_local_data_dir(temp_dir.path().to_path_buf());

        storage_paths
            .ensure_directory_layout()
            .expect("storage directory layout should be created");

        for directory in storage_paths.managed_directories() {
            assert!(
                fs::metadata(directory)
                    .map(|metadata| metadata.is_dir())
                    .unwrap_or(false),
                "directory {} should exist",
                directory.display()
            );
        }
    }

    #[test]
    fn initializes_database_within_managed_storage_layout() {
        let temp_dir = tempdir().expect("tempdir");
        let storage_paths =
            DesktopStoragePaths::from_app_local_data_dir(temp_dir.path().to_path_buf());

        let report =
            initialize_local_storage_at(&storage_paths).expect("local storage initialization");

        assert_eq!(report.database_path, storage_paths.database.database_path);
        assert_eq!(report.current_version, latest_schema_version());
        assert_eq!(
            report.applied_versions,
            (1..=latest_schema_version()).collect::<Vec<_>>()
        );

        for directory in storage_paths.managed_directories() {
            assert!(
                fs::metadata(directory)
                    .map(|metadata| metadata.is_dir())
                    .unwrap_or(false),
                "directory {} should exist after initialization",
                directory.display()
            );
        }
        assert!(
            fs::metadata(&storage_paths.database.database_path)
                .map(|metadata| metadata.is_file())
                .unwrap_or(false),
            "database file should be created inside the managed database directory"
        );
    }
}
