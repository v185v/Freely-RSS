use freelyrss_core_domain::AIArtifact;

use crate::{
    AiAdapterError, AiContextDocument, AiContextScope, AiExecutionPolicy, AiProviderRegistry,
    AiQuestionRequest, AiQueueRunOutcome, AiQueueTask, AiTaskInput, AiTaskProperty, AiTaskQueue,
    AiTaskSubmission, AiTranslationRequest,
};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AiTranslationMode {
    FullArticle,
    Selection,
}

impl AiTranslationMode {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::FullArticle => "full-article",
            Self::Selection => "selection",
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AiArticleTranslationRequest {
    pub article_id: String,
    pub requested_at: String,
    pub text: String,
    pub source_language: Option<String>,
    pub target_language: String,
    pub mode: AiTranslationMode,
    pub execution: AiExecutionPolicy,
}

impl AiArticleTranslationRequest {
    pub fn new(
        article_id: impl Into<String>,
        requested_at: impl Into<String>,
        text: impl Into<String>,
        source_language: Option<String>,
        target_language: impl Into<String>,
        mode: AiTranslationMode,
    ) -> Self {
        Self {
            article_id: article_id.into(),
            requested_at: requested_at.into(),
            text: text.into(),
            source_language,
            target_language: target_language.into(),
            mode,
            execution: AiExecutionPolicy::default(),
        }
    }

