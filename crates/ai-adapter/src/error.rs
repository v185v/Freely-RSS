use std::{error::Error, fmt};

use crate::AiProviderCapability;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum AiAdapterError {
    ProviderAlreadyRegistered {
        provider_id: String,
    },
    ProviderNotFound {
        provider_id: String,
    },
    InvalidManifest {
        provider_id: Option<String>,
        reason: &'static str,
    },
    InvalidTaskSubmission {
        reason: &'static str,
    },
    InvalidExecutionPolicy {
        reason: &'static str,
    },
    UnsupportedCapability {
        provider_id: String,
        capability: AiProviderCapability,
    },
    ProviderInvocationFailed {
        provider_id: String,
        reason: String,
    },
    InvalidQueueTask {
        reason: &'static str,
    },
    InvalidArtifactMapping {
        reason: String,
    },
    InvalidArticleInsightRequest {
        reason: &'static str,
    },
    InvalidArticleActionRequest {
        reason: &'static str,
    },
}

impl fmt::Display for AiAdapterError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ProviderAlreadyRegistered { provider_id } => {
                write!(f, "AI provider {provider_id} is already registered")
            }
            Self::ProviderNotFound { provider_id } => {
                write!(f, "AI provider {provider_id} is not registered")
            }
            Self::InvalidManifest {
                provider_id,
                reason,
            } => match provider_id {
                Some(provider_id) => {
                    write!(f, "AI provider {provider_id} manifest is invalid: {reason}")
                }
                None => write!(f, "AI provider manifest is invalid: {reason}"),
            },
            Self::InvalidTaskSubmission { reason } => {
                write!(f, "AI task submission is invalid: {reason}")
            }
            Self::InvalidExecutionPolicy { reason } => {
                write!(f, "AI execution policy is invalid: {reason}")
            }
            Self::UnsupportedCapability {
                provider_id,
                capability,
            } => write!(
                f,
                "AI provider {provider_id} does not support capability {}",
                capability.operation()
            ),
            Self::ProviderInvocationFailed {
                provider_id,
                reason,
            } => {
                write!(f, "AI provider {provider_id} invocation failed: {reason}")
            }
            Self::InvalidQueueTask { reason } => {
                write!(f, "AI queue task is invalid: {reason}")
            }
            Self::InvalidArtifactMapping { reason } => {
                write!(
                    f,
                    "AI task response cannot be mapped to AIArtifact: {reason}"
                )
            }
            Self::InvalidArticleInsightRequest { reason } => {
                write!(f, "AI article insight request is invalid: {reason}")
            }
            Self::InvalidArticleActionRequest { reason } => {
                write!(f, "AI article action request is invalid: {reason}")
            }
        }
    }
}

impl Error for AiAdapterError {}
