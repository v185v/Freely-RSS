use std::collections::{BTreeMap, BTreeSet};

use serde_json::Value;

use crate::{SyncCursor, SyncEngineError, SyncEventBatch, SyncEventChangeType, SyncEventEnvelope};

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct SyncReplayState {
    pub cursor: SyncCursor,
    pub applied_event_ids: BTreeSet<String>,
    pub feeds: BTreeMap<String, BTreeMap<String, Value>>,
    pub folders: BTreeMap<String, BTreeMap<String, Value>>,
    pub tags: BTreeMap<String, BTreeMap<String, Value>>,
    pub user_states: BTreeMap<String, BTreeMap<String, Value>>,
    pub annotations: BTreeMap<String, BTreeMap<String, Value>>,
    pub rules: BTreeMap<String, BTreeMap<String, Value>>,
    pub smart_folders: BTreeMap<String, BTreeMap<String, Value>>,
    pub feed_tags: BTreeSet<(String, String)>,
    pub article_tags: BTreeSet<(String, String)>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SyncReplayOutcome {
    Applied,
    SkippedDuplicate,
}

pub fn replay_event_batch(
    state: &mut SyncReplayState,
    batch: &SyncEventBatch,
) -> Result<Vec<SyncReplayOutcome>, SyncEngineError> {
    let mut events = batch.events.clone();
    events.sort_by_key(SyncEventEnvelope::key);

    events
        .iter()
        .map(|event| replay_event(state, event))
        .collect()
}

fn replay_event(
    state: &mut SyncReplayState,
    event: &SyncEventEnvelope,
) -> Result<SyncReplayOutcome, SyncEngineError> {
    if state.applied_event_ids.contains(&event.id) {
        return Ok(SyncReplayOutcome::SkippedDuplicate);
    }

    match (event.entity_type.as_str(), event.change_type.as_str()) {
        (entity_type, change_type)
            if is_entity_map_type(entity_type) && is_upsert_change(change_type) =>
        {
            let fields = payload_value_fields(event)?;
            upsert_entity_map(state, entity_type, &event.entity_id, fields)?;
        }
        (entity_type, change_type)
            if is_entity_map_type(entity_type) && is_delete_change(change_type) =>
        {
            delete_entity_map(state, entity_type, &event.entity_id)?;
        }
        ("feed-tag", change_type) if is_attach_change(change_type) => {
            state
                .feed_tags
                .insert(relation_pair(event, "feed_id", "tag_id")?);
        }
        ("feed-tag", change_type) if is_detach_change(change_type) => {
            state
                .feed_tags
                .remove(&relation_pair(event, "feed_id", "tag_id")?);
        }
        ("article-tag", change_type) if is_attach_change(change_type) => {
            state
                .article_tags
                .insert(relation_pair(event, "article_id", "tag_id")?);
        }
        ("article-tag", change_type) if is_detach_change(change_type) => {
            state
                .article_tags
                .remove(&relation_pair(event, "article_id", "tag_id")?);
        }
        _ => {
            return Err(SyncEngineError::UnsupportedEvent {
                event_id: event.id.clone(),
                entity_type: event.entity_type.clone(),
                change_type: event.change_type.clone(),
            });
        }
    }

    state.applied_event_ids.insert(event.id.clone());
    state.cursor.advance_to(event)?;

    Ok(SyncReplayOutcome::Applied)
}

fn payload_value_fields(
    event: &SyncEventEnvelope,
) -> Result<BTreeMap<String, Value>, SyncEngineError> {
    let Some(value) = event.payload.get("value") else {
        return Ok(BTreeMap::new());
    };

    let Value::Object(values) = value else {
        return Err(SyncEngineError::InvalidEventPayload {
            event_id: event.id.clone(),
            reason: "payload.value must be an object when present",
        });
    };

    Ok(values
        .iter()
        .map(|(field, value)| (field.clone(), value.clone()))
        .collect())
}

fn upsert_entity_map(
    state: &mut SyncReplayState,
    entity_type: &str,
    entity_id: &str,
    fields: BTreeMap<String, Value>,
) -> Result<(), SyncEngineError> {
    let entities = entity_collection_mut(state, entity_type)?;
    let entry = entities.entry(entity_id.to_owned()).or_default();

    for (field, value) in fields {
        entry.insert(field, value);
    }

    Ok(())
}

fn delete_entity_map(
    state: &mut SyncReplayState,
    entity_type: &str,
    entity_id: &str,
) -> Result<(), SyncEngineError> {
    entity_collection_mut(state, entity_type)?.remove(entity_id);
    Ok(())
}

fn entity_collection_mut<'state>(
    state: &'state mut SyncReplayState,
    entity_type: &str,
) -> Result<&'state mut BTreeMap<String, BTreeMap<String, Value>>, SyncEngineError> {
    match entity_type {
        "feed" => Ok(&mut state.feeds),
        "folder" => Ok(&mut state.folders),
        "tag" => Ok(&mut state.tags),
        "user-state" => Ok(&mut state.user_states),
        "annotation" => Ok(&mut state.annotations),
        "rule" => Ok(&mut state.rules),
        "smart-folder" => Ok(&mut state.smart_folders),
        _ => Err(SyncEngineError::UnsupportedEvent {
            event_id: "<unknown>".to_owned(),
            entity_type: entity_type.to_owned(),
            change_type: "<unknown>".to_owned(),
        }),
    }
}

