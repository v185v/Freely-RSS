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

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ActionValidationIssue {
    pub path: String,
    pub code: String,
    pub message: String,
}

impl ActionValidationIssue {
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
    #[error("invalid rule action definition")]
    InvalidActionDefinition { issues: Vec<ActionValidationIssue> },
}

impl RuleEngineError {
    pub fn query_issues(&self) -> Option<&[QueryValidationIssue]> {
        match self {
            Self::InvalidQueryDefinition { issues } => Some(issues),
            Self::InvalidActionDefinition { .. } => None,
        }
    }

    pub fn action_issues(&self) -> Option<&[ActionValidationIssue]> {
        match self {
            Self::InvalidQueryDefinition { .. } => None,
            Self::InvalidActionDefinition { issues } => Some(issues),
        }
    }
}
