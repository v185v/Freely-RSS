use std::{
    env, fs,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};

use crate::{
    ExportAnnotationSnapshot, ExportAnnotationType, ExportArticleSnapshot, ExportRequest,
    IntegrationAdapter, IntegrationEngineError, IntegrationRegistry, IntegrationRequest,
    IntegrationResponse, IntegrationRunStatus,
};

use super::{
    KNOWLEDGE_BASE_EXPORT_ADAPTER_ID, KnowledgeBaseExportAdapter, KnowledgeBaseExportProfile,
    KnowledgeBaseExportTarget,
};

#[test]
fn knowledge_base_adapter_exports_tagged_and_noted_articles_to_markdown_directory() {
    let root_dir = unique_test_dir("generic");
    let adapter = KnowledgeBaseExportAdapter::new(
        KnowledgeBaseExportTarget::new(
            root_dir.clone(),
            KnowledgeBaseExportProfile::GenericMarkdown,
        )
        .expect("target"),
    )
    .expect("knowledge-base adapter");
    let mut registry = IntegrationRegistry::default();
    registry
        .register(Box::new(adapter))
        .expect("register export adapter");

    let response = registry
        .invoke(
            KNOWLEDGE_BASE_EXPORT_ADAPTER_ID,
            IntegrationRequest::Export(ExportRequest {
                target: "markdown-directory".to_owned(),
                articles: vec![article("article-1", "Practical RSS Reader")],
                properties: Vec::new(),
            }),
        )
        .expect("export knowledge-base markdown");

    let IntegrationResponse::Export(response) = response else {
        panic!("expected export response");
    };
    assert_eq!(response.status, IntegrationRunStatus::Accepted);
    assert_eq!(response.exported_count, 1);
    assert_eq!(
        response.artifact_refs,
        vec![
            "index.md".to_owned(),
            "articles/practical-rss-reader-article-1.md".to_owned(),
            "tags/architecture.md".to_owned(),
            "tags/rss.md".to_owned(),
        ]
    );

    let article_markdown =
        fs::read_to_string(root_dir.join("articles/practical-rss-reader-article-1.md"))
            .expect("article markdown");
    assert!(article_markdown.contains("id: \"article-1\""));
    assert!(article_markdown.contains("title: \"Practical RSS Reader\""));
    assert!(article_markdown.contains("source: \"FreelyRSS Engineering\""));
    assert!(article_markdown.contains("  - \"rss\""));
    assert!(article_markdown.contains("## Notes and highlights"));
    assert!(article_markdown.contains("> selected passage"));
    assert!(article_markdown.contains("Note: Keep this for the architecture digest."));

    let tag_markdown = fs::read_to_string(root_dir.join("tags/rss.md")).expect("tag markdown");
    assert!(
        tag_markdown
            .contains("[Practical RSS Reader](../articles/practical-rss-reader-article-1.md)")
    );

    fs::remove_dir_all(root_dir).expect("clean export temp dir");
}

