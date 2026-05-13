//! External integration adapter boundaries for FreelyRSS.

mod adapter;
mod error;
mod model;
mod noop;
mod registry;
mod webhook;

pub use adapter::IntegrationAdapter;
pub use error::IntegrationEngineError;
pub use model::{
    ArticleIntegrationSnapshot, AutomationEventRequest, AutomationEventResponse, BridgeFeedRequest,
    BridgeFeedResponse, ExportRequest, ExportResponse, IntegrationCapability, IntegrationKind,
    IntegrationManifest, IntegrationProperty, IntegrationRequest, IntegrationResponse,
    IntegrationRunStatus, ReadLaterRequest, ReadLaterResponse,
};
pub use noop::{NOOP_INTEGRATION_ADAPTER_ID, NoopIntegrationAdapter};
pub use registry::IntegrationRegistry;
pub use webhook::{
    WEBHOOK_AUTOMATION_ADAPTER_ID, WebhookAutomationAdapter, WebhookEndpoint, WebhookPayload,
};

#[cfg(test)]
mod tests {
    use super::{
        ArticleIntegrationSnapshot, BridgeFeedRequest, ExportRequest, IntegrationEngineError,
        IntegrationKind, IntegrationRequest, IntegrationResponse, IntegrationRunStatus,
        NoopIntegrationAdapter, ReadLaterRequest,
    };
    use crate::{IntegrationAdapter, IntegrationRegistry};

    #[test]
    fn noop_adapter_exposes_all_step_68_boundaries() {
        let adapter = NoopIntegrationAdapter::default();
        let manifest = adapter.manifest();

        assert_eq!(manifest.id, "freelyrss.noop");
        assert!(manifest.supports_kind(IntegrationKind::Bridge));
        assert!(manifest.supports_kind(IntegrationKind::ReadLater));
        assert!(manifest.supports_kind(IntegrationKind::ExportConnector));
        assert!(manifest.supports_kind(IntegrationKind::Automation));
    }

    #[test]
    fn registry_invokes_empty_adapter_without_provider_specific_surface() {
        let mut registry = IntegrationRegistry::default();
        registry
            .register(Box::new(NoopIntegrationAdapter::default()))
            .expect("register no-op adapter");
        let manifests = registry.manifests_for_kind(IntegrationKind::ReadLater);

        assert_eq!(manifests.len(), 1);
        assert_eq!(manifests[0].id, "freelyrss.noop");

        let response = registry
            .invoke(
                "freelyrss.noop",
                IntegrationRequest::ReadLater(ReadLaterRequest {
                    article: article("article-1"),
                    collection: Some("Queue".to_owned()),
                    properties: Vec::new(),
                }),
            )
            .expect("invoke no-op read-later adapter");

        let IntegrationResponse::ReadLater(response) = response else {
            panic!("expected read-later response");
        };
        assert_eq!(response.status, IntegrationRunStatus::Accepted);
        assert_eq!(
            response.external_id,
            Some("noop:read-later:article-1".to_owned())
        );
    }

    #[test]
    fn registry_rejects_unsupported_operation_before_adapter_details_leak() {
        let mut registry = IntegrationRegistry::default();
        registry
            .register(Box::new(
                NoopIntegrationAdapter::new(
                    "noop.export",
                    "No-op export adapter",
                    vec![IntegrationKind::ExportConnector],
                )
                .expect("export adapter"),
            ))
            .expect("register export adapter");

        let error = registry
            .invoke(
                "noop.export",
                IntegrationRequest::BridgeFeed(BridgeFeedRequest {
                    source_url: "https://example.com".to_owned(),
                    preferred_title: None,
                    properties: Vec::new(),
                }),
            )
            .expect_err("bridge request must be rejected");

        assert_eq!(
            error,
            IntegrationEngineError::UnsupportedOperation {
                adapter_id: "noop.export".to_owned(),
                operation: "discover-or-convert-feed",
            }
        );
    }

    #[test]
    fn export_request_uses_generic_article_snapshots() {
        let mut registry = IntegrationRegistry::default();
        registry
            .register(Box::new(NoopIntegrationAdapter::default()))
            .expect("register no-op adapter");

        let response = registry
            .invoke(
                "freelyrss.noop",
                IntegrationRequest::Export(ExportRequest {
                    target: "knowledge-base".to_owned(),
                    articles: vec![article("article-1"), article("article-2")],
                    properties: Vec::new(),
                }),
            )
            .expect("invoke no-op export adapter");

        let IntegrationResponse::Export(response) = response else {
            panic!("expected export response");
        };
        assert_eq!(response.exported_count, 2);
        assert!(response.artifact_refs.is_empty());
    }

    fn article(id: &str) -> ArticleIntegrationSnapshot {
        ArticleIntegrationSnapshot {
            id: id.to_owned(),
            title: format!("Article {id}"),
            url: Some(format!("https://example.com/{id}")),
            summary: None,
            tags: vec!["rss".to_owned()],
        }
    }
}
