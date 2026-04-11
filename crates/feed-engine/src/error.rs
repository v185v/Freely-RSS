use thiserror::Error;

#[derive(Clone, Debug, Error, PartialEq, Eq)]
pub enum FeedEngineError {
    #[error("fetch stage failed: {message}")]
    Fetch { message: String },
    #[error("parse stage failed: {message}")]
    Parse { message: String },
    #[error("normalize stage failed: {message}")]
    Normalize { message: String },
    #[error("persist stage failed: {message}")]
    Persist { message: String },
}

impl FeedEngineError {
    pub fn fetch(message: impl Into<String>) -> Self {
        Self::Fetch {
            message: message.into(),
        }
    }

    pub fn parse(message: impl Into<String>) -> Self {
        Self::Parse {
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
}
