use std::{error::Error, fmt};

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum IntegrationEngineError {
    AdapterAlreadyRegistered {
        adapter_id: String,
    },
    AdapterNotFound {
        adapter_id: String,
    },
    InvalidManifest {
        adapter_id: Option<String>,
        reason: &'static str,
    },
    InvalidRequest {
        reason: &'static str,
    },
    UnsupportedOperation {
        adapter_id: String,
        operation: &'static str,
    },
    WebhookDeliveryFailed {
        adapter_id: String,
        reason: String,
    },
}

impl fmt::Display for IntegrationEngineError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::AdapterAlreadyRegistered { adapter_id } => {
                write!(f, "integration adapter {adapter_id} is already registered")
            }
            Self::AdapterNotFound { adapter_id } => {
                write!(f, "integration adapter {adapter_id} is not registered")
            }
            Self::InvalidManifest { adapter_id, reason } => match adapter_id {
                Some(adapter_id) => {
                    write!(
                        f,
                        "integration adapter {adapter_id} manifest is invalid: {reason}"
                    )
                }
                None => write!(f, "integration adapter manifest is invalid: {reason}"),
            },
            Self::InvalidRequest { reason } => {
                write!(f, "integration request is invalid: {reason}")
            }
            Self::UnsupportedOperation {
                adapter_id,
                operation,
            } => write!(
                f,
                "integration adapter {adapter_id} does not support operation {operation}"
            ),
            Self::WebhookDeliveryFailed { adapter_id, reason } => {
                write!(
                    f,
                    "integration adapter {adapter_id} could not deliver webhook: {reason}"
                )
            }
        }
    }
}

impl Error for IntegrationEngineError {}
