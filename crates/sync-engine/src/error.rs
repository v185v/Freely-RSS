use std::{error::Error, fmt};

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum SyncEngineError {
    InvalidBatchSize,
    InvalidCursor,
    InvalidEventPayload {
        event_id: String,
        reason: &'static str,
    },
    MissingRelationField {
        event_id: String,
        field: &'static str,
    },
    UnsupportedEvent {
        event_id: String,
        entity_type: String,
        change_type: String,
    },
}

impl fmt::Display for SyncEngineError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidBatchSize => {
                f.write_str("sync event batch size must be greater than zero")
            }
            Self::InvalidCursor => f.write_str(
                "sync cursor must either be empty or contain both timestamp and event id",
            ),
            Self::InvalidEventPayload { event_id, reason } => {
                write!(f, "sync event {event_id} has an invalid payload: {reason}")
            }
            Self::MissingRelationField { event_id, field } => {
                write!(f, "sync event {event_id} is missing relation field {field}")
            }
            Self::UnsupportedEvent {
                event_id,
                entity_type,
                change_type,
            } => write!(
                f,
                "sync event {event_id} has unsupported replay operation {entity_type}/{change_type}"
            ),
        }
    }
}

impl Error for SyncEngineError {}
