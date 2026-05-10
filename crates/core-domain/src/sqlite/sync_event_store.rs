use freelyrss_sync_engine::{
    FeedSyncField, SyncBoundaryDecision, SyncChange, UserStateSyncField, classify_change,
};
use rusqlite::{Connection, Transaction, params};
use serde_json::{Map, Value, json};

use crate::{
    Annotation, ArticleTag, DeviceId, FeedId, FeedTag, FolderId, IsoDateTime, JsonBlob, SyncEvent,
    SyncEventId, UserState,
};

use super::StoreError;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SyncEventWriteContext {
    pub event_id: SyncEventId,
    pub device_id: DeviceId,
    pub created_at: IsoDateTime,
}

impl SyncEventWriteContext {
    pub fn new(event_id: SyncEventId, device_id: DeviceId, created_at: IsoDateTime) -> Self {
        Self {
            event_id,
            device_id,
            created_at,
        }
    }
}

pub struct LocalSyncEventStore<'conn> {
    connection: &'conn mut Connection,
}

impl<'conn> LocalSyncEventStore<'conn> {
    pub fn new(connection: &'conn mut Connection) -> Self {
        Self { connection }
    }

    pub fn update_user_state(
        &mut self,
        state: &UserState,
        fields: Vec<UserStateSyncField>,
        context: SyncEventWriteContext,
    ) -> Result<SyncEvent, StoreError> {
        let transaction = self.connection.transaction()?;

        upsert_user_state(&transaction, state)?;

        let event = sync_event_from_decision(
            "update_user_state",
            classify_change(SyncChange::UpdateUserState {
                article_id: state.article_id.as_str().to_owned(),
                fields,
            }),
            user_state_payload_value(state),
            context,
        )?;
        insert_sync_event(&transaction, &event)?;

        transaction.commit()?;

        Ok(event)
    }

    pub fn create_annotation(
        &mut self,
        annotation: &Annotation,
        context: SyncEventWriteContext,
    ) -> Result<SyncEvent, StoreError> {
        let transaction = self.connection.transaction()?;

        insert_annotation(&transaction, annotation)?;

        let event = sync_event_from_decision(
            "create_annotation",
            classify_change(SyncChange::CreateAnnotation {
                annotation_id: annotation.id.as_str().to_owned(),
            }),
            annotation_payload_value(annotation),
            context,
        )?;
        insert_sync_event(&transaction, &event)?;

        transaction.commit()?;

        Ok(event)
    }

    pub fn move_feed_to_folder(
        &mut self,
        feed_id: &FeedId,
        folder_id: Option<&FolderId>,
        context: SyncEventWriteContext,
    ) -> Result<Option<SyncEvent>, StoreError> {
        let transaction = self.connection.transaction()?;

        let updated_rows = transaction.execute(
            "UPDATE Feed
            SET folder_id = ?2
            WHERE id = ?1",
            params![
                feed_id.as_str(),
                folder_id.map(|folder_id| folder_id.as_str()),
            ],
        )?;

        if updated_rows == 0 {
            transaction.commit()?;
            return Ok(None);
        }

        let event = sync_event_from_decision(
            "move_feed_to_folder",
            classify_change(SyncChange::UpdateFeed {
                feed_id: feed_id.as_str().to_owned(),
                fields: vec![FeedSyncField::FolderId],
            }),
            feed_folder_payload_value(folder_id),
            context,
        )?;
        insert_sync_event(&transaction, &event)?;

        transaction.commit()?;

        Ok(Some(event))
    }

    pub fn attach_article_tag(
        &mut self,
        article_tag: &ArticleTag,
        context: SyncEventWriteContext,
    ) -> Result<Option<SyncEvent>, StoreError> {
        let transaction = self.connection.transaction()?;

        let inserted_rows = transaction.execute(
            "INSERT OR IGNORE INTO ArticleTag (article_id, tag_id)
            VALUES (?1, ?2)",
            params![article_tag.article_id.as_str(), article_tag.tag_id.as_str()],
        )?;

        if inserted_rows == 0 {
            transaction.commit()?;
            return Ok(None);
        }

        let event = sync_event_from_decision(
            "attach_article_tag",
            classify_change(SyncChange::AttachArticleTag {
                article_id: article_tag.article_id.as_str().to_owned(),
                tag_id: article_tag.tag_id.as_str().to_owned(),
            }),
            article_tag_payload_value(article_tag),
            context,
        )?;
        insert_sync_event(&transaction, &event)?;

        transaction.commit()?;

        Ok(Some(event))
    }

