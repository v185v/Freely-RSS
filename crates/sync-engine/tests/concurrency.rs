use std::collections::{BTreeMap, BTreeSet};

use freelyrss_sync_engine::{
    MergedEntity, SyncCursor, SyncEventBatch, SyncEventEnvelope, SyncMergeOutcome, SyncMergeState,
    SyncReplayOutcome, SyncReplayState, merge_event_batch, package_event_batch, replay_event_batch,
};
use serde_json::{Value, json};

const DEVICE_A_EVENTS: &[&str] = &[
    "event-alpha-read-a",
    "event-beta-later-a",
    "event-gamma-read-a",
    "event-tag-alpha-attach-a",
    "event-tag-beta-attach-a",
    "event-note-alpha-a",
];

const DEVICE_B_EVENTS: &[&str] = &[
    "event-alpha-star-b",
    "event-alpha-unread-b",
    "event-beta-liked-b",
    "event-gamma-unstar-b",
    "event-tag-alpha-detach-b",
    "event-tag-gamma-detach-b",
    "event-note-alpha-b",
];

const DEVICE_C_EVENTS: &[&str] = &[
    "event-alpha-progress-c",
    "event-beta-progress-c",
    "event-gamma-star-c",
    "event-tag-gamma-attach-c",
    "event-note-beta-c",
];

#[derive(Debug, PartialEq, Eq)]
struct ArticleSyncProjection {
    user_states: BTreeMap<String, BTreeMap<String, Value>>,
    annotations: BTreeMap<String, BTreeMap<String, Value>>,
    article_tags: BTreeSet<(String, String)>,
}

#[test]
fn concurrent_article_batches_converge_across_merge_and_replay_runs() {
    let events = concurrent_article_events();
    let expected_projection = expected_article_projection();
    let expected_cursor = events
        .iter()
        .max_by_key(|event| event.key())
        .map(SyncCursor::from_event)
        .expect("scenario has events");

    for run in 0..8 {
        let mut merge_state = SyncMergeState::default();

        for batch in merge_delivery_plan(&events, run) {
            merge_event_batch(&mut merge_state, &batch).expect("merge delivery batch");
            let duplicate_outcomes =
                merge_event_batch(&mut merge_state, &batch).expect("merge duplicate batch");

            assert!(
                duplicate_outcomes
                    .iter()
                    .all(|outcome| *outcome == SyncMergeOutcome::SkippedDuplicate),
                "merge run {run} must skip duplicate event delivery"
            );
        }

        let mut replay_state = SyncReplayState::default();

        for batch in cursor_ordered_batches(&events, replay_page_size(run)) {
            replay_event_batch(&mut replay_state, &batch).expect("replay cursor batch");
            let duplicate_outcomes =
                replay_event_batch(&mut replay_state, &batch).expect("replay duplicate batch");

            assert!(
                duplicate_outcomes
                    .iter()
                    .all(|outcome| *outcome == SyncReplayOutcome::SkippedDuplicate),
                "replay run {run} must skip duplicate event delivery"
            );
        }

        assert_eq!(
            project_merge_state(&merge_state),
            expected_projection,
            "merge run {run} drifted from the expected article projection"
        );
        assert_eq!(
            project_replay_state(&replay_state),
            expected_projection,
            "replay run {run} drifted from the expected article projection"
        );
        assert_eq!(
            project_merge_state(&merge_state),
            project_replay_state(&replay_state),
            "merge and replay projections drifted during run {run}"
        );
        assert_eq!(
            merge_state.cursor, expected_cursor,
            "merge run {run} cursor did not converge to the final event key"
        );
        assert_eq!(
            replay_state.cursor, expected_cursor,
            "replay run {run} cursor did not converge to the final event key"
        );
    }
}