fn relation_pair(
    event: &SyncEventEnvelope,
    left_field: &'static str,
    right_field: &'static str,
) -> Result<(String, String), SyncEngineError> {
    let values = payload_value_fields(event)?;
    let left = relation_value(&values, left_field);
    let right = relation_value(&values, right_field);
    let missing_field = if left.is_none() {
        left_field
    } else {
        right_field
    };

    match (left, right) {
        (Some(left), Some(right)) => Ok((left, right)),
        _ => event
            .entity_id
            .split_once(':')
            .map(|(left, right)| (left.to_owned(), right.to_owned()))
            .ok_or_else(|| SyncEngineError::MissingRelationField {
                event_id: event.id.clone(),
                field: missing_field,
            }),
    }
}

fn relation_value(values: &BTreeMap<String, Value>, field: &'static str) -> Option<String> {
    match values.get(field) {
        Some(Value::String(value)) => Some(value.clone()),
        Some(_) => None,
        None => None,
    }
}

fn is_entity_map_type(entity_type: &str) -> bool {
    matches!(
        entity_type,
        "feed" | "folder" | "tag" | "user-state" | "annotation" | "rule" | "smart-folder"
    )
}

fn is_upsert_change(change_type: &str) -> bool {
    matches!(
        change_type,
        value if value == SyncEventChangeType::Create.as_str()
            || value == SyncEventChangeType::Update.as_str()
            || value == SyncEventChangeType::Snapshot.as_str()
    )
}

fn is_delete_change(change_type: &str) -> bool {
    change_type == SyncEventChangeType::Delete.as_str()
}

fn is_attach_change(change_type: &str) -> bool {
    matches!(
        change_type,
        value if value == SyncEventChangeType::Attach.as_str()
            || value == SyncEventChangeType::Create.as_str()
            || value == SyncEventChangeType::Snapshot.as_str()
    )
}