    pub fn attach_feed_tag(
        &mut self,
        feed_tag: &FeedTag,
        context: SyncEventWriteContext,
    ) -> Result<Option<SyncEvent>, StoreError> {
        let transaction = self.connection.transaction()?;

        let inserted_rows = transaction.execute(
            "INSERT OR IGNORE INTO FeedTag (feed_id, tag_id)
            VALUES (?1, ?2)",
            params![feed_tag.feed_id.as_str(), feed_tag.tag_id.as_str()],
        )?;

        if inserted_rows == 0 {
            transaction.commit()?;
            return Ok(None);
        }

        let event = sync_event_from_decision(
            "attach_feed_tag",
            classify_change(SyncChange::AttachFeedTag {
                feed_id: feed_tag.feed_id.as_str().to_owned(),
                tag_id: feed_tag.tag_id.as_str().to_owned(),
            }),
            feed_tag_payload_value(feed_tag),
            context,
        )?;
        insert_sync_event(&transaction, &event)?;

        transaction.commit()?;

        Ok(Some(event))
    }

    pub fn list_sync_events(&mut self) -> Result<Vec<SyncEvent>, StoreError> {
        let mut statement = self.connection.prepare(
            "SELECT
                id,
                entity_type,
                entity_id,
                change_type,
                payload,
                device_id,
                created_at
            FROM SyncEvent
            ORDER BY created_at ASC, id ASC",
        )?;

        let rows = statement.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, String>(6)?,
            ))
        })?;

        rows.into_iter()
            .map(|row| {
                let (id, entity_type, entity_id, change_type, payload, device_id, created_at) =
                    row?;

                Ok(SyncEvent {
                    id: SyncEventId::try_from(id)?,
                    entity_type,
                    entity_id,
                    change_type,
                    payload: JsonBlob::parse("payload", &payload)?,
                    device_id: DeviceId::try_from(device_id)?,
                    created_at: IsoDateTime::try_from(created_at)?,
                })
            })
            .collect()
    }
}

fn sync_event_from_decision(
    operation: &'static str,
    decision: SyncBoundaryDecision,
    payload_value: Value,
    context: SyncEventWriteContext,
) -> Result<SyncEvent, StoreError> {
    let SyncBoundaryDecision::Event(boundary) = decision else {
        return Err(StoreError::NonEventSyncBoundary { operation });
    };

    let value = select_changed_fields(payload_value, &boundary.payload_fields);
    let changed_fields = boundary.payload_fields;

    Ok(SyncEvent {
        id: context.event_id,
        entity_type: boundary.entity_type.as_str().to_owned(),
        entity_id: boundary.entity_id,
        change_type: boundary.change_type.as_str().to_owned(),
        payload: JsonBlob::from(json!({
            "changedFields": changed_fields,
            "value": value,
        })),
        device_id: context.device_id,
        created_at: context.created_at,
    })
}

fn upsert_user_state(
    transaction: &Transaction<'_>,
    state: &UserState,
) -> Result<(), rusqlite::Error> {
    transaction.execute(
        "INSERT INTO UserState (
            article_id,
            read_state,
            starred,
            liked,
            importance,
            read_later,
            reading_progress,
            last_opened_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        ON CONFLICT(article_id) DO UPDATE SET
            read_state = excluded.read_state,
            starred = excluded.starred,
            liked = excluded.liked,
            importance = excluded.importance,
            read_later = excluded.read_later,
            reading_progress = excluded.reading_progress,
            last_opened_at = excluded.last_opened_at",
        params![
            state.article_id.as_str(),
            state.read_state.as_str(),
            encode_bool_flag(state.starred),
            encode_bool_flag(state.liked),
            state.importance.as_str(),
            encode_bool_flag(state.read_later),
            state.reading_progress,
            state.last_opened_at.as_ref().map(|value| value.as_str()),
        ],
    )?;

    Ok(())
}

fn insert_annotation(
    transaction: &Transaction<'_>,
    annotation: &Annotation,
) -> Result<(), rusqlite::Error> {
    transaction.execute(
        "INSERT INTO Annotation (
            id,
            article_id,
            type,
            selected_text,
            anchor,
            note,
            color,
            created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            annotation.id.as_str(),
            annotation.article_id.as_str(),
            annotation.annotation_type.as_str(),
            annotation.selected_text.as_str(),
            annotation.anchor.to_compact_string(),
            annotation.note.as_deref(),
            annotation.color.as_ref().map(|value| value.as_str()),
            annotation.created_at.as_str(),
        ],
    )?;

    Ok(())
}