fn concurrent_article_events() -> Vec<SyncEventEnvelope> {
    vec![
        event(
            "event-alpha-read-a",
            "user-state",
            "article-alpha",
            "update",
            json!({
                "changedFields": ["read_state", "reading_progress"],
                "value": { "read_state": "read", "reading_progress": 0.25 }
            }),
            "device-a",
            "2026-05-21T10:00:00Z",
        ),
        event(
            "event-alpha-star-b",
            "user-state",
            "article-alpha",
            "update",
            json!({
                "changedFields": ["starred", "reading_progress"],
                "value": { "starred": true, "reading_progress": 0.45 }
            }),
            "device-b",
            "2026-05-21T10:00:00Z",
        ),
        event(
            "event-beta-later-a",
            "user-state",
            "article-beta",
            "update",
            json!({
                "changedFields": ["read_later", "reading_progress"],
                "value": { "read_later": true, "reading_progress": 0.10 }
            }),
            "device-a",
            "2026-05-21T10:00:30Z",
        ),
        event(
            "event-beta-liked-b",
            "user-state",
            "article-beta",
            "update",
            json!({
                "changedFields": ["liked", "importance"],
                "value": { "liked": true, "importance": 2 }
            }),
            "device-b",
            "2026-05-21T10:00:30Z",
        ),
        event(
            "event-gamma-read-a",
            "user-state",
            "article-gamma",
            "update",
            json!({
                "changedFields": ["read_state", "reading_progress"],
                "value": { "read_state": "read", "reading_progress": 1.0 }
            }),
            "device-a",
            "2026-05-21T10:01:00Z",
        ),
        event(
            "event-gamma-star-c",
            "user-state",
            "article-gamma",
            "update",
            json!({
                "changedFields": ["starred", "read_later"],
                "value": { "starred": true, "read_later": true }
            }),
            "device-c",
            "2026-05-21T10:01:00Z",
        ),
        event(
            "event-tag-alpha-attach-a",
            "article-tag",
            "article-alpha:tag-sync",
            "attach",
            json!({
                "changedFields": ["article_id", "tag_id"],
                "value": { "article_id": "article-alpha", "tag_id": "tag-sync" }
            }),
            "device-a",
            "2026-05-21T10:01:10Z",
        ),
        event(
            "event-tag-beta-attach-a",
            "article-tag",
            "article-beta:tag-saved",
            "attach",
            json!({
                "changedFields": ["article_id", "tag_id"],
                "value": { "article_id": "article-beta", "tag_id": "tag-saved" }
            }),
            "device-a",
            "2026-05-21T10:01:20Z",
        ),
        event(
            "event-tag-gamma-attach-c",
            "article-tag",
            "article-gamma:tag-sync",
            "attach",
            json!({
                "changedFields": ["article_id", "tag_id"],
                "value": { "article_id": "article-gamma", "tag_id": "tag-sync" }
            }),
            "device-c",
            "2026-05-21T10:01:30Z",
        ),
        event(
            "event-tag-gamma-detach-b",
            "article-tag",
            "article-gamma:tag-sync",
            "detach",
            json!({
                "changedFields": ["article_id", "tag_id"],
                "value": { "article_id": "article-gamma", "tag_id": "tag-sync" }
            }),
            "device-b",
            "2026-05-21T10:01:30Z",
        ),
        event(
            "event-alpha-progress-c",
            "user-state",
            "article-alpha",
            "update",
            json!({
                "changedFields": ["reading_progress", "last_opened_at"],
                "value": {
                    "reading_progress": 0.95,
                    "last_opened_at": "2026-05-21T10:02:00Z"
                }
            }),
            "device-c",
            "2026-05-21T10:02:00Z",
        ),
        event(
            "event-note-alpha-a",
            "annotation",
            "annotation-alpha-a",
            "create",
            json!({
                "changedFields": ["type", "selected_text", "anchor", "note", "color", "created_at"],
                "value": {
                    "type": "note",
                    "selected_text": "shared alpha",
                    "anchor": "article-alpha:p1:0-12",
                    "note": "Device A alpha note",
                    "color": "yellow",
                    "created_at": "2026-05-21T10:02:10Z"
                }
            }),
            "device-a",
            "2026-05-21T10:02:10Z",
        ),
        event(
            "event-note-alpha-b",
            "annotation",
            "annotation-alpha-b",
            "create",
            json!({
                "changedFields": ["type", "selected_text", "anchor", "note", "color", "created_at"],
                "value": {
                    "type": "highlight",
                    "selected_text": "alpha quote",
                    "anchor": "article-alpha:p2:4-15",
                    "note": "Device B alpha highlight",
                    "color": "blue",
                    "created_at": "2026-05-21T10:02:10Z"
                }
            }),
            "device-b",
            "2026-05-21T10:02:10Z",
        ),
        event(
            "event-note-beta-c",
            "annotation",
            "annotation-beta-c",
            "create",
            json!({
                "changedFields": ["type", "selected_text", "anchor", "note", "color", "created_at"],
                "value": {
                    "type": "note",
                    "selected_text": "beta quote",
                    "anchor": "article-beta:p1:2-12",
                    "note": "Device C beta note",
                    "color": "green",
                    "created_at": "2026-05-21T10:03:00Z"
                }
            }),
            "device-c",
            "2026-05-21T10:03:00Z",
        ),
        event(
            "event-alpha-unread-b",
            "user-state",
            "article-alpha",
            "update",
            json!({
                "changedFields": ["read_state", "last_opened_at"],
                "value": {
                    "read_state": "unread",
                    "last_opened_at": "2026-05-21T10:03:20Z"
                }
            }),
            "device-b",
            "2026-05-21T10:03:20Z",
        ),
        event(
            "event-beta-progress-c",
            "user-state",
            "article-beta",
            "update",
            json!({
                "changedFields": ["liked", "reading_progress"],
                "value": { "liked": false, "reading_progress": 0.80 }
            }),
            "device-c",
            "2026-05-21T10:04:00Z",
        ),
        event(
            "event-gamma-unstar-b",
            "user-state",
            "article-gamma",
            "update",
            json!({
                "changedFields": ["starred"],
                "value": { "starred": false }
            }),
            "device-b",
            "2026-05-21T10:05:00Z",
        ),
        event(
            "event-tag-alpha-detach-b",
            "article-tag",
            "article-alpha:tag-sync",
            "detach",
            json!({
                "changedFields": ["article_id", "tag_id"],
                "value": { "article_id": "article-alpha", "tag_id": "tag-sync" }
            }),
            "device-b",
            "2026-05-21T10:05:30Z",
        ),
    ]
}

