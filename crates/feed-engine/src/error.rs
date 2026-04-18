use freelyrss_core_domain::FeedErrorKind;
use thiserror::Error;

#[derive(Clone, Debug, Error, PartialEq, Eq)]
pub enum FeedEngineError {
    #[error("fetch stage failed ({kind}): {message}")]
    Fetch {
        kind: FeedErrorKind,
        message: String,
    },
    #[error("parse stage failed ({kind}): {message}")]
    Parse {
        kind: FeedErrorKind,
        message: String,
    },
    #[error("normalize stage failed: {message}")]
    Normalize { message: String },
    #[error("persist stage failed: {message}")]
    Persist { message: String },
}

impl FeedEngineError {
    pub fn fetch(message: impl Into<String>) -> Self {
        Self::Fetch {
            kind: FeedErrorKind::Network,
            message: message.into(),
        }
    }

    pub fn fetch_permission(message: impl Into<String>) -> Self {
        Self::Fetch {
            kind: FeedErrorKind::Permission,
            message: message.into(),
        }
    }

    pub fn parse(message: impl Into<String>) -> Self {
        Self::Parse {
            kind: FeedErrorKind::Parse,
            message: message.into(),
        }
    }

    pub fn empty_content(message: impl Into<String>) -> Self {
        Self::Parse {
            kind: FeedErrorKind::Empty,
            message: message.into(),
        }
    }

    pub fn normalize(message: impl Into<String>) -> Self {
        Self::Normalize {
            message: message.into(),
        }
    }

    pub fn persist(message: impl Into<String>) -> Self {
        Self::Persist {
            message: message.into(),
        }
    }

    pub fn error_kind(&self) -> Option<FeedErrorKind> {
        match self {
            Self::Fetch { kind, .. } | Self::Parse { kind, .. } => Some(*kind),
            Self::Normalize { .. } | Self::Persist { .. } => None,
        }
    }

    pub fn message(&self) -> &str {
        match self {
            Self::Fetch { message, .. }
            | Self::Parse { message, .. }
            | Self::Normalize { message }
            | Self::Persist { message } => message,
        }
    }
}