fn is_detach_change(change_type: &str) -> bool {
    matches!(
        change_type,
        value if value == SyncEventChangeType::Detach.as_str()
            || value == SyncEventChangeType::Delete.as_str()
    )
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use crate::{SyncCursor, SyncEventEnvelope, package_event_batch};

    use super::{SyncReplayOutcome, SyncReplayState, replay_event_batch};

    #[test]
    fn replays_event_batches_into_empty_replica_state() {
        let events = vec![
            event(
                "event-folder-create",
                "folder",
                "folder-reading",
                "create",
                json!({
                    "changedFields": ["name", "kind"],
                    "value": { "name": "Reading", "kind": "regular" }
                }),
                "2026-05-09T10:00:00Z",
            ),
            event(
                "event-feed-create",
                "feed",
                "feed-rust",
                "create",
                json!({
                    "changedFields": ["title", "feed_url", "format"],
                    "value": {
                        "title": "Rust Blog",
                        "feed_url": "https://blog.rust-lang.org/feed.xml",
                        "format": "rss"
                    }
                }),
                "2026-05-09T10:01:00Z",
            ),
            event(
                "event-feed-move",
                "feed",
                "feed-rust",
                "update",
                json!({
                    "changedFields": ["folder_id"],
                    "value": { "folder_id": "folder-reading" }
                }),
                "2026-05-09T10:02:00Z",
            ),
            event(
                "event-state",
                "user-state",
                "article-rust",
                "update",
                json!({
                    "changedFields": ["read_state", "reading_progress"],
                    "value": { "read_state": "read", "reading_progress": 1.0 }
                }),
                "2026-05-09T10:03:00Z",
            ),
            event(
                "event-note",
                "annotation",
                "annotation-rust",
                "create",
                json!({
                    "changedFields": ["type", "selected_text", "note", "created_at"],
                    "value": {
                        "type": "note",
                        "selected_text": "Sync replay",
                        "note": "Replayed from event batch",
                        "created_at": "2026-05-09T10:04:00Z"
                    }
                }),
                "2026-05-09T10:04:00Z",
            ),
            event(
                "event-article-tag",
                "article-tag",
                "article-rust:tag-sync",
                "attach",
                json!({
                    "changedFields": ["article_id", "tag_id"],
                    "value": { "article_id": "article-rust", "tag_id": "tag-sync" }
                }),
                "2026-05-09T10:05:00Z",
            ),
        ];

        let first_batch =
            package_event_batch(&events, &SyncCursor::start(), 3).expect("first batch");
        let second_batch =
            package_event_batch(&events, &first_batch.next_cursor, 10).expect("second batch");
        let mut state = SyncReplayState::default();

        assert_eq!(
            replay_event_batch(&mut state, &first_batch).expect("replay first batch"),
            vec![
                SyncReplayOutcome::Applied,
                SyncReplayOutcome::Applied,
                SyncReplayOutcome::Applied
            ]
        );
        replay_event_batch(&mut state, &second_batch).expect("replay second batch");

        assert_eq!(
            state
                .feeds
                .get("feed-rust")
                .and_then(|feed| feed.get("folder_id")),
            Some(&json!("folder-reading"))
        );
        assert_eq!(
            state
                .user_states
                .get("article-rust")
                .and_then(|user_state| user_state.get("read_state")),
            Some(&json!("read"))
        );
        assert_eq!(
            state
                .annotations
                .get("annotation-rust")
                .and_then(|annotation| annotation.get("note")),
            Some(&json!("Replayed from event batch"))
        );
        assert!(
            state
                .article_tags
                .contains(&("article-rust".to_owned(), "tag-sync".to_owned()))
        );
        assert_eq!(state.cursor, second_batch.next_cursor);
    }

    #[test]
    fn replay_is_idempotent_by_event_id() {
        let events = vec![event(
            "event-state",
            "user-state",
            "article-rust",
            "update",
            json!({
                "changedFields": ["read_state"],
                "value": { "read_state": "read" }
            }),
            "2026-05-09T10:00:00Z",
        )];
        let batch = package_event_batch(&events, &SyncCursor::start(), 10).expect("batch");
        let mut state = SyncReplayState::default();

        replay_event_batch(&mut state, &batch).expect("first replay");

        assert_eq!(
            replay_event_batch(&mut state, &batch).expect("second replay"),
            vec![SyncReplayOutcome::SkippedDuplicate]
        );
    }

    fn event(
        id: &str,
        entity_type: &str,
        entity_id: &str,
        change_type: &str,
        payload: serde_json::Value,
        created_at: &str,
    ) -> SyncEventEnvelope {
        SyncEventEnvelope::new(
            id,
            entity_type,
            entity_id,
            change_type,
            payload,
            "device-a",
            created_at,
        )
    }
}