fn merge_delivery_plan(events: &[SyncEventEnvelope], run: usize) -> Vec<SyncEventBatch> {
    let delivery_order: Vec<&[&str]> = match run % 4 {
        0 => vec![DEVICE_A_EVENTS, DEVICE_B_EVENTS, DEVICE_C_EVENTS],
        1 => vec![DEVICE_C_EVENTS, DEVICE_A_EVENTS, DEVICE_B_EVENTS],
        2 => vec![DEVICE_B_EVENTS, DEVICE_C_EVENTS, DEVICE_A_EVENTS],
        _ => vec![DEVICE_C_EVENTS, DEVICE_B_EVENTS, DEVICE_A_EVENTS],
    };

    delivery_order
        .into_iter()
        .map(|event_ids| batch_from_event_ids(events, event_ids))
        .collect()
}

fn cursor_ordered_batches(events: &[SyncEventEnvelope], page_size: usize) -> Vec<SyncEventBatch> {
    let mut cursor = SyncCursor::start();
    let mut batches = Vec::new();

    loop {
        let batch = package_event_batch(events, &cursor, page_size).expect("cursor batch");
        cursor = batch.next_cursor.clone();
        let has_more = batch.has_more;
        batches.push(batch);

        if !has_more {
            break;
        }
    }

    batches
}

fn replay_page_size(run: usize) -> usize {
    match run % 4 {
        0 => 2,
        1 => 3,
        2 => 5,
        _ => 19,
    }
}