fn insert_sync_event(
    transaction: &Transaction<'_>,
    event: &SyncEvent,
) -> Result<(), rusqlite::Error> {
    transaction.execute(
        "INSERT INTO SyncEvent (
            id,
            entity_type,
            entity_id,
            change_type,
            payload,
            device_id,
            created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            event.id.as_str(),
            event.entity_type.as_str(),
            event.entity_id.as_str(),
            event.change_type.as_str(),
            event.payload.to_compact_string(),
            event.device_id.as_str(),
            event.created_at.as_str(),
        ],
    )?;

    Ok(())
}

fn user_state_payload_value(state: &UserState) -> Value {
    json!({
        "read_state": state.read_state.as_str(),
        "starred": state.starred,
        "liked": state.liked,
        "importance": state.importance.as_str(),
        "read_later": state.read_later,
        "reading_progress": state.reading_progress,
        "last_opened_at": state.last_opened_at.as_ref().map(|value| value.as_str()),
    })
}

fn annotation_payload_value(annotation: &Annotation) -> Value {
    json!({
        "type": annotation.annotation_type.as_str(),
        "selected_text": annotation.selected_text.as_str(),
        "anchor": annotation.anchor.as_value().clone(),
        "note": annotation.note.as_deref(),
        "color": annotation.color.as_ref().map(|value| value.as_str()),
        "created_at": annotation.created_at.as_str(),
    })
}

fn feed_folder_payload_value(folder_id: Option<&FolderId>) -> Value {
    json!({
        "folder_id": folder_id.map(|folder_id| folder_id.as_str()),
    })
}

fn article_tag_payload_value(article_tag: &ArticleTag) -> Value {
    json!({
        "article_id": article_tag.article_id.as_str(),
        "tag_id": article_tag.tag_id.as_str(),
    })
}

fn feed_tag_payload_value(feed_tag: &FeedTag) -> Value {
    json!({
        "feed_id": feed_tag.feed_id.as_str(),
        "tag_id": feed_tag.tag_id.as_str(),
    })
}

fn select_changed_fields(payload_value: Value, payload_fields: &[&str]) -> Value {
    let Value::Object(values) = payload_value else {
        return payload_value;
    };

    let mut selected = Map::new();

    for field in payload_fields {
        if let Some(value) = values.get(*field) {
            selected.insert((*field).to_owned(), value.clone());
        }
    }

    Value::Object(selected)
}

fn encode_bool_flag(value: bool) -> i64 {
    if value { 1 } else { 0 }
}

#[cfg(test)]
mod tests {
    use freelyrss_sync_engine::UserStateSyncField;
    use rusqlite::{Connection, params};
    use serde_json::json;
    use tempfile::tempdir;

    use super::{LocalSyncEventStore, SyncEventWriteContext};
    use crate::{
        Annotation, AnnotationId, AnnotationType, ArticleId, DeviceId, FeedId, FolderId, HexColor,
        ImportanceLevel, IsoDateTime, JsonBlob, ReadState, SyncEventId, UserState,
        sqlite::{DatabaseInitializationOptions, initialize_database, prepare_database_connection},
    };

