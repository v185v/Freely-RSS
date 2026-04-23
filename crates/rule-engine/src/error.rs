use thiserror::Error;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct QueryValidationIssue {
    pub path: String,
    pub code: String,
    pub message: String,
}

impl QueryValidationIssue {
    pub fn new(
        path: impl Into<String>,
        code: impl Into<String>,
        message: impl Into<String>,
    ) -> Self {
        Self {
            path: path.into(),
            code: code.into(),
            message: message.into(),
        }
    }
}

#[derive(Debug, Error)]
pub enum RuleEngineError {
    #[error("invalid query definition")]
    InvalidQueryDefinition { issues: Vec<QueryValidationIssue> },
}

impl RuleEngineError {
    pub fn issues(&self) -> &[QueryValidationIssue] {
        match self {
            Self::InvalidQueryDefinition { issues } => issues,
        }
    }
}