fn batch_from_event_ids(events: &[SyncEventEnvelope], event_ids: &[&str]) -> SyncEventBatch {
    let selected_events = event_ids
        .iter()
        .map(|event_id| {
            events
                .iter()
                .find(|event| event.id == *event_id)
                .unwrap_or_else(|| panic!("missing event fixture {event_id}"))
                .clone()
        })
        .collect::<Vec<_>>();
    let next_cursor = selected_events
        .iter()
        .max_by_key(|event| event.key())
        .map(SyncCursor::from_event)
        .unwrap_or_else(SyncCursor::start);

    SyncEventBatch {
        previous_cursor: SyncCursor::start(),
        next_cursor,
        events: selected_events,
        has_more: false,
    }
}

fn project_merge_state(state: &SyncMergeState) -> ArticleSyncProjection {
    ArticleSyncProjection {
        user_states: project_merged_entities(&state.user_states),
        annotations: project_merged_entities(&state.annotations),
        article_tags: state.article_tags.clone(),
    }
}

fn project_replay_state(state: &SyncReplayState) -> ArticleSyncProjection {
    ArticleSyncProjection {
        user_states: state.user_states.clone(),
        annotations: state.annotations.clone(),
        article_tags: state.article_tags.clone(),
    }
}

fn project_merged_entities(
    entities: &BTreeMap<String, MergedEntity>,
) -> BTreeMap<String, BTreeMap<String, Value>> {
    entities
        .iter()
        .map(|(entity_id, entity)| (entity_id.clone(), entity.fields.clone()))
        .collect()
}

fn expected_article_projection() -> ArticleSyncProjection {
    ArticleSyncProjection {
        user_states: BTreeMap::from([
            (
                "article-alpha".to_owned(),
                fields(vec![
                    ("last_opened_at", json!("2026-05-21T10:03:20Z")),
                    ("read_state", json!("unread")),
                    ("reading_progress", json!(0.95)),
                    ("starred", json!(true)),
                ]),
            ),
            (
                "article-beta".to_owned(),
                fields(vec![
                    ("importance", json!(2)),
                    ("liked", json!(false)),
                    ("read_later", json!(true)),
                    ("reading_progress", json!(0.80)),
                ]),
            ),
            (
                "article-gamma".to_owned(),
                fields(vec![
                    ("read_later", json!(true)),
                    ("read_state", json!("read")),
                    ("reading_progress", json!(1.0)),
                    ("starred", json!(false)),
                ]),
            ),
        ]),
        annotations: BTreeMap::from([
            (
                "annotation-alpha-a".to_owned(),
                fields(vec![
                    ("anchor", json!("article-alpha:p1:0-12")),
                    ("color", json!("yellow")),
                    ("created_at", json!("2026-05-21T10:02:10Z")),
                    ("note", json!("Device A alpha note")),
                    ("selected_text", json!("shared alpha")),
                    ("type", json!("note")),
                ]),
            ),
            (
                "annotation-alpha-b".to_owned(),
                fields(vec![
                    ("anchor", json!("article-alpha:p2:4-15")),
                    ("color", json!("blue")),
                    ("created_at", json!("2026-05-21T10:02:10Z")),
                    ("note", json!("Device B alpha highlight")),
                    ("selected_text", json!("alpha quote")),
                    ("type", json!("highlight")),
                ]),
            ),
            (
                "annotation-beta-c".to_owned(),
                fields(vec![
                    ("anchor", json!("article-beta:p1:2-12")),
                    ("color", json!("green")),
                    ("created_at", json!("2026-05-21T10:03:00Z")),
                    ("note", json!("Device C beta note")),
                    ("selected_text", json!("beta quote")),
                    ("type", json!("note")),
                ]),
            ),
        ]),
        article_tags: BTreeSet::from([("article-beta".to_owned(), "tag-saved".to_owned())]),
    }
}

fn fields(entries: Vec<(&str, Value)>) -> BTreeMap<String, Value> {
    entries
        .into_iter()
        .map(|(field, value)| (field.to_owned(), value))
        .collect()
}

fn event(
    id: &str,
    entity_type: &str,
    entity_id: &str,
    change_type: &str,
    payload: Value,
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
