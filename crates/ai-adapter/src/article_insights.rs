use freelyrss_core_domain::AIArtifact;

use crate::{
    AiAdapterError, AiArticleKeywordRequest, AiArticleSummaryRequest, AiExecutionPolicy,
    AiProviderRegistry, AiQueueRunOutcome, AiQueueTask, AiTaskInput, AiTaskQueue, AiTaskSubmission,
};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AiArticleInsightSnapshot {
    pub article_id: String,
    pub title: String,
    pub summary: Option<String>,
    pub content: String,
    pub language: Option<String>,
}

impl AiArticleInsightSnapshot {
    pub fn new(
        article_id: impl Into<String>,
        title: impl Into<String>,
        content: impl Into<String>,
    ) -> Self {
        Self {
            article_id: article_id.into(),
            title: title.into(),
            summary: None,
            content: content.into(),
            language: None,
        }
    }

    fn validate(&self) -> Result<(), AiAdapterError> {
        if self.article_id.trim().is_empty() {
            return Err(AiAdapterError::InvalidArticleInsightRequest {
                reason: "article insight article id must not be empty",
            });
        }

        if self.title.trim().is_empty() {
            return Err(AiAdapterError::InvalidArticleInsightRequest {
                reason: "article insight title must not be empty",
            });
        }

        if self.content.trim().is_empty() {
            return Err(AiAdapterError::InvalidArticleInsightRequest {
                reason: "article insight content must not be empty",
            });
        }

        Ok(())
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AiArticleInsightRequest {
    pub article: AiArticleInsightSnapshot,
    pub requested_at: String,
    pub max_summary_chars: Option<usize>,
    pub max_keywords: Option<usize>,
    pub execution: AiExecutionPolicy,
}

impl AiArticleInsightRequest {
    pub fn new(
        article: AiArticleInsightSnapshot,
        requested_at: impl Into<String>,
        max_summary_chars: Option<usize>,
        max_keywords: Option<usize>,
    ) -> Self {
        Self {
            article,
            requested_at: requested_at.into(),
            max_summary_chars,
            max_keywords,
            execution: AiExecutionPolicy::default(),
        }
    }

    fn validate(&self) -> Result<(), AiAdapterError> {
        self.article.validate()?;

        if self.requested_at.trim().is_empty() {
            return Err(AiAdapterError::InvalidArticleInsightRequest {
                reason: "article insight requested_at must not be empty",
            });
        }

        if matches!(self.max_summary_chars, Some(0)) {
            return Err(AiAdapterError::InvalidArticleInsightRequest {
                reason: "max_summary_chars must be greater than zero when provided",
            });
        }

        if matches!(self.max_keywords, Some(0)) {
            return Err(AiAdapterError::InvalidArticleInsightRequest {
                reason: "max_keywords must be greater than zero when provided",
            });
        }

        self.execution.validate()
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AiArticleInsights {
    pub summary: AIArtifact,
    pub keywords: AIArtifact,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AiArticleInsightReport {
    pub provider_id: String,
    pub requested_article_id: String,
    pub summary_from_cache: bool,
    pub keywords_from_cache: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AiArticleInsightRun {
    pub artifacts: AiArticleInsights,
    pub report: AiArticleInsightReport,
}

#[derive(Default)]
pub struct AiArticleInsightWorkflow {
    queue: AiTaskQueue,
}

impl AiArticleInsightWorkflow {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn seed_cache(&mut self, artifact: AIArtifact) {
        self.queue.seed_cache(artifact);
    }

    pub fn generate_summary_and_keywords(
        &mut self,
        registry: &AiProviderRegistry,
        provider_id: &str,
        request: AiArticleInsightRequest,
    ) -> Result<AiArticleInsightRun, AiAdapterError> {
        request.validate()?;

        let article_id = request.article.article_id.clone();
        let summary_task = build_summary_task(&request);
        let keyword_task = build_keyword_task(&request);

        self.queue.enqueue(summary_task)?;
        self.queue.enqueue(keyword_task)?;

        let summary = self.run_required_artifact(registry, provider_id)?;
        let keywords = self.run_required_artifact(registry, provider_id)?;

        Ok(AiArticleInsightRun {
            artifacts: AiArticleInsights {
                summary: summary.artifact,
                keywords: keywords.artifact,
            },
            report: AiArticleInsightReport {
                provider_id: provider_id.to_owned(),
                requested_article_id: article_id,
                summary_from_cache: summary.from_cache,
                keywords_from_cache: keywords.from_cache,
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
            AiQueueRunOutcome::Empty => Err(AiAdapterError::InvalidArticleInsightRequest {
                reason: "article insight workflow expected a queued AI task",
            }),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct ArtifactRun {
    artifact: AIArtifact,
    from_cache: bool,
}

fn build_summary_task(request: &AiArticleInsightRequest) -> AiQueueTask {
    AiQueueTask::new(
        AiTaskSubmission {
            task_id: format!("summary-{}", request.article.article_id),
            input: AiTaskInput::SummarizeArticle(AiArticleSummaryRequest {
                article_id: request.article.article_id.clone(),
                title: request.article.title.clone(),
                content: request.article.content.clone(),
                language: request.article.language.clone(),
                max_summary_chars: request.max_summary_chars,
            }),
            execution: request.execution,
            properties: Vec::new(),
        },
        request.article.article_id.clone(),
        request.requested_at.clone(),
    )
}

fn build_keyword_task(request: &AiArticleInsightRequest) -> AiQueueTask {
    let content = match request.article.summary.as_deref() {
        Some(summary) if !summary.trim().is_empty() => {
            format!("{}\n\n{}", summary, request.article.content)
        }
        _ => request.article.content.clone(),
    };

    AiQueueTask::new(
        AiTaskSubmission {
            task_id: format!("keywords-{}", request.article.article_id),
            input: AiTaskInput::ExtractKeywords(AiArticleKeywordRequest {
                article_id: request.article.article_id.clone(),
                title: request.article.title.clone(),
                content,
                language: request.article.language.clone(),
                max_keywords: request.max_keywords,
            }),
            execution: request.execution,
            properties: Vec::new(),
        },
        request.article.article_id.clone(),
        request.requested_at.clone(),
    )
}
