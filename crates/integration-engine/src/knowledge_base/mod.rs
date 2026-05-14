use std::{collections::BTreeMap, fs, path::Path};

mod format;
mod profile;

#[cfg(test)]
mod tests;

use crate::{
    ExportArticleSnapshot, ExportRequest, ExportResponse, IntegrationAdapter,
    IntegrationCapability, IntegrationEngineError, IntegrationKind, IntegrationManifest,
    IntegrationRequest, IntegrationResponse, IntegrationRunStatus,
};
use format::{format_article, format_index, format_tag_page};
use profile::{article_path, markdown_path, tag_path};

pub use profile::{KnowledgeBaseExportProfile, KnowledgeBaseExportTarget};

pub const KNOWLEDGE_BASE_EXPORT_ADAPTER_ID: &str = "freelyrss.knowledge-base-export";

pub struct KnowledgeBaseExportAdapter {
    manifest: IntegrationManifest,
    target: KnowledgeBaseExportTarget,
}

impl KnowledgeBaseExportAdapter {
    pub fn new(target: KnowledgeBaseExportTarget) -> Result<Self, IntegrationEngineError> {
        let manifest = IntegrationManifest::new(
            KNOWLEDGE_BASE_EXPORT_ADAPTER_ID,
            "FreelyRSS knowledge-base export adapter",
            vec![IntegrationKind::ExportConnector],
            vec![IntegrationCapability::ExportArticles],
        )?;

        Ok(Self { manifest, target })
    }

    pub fn target(&self) -> &KnowledgeBaseExportTarget {
        &self.target
    }

    fn export(&self, request: ExportRequest) -> Result<ExportResponse, IntegrationEngineError> {
        validate_export_request(&request)?;

        let profile = self.target.profile();
        if !profile.accepts_target(&request.target) {
            return Err(IntegrationEngineError::InvalidRequest {
                reason: "knowledge-base export target does not match adapter profile",
            });
        }

        let artifacts = build_export_artifacts(profile, &request);
        let artifact_refs = artifacts
            .iter()
            .map(|artifact| markdown_path(&artifact.relative_path))
            .collect();

        for artifact in &artifacts {
            write_artifact(self.target.root_dir(), artifact, &self.manifest.id)?;
        }

        Ok(ExportResponse {
            status: IntegrationRunStatus::Accepted,
            exported_count: request.articles.len(),
            artifact_refs,
        })
    }
}

impl IntegrationAdapter for KnowledgeBaseExportAdapter {
    fn manifest(&self) -> &IntegrationManifest {
        &self.manifest
    }

    fn invoke(
        &self,
        request: IntegrationRequest,
    ) -> Result<IntegrationResponse, IntegrationEngineError> {
        let capability = request.capability();
        let IntegrationRequest::Export(request) = request else {
            return Err(IntegrationEngineError::UnsupportedOperation {
                adapter_id: self.manifest.id.clone(),
                operation: capability.operation(),
            });
        };

        self.export(request).map(IntegrationResponse::Export)
    }
}

struct ExportArtifact {
    relative_path: std::path::PathBuf,
    contents: String,
}

fn build_export_artifacts(
    profile: KnowledgeBaseExportProfile,
    request: &ExportRequest,
) -> Vec<ExportArtifact> {
    let tag_index = build_tag_index(&request.articles);
    let mut artifacts = vec![ExportArtifact {
        relative_path: profile.index_path(),
        contents: format_index(profile, request, &tag_index),
    }];

    artifacts.extend(request.articles.iter().map(|article| ExportArtifact {
        relative_path: article_path(profile, article),
        contents: format_article(profile, article),
    }));

    artifacts.extend(tag_index.iter().map(|(tag, articles)| ExportArtifact {
        relative_path: tag_path(profile, tag),
        contents: format_tag_page(profile, tag, articles),
    }));

    artifacts
}

fn build_tag_index(
    articles: &[ExportArticleSnapshot],
) -> BTreeMap<String, Vec<&ExportArticleSnapshot>> {
    let mut tag_index: BTreeMap<String, Vec<&ExportArticleSnapshot>> = BTreeMap::new();

    for article in articles {
        for tag in &article.tags {
            let tag = tag.trim();
            if !tag.is_empty() {
                tag_index.entry(tag.to_owned()).or_default().push(article);
            }
        }
    }

    tag_index
}

fn write_artifact(
    root_dir: &Path,
    artifact: &ExportArtifact,
    adapter_id: &str,
) -> Result<(), IntegrationEngineError> {
    let output_path = root_dir.join(&artifact.relative_path);

    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            IntegrationEngineError::KnowledgeBaseExportFailed {
                adapter_id: adapter_id.to_owned(),
                reason: format!("create directory {}: {error}", parent.display()),
            }
        })?;
    }

    fs::write(&output_path, &artifact.contents).map_err(|error| {
        IntegrationEngineError::KnowledgeBaseExportFailed {
            adapter_id: adapter_id.to_owned(),
            reason: format!("write file {}: {error}", output_path.display()),
        }
    })
}

fn validate_export_request(request: &ExportRequest) -> Result<(), IntegrationEngineError> {
    ensure_not_blank(&request.target, "export target must not be empty")?;

    if request.articles.is_empty() {
        return Err(IntegrationEngineError::InvalidRequest {
            reason: "export request must include at least one article",
        });
    }

    for article in &request.articles {
        ensure_not_blank(&article.id, "export article id must not be empty")?;
        ensure_not_blank(&article.title, "export article title must not be empty")?;

        for tag in &article.tags {
            ensure_not_blank(tag, "export article tag must not be empty")?;
        }

        for annotation in &article.annotations {
            ensure_not_blank(&annotation.id, "export annotation id must not be empty")?;
            ensure_not_blank(
                &annotation.selected_text,
                "export annotation selected text must not be empty",
            )?;
        }
    }

    for property in &request.properties {
        ensure_not_blank(&property.key, "export property key must not be empty")?;
    }

    Ok(())
}

fn ensure_not_blank(value: &str, reason: &'static str) -> Result<(), IntegrationEngineError> {
    if value.trim().is_empty() {
        Err(IntegrationEngineError::InvalidRequest { reason })
    } else {
        Ok(())
    }
}
