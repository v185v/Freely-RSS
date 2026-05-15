use std::time::Duration;

use crate::{AiAdapterError, AiExecutionPolicy};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum AiProviderKind {
    Local,
    Remote,
}

impl AiProviderKind {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Local => "local",
            Self::Remote => "remote",
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum AiProviderCapability {
    SummarizeArticle,
    ExtractKeywords,
    TranslateText,
    AnswerQuestion,
}

impl AiProviderCapability {
    pub const fn operation(self) -> &'static str {
        match self {
            Self::SummarizeArticle => "summarize-article",
            Self::ExtractKeywords => "extract-keywords",
            Self::TranslateText => "translate-text",
            Self::AnswerQuestion => "answer-question",
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AiProviderManifest {
    pub id: String,
    pub display_name: String,
    pub provider_kind: AiProviderKind,
    pub capabilities: Vec<AiProviderCapability>,
    pub default_timeout: Duration,
}

impl AiProviderManifest {
    pub fn new(
        id: impl Into<String>,
        display_name: impl Into<String>,
        provider_kind: AiProviderKind,
        capabilities: Vec<AiProviderCapability>,
    ) -> Result<Self, AiAdapterError> {
        let manifest = Self {
            id: id.into(),
            display_name: display_name.into(),
            provider_kind,
            capabilities,
            default_timeout: Duration::from_secs(30),
        };

        manifest.validate()?;

        Ok(manifest)
    }

    pub fn supports_capability(&self, capability: AiProviderCapability) -> bool {
        self.capabilities.contains(&capability)
    }

    pub fn validate(&self) -> Result<(), AiAdapterError> {
        if self.id.trim().is_empty() {
            return Err(AiAdapterError::InvalidManifest {
                provider_id: None,
                reason: "provider id must not be empty",
            });
        }

        if self.display_name.trim().is_empty() {
            return Err(AiAdapterError::InvalidManifest {
                provider_id: Some(self.id.clone()),
                reason: "display name must not be empty",
            });
        }

        if self.capabilities.is_empty() {
            return Err(AiAdapterError::InvalidManifest {
                provider_id: Some(self.id.clone()),
                reason: "provider must expose at least one capability",
            });
        }

        if self.default_timeout.is_zero() {
            return Err(AiAdapterError::InvalidManifest {
                provider_id: Some(self.id.clone()),
                reason: "default timeout must be greater than zero",
            });
        }

        Ok(())
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AiTaskProperty {
    pub key: String,
    pub value: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AiArticleSummaryRequest {
    pub article_id: String,
    pub title: String,
    pub content: String,
    pub language: Option<String>,
    pub max_summary_chars: Option<usize>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AiArticleKeywordRequest {
    pub article_id: String,
    pub title: String,
    pub content: String,
    pub language: Option<String>,
    pub max_keywords: Option<usize>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AiTranslationRequest {
    pub text: String,
    pub source_language: Option<String>,
    pub target_language: String,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum AiContextScope {
    CurrentArticle,
    CurrentFeed,
    CurrentSearchResult,
}

impl AiContextScope {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::CurrentArticle => "current-article",
            Self::CurrentFeed => "current-feed",
            Self::CurrentSearchResult => "current-search-result",
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AiContextDocument {
    pub id: String,
    pub scope: AiContextScope,
    pub title: String,
    pub content: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AiQuestionRequest {
    pub question: String,
    pub contexts: Vec<AiContextDocument>,
    pub language: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum AiTaskInput {
    SummarizeArticle(AiArticleSummaryRequest),
    ExtractKeywords(AiArticleKeywordRequest),
    TranslateText(AiTranslationRequest),
    AnswerQuestion(AiQuestionRequest),
}

impl AiTaskInput {
    pub const fn capability(&self) -> AiProviderCapability {
        match self {
            Self::SummarizeArticle(_) => AiProviderCapability::SummarizeArticle,
            Self::ExtractKeywords(_) => AiProviderCapability::ExtractKeywords,
            Self::TranslateText(_) => AiProviderCapability::TranslateText,
            Self::AnswerQuestion(_) => AiProviderCapability::AnswerQuestion,
        }
    }

    pub fn validate(&self) -> Result<(), AiAdapterError> {
        match self {
            Self::SummarizeArticle(request) => {
                validate_non_empty(&request.article_id, "summary article id must not be empty")?;
                validate_non_empty(&request.content, "summary content must not be empty")
            }
            Self::ExtractKeywords(request) => {
                validate_non_empty(&request.article_id, "keyword article id must not be empty")?;
                validate_non_empty(&request.content, "keyword content must not be empty")
            }
            Self::TranslateText(request) => {
                validate_non_empty(&request.text, "translation text must not be empty")?;
                validate_non_empty(
                    &request.target_language,
                    "translation target language must not be empty",
                )
            }
            Self::AnswerQuestion(request) => {
                validate_non_empty(&request.question, "question must not be empty")?;
                if request.contexts.is_empty() {
                    return Err(AiAdapterError::InvalidTaskSubmission {
                        reason: "question answering requires at least one approved context",
                    });
                }
                Ok(())
            }
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AiTaskSubmission {
    pub task_id: String,
    pub input: AiTaskInput,
    pub execution: AiExecutionPolicy,
    pub properties: Vec<AiTaskProperty>,
}

impl AiTaskSubmission {
    pub fn validate(&self) -> Result<(), AiAdapterError> {
        validate_non_empty(&self.task_id, "task id must not be empty")?;
        self.input.validate()?;
        self.execution.validate()
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AiTaskStatus {
    Completed,
    Skipped,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum AiTaskOutput {
    Summary {
        text: String,
    },
    Keywords {
        keywords: Vec<String>,
    },
    Translation {
        text: String,
        target_language: String,
    },
    Answer {
        text: String,
        cited_context_ids: Vec<String>,
    },
}

impl AiTaskOutput {
    pub const fn kind(&self) -> AiProviderCapability {
        match self {
            Self::Summary { .. } => AiProviderCapability::SummarizeArticle,
            Self::Keywords { .. } => AiProviderCapability::ExtractKeywords,
            Self::Translation { .. } => AiProviderCapability::TranslateText,
            Self::Answer { .. } => AiProviderCapability::AnswerQuestion,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AiTaskResponse {
    pub task_id: String,
    pub provider_id: String,
    pub status: AiTaskStatus,
    pub output: AiTaskOutput,
}

fn validate_non_empty(value: &str, reason: &'static str) -> Result<(), AiAdapterError> {
    if value.trim().is_empty() {
        Err(AiAdapterError::InvalidTaskSubmission { reason })
    } else {
        Ok(())
    }
}
