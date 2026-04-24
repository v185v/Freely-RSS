use rusqlite::{Connection, params};

use crate::{JsonBlob, SmartFolder, SmartFolderId};

use super::StoreError;

pub struct SmartFolderStore<'conn> {
    connection: &'conn mut Connection,
}

impl<'conn> SmartFolderStore<'conn> {
    pub fn new(connection: &'conn mut Connection) -> Self {
        Self { connection }
    }

    pub fn save_smart_folder(&mut self, smart_folder: &SmartFolder) -> Result<(), StoreError> {
        self.connection.execute(
            "INSERT INTO SmartFolder (
                id,
                name,
                query_definition,
                sort_definition
            ) VALUES (?1, ?2, ?3, ?4)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                query_definition = excluded.query_definition,
                sort_definition = excluded.sort_definition",
            params![
                smart_folder.id.as_str(),
                smart_folder.name,
                smart_folder.query_definition.to_compact_string(),
                smart_folder
                    .sort_definition
                    .as_ref()
                    .map(JsonBlob::to_compact_string),
            ],
        )?;

        Ok(())
    }

    pub fn list_smart_folders(&mut self) -> Result<Vec<SmartFolder>, StoreError> {
        let mut statement = self.connection.prepare(
            "SELECT
                id,
                name,
                query_definition,
                sort_definition
            FROM SmartFolder
            ORDER BY name ASC, id ASC",
        )?;

        let rows = statement.query_map([], |row| {
            let id: String = row.get(0)?;
            let name: String = row.get(1)?;
            let query_definition: String = row.get(2)?;
            let sort_definition: Option<String> = row.get(3)?;

            Ok((id, name, query_definition, sort_definition))
        })?;

        rows.into_iter()
            .map(|row| {
                let (id, name, query_definition, sort_definition) = row?;

                Ok(SmartFolder {
                    id: SmartFolderId::try_from(id)?,
                    name,
                    query_definition: JsonBlob::parse("query_definition", &query_definition)?,
                    sort_definition: sort_definition
                        .map(|value| JsonBlob::parse("sort_definition", &value))
                        .transpose()?,
                })
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use rusqlite::Connection;
    use serde_json::json;
    use tempfile::tempdir;

    use super::SmartFolderStore;
    use crate::{
        JsonBlob, SmartFolder, SmartFolderId,
        sqlite::{DatabaseInitializationOptions, initialize_database},
    };

    #[test]
    fn saves_and_lists_smart_folders() {
        let temp_dir = tempdir().expect("temp dir");
        let database_path = temp_dir.path().join("smart-folders.sqlite3");
        let connection = Connection::open(&database_path).expect("open database");
        drop(connection);
        initialize_database(&database_path, &DatabaseInitializationOptions::default())
            .expect("initialize database");
        let mut connection = Connection::open(&database_path).expect("reopen database");

        let mut store = SmartFolderStore::new(&mut connection);
        let smart_folder = SmartFolder {
            id: SmartFolderId::try_from("smart-folder-last-7-days-unread")
                .expect("smart folder id"),
            name: "Last 7 days unread".into(),
            query_definition: JsonBlob::from(json!({
                "version": 1,
                "root": {
                    "kind": "group",
                    "match": "all",
                    "children": [
                        { "kind": "predicate", "field": "readState", "operator": "neq", "value": "read" }
                    ]
                },
                "sort": [{ "field": "publishedAt", "direction": "desc", "nulls": "last" }]
            })),
            sort_definition: None,
        };

        store
            .save_smart_folder(&smart_folder)
            .expect("save smart folder");

        let listed = store.list_smart_folders().expect("list smart folders");

        assert_eq!(listed, vec![smart_folder]);
    }
}
