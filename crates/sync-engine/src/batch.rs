use serde_json::Value;

use crate::SyncEngineError;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SyncEventEnvelope {
    pub id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub change_type: String,
    pub payload: Value,
    pub device_id: String,
    pub created_at: String,
}

impl SyncEventEnvelope {
    pub fn new(
        id: impl Into<String>,
        entity_type: impl Into<String>,
        entity_id: impl Into<String>,
        change_type: impl Into<String>,
        payload: Value,
        device_id: impl Into<String>,
        created_at: impl Into<String>,
    ) -> Self {
        Self {
            id: id.into(),
            entity_type: entity_type.into(),
            entity_id: entity_id.into(),
            change_type: change_type.into(),
            payload,
            device_id: device_id.into(),
            created_at: created_at.into(),
        }
    }

    pub fn key(&self) -> SyncEventKey {
        SyncEventKey {
            created_at: self.created_at.clone(),
            event_id: self.id.clone(),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct SyncEventKey {
    pub created_at: String,
    pub event_id: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct SyncCursor {
    pub last_created_at: Option<String>,
    pub last_event_id: Option<String>,
}

impl SyncCursor {
    pub fn start() -> Self {
        Self::default()
    }

    pub fn new(last_created_at: impl Into<String>, last_event_id: impl Into<String>) -> Self {
        Self {
            last_created_at: Some(last_created_at.into()),
            last_event_id: Some(last_event_id.into()),
        }
    }

    pub fn from_event(event: &SyncEventEnvelope) -> Self {
        Self::new(event.created_at.clone(), event.id.clone())
    }

    pub fn is_start(&self) -> bool {
        self.last_created_at.is_none() && self.last_event_id.is_none()
    }

    pub fn event_is_after(&self, event: &SyncEventEnvelope) -> Result<bool, SyncEngineError> {
        if self.is_start() {
            return Ok(true);
        }

        let Some(last_created_at) = self.last_created_at.as_deref() else {
            return Err(SyncEngineError::InvalidCursor);
        };
        let Some(last_event_id) = self.last_event_id.as_deref() else {
            return Err(SyncEngineError::InvalidCursor);
        };

        Ok(event.created_at.as_str() > last_created_at
            || (event.created_at.as_str() == last_created_at && event.id.as_str() > last_event_id))
    }

    pub fn advance_to(&mut self, event: &SyncEventEnvelope) -> Result<(), SyncEngineError> {
        if self.event_is_after(event)? {
            *self = Self::from_event(event);
        }

        Ok(())
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SyncEventBatch {
    pub previous_cursor: SyncCursor,
    pub next_cursor: SyncCursor,
    pub events: Vec<SyncEventEnvelope>,
    pub has_more: bool,
}

pub fn package_event_batch(
    events: &[SyncEventEnvelope],
    cursor: &SyncCursor,
    max_events: usize,
) -> Result<SyncEventBatch, SyncEngineError> {
    if max_events == 0 {
        return Err(SyncEngineError::InvalidBatchSize);
    }

    if !cursor.is_start() && (cursor.last_created_at.is_none() || cursor.last_event_id.is_none()) {
        return Err(SyncEngineError::InvalidCursor);
    }

    let mut available = Vec::new();

    for event in events {
        if cursor.event_is_after(event)? {
            available.push(event.clone());
        }
    }

    available.sort_by_key(SyncEventEnvelope::key);

    let selected = available
        .iter()
        .take(max_events)
        .cloned()
        .collect::<Vec<_>>();
    let next_cursor = selected
        .last()
        .map(SyncCursor::from_event)
        .unwrap_or_else(|| cursor.clone());

    Ok(SyncEventBatch {
        previous_cursor: cursor.clone(),
        next_cursor,
        has_more: selected.len() < available.len(),
        events: selected,
    })
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::{SyncCursor, SyncEventEnvelope, package_event_batch};

    #[test]
    fn packages_events_after_cursor_in_stable_order() {
        let events = vec![
            event("event-3", "2026-05-09T10:02:00Z"),
            event("event-1", "2026-05-09T10:00:00Z"),
            event("event-2", "2026-05-09T10:01:00Z"),
            event("event-4", "2026-05-09T10:03:00Z"),
        ];

        let batch = package_event_batch(
            &events,
            &SyncCursor::new("2026-05-09T10:00:00Z", "event-1"),
            2,
        )
        .expect("package batch");

        assert_eq!(
            batch
                .events
                .iter()
                .map(|event| event.id.as_str())
                .collect::<Vec<_>>(),
            vec!["event-2", "event-3"]
        );
        assert_eq!(
            batch.next_cursor,
            SyncCursor::new("2026-05-09T10:02:00Z", "event-3")
        );
        assert!(batch.has_more);
    }

    #[test]
    fn empty_batch_keeps_cursor_when_no_events_remain() {
        let events = vec![event("event-1", "2026-05-09T10:00:00Z")];
        let cursor = SyncCursor::new("2026-05-09T10:00:00Z", "event-1");

        let batch = package_event_batch(&events, &cursor, 10).expect("package empty batch");

        assert!(batch.events.is_empty());
        assert_eq!(batch.next_cursor, cursor);
        assert!(!batch.has_more);
    }

    fn event(id: &str, created_at: &str) -> SyncEventEnvelope {
        SyncEventEnvelope::new(
            id,
            "user-state",
            "article-1",
            "update",
            json!({ "changedFields": ["read_state"], "value": { "read_state": "read" } }),
            "device-a",
            created_at,
        )
    }
}
