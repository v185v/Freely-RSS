use std::collections::{BTreeMap, VecDeque};

use freelyrss_core_domain::{
    AIArtifact, AIArtifactId, AIArtifactKind, ArticleId, IsoDateTime, JsonBlob,
};
use serde_json::{Value, json};

use crate::{
    AiAdapterError, AiProviderRegistry, AiTaskInput, AiTaskOutput, AiTaskResponse, AiTaskSubmission,
};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AiQueueTask {
    pub submission: AiTaskSubmission,
    pub article_id: String,
    pub requested_at: String,
}

impl AiQueueTask {
    pub fn new(
        submission: AiTaskSubmission,
        article_id: impl Into<String>,
        requested_at: impl Into<String>,
    ) -> Self {
        Self {
            submission,
            article_id: article_id.into(),
            requested_at: requested_at.into(),
        }
    }

    fn validate(&self) -> Result<(), AiAdapterError> {
        self.submission.validate()?;

        if self.article_id.trim().is_empty() {
            return Err(AiAdapterError::InvalidQueueTask {
                reason: "AI artifact article id must not be empty",
            });
        }

        if self.requested_at.trim().is_empty() {
            return Err(AiAdapterError::InvalidQueueTask {
                reason: "AI queue requested_at must not be empty",
            });
        }

        Ok(())
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum AiQueueRunOutcome {
    Completed { artifact: AIArtifact },
    CacheHit { artifact: AIArtifact },
    Empty,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AiQueueReport {
    pub queued_count: usize,
    pub cached_count: usize,
}

#[derive(Default)]
pub struct AiTaskQueue {
    queued: VecDeque<AiQueueTask>,
    cache_by_input_hash: BTreeMap<String, AIArtifact>,
}

impl AiTaskQueue {
    pub fn enqueue(&mut self, task: AiQueueTask) -> Result<AiQueueReport, AiAdapterError> {
        task.validate()?;
        self.queued.push_back(task);
        Ok(self.report())
    }

    pub fn seed_cache(&mut self, artifact: AIArtifact) {
        self.cache_by_input_hash
            .insert(artifact.input_hash.clone(), artifact);
    }

    pub fn report(&self) -> AiQueueReport {
        AiQueueReport {
            queued_count: self.queued.len(),
            cached_count: self.cache_by_input_hash.len(),
        }
    }

    pub fn run_next(
        &mut self,
        registry: &AiProviderRegistry,
        provider_id: &str,
    ) -> Result<AiQueueRunOutcome, AiAdapterError> {
        let Some(task) = self.queued.pop_front() else {
            return Ok(AiQueueRunOutcome::Empty);
        };

        let input_hash = stable_input_hash(provider_id, &task);
        if let Some(artifact) = self.cache_by_input_hash.get(&input_hash) {
            return Ok(AiQueueRunOutcome::CacheHit {
                artifact: artifact.clone(),
            });
        }

        let response = registry.submit(provider_id, task.submission.clone())?;
        let artifact = response_to_artifact(response, task, input_hash)?;
        self.cache_by_input_hash
            .insert(artifact.input_hash.clone(), artifact.clone());

        Ok(AiQueueRunOutcome::Completed { artifact })
    }
}

fn response_to_artifact(
    response: AiTaskResponse,
    task: AiQueueTask,
    input_hash: String,
) -> Result<AIArtifact, AiAdapterError> {
    Ok(AIArtifact {
        id: AIArtifactId::new(format!("ai-artifact-{}", task.submission.task_id)).map_err(
            |source| AiAdapterError::InvalidArtifactMapping {
                reason: source.to_string(),
            },
        )?,
        article_id: ArticleId::new(task.article_id).map_err(|source| {
            AiAdapterError::InvalidArtifactMapping {
                reason: source.to_string(),
            }
        })?,
        kind: artifact_kind_for_output(&response.output),
        provider: response.provider_id,
        input_hash,
        result: JsonBlob::new(output_to_json(response.output)),
        created_at: IsoDateTime::new(task.requested_at).map_err(|source| {
            AiAdapterError::InvalidArtifactMapping {
                reason: source.to_string(),
            }
        })?,
    })
}

fn artifact_kind_for_output(output: &AiTaskOutput) -> AIArtifactKind {
    match output {
        AiTaskOutput::Summary { .. } => AIArtifactKind::Summary,
        AiTaskOutput::Keywords { .. } => AIArtifactKind::Keywords,
        AiTaskOutput::Translation { .. } => AIArtifactKind::Translation,
        AiTaskOutput::Answer { .. } => AIArtifactKind::QuestionAnswer,
    }
}

fn output_to_json(output: AiTaskOutput) -> Value {
    match output {
        AiTaskOutput::Summary { text } => json!({
            "kind": "summary",
            "text": text,
        }),
        AiTaskOutput::Keywords { keywords } => json!({
            "kind": "keywords",
            "keywords": keywords,
        }),
        AiTaskOutput::Translation {
            text,
            target_language,
        } => json!({
            "kind": "translation",
            "text": text,
            "targetLanguage": target_language,
        }),
        AiTaskOutput::Answer {
            text,
            cited_context_ids,
        } => json!({
            "kind": "question-answer",
            "text": text,
            "citedContextIds": cited_context_ids,
        }),
    }
}

fn stable_input_hash(provider_id: &str, task: &AiQueueTask) -> String {
    let mut fingerprint = StableFingerprint::default();
    fingerprint.push(provider_id);
    fingerprint.push(&task.article_id);
    fingerprint.push(task.submission.input.capability().operation());
    fingerprint.push_input(&task.submission.input);
    format!("fnv64:{:016x}", fingerprint.finish())
}

#[derive(Default)]
struct StableFingerprint {
    hash: u64,
}

impl StableFingerprint {
    fn push(&mut self, value: &str) {
        if self.hash == 0 {
            self.hash = 0xcbf29ce484222325;
        }

        for byte in value.as_bytes() {
            self.hash ^= u64::from(*byte);
            self.hash = self.hash.wrapping_mul(0x100000001b3);
        }

        self.hash ^= 0xff;
        self.hash = self.hash.wrapping_mul(0x100000001b3);
    }

    fn push_input(&mut self, input: &AiTaskInput) {
        match input {
            AiTaskInput::SummarizeArticle(request) => {
                self.push(&request.article_id);
                self.push(&request.title);
                self.push(&request.content);
                self.push(request.language.as_deref().unwrap_or(""));
                self.push(&request.max_summary_chars.unwrap_or_default().to_string());
            }
            AiTaskInput::ExtractKeywords(request) => {
                self.push(&request.article_id);
                self.push(&request.title);
                self.push(&request.content);
                self.push(request.language.as_deref().unwrap_or(""));
                self.push(&request.max_keywords.unwrap_or_default().to_string());
            }
            AiTaskInput::TranslateText(request) => {
                self.push(&request.text);
                self.push(request.source_language.as_deref().unwrap_or(""));
                self.push(&request.target_language);
            }
            AiTaskInput::AnswerQuestion(request) => {
                self.push(&request.question);
                self.push(request.language.as_deref().unwrap_or(""));
                for context in &request.contexts {
                    self.push(&context.id);
                    self.push(context.scope.as_str());
                    self.push(&context.title);
                    self.push(&context.content);
                }
            }
        }
    }

    fn finish(self) -> u64 {
        self.hash
    }
}
