use crate::{
    AiAdapterError, AiArticleKeywordRequest, AiArticleSummaryRequest, AiProvider,
    AiProviderCapability, AiProviderKind, AiProviderManifest, AiQuestionRequest, AiTaskInput,
    AiTaskOutput, AiTaskResponse, AiTaskStatus, AiTaskSubmission, AiTranslationRequest,
};

pub const MOCK_LOCAL_AI_PROVIDER_ID: &str = "freelyrss.ai.mock.local";
pub const MOCK_REMOTE_AI_PROVIDER_ID: &str = "freelyrss.ai.mock.remote";

#[derive(Clone, Debug)]
pub struct MockLocalAiProvider {
    manifest: AiProviderManifest,
}

impl MockLocalAiProvider {
    pub fn with_manifest(manifest: AiProviderManifest) -> Self {
        Self { manifest }
    }
}

impl Default for MockLocalAiProvider {
    fn default() -> Self {
        Self {
            manifest: mock_manifest(
                MOCK_LOCAL_AI_PROVIDER_ID,
                "Mock local AI provider",
                AiProviderKind::Local,
            ),
        }
    }
}

impl AiProvider for MockLocalAiProvider {
    fn manifest(&self) -> &AiProviderManifest {
        &self.manifest
    }

    fn invoke(&self, submission: AiTaskSubmission) -> Result<AiTaskResponse, AiAdapterError> {
        invoke_mock_provider(&self.manifest, submission)
    }
}

#[derive(Clone, Debug)]
pub struct MockRemoteAiProvider {
    manifest: AiProviderManifest,
}

impl MockRemoteAiProvider {
    pub fn with_manifest(manifest: AiProviderManifest) -> Self {
        Self { manifest }
    }
}

impl Default for MockRemoteAiProvider {
    fn default() -> Self {
        Self {
            manifest: mock_manifest(
                MOCK_REMOTE_AI_PROVIDER_ID,
                "Mock remote AI provider",
                AiProviderKind::Remote,
            ),
        }
    }
}

impl AiProvider for MockRemoteAiProvider {
    fn manifest(&self) -> &AiProviderManifest {
        &self.manifest
    }

    fn invoke(&self, submission: AiTaskSubmission) -> Result<AiTaskResponse, AiAdapterError> {
        invoke_mock_provider(&self.manifest, submission)
    }
}

fn invoke_mock_provider(
    manifest: &AiProviderManifest,
    submission: AiTaskSubmission,
) -> Result<AiTaskResponse, AiAdapterError> {
    submission.validate()?;

    Ok(AiTaskResponse {
        task_id: submission.task_id,
        provider_id: manifest.id.clone(),
        status: AiTaskStatus::Completed,
        output: match submission.input {
            AiTaskInput::SummarizeArticle(request) => summarize(request),
            AiTaskInput::ExtractKeywords(request) => keywords(request),
            AiTaskInput::TranslateText(request) => translate(request),
            AiTaskInput::AnswerQuestion(request) => answer(request),
        },
    })
}

fn mock_manifest(
    id: &'static str,
    display_name: &'static str,
    provider_kind: AiProviderKind,
) -> AiProviderManifest {
    AiProviderManifest::new(
        id,
        display_name,
        provider_kind,
        vec![
            AiProviderCapability::SummarizeArticle,
            AiProviderCapability::ExtractKeywords,
            AiProviderCapability::TranslateText,
            AiProviderCapability::AnswerQuestion,
        ],
    )
    .expect("mock AI manifest must be valid")
}

fn summarize(request: AiArticleSummaryRequest) -> AiTaskOutput {
    let excerpt = truncate_chars(&request.content, request.max_summary_chars.unwrap_or(120));
    AiTaskOutput::Summary {
        text: format!("Mock summary for {}: {excerpt}", request.article_id),
    }
}

fn keywords(request: AiArticleKeywordRequest) -> AiTaskOutput {
    let mut keywords = Vec::new();
    for token in format!("{} {}", request.title, request.content).split_whitespace() {
        let normalized = token
            .trim_matches(|ch: char| !ch.is_alphanumeric())
            .to_lowercase();
        if normalized.len() >= 4 && !keywords.contains(&normalized) {
            keywords.push(normalized);
        }
        if keywords.len() >= request.max_keywords.unwrap_or(6) {
            break;
        }
    }

    AiTaskOutput::Keywords { keywords }
}

fn translate(request: AiTranslationRequest) -> AiTaskOutput {
    AiTaskOutput::Translation {
        text: format!("[{}] {}", request.target_language, request.text),
        target_language: request.target_language,
    }
}

fn answer(request: AiQuestionRequest) -> AiTaskOutput {
    AiTaskOutput::Answer {
        text: format!(
            "Mock answer using {} context item(s): {}",
            request.contexts.len(),
            request.question
        ),
        cited_context_ids: request
            .contexts
            .into_iter()
            .map(|context| context.id)
            .collect(),
    }
}

fn truncate_chars(value: &str, max_chars: usize) -> String {
    value.chars().take(max_chars).collect()
}
