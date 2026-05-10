use std::collections::{BTreeMap, BTreeSet};

use serde_json::Value;

use crate::{SyncCursor, SyncEngineError, SyncEventBatch, SyncEventEnvelope, SyncEventKey};

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct MergedEntity {
    pub fields: BTreeMap<String, Value>,
    pub field_versions: BTreeMap<String, SyncEventKey>,
}

impl MergedEntity {
    fn latest_version(&self) -> Option<&SyncEventKey> {
        self.field_versions.values().max()
    }
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct SyncMergeState {
    pub cursor: SyncCursor,
    pub applied_event_ids: BTreeSet<String>,
    pub feeds: BTreeMap<String, MergedEntity>,
    pub folders: BTreeMap<String, MergedEntity>,
    pub tags: BTreeMap<String, MergedEntity>,
    pub user_states: BTreeMap<String, MergedEntity>,
    pub annotations: BTreeMap<String, MergedEntity>,
    pub rules: BTreeMap<String, MergedEntity>,
    pub smart_folders: BTreeMap<String, MergedEntity>,
    pub feed_tags: BTreeSet<(String, String)>,
    pub article_tags: BTreeSet<(String, String)>,
    pub feed_tag_versions: BTreeMap<(String, String), SyncEventKey>,
    pub article_tag_versions: BTreeMap<(String, String), SyncEventKey>,
    entity_tombstones: BTreeMap<EntityIdentity, SyncEventKey>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SyncMergeOutcome {
    Applied,
    SkippedDuplicate,
}

pub fn merge_event_batch(
    state: &mut SyncMergeState,
    batch: &SyncEventBatch,
) -> Result<Vec<SyncMergeOutcome>, SyncEngineError> {
    let mut events = batch.events.clone();
    events.sort_by_key(SyncEventEnvelope::key);

    events
        .iter()
        .map(|event| merge_event(state, event))
        .collect()
}

fn merge_event(
    state: &mut SyncMergeState,
    event: &SyncEventEnvelope,
) -> Result<SyncMergeOutcome, SyncEngineError> {
    if state.applied_event_ids.contains(&event.id) {
        return Ok(SyncMergeOutcome::SkippedDuplicate);
    }

    match (event.entity_type.as_str(), event.change_type.as_str()) {
        (entity_type, change_type)
            if is_entity_map_type(entity_type) && is_upsert_change(change_type) =>
        {
            let fields = payload_value_fields(event)?;
            merge_entity_fields(state, event, entity_type, fields)?;
        }
        (entity_type, change_type)
            if is_entity_map_type(entity_type) && is_delete_change(change_type) =>
        {
            merge_entity_delete(state, event, entity_type)?;
        }
        ("feed-tag", change_type) if is_attach_change(change_type) => {
            merge_relation(state, event, "feed_id", "tag_id", true)?;
        }
        ("feed-tag", change_type) if is_detach_change(change_type) => {
            merge_relation(state, event, "feed_id", "tag_id", false)?;
        }
        ("article-tag", change_type) if is_attach_change(change_type) => {
            merge_relation(state, event, "article_id", "tag_id", true)?;
        }
        ("article-tag", change_type) if is_detach_change(change_type) => {
            merge_relation(state, event, "article_id", "tag_id", false)?;
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

    Ok(SyncMergeOutcome::Applied)
}

fn merge_entity_fields(
    state: &mut SyncMergeState,
    event: &SyncEventEnvelope,
    entity_type: &str,
    fields: BTreeMap<String, Value>,
) -> Result<(), SyncEngineError> {
    let entity_key = EntityIdentity::new(entity_type, &event.entity_id);
    let event_key = event.key();

    if state
        .entity_tombstones
        .get(&entity_key)
        .is_some_and(|tombstone_key| event_key <= *tombstone_key)
    {
        return Ok(());
    }

    state.entity_tombstones.remove(&entity_key);

    let entity = entity_collection_mut(state, entity_type)?
        .entry(event.entity_id.clone())
        .or_default();

    for (field, value) in fields {
        if entity_type == "user-state" && field == "reading_progress" {
            merge_reading_progress(entity, event, value)?;
        } else {
            merge_last_writer_wins_field(entity, &field, value, event_key.clone());
        }
    }

    Ok(())
}

fn merge_last_writer_wins_field(
    entity: &mut MergedEntity,
    field: &str,
    value: Value,
    event_key: SyncEventKey,
) {
    if entity
        .field_versions
        .get(field)
        .is_none_or(|previous_key| event_key > *previous_key)
    {
        entity.fields.insert(field.to_owned(), value);
        entity.field_versions.insert(field.to_owned(), event_key);
    }
}

fn merge_reading_progress(
    entity: &mut MergedEntity,
    event: &SyncEventEnvelope,
    value: Value,
) -> Result<(), SyncEngineError> {
    let Some(next_progress) = value.as_f64() else {
        return Err(SyncEngineError::InvalidEventPayload {
            event_id: event.id.clone(),
            reason: "user-state reading_progress must be a number",
        });
    };

    if !(0.0..=1.0).contains(&next_progress) || !next_progress.is_finite() {
        return Err(SyncEngineError::InvalidEventPayload {
            event_id: event.id.clone(),
            reason: "user-state reading_progress must be between 0 and 1",
        });
    }

    let current_progress = entity
        .fields
        .get("reading_progress")
        .and_then(Value::as_f64);

    if current_progress.is_none_or(|current| next_progress > current) {
        entity
            .fields
            .insert("reading_progress".to_owned(), value.clone());
        entity
            .field_versions
            .insert("reading_progress".to_owned(), event.key());
    } else if current_progress == Some(next_progress) {
        let event_key = event.key();
        entity
            .field_versions
            .entry("reading_progress".to_owned())
            .and_modify(|previous_key| {
                if event_key > *previous_key {
                    *previous_key = event_key.clone();
                }
            })
            .or_insert(event_key);
    }

    Ok(())
}

fn merge_entity_delete(
    state: &mut SyncMergeState,
    event: &SyncEventEnvelope,
    entity_type: &str,
) -> Result<(), SyncEngineError> {
    let event_key = event.key();
    let entity_key = EntityIdentity::new(entity_type, &event.entity_id);
    let should_delete = {
        let entities = entity_collection_mut(state, entity_type)?;
        entities
            .get(&event.entity_id)
            .and_then(MergedEntity::latest_version)
            .is_none_or(|latest_key| event_key > *latest_key)
    };

    if should_delete
        && state
            .entity_tombstones
            .get(&entity_key)
            .is_none_or(|tombstone_key| event_key > *tombstone_key)
    {
        entity_collection_mut(state, entity_type)?.remove(&event.entity_id);
        state.entity_tombstones.insert(entity_key, event_key);
    }

    Ok(())
}

fn merge_relation(
    state: &mut SyncMergeState,
    event: &SyncEventEnvelope,
    left_field: &'static str,
    right_field: &'static str,
    attached: bool,
) -> Result<(), SyncEngineError> {
    let pair = relation_pair(event, left_field, right_field)?;
    let event_key = event.key();

    let (entries, versions) = match event.entity_type.as_str() {
        "feed-tag" => (&mut state.feed_tags, &mut state.feed_tag_versions),
        "article-tag" => (&mut state.article_tags, &mut state.article_tag_versions),
        _ => {
            return Err(SyncEngineError::UnsupportedEvent {
                event_id: event.id.clone(),
                entity_type: event.entity_type.clone(),
                change_type: event.change_type.clone(),
            });
        }
    };

    if versions
        .get(&pair)
        .is_none_or(|previous_key| event_key > *previous_key)
    {
        versions.insert(pair.clone(), event_key);
        if attached {
            entries.insert(pair);
        } else {
            entries.remove(&pair);
        }
    }

    Ok(())
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

fn entity_collection_mut<'state>(
    state: &'state mut SyncMergeState,
    entity_type: &str,
) -> Result<&'state mut BTreeMap<String, MergedEntity>, SyncEngineError> {
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
    matches!(change_type, "create" | "update" | "snapshot")
}

fn is_delete_change(change_type: &str) -> bool {
    change_type == "delete"
}

fn is_attach_change(change_type: &str) -> bool {
    matches!(change_type, "attach" | "create" | "snapshot")
}

fn is_detach_change(change_type: &str) -> bool {
    matches!(change_type, "detach" | "delete")
}

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
struct EntityIdentity {
    entity_type: String,
    entity_id: String,
}

impl EntityIdentity {
    fn new(entity_type: &str, entity_id: &str) -> Self {
        Self {
            entity_type: entity_type.to_owned(),
            entity_id: entity_id.to_owned(),
        }
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use crate::{SyncCursor, SyncEventEnvelope, package_event_batch};

    use super::{SyncMergeOutcome, SyncMergeState, merge_event_batch};

    #[test]
    fn merges_user_state_with_field_clocks_and_max_reading_progress() {
        let events = vec![
            event(
                "event-state-read",
                "user-state",
                "article-rust",
                "update",
                json!({
                    "changedFields": ["read_state", "reading_progress"],
                    "value": { "read_state": "read", "reading_progress": 0.8 }
                }),
                "device-a",
                "2026-05-10T10:00:00Z",
            ),
            event(
                "event-state-star",
                "user-state",
                "article-rust",
                "update",
                json!({
                    "changedFields": ["starred", "reading_progress"],
                    "value": { "starred": true, "reading_progress": 0.3 }
                }),
                "device-b",
                "2026-05-10T10:01:00Z",
            ),
        ];
        let batch = package_event_batch(&events, &SyncCursor::start(), 10).expect("batch");
        let mut state = SyncMergeState::default();

        merge_event_batch(&mut state, &batch).expect("merge events");

        let user_state = state
            .user_states
            .get("article-rust")
            .expect("merged user state");
        assert_eq!(user_state.fields.get("read_state"), Some(&json!("read")));
        assert_eq!(user_state.fields.get("starred"), Some(&json!(true)));
        assert_eq!(user_state.fields.get("reading_progress"), Some(&json!(0.8)));
    }

    #[test]
    fn ignores_stale_field_updates_that_arrive_late() {
        let newer = package_event_batch(
            &[event(
                "event-newer-read-state",
                "user-state",
                "article-rust",
                "update",
                json!({
                    "changedFields": ["read_state"],
                    "value": { "read_state": "read" }
                }),
                "device-b",
                "2026-05-10T10:05:00Z",
            )],
            &SyncCursor::start(),
            10,
        )
        .expect("newer batch");
        let older = package_event_batch(
            &[event(
                "event-older-read-state",
                "user-state",
                "article-rust",
                "update",
                json!({
                    "changedFields": ["read_state"],
                    "value": { "read_state": "unread" }
                }),
                "device-a",
                "2026-05-10T10:00:00Z",
            )],
            &SyncCursor::start(),
            10,
        )
        .expect("older batch");
        let mut state = SyncMergeState::default();

        merge_event_batch(&mut state, &newer).expect("merge newer");
        merge_event_batch(&mut state, &older).expect("merge older");

        assert_eq!(
            state
                .user_states
                .get("article-rust")
                .and_then(|user_state| user_state.fields.get("read_state")),
            Some(&json!("read"))
        );
    }

    #[test]
    fn keeps_concurrent_annotations_append_only() {
        let events = vec![
            event(
                "event-note-a",
                "annotation",
                "annotation-a",
                "create",
                json!({
                    "changedFields": ["type", "note"],
                    "value": {
                        "type": "note",
                        "note": "Device A note"
                    }
                }),
                "device-a",
                "2026-05-10T10:00:00Z",
            ),
            event(
                "event-note-b",
                "annotation",
                "annotation-b",
                "create",
                json!({
                    "changedFields": ["type", "note"],
                    "value": {
                        "type": "highlight",
                        "note": "Device B highlight"
                    }
                }),
                "device-b",
                "2026-05-10T10:00:00Z",
            ),
        ];
        let batch = package_event_batch(&events, &SyncCursor::start(), 10).expect("batch");
        let mut state = SyncMergeState::default();

        merge_event_batch(&mut state, &batch).expect("merge annotations");

        assert!(state.annotations.contains_key("annotation-a"));
        assert!(state.annotations.contains_key("annotation-b"));
    }

    #[test]
    fn applies_tag_relationships_as_explicit_set_operations() {
        let attach = package_event_batch(
            &[event(
                "event-attach",
                "article-tag",
                "article-rust:tag-sync",
                "attach",
                json!({
                    "changedFields": ["article_id", "tag_id"],
                    "value": { "article_id": "article-rust", "tag_id": "tag-sync" }
                }),
                "device-a",
                "2026-05-10T10:00:00Z",
            )],
            &SyncCursor::start(),
            10,
        )
        .expect("attach batch");
        let detach = package_event_batch(
            &[event(
                "event-detach",
                "article-tag",
                "article-rust:tag-sync",
                "detach",
                json!({
                    "changedFields": ["article_id", "tag_id"],
                    "value": { "article_id": "article-rust", "tag_id": "tag-sync" }
                }),
                "device-b",
                "2026-05-10T10:01:00Z",
            )],
            &SyncCursor::start(),
            10,
        )
        .expect("detach batch");
        let mut state = SyncMergeState::default();

        merge_event_batch(&mut state, &detach).expect("merge newer detach");
        merge_event_batch(&mut state, &attach).expect("merge older attach");

        assert!(
            !state
                .article_tags
                .contains(&("article-rust".to_owned(), "tag-sync".to_owned()))
        );
    }

    #[test]
    fn treats_subscription_ordering_as_field_level_feed_events() {
        let events = vec![
            event(
                "event-feed-name",
                "feed",
                "feed-rust",
                "update",
                json!({
                    "changedFields": ["custom_name", "sort_order"],
                    "value": { "custom_name": "Rust", "sort_order": 10 }
                }),
                "device-a",
                "2026-05-10T10:00:00Z",
            ),
            event(
                "event-feed-order",
                "feed",
                "feed-rust",
                "update",
                json!({
                    "changedFields": ["folder_id", "sort_order"],
                    "value": { "folder_id": "folder-tech", "sort_order": 20 }
                }),
                "device-b",
                "2026-05-10T10:02:00Z",
            ),
        ];
        let batch = package_event_batch(&events, &SyncCursor::start(), 10).expect("batch");
        let mut state = SyncMergeState::default();

        merge_event_batch(&mut state, &batch).expect("merge feed order");

        let feed = state.feeds.get("feed-rust").expect("merged feed");
        assert_eq!(feed.fields.get("custom_name"), Some(&json!("Rust")));
        assert_eq!(feed.fields.get("folder_id"), Some(&json!("folder-tech")));
        assert_eq!(feed.fields.get("sort_order"), Some(&json!(20)));
    }

    #[test]
    fn merge_is_idempotent_by_event_id() {
        let batch = package_event_batch(
            &[event(
                "event-state",
                "user-state",
                "article-rust",
                "update",
                json!({
                    "changedFields": ["starred"],
                    "value": { "starred": true }
                }),
                "device-a",
                "2026-05-10T10:00:00Z",
            )],
            &SyncCursor::start(),
            10,
        )
        .expect("batch");
        let mut state = SyncMergeState::default();

        merge_event_batch(&mut state, &batch).expect("first merge");

        assert_eq!(
            merge_event_batch(&mut state, &batch).expect("second merge"),
            vec![SyncMergeOutcome::SkippedDuplicate]
        );
    }

    fn event(
        id: &str,
        entity_type: &str,
        entity_id: &str,
        change_type: &str,
        payload: serde_json::Value,
        device_id: &str,
        created_at: &str,
    ) -> SyncEventEnvelope {
        SyncEventEnvelope::new(
            id,
            entity_type,
            entity_id,
            change_type,
            payload,
            device_id,
            created_at,
        )
    }
}