    fn validate(&self) -> Result<(), AiAdapterError> {
        if self.article_id.trim().is_empty() {
            return Err(AiAdapterError::InvalidArticleActionRequest {
                reason: "article translation article id must not be empty",
            });
        }

        if self.requested_at.trim().is_empty() {
            return Err(AiAdapterError::InvalidArticleActionRequest {
                reason: "article translation requested_at must not be empty",
            });
        }

        if self.text.trim().is_empty() {
            return Err(AiAdapterError::InvalidArticleActionRequest {
                reason: "article translation text must not be empty",
            });
        }

        if self.target_language.trim().is_empty() {
            return Err(AiAdapterError::InvalidArticleActionRequest {
                reason: "article translation target language must not be empty",
            });
        }

        self.execution.validate()
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AiArticleQuestionRequest {
    pub article_id: String,
    pub requested_at: String,
    pub question: String,
    pub contexts: Vec<AiContextDocument>,
    pub allowed_scope: AiContextScope,
    pub language: Option<String>,
    pub execution: AiExecutionPolicy,
}

impl AiArticleQuestionRequest {
    pub fn new(
        article_id: impl Into<String>,
        requested_at: impl Into<String>,
        question: impl Into<String>,
        contexts: Vec<AiContextDocument>,
        allowed_scope: AiContextScope,
        language: Option<String>,
    ) -> Self {
        Self {
            article_id: article_id.into(),
            requested_at: requested_at.into(),
            question: question.into(),
            contexts,
            allowed_scope,
            language,
            execution: AiExecutionPolicy::default(),
        }
    }

    fn validate(&self) -> Result<(), AiAdapterError> {
        if self.article_id.trim().is_empty() {
            return Err(AiAdapterError::InvalidArticleActionRequest {
                reason: "article question article id must not be empty",
            });
        }

        if self.requested_at.trim().is_empty() {
            return Err(AiAdapterError::InvalidArticleActionRequest {
                reason: "article question requested_at must not be empty",
            });
        }

        if self.question.trim().is_empty() {
            return Err(AiAdapterError::InvalidArticleActionRequest {
                reason: "article question must not be empty",
            });
        }

        if self.contexts.is_empty() {
            return Err(AiAdapterError::InvalidArticleActionRequest {
                reason: "article question requires at least one approved context",
            });
        }

        if self
            .contexts
            .iter()
            .any(|context| context.scope != self.allowed_scope)
        {
            return Err(AiAdapterError::InvalidArticleActionRequest {
                reason: "article question context is outside the allowed scope",
            });
        }

        if self
            .contexts
            .iter()
            .any(|context| context.id.trim().is_empty() || context.content.trim().is_empty())
        {
            return Err(AiAdapterError::InvalidArticleActionRequest {
                reason: "article question contexts require non-empty id and content",
            });
        }

        self.execution.validate()
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AiArticleActionRun {
    pub artifact: AIArtifact,
    pub report: AiArticleActionReport,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AiArticleActionReport {
    pub provider_id: String,
    pub requested_article_id: String,
    pub from_cache: bool,
    pub context_scope: Option<AiContextScope>,
}

#[derive(Default)]
pub struct AiArticleActionWorkflow {
    queue: AiTaskQueue,
}

impl AiArticleActionWorkflow {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn seed_cache(&mut self, artifact: AIArtifact) {
        self.queue.seed_cache(artifact);
    }

    pub fn translate_article_text(
        &mut self,
        registry: &AiProviderRegistry,
        provider_id: &str,
        request: AiArticleTranslationRequest,
    ) -> Result<AiArticleActionRun, AiAdapterError> {
        request.validate()?;

        let article_id = request.article_id.clone();
        self.queue.enqueue(build_translation_task(&request))?;
        let artifact = self.run_required_artifact(registry, provider_id)?;

        Ok(AiArticleActionRun {
            artifact: artifact.artifact,
            report: AiArticleActionReport {
                provider_id: provider_id.to_owned(),
                requested_article_id: article_id,
                from_cache: artifact.from_cache,
                context_scope: None,
            },
        })
    }

    pub fn answer_limited_question(
        &mut self,
        registry: &AiProviderRegistry,
        provider_id: &str,
        request: AiArticleQuestionRequest,
    ) -> Result<AiArticleActionRun, AiAdapterError> {
        request.validate()?;

        let article_id = request.article_id.clone();
        let context_scope = request.allowed_scope;
        self.queue.enqueue(build_question_task(&request))?;
        let artifact = self.run_required_artifact(registry, provider_id)?;

        Ok(AiArticleActionRun {
            artifact: artifact.artifact,
            report: AiArticleActionReport {
                provider_id: provider_id.to_owned(),
                requested_article_id: article_id,
                from_cache: artifact.from_cache,
                context_scope: Some(context_scope),
            },
        })
    }

    fn run_required_artifact(
        &mut self,
        registry: &AiProviderRegistry,
        provider_id: &str,
    ) -> Result<ArtifactRun, AiAdapterError> {
        match self.queue.run_next(registry, provider_id)? {
            AiQueueRunOutcome::Completed { artifact } => Ok(ArtifactRun {
                artifact,
                from_cache: false,
            }),
            AiQueueRunOutcome::CacheHit { artifact } => Ok(ArtifactRun {
                artifact,
                from_cache: true,
            }),
            AiQueueRunOutcome::Empty => Err(AiAdapterError::InvalidArticleActionRequest {
                reason: "article AI workflow expected a queued AI task",
            }),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct ArtifactRun {
    artifact: AIArtifact,
    from_cache: bool,
}

fn build_translation_task(request: &AiArticleTranslationRequest) -> AiQueueTask {
    let fingerprint = stable_fingerprint(&[
        request.mode.as_str(),
        &request.target_language,
        &request.text,
    ]);

    AiQueueTask::new(
        AiTaskSubmission {
            task_id: format!(
                "translation-{}-{}-{}-{fingerprint}",
                request.mode.as_str(),
                request.target_language,
                request.article_id
            ),
            input: AiTaskInput::TranslateText(AiTranslationRequest {
                text: request.text.clone(),
                source_language: request.source_language.clone(),
                target_language: request.target_language.clone(),
            }),
            execution: request.execution,
            properties: vec![
                AiTaskProperty {
                    key: "translation-mode".to_owned(),
                    value: request.mode.as_str().to_owned(),
                },
                AiTaskProperty {
                    key: "target-language".to_owned(),
                    value: request.target_language.clone(),
                },
            ],
        },
        request.article_id.clone(),
        request.requested_at.clone(),
    )
}

fn build_question_task(request: &AiArticleQuestionRequest) -> AiQueueTask {
    let mut fingerprint_parts = vec![
        request.allowed_scope.as_str(),
        request.question.as_str(),
        request.language.as_deref().unwrap_or(""),
    ];
    for context in &request.contexts {
        fingerprint_parts.push(&context.id);
    }
    let fingerprint = stable_fingerprint(&fingerprint_parts);

    AiQueueTask::new(
        AiTaskSubmission {
            task_id: format!(
                "question-{}-{}-{fingerprint}",
                request.allowed_scope.as_str(),
                request.article_id
            ),
            input: AiTaskInput::AnswerQuestion(AiQuestionRequest {
                question: request.question.clone(),
                contexts: request.contexts.clone(),
                language: request.language.clone(),
            }),
            execution: request.execution,
            properties: vec![AiTaskProperty {
                key: "context-scope".to_owned(),
                value: request.allowed_scope.as_str().to_owned(),
            }],
        },
        request.article_id.clone(),
        request.requested_at.clone(),
    )
}

fn stable_fingerprint(parts: &[&str]) -> String {
    let mut hash = 0xcbf29ce484222325_u64;

    for part in parts {
        for byte in part.as_bytes() {
            hash ^= u64::from(*byte);
            hash = hash.wrapping_mul(0x100000001b3);
        }
        hash ^= 0xff;
        hash = hash.wrapping_mul(0x100000001b3);
    }

    format!("{hash:016x}")
}
