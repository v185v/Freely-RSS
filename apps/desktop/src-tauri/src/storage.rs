use std::{error::Error, path::PathBuf};

use freelyrss_core_domain::sqlite::{DatabaseInitializationOptions, MigrationReport, initialize_database};
use tauri::{App, Manager, Runtime};

const DATABASE_DIRECTORY_NAME: &str = "database";
const DATABASE_FILE_NAME: &str = "freelyrss.sqlite3";
const DATABASE_BACKUP_DIRECTORY_NAME: &str = "backups";

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DesktopDatabasePaths {
    pub root_dir: PathBuf,
    pub database_path: PathBuf,
    pub backup_dir: PathBuf,
}

impl DesktopDatabasePaths {
    fn from_app_local_data_dir(app_local_data_dir: PathBuf) -> Self {
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

pub fn initialize_local_database<R: Runtime>(
    app: &mut App<R>,
) -> Result<MigrationReport, Box<dyn Error>> {
    let app_local_data_dir = app.path().app_local_data_dir()?;
    let database_paths = DesktopDatabasePaths::from_app_local_data_dir(app_local_data_dir);
    let options =
        DatabaseInitializationOptions::new().with_backup_dir(database_paths.backup_dir.clone());

    initialize_database(&database_paths.database_path, &options).map_err(Into::into)
}

pub fn setup_local_database<R: Runtime>(app: &mut App<R>) -> Result<(), Box<dyn Error>> {
    let _report = initialize_local_database(app)?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use super::DesktopDatabasePaths;

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
}
