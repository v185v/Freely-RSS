//! Optional AI provider adapter boundaries for FreelyRSS.

mod adapter;
mod error;
mod mock;
mod model;
mod queue;
mod registry;
mod retry;

pub use adapter::AiProvider;
pub use error::AiAdapterError;
pub use mock::{
    MOCK_LOCAL_AI_PROVIDER_ID, MOCK_REMOTE_AI_PROVIDER_ID, MockLocalAiProvider,
    MockRemoteAiProvider,
};
pub use model::{
    AiArticleKeywordRequest, AiArticleSummaryRequest, AiContextDocument, AiContextScope,
    AiProviderCapability, AiProviderKind, AiProviderManifest, AiQuestionRequest, AiTaskInput,
    AiTaskOutput, AiTaskProperty, AiTaskResponse, AiTaskStatus, AiTaskSubmission,
    AiTranslationRequest,
};
pub use queue::{AiQueueReport, AiQueueRunOutcome, AiQueueTask, AiTaskQueue};
pub use registry::AiProviderRegistry;
pub use retry::{AiExecutionPolicy, AiRetryPolicy};

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use super::{
        AiAdapterError, AiExecutionPolicy, AiProviderCapability, AiProviderKind,
        AiProviderManifest, AiProviderRegistry, AiQueueRunOutcome, AiQueueTask, AiRetryPolicy,
        AiTaskInput, AiTaskOutput, AiTaskQueue, AiTaskSubmission, AiTranslationRequest,
        MOCK_LOCAL_AI_PROVIDER_ID, MOCK_REMOTE_AI_PROVIDER_ID, MockLocalAiProvider,
        MockRemoteAiProvider,
    };

    #[test]
    fn mock_local_and_remote_providers_share_the_same_submission_entry() {
        let mut registry = AiProviderRegistry::default();
        registry
            .register(Box::new(MockLocalAiProvider::default()))
            .expect("register local mock provider");
        registry
            .register(Box::new(MockRemoteAiProvider::default()))
            .expect("register remote mock provider");

        let submission = translation_submission("task-translate");
        let local = registry
            .submit(MOCK_LOCAL_AI_PROVIDER_ID, submission.clone())
            .expect("invoke local mock provider");
        let remote = registry
            .submit(MOCK_REMOTE_AI_PROVIDER_ID, submission)
            .expect("invoke remote mock provider");

        assert_eq!(local.task_id, "task-translate");
        assert_eq!(remote.task_id, "task-translate");
        assert_eq!(local.provider_id, MOCK_LOCAL_AI_PROVIDER_ID);
        assert_eq!(remote.provider_id, MOCK_REMOTE_AI_PROVIDER_ID);
        assert!(matches!(
            local.output,
            AiTaskOutput::Translation {
                target_language: _,
                ..
            }
        ));
        assert_eq!(local.output.kind(), remote.output.kind());
    }

    #[test]
    fn registry_rejects_unsupported_capability_before_provider_invocation() {
        let manifest = AiProviderManifest::new(
            "freelyrss.ai.summary-only",
            "Summary only",
            AiProviderKind::Local,
            vec![AiProviderCapability::SummarizeArticle],
        )
        .expect("manifest");

        let mut registry = AiProviderRegistry::default();
        registry
            .register(Box::new(MockLocalAiProvider::with_manifest(manifest)))
            .expect("register summary-only provider");

        let error = registry
            .submit(
                "freelyrss.ai.summary-only",
                translation_submission("task-1"),
            )
            .expect_err("translation must be rejected");

        assert_eq!(
            error,
            AiAdapterError::UnsupportedCapability {
                provider_id: "freelyrss.ai.summary-only".to_owned(),
                capability: AiProviderCapability::TranslateText,
            }
        );
    }

    #[test]
    fn execution_policy_defines_timeout_and_retry_rules() {
        let policy = AiExecutionPolicy {
            timeout: Duration::from_secs(15),
            retry: AiRetryPolicy::fixed(3, Duration::from_millis(250)),
        };

        policy.validate().expect("policy is valid");
        assert_eq!(
            policy.retry.next_delay_after_failure(1),
            Some(Duration::from_millis(250))
        );
        assert_eq!(
            policy.retry.next_delay_after_failure(2),
            Some(Duration::from_millis(250))
        );
        assert_eq!(policy.retry.next_delay_after_failure(3), None);
    }

    #[test]
    fn execution_policy_rejects_zero_timeout() {
        let policy = AiExecutionPolicy {
            timeout: Duration::ZERO,
            retry: AiRetryPolicy::disabled(),
        };

        assert_eq!(
            policy.validate(),
            Err(AiAdapterError::InvalidExecutionPolicy {
                reason: "timeout must be greater than zero",
            })
        );
    }

    #[test]
    fn queue_executes_provider_and_persists_completed_output_as_artifact() {
        let mut registry = AiProviderRegistry::default();
        registry
            .register(Box::new(MockLocalAiProvider::default()))
            .expect("register local mock provider");

        let mut queue = AiTaskQueue::default();
        queue
            .enqueue(AiQueueTask::new(
                translation_submission("task-translate"),
                "article-1",
                "2026-05-16T00:00:00Z",
            ))
            .expect("enqueue task");

        let outcome = queue
            .run_next(&registry, MOCK_LOCAL_AI_PROVIDER_ID)
            .expect("run queued task");

        let AiQueueRunOutcome::Completed { artifact } = outcome else {
            panic!("expected completed artifact");
        };

        assert_eq!(artifact.id.as_str(), "ai-artifact-task-translate");
        assert_eq!(artifact.article_id.as_str(), "article-1");
        assert_eq!(artifact.provider, MOCK_LOCAL_AI_PROVIDER_ID);
        assert_eq!(artifact.kind.as_str(), "translation");
        assert_eq!(artifact.created_at.as_str(), "2026-05-16T00:00:00Z");
        assert_eq!(
            artifact.result.as_value()["targetLanguage"],
            serde_json::json!("zh-Hans")
        );
        assert_eq!(queue.report().cached_count, 1);
    }

    #[test]
    fn queue_uses_input_hash_cache_before_provider_invocation() {
        let mut registry = AiProviderRegistry::default();
        registry
            .register(Box::new(MockLocalAiProvider::default()))
            .expect("register local mock provider");

        let mut queue = AiTaskQueue::default();
        queue
            .enqueue(AiQueueTask::new(
                translation_submission("task-first"),
                "article-1",
                "2026-05-16T00:00:00Z",
            ))
            .expect("enqueue first task");

        let first = queue
            .run_next(&registry, MOCK_LOCAL_AI_PROVIDER_ID)
            .expect("run first task");
        let AiQueueRunOutcome::Completed { artifact: cached } = first else {
            panic!("expected completed artifact");
        };

        queue
            .enqueue(AiQueueTask::new(
                translation_submission("task-second"),
                "article-1",
                "2026-05-16T00:01:00Z",
            ))
            .expect("enqueue equivalent task");

        let second = queue
            .run_next(&registry, MOCK_LOCAL_AI_PROVIDER_ID)
            .expect("equivalent task should hit cache");

        assert_eq!(second, AiQueueRunOutcome::CacheHit { artifact: cached });
    }

    fn translation_submission(task_id: &str) -> AiTaskSubmission {
        AiTaskSubmission {
            task_id: task_id.to_owned(),
            input: AiTaskInput::TranslateText(AiTranslationRequest {
                text: "Feeds stay local".to_owned(),
                source_language: Some("en".to_owned()),
                target_language: "zh-Hans".to_owned(),
            }),
            execution: AiExecutionPolicy::default(),
            properties: Vec::new(),
        }
    }
}