    #[test]
    fn writes_sync_events_for_state_annotation_and_feed_moves() {
        let temp_dir = tempdir().expect("temp dir");
        let database_path = temp_dir.path().join("sync-events.sqlite3");

        initialize_database(&database_path, &DatabaseInitializationOptions::default())
            .expect("initialize database");

        let mut connection = Connection::open(&database_path).expect("open database");
        prepare_database_connection(&connection).expect("prepare connection");
        seed_sync_event_database(&connection);

        let device_id = DeviceId::try_from("device-desktop").expect("device id");

        let mut store = LocalSyncEventStore::new(&mut connection);
        let read_state = UserState {
            article_id: ArticleId::try_from("article-sync").expect("article id"),
            read_state: ReadState::Read,
            starred: false,
            liked: false,
            importance: ImportanceLevel::Normal,
            read_later: false,
            reading_progress: 1.0,
            last_opened_at: Some(IsoDateTime::try_from("2026-04-30T10:00:00Z").expect("datetime")),
        }
        .validate()
        .expect("valid state");
        store
            .update_user_state(
                &read_state,
                vec![
                    UserStateSyncField::ReadState,
                    UserStateSyncField::ReadingProgress,
                    UserStateSyncField::LastOpenedAt,
                ],
                sync_context("sync-event-state", &device_id, "2026-04-30T10:00:00Z"),
            )
            .expect("record read state event");

        let annotation = Annotation {
            id: AnnotationId::try_from("annotation-note").expect("annotation id"),
            article_id: ArticleId::try_from("article-sync").expect("article id"),
            annotation_type: AnnotationType::Note,
            selected_text: "local event log".into(),
            anchor: JsonBlob::from(
                json!({ "paragraphIndex": 0, "startOffset": 2, "endOffset": 17 }),
            ),
            note: Some("Keep sync writes adjacent to domain writes.".into()),
            color: Some(HexColor::try_from("#ffcc00").expect("color")),
            created_at: IsoDateTime::try_from("2026-04-30T10:01:00Z").expect("datetime"),
        };
        store
            .create_annotation(
                &annotation,
                sync_context("sync-event-annotation", &device_id, "2026-04-30T10:01:00Z"),
            )
            .expect("record annotation event");

        let feed_id = FeedId::try_from("feed-sync").expect("feed id");
        let folder_id = FolderId::try_from("folder-reading").expect("folder id");
        store
            .move_feed_to_folder(
                &feed_id,
                Some(&folder_id),
                sync_context("sync-event-feed-folder", &device_id, "2026-04-30T10:02:00Z"),
            )
            .expect("record feed move")
            .expect("feed move should update a row");

        let events = store.list_sync_events().expect("list sync events");

        assert_eq!(events.len(), 3);
        assert_eq!(events[0].entity_type, "user-state");
        assert_eq!(events[0].entity_id, "article-sync");
        assert_eq!(events[0].change_type, "update");
        assert_eq!(
            events[0].payload.as_value(),
            &json!({
                "changedFields": ["read_state", "reading_progress", "last_opened_at"],
                "value": {
                    "read_state": "read",
                    "reading_progress": 1.0,
                    "last_opened_at": "2026-04-30T10:00:00Z"
                }
            })
        );

        assert_eq!(events[1].entity_type, "annotation");
        assert_eq!(events[1].entity_id, "annotation-note");
        assert_eq!(events[1].change_type, "create");
        assert_eq!(
            events[1].payload.as_value(),
            &json!({
                "changedFields": ["type", "selected_text", "anchor", "note", "color", "created_at"],
                "value": {
                    "type": "note",
                    "selected_text": "local event log",
                    "anchor": { "paragraphIndex": 0, "startOffset": 2, "endOffset": 17 },
                    "note": "Keep sync writes adjacent to domain writes.",
                    "color": "#ffcc00",
                    "created_at": "2026-04-30T10:01:00Z"
                }
            })
        );

        assert_eq!(events[2].entity_type, "feed");
        assert_eq!(events[2].entity_id, "feed-sync");
        assert_eq!(events[2].change_type, "update");
        assert_eq!(
            events[2].payload.as_value(),
            &json!({
                "changedFields": ["folder_id"],
                "value": { "folder_id": "folder-reading" }
            })
        );

        let persisted_folder_id: String = connection
            .query_row(
                "SELECT folder_id FROM Feed WHERE id = ?1",
                params!["feed-sync"],
                |row| row.get(0),
            )
            .expect("feed folder id");
        assert_eq!(persisted_folder_id, "folder-reading");
    }

    fn sync_context(
        event_id: &str,
        device_id: &DeviceId,
        created_at: &str,
    ) -> SyncEventWriteContext {
        SyncEventWriteContext::new(
            SyncEventId::try_from(event_id).expect("event id"),
            device_id.clone(),
            IsoDateTime::try_from(created_at).expect("created at"),
        )
    }

    fn seed_sync_event_database(connection: &Connection) {
        connection
            .execute(
                "INSERT INTO Folder (id, name, kind) VALUES (?1, ?2, ?3)",
                params!["folder-reading", "Reading", "regular"],
            )
            .expect("insert folder");
        connection
            .execute(
                "INSERT INTO Feed (id, title, feed_url, format) VALUES (?1, ?2, ?3, ?4)",
                params![
                    "feed-sync",
                    "Sync Source",
                    "https://example.com/feed.xml",
                    "rss"
                ],
            )
            .expect("insert feed");
        connection
            .execute(
                "INSERT INTO Article (id, feed_id, title) VALUES (?1, ?2, ?3)",
                params!["article-sync", "feed-sync", "Sync article"],
            )
            .expect("insert article");
    }
}
