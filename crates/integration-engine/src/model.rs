use crate::IntegrationEngineError;
use serde::Serialize;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum IntegrationKind {
    Bridge,
    ReadLater,
    ExportConnector,
    Automation,
}

impl IntegrationKind {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Bridge => "bridge",
            Self::ReadLater => "read-later",
            Self::ExportConnector => "export-connector",
            Self::Automation => "automation",
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum IntegrationCapability {
    DiscoverOrConvertFeed,
    SaveArticleForLater,
    ExportArticles,
    DispatchAutomationEvent,
}

impl IntegrationCapability {
    pub const fn kind(self) -> IntegrationKind {
        match self {
            Self::DiscoverOrConvertFeed => IntegrationKind::Bridge,
            Self::SaveArticleForLater => IntegrationKind::ReadLater,
            Self::ExportArticles => IntegrationKind::ExportConnector,
            Self::DispatchAutomationEvent => IntegrationKind::Automation,
        }
    }

    pub const fn operation(self) -> &'static str {
        match self {
            Self::DiscoverOrConvertFeed => "discover-or-convert-feed",
            Self::SaveArticleForLater => "save-article-for-later",
            Self::ExportArticles => "export-articles",
            Self::DispatchAutomationEvent => "dispatch-automation-event",
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct IntegrationManifest {
    pub id: String,
    pub display_name: String,
    pub kinds: Vec<IntegrationKind>,
    pub capabilities: Vec<IntegrationCapability>,
}

impl IntegrationManifest {
    pub fn new(
        id: impl Into<String>,
        display_name: impl Into<String>,
        kinds: Vec<IntegrationKind>,
        capabilities: Vec<IntegrationCapability>,
    ) -> Result<Self, IntegrationEngineError> {
        let manifest = Self {
            id: id.into(),
            display_name: display_name.into(),
            kinds,
            capabilities,
        };

        manifest.validate()?;

        Ok(manifest)
    }

    pub fn supports_kind(&self, kind: IntegrationKind) -> bool {
        self.kinds.contains(&kind)
    }

    pub fn supports_capability(&self, capability: IntegrationCapability) -> bool {
        self.capabilities.contains(&capability)
    }

    pub fn validate(&self) -> Result<(), IntegrationEngineError> {
        if self.id.trim().is_empty() {
            return Err(IntegrationEngineError::InvalidManifest {
                adapter_id: None,
                reason: "adapter id must not be empty",
            });
        }

        if self.display_name.trim().is_empty() {
            return Err(IntegrationEngineError::InvalidManifest {
                adapter_id: Some(self.id.clone()),
                reason: "display name must not be empty",
            });
        }

        if self.kinds.is_empty() {
            return Err(IntegrationEngineError::InvalidManifest {
                adapter_id: Some(self.id.clone()),
                reason: "adapter must expose at least one integration kind",
            });
        }

        if self.capabilities.is_empty() {
            return Err(IntegrationEngineError::InvalidManifest {
                adapter_id: Some(self.id.clone()),
                reason: "adapter must expose at least one capability",
            });
        }

        if self
            .capabilities
            .iter()
            .any(|capability| !self.supports_kind(capability.kind()))
        {
            return Err(IntegrationEngineError::InvalidManifest {
                adapter_id: Some(self.id.clone()),
                reason: "adapter capability kind must be listed in manifest kinds",
            });
        }

        Ok(())
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct IntegrationProperty {
    pub key: String,
    pub value: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct ArticleIntegrationSnapshot {
    pub id: String,
    pub title: String,
    pub url: Option<String>,
    pub summary: Option<String>,
    pub tags: Vec<String>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum ExportAnnotationType {
    Highlight,
    Note,
    Comment,
}

impl ExportAnnotationType {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Highlight => "highlight",
            Self::Note => "note",
            Self::Comment => "comment",
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct ExportAnnotationSnapshot {
    pub id: String,
    pub annotation_type: ExportAnnotationType,
    pub selected_text: String,
    pub note: Option<String>,
    pub color: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct ExportArticleSnapshot {
    pub id: String,
    pub title: String,
    pub source_title: Option<String>,
    pub url: Option<String>,
    pub author: Option<String>,
    pub summary: Option<String>,
    pub content: Option<String>,
    pub published_at: Option<String>,
    pub fetched_at: Option<String>,
    pub tags: Vec<String>,
    pub annotations: Vec<ExportAnnotationSnapshot>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BridgeFeedRequest {
    pub source_url: String,
    pub preferred_title: Option<String>,
    pub properties: Vec<IntegrationProperty>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ReadLaterRequest {
    pub article: ArticleIntegrationSnapshot,
    pub collection: Option<String>,
    pub properties: Vec<IntegrationProperty>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ExportRequest {
    pub target: String,
    pub articles: Vec<ExportArticleSnapshot>,
    pub properties: Vec<IntegrationProperty>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AutomationEventRequest {
    pub event_name: String,
    pub article_ids: Vec<String>,
    pub articles: Vec<ArticleIntegrationSnapshot>,
    pub properties: Vec<IntegrationProperty>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum IntegrationRequest {
    BridgeFeed(BridgeFeedRequest),
    ReadLater(ReadLaterRequest),
    Export(ExportRequest),
    Automation(AutomationEventRequest),
}

impl IntegrationRequest {
    pub const fn kind(&self) -> IntegrationKind {
        match self {
            Self::BridgeFeed(_) => IntegrationKind::Bridge,
            Self::ReadLater(_) => IntegrationKind::ReadLater,
            Self::Export(_) => IntegrationKind::ExportConnector,
            Self::Automation(_) => IntegrationKind::Automation,
        }
    }

    pub const fn capability(&self) -> IntegrationCapability {
        match self {
            Self::BridgeFeed(_) => IntegrationCapability::DiscoverOrConvertFeed,
            Self::ReadLater(_) => IntegrationCapability::SaveArticleForLater,
            Self::Export(_) => IntegrationCapability::ExportArticles,
            Self::Automation(_) => IntegrationCapability::DispatchAutomationEvent,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum IntegrationRunStatus {
    Accepted,
    Skipped,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BridgeFeedResponse {
    pub status: IntegrationRunStatus,
    pub feed_url: Option<String>,
    pub title: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ReadLaterResponse {
    pub status: IntegrationRunStatus,
    pub external_id: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ExportResponse {
    pub status: IntegrationRunStatus,
    pub exported_count: usize,
    pub artifact_refs: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AutomationEventResponse {
    pub status: IntegrationRunStatus,
    pub dispatched_count: usize,
    pub delivery_ids: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum IntegrationResponse {
    BridgeFeed(BridgeFeedResponse),
    ReadLater(ReadLaterResponse),
    Export(ExportResponse),
    Automation(AutomationEventResponse),
}

impl IntegrationResponse {
    pub const fn kind(&self) -> IntegrationKind {
        match self {
            Self::BridgeFeed(_) => IntegrationKind::Bridge,
            Self::ReadLater(_) => IntegrationKind::ReadLater,
            Self::Export(_) => IntegrationKind::ExportConnector,
            Self::Automation(_) => IntegrationKind::Automation,
        }
    }
}