#[test]
fn knowledge_base_adapter_maps_obsidian_and_logseq_profiles_without_provider_leakage() {
    let obsidian_root = unique_test_dir("obsidian");
    let obsidian_adapter = KnowledgeBaseExportAdapter::new(
        KnowledgeBaseExportTarget::new(obsidian_root.clone(), KnowledgeBaseExportProfile::Obsidian)
            .expect("target"),
    )
    .expect("obsidian adapter");
    let obsidian_response = obsidian_adapter
        .invoke(IntegrationRequest::Export(ExportRequest {
            target: "obsidian".to_owned(),
            articles: vec![article("article-2", "Knowledge Export Boundaries")],
            properties: Vec::new(),
        }))
        .expect("export obsidian markdown");

    let IntegrationResponse::Export(obsidian_response) = obsidian_response else {
        panic!("expected export response");
    };
    assert!(
        obsidian_response
            .artifact_refs
            .contains(&"Home.md".to_owned())
    );
    assert!(
        obsidian_response
            .artifact_refs
            .contains(&"Articles/knowledge-export-boundaries-article-2.md".to_owned())
    );
    let obsidian_article =
        fs::read_to_string(obsidian_root.join("Articles/knowledge-export-boundaries-article-2.md"))
            .expect("obsidian article markdown");
    assert!(obsidian_article.contains("aliases:"));
    assert!(obsidian_article.contains("[[Tags/rss|rss]]"));

    let logseq_root = unique_test_dir("logseq");
    let logseq_adapter = KnowledgeBaseExportAdapter::new(
        KnowledgeBaseExportTarget::new(logseq_root.clone(), KnowledgeBaseExportProfile::Logseq)
            .expect("target"),
    )
    .expect("logseq adapter");
    let logseq_response = logseq_adapter
        .invoke(IntegrationRequest::Export(ExportRequest {
            target: "logseq".to_owned(),
            articles: vec![article("article-3", "Logseq Mapping")],
            properties: Vec::new(),
        }))
        .expect("export logseq markdown");

    let IntegrationResponse::Export(logseq_response) = logseq_response else {
        panic!("expected export response");
    };
    assert!(
        logseq_response
            .artifact_refs
            .contains(&"pages/logseq-mapping-article-3.md".to_owned())
    );
    assert!(
        logseq_response
            .artifact_refs
            .contains(&"pages/tag-rss.md".to_owned())
    );
    let logseq_article = fs::read_to_string(logseq_root.join("pages/logseq-mapping-article-3.md"))
        .expect("logseq article markdown");
    assert!(logseq_article.contains("tags:: rss, architecture"));
    assert!(logseq_article.contains("- Notes and highlights"));

    fs::remove_dir_all(obsidian_root).expect("clean obsidian temp dir");
    fs::remove_dir_all(logseq_root).expect("clean logseq temp dir");
}

#[test]
fn knowledge_base_adapter_rejects_profile_mismatch_before_writing_files() {
    let root_dir = unique_test_dir("mismatch");
    let adapter = KnowledgeBaseExportAdapter::new(
        KnowledgeBaseExportTarget::new(root_dir.clone(), KnowledgeBaseExportProfile::Obsidian)
            .expect("target"),
    )
    .expect("obsidian adapter");

    let error = adapter
        .invoke(IntegrationRequest::Export(ExportRequest {
            target: "logseq".to_owned(),
            articles: vec![article("article-4", "Wrong Target")],
            properties: Vec::new(),
        }))
        .expect_err("profile mismatch must fail");

    assert_eq!(
        error,
        IntegrationEngineError::InvalidRequest {
            reason: "knowledge-base export target does not match adapter profile",
        }
    );
    assert!(!root_dir.exists());
}

fn article(id: &str, title: &str) -> ExportArticleSnapshot {
    ExportArticleSnapshot {
        id: id.to_owned(),
        title: title.to_owned(),
        source_title: Some("FreelyRSS Engineering".to_owned()),
        url: Some(format!("https://example.com/{id}")),
        author: Some("FreelyRSS Team".to_owned()),
        summary: Some("A short export summary.".to_owned()),
        content: Some("Article body that can be imported into a knowledge base.".to_owned()),
        published_at: Some("2026-05-14T08:00:00Z".to_owned()),
        fetched_at: Some("2026-05-14T08:30:00Z".to_owned()),
        tags: vec!["rss".to_owned(), "architecture".to_owned()],
        annotations: vec![ExportAnnotationSnapshot {
            id: format!("annotation-{id}"),
            annotation_type: ExportAnnotationType::Note,
            selected_text: "selected passage".to_owned(),
            note: Some("Keep this for the architecture digest.".to_owned()),
            color: Some("#8eb6ff".to_owned()),
            created_at: Some("2026-05-14T08:45:00Z".to_owned()),
        }],
    }
}

fn unique_test_dir(label: &str) -> PathBuf {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock")
        .as_nanos();
    env::temp_dir().join(format!(
        "freelyrss-knowledge-base-{label}-{}-{nanos}",
        std::process::id()
    ))
}
