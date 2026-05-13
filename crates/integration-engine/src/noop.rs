use crate::{
    AutomationEventResponse, BridgeFeedResponse, IntegrationAdapter, IntegrationCapability,
    IntegrationEngineError, IntegrationKind, IntegrationManifest, IntegrationRequest,
    IntegrationResponse, IntegrationRunStatus, ReadLaterResponse,
};

pub const NOOP_INTEGRATION_ADAPTER_ID: &str = "freelyrss.noop";

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct NoopIntegrationAdapter {
    manifest: IntegrationManifest,
}

impl NoopIntegrationAdapter {
    pub fn new(
        id: impl Into<String>,
        display_name: impl Into<String>,
        kinds: Vec<IntegrationKind>,
    ) -> Result<Self, IntegrationEngineError> {
        let capabilities = kinds.iter().map(kind_to_capability).collect();
        let manifest = IntegrationManifest::new(id, display_name, kinds, capabilities)?;

        Ok(Self { manifest })
    }
}

impl Default for NoopIntegrationAdapter {
    fn default() -> Self {
        Self::new(
            NOOP_INTEGRATION_ADAPTER_ID,
            "FreelyRSS no-op integration adapter",
            vec![
                IntegrationKind::Bridge,
                IntegrationKind::ReadLater,
                IntegrationKind::ExportConnector,
                IntegrationKind::Automation,
            ],
        )
        .expect("default no-op integration adapter manifest is valid")
    }
}

impl IntegrationAdapter for NoopIntegrationAdapter {
    fn manifest(&self) -> &IntegrationManifest {
        &self.manifest
    }

    fn invoke(
        &self,
        request: IntegrationRequest,
    ) -> Result<IntegrationResponse, IntegrationEngineError> {
        if !self.manifest.supports_capability(request.capability()) {
            return Err(IntegrationEngineError::UnsupportedOperation {
                adapter_id: self.manifest.id.clone(),
                operation: request.capability().operation(),
            });
        }

        validate_request(&request)?;

        Ok(match request {
            IntegrationRequest::BridgeFeed(request) => {
                IntegrationResponse::BridgeFeed(BridgeFeedResponse {
                    status: IntegrationRunStatus::Accepted,
                    feed_url: Some(request.source_url),
                    title: request.preferred_title,
                })
            }
            IntegrationRequest::ReadLater(request) => {
                IntegrationResponse::ReadLater(ReadLaterResponse {
                    status: IntegrationRunStatus::Accepted,
                    external_id: Some(format!("noop:read-later:{}", request.article.id)),
                })
            }
            IntegrationRequest::Export(request) => {
                IntegrationResponse::Export(crate::ExportResponse {
                    status: IntegrationRunStatus::Accepted,
                    exported_count: request.articles.len(),
                    artifact_refs: Vec::new(),
                })
            }
            IntegrationRequest::Automation(request) => {
                IntegrationResponse::Automation(AutomationEventResponse {
                    status: IntegrationRunStatus::Accepted,
                    dispatched_count: 1,
                    delivery_ids: vec![format!("noop:automation:{}", request.event_name)],
                })
            }
        })
    }
}

fn kind_to_capability(kind: &IntegrationKind) -> IntegrationCapability {
    match kind {
        IntegrationKind::Bridge => IntegrationCapability::DiscoverOrConvertFeed,
        IntegrationKind::ReadLater => IntegrationCapability::SaveArticleForLater,
        IntegrationKind::ExportConnector => IntegrationCapability::ExportArticles,
        IntegrationKind::Automation => IntegrationCapability::DispatchAutomationEvent,
    }
}

fn validate_request(request: &IntegrationRequest) -> Result<(), IntegrationEngineError> {
    match request {
        IntegrationRequest::BridgeFeed(request) => {
            ensure_not_blank(&request.source_url, "bridge source URL must not be empty")
        }
        IntegrationRequest::ReadLater(request) => {
            ensure_not_blank(
                &request.article.id,
                "read-later article id must not be empty",
            )?;
            ensure_not_blank(
                &request.article.title,
                "read-later article title must not be empty",
            )
        }
        IntegrationRequest::Export(request) => {
            ensure_not_blank(&request.target, "export target must not be empty")?;

            if request.articles.is_empty() {
                Err(IntegrationEngineError::InvalidRequest {
                    reason: "export request must include at least one article",
                })
            } else {
                Ok(())
            }
        }
        IntegrationRequest::Automation(request) => ensure_not_blank(
            &request.event_name,
            "automation event name must not be empty",
        ),
    }
}

fn ensure_not_blank(value: &str, reason: &'static str) -> Result<(), IntegrationEngineError> {
    if value.trim().is_empty() {
        Err(IntegrationEngineError::InvalidRequest { reason })
    } else {
        Ok(())
    }
}
