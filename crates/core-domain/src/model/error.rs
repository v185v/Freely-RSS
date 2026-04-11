use thiserror::Error;

#[derive(Debug, Error)]
pub enum ModelError {
    #[error("{kind} cannot be empty")]
    EmptyValue { kind: &'static str },
    #[error("invalid {kind}: {value}")]
    InvalidEnum { kind: &'static str, value: String },
    #[error("invalid {field} boolean flag: {value}")]
    InvalidBooleanFlag { field: &'static str, value: i64 },
    #[error("reading_progress must stay within 0.0..=1.0, got {value}")]
    InvalidReadingProgress { value: f64 },
    #[error("invalid JSON in {field}")]
    InvalidJson {
        field: &'static str,
        #[source]
        source: serde_json::Error,
    },
}
