use std::{error::Error, fmt};

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum SyncEngineError {
    DecryptionFailed {
        event_id: Option<String>,
        reason: &'static str,
    },
    EncryptionFailed {
        reason: &'static str,
    },
    InvalidBatchSize,
    InvalidCryptoKey {
        reason: &'static str,
    },
    InvalidCursor,
    InvalidEncryptedPayload {
        event_id: Option<String>,
        reason: &'static str,
    },
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
            Self::DecryptionFailed { event_id, reason } => match event_id {
                Some(event_id) => {
                    write!(f, "sync event {event_id} could not be decrypted: {reason}")
                }
                None => write!(f, "encrypted sync payload could not be decrypted: {reason}"),
            },
            Self::EncryptionFailed { reason } => {
                write!(f, "sync payload encryption failed: {reason}")
            }
            Self::InvalidBatchSize => {
                f.write_str("sync event batch size must be greater than zero")
            }
            Self::InvalidCryptoKey { reason } => {
                write!(f, "sync crypto key is invalid: {reason}")
            }
            Self::InvalidCursor => f.write_str(
                "sync cursor must either be empty or contain both timestamp and event id",
            ),
            Self::InvalidEncryptedPayload { event_id, reason } => match event_id {
                Some(event_id) => {
                    write!(
                        f,
                        "sync event {event_id} has an invalid encrypted payload: {reason}"
                    )
                }
                None => write!(f, "encrypted sync payload is invalid: {reason}"),
            },
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
