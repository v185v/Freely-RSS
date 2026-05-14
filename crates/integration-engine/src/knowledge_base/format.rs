use std::collections::BTreeMap;

use crate::{ExportAnnotationSnapshot, ExportAnnotationType, ExportArticleSnapshot, ExportRequest};

use super::profile::{
    KnowledgeBaseExportProfile, article_path, index_page_link, slugify, tag_page_article_link,
    tag_path,
};

pub(super) fn format_index(
    profile: KnowledgeBaseExportProfile,
    request: &ExportRequest,
    tag_index: &BTreeMap<String, Vec<&ExportArticleSnapshot>>,
) -> String {
    let article_lines = request
        .articles
        .iter()
        .map(|article| {
            format!(
                "- [{}]({})",
                normalize_inline(&article.title, "Untitled article"),
                index_page_link(profile, &article_path(profile, article))
            )
        })
        .collect::<Vec<_>>()
        .join("\n");
    let tag_lines = tag_index
        .keys()
        .map(|tag| {
            format!(
                "- [{}]({})",
                tag,
                index_page_link(profile, &tag_path(profile, tag))
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    format!(
        "# FreelyRSS Knowledge Export\n\n- Profile: {}\n- Requested target: {}\n- Article count: {}\n- Tag count: {}\n\n## Articles\n\n{}\n\n## Tags\n\n{}\n",
        profile.display_name(),
        normalize_inline(&request.target, "knowledge-base"),
        request.articles.len(),
        tag_index.len(),
        if article_lines.is_empty() {
            "No articles exported.".to_owned()
        } else {
            article_lines
        },
        if tag_lines.is_empty() {
            "No tags exported.".to_owned()
        } else {
            tag_lines
        }
    )
}

pub(super) fn format_tag_page(
    profile: KnowledgeBaseExportProfile,
    tag: &str,
    articles: &[&ExportArticleSnapshot],
) -> String {
    let article_lines = articles
        .iter()
        .map(|article| {
            format!(
                "- [{}]({})",
                normalize_inline(&article.title, "Untitled article"),
                tag_page_article_link(profile, &article_path(profile, article))
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    match profile {
        KnowledgeBaseExportProfile::Logseq => {
            let logseq_article_lines = articles
                .iter()
                .map(|article| {
                    format!(
                        "[{}]({})",
                        normalize_inline(&article.title, "Untitled article"),
                        tag_page_article_link(profile, &article_path(profile, article))
                    )
                })
                .collect::<Vec<_>>()
                .join("\n");
            format!(
                "# {}\n\n- Tag:: {}\n- Articles\n{}\n",
                tag,
                tag,
                indent_lines(&logseq_article_lines)
            )
        }
        _ => format!("# {}\n\n## Articles\n\n{}\n", tag, article_lines),
    }
}

pub(super) fn format_article(
    profile: KnowledgeBaseExportProfile,
    article: &ExportArticleSnapshot,
) -> String {
    match profile {
        KnowledgeBaseExportProfile::Logseq => format_logseq_article(article),
        _ => format_frontmatter_article(profile, article),
    }
}

fn format_frontmatter_article(
    profile: KnowledgeBaseExportProfile,
    article: &ExportArticleSnapshot,
) -> String {
    let source = optional_yaml_field("source", article.source_title.as_deref());
    let url = optional_yaml_field("url", article.url.as_deref());
    let author = optional_yaml_field("author", article.author.as_deref());
    let published_at = optional_yaml_field("publishedAt", article.published_at.as_deref());
    let fetched_at = optional_yaml_field("fetchedAt", article.fetched_at.as_deref());
    let profile_name = profile.as_str();
    let tags = yaml_list_field("tags", &article.tags);
    let aliases = if profile == KnowledgeBaseExportProfile::Obsidian {
        format!("aliases:\n  - {}\n", yaml_string(&article.title))
    } else {
        String::new()
    };
    let knowledge_links = format_knowledge_links(profile, article);

    format!(
        "---\nid: {}\ntitle: {}\nprofile: {}\n{}{}{}{}{}{}{}annotationCount: {}\n---\n\n# {}\n\n{}{}{}{}\n",
        yaml_string(&article.id),
        yaml_string(&article.title),
        yaml_string(profile_name),
        aliases,
        source,
        url,
        author,
        published_at,
        fetched_at,
        tags,
        article.annotations.len(),
        markdown_heading(&article.title),
        format_summary(article),
        format_content(article),
        format_annotations(&article.annotations),
        knowledge_links,
    )
}

fn format_logseq_article(article: &ExportArticleSnapshot) -> String {
    let tags = if article.tags.is_empty() {
        "tags::\n".to_owned()
    } else {
        format!("tags:: {}\n", article.tags.join(", "))
    };
    let source = optional_logseq_property("source", article.source_title.as_deref());
    let url = optional_logseq_property("url", article.url.as_deref());
    let published_at = optional_logseq_property("published-at", article.published_at.as_deref());

    format!(
        "# {}\n\nid:: {}\n{}{}{}{}annotation-count:: {}\n\n- Summary\n{}\n- Content\n{}\n- Notes and highlights\n{}\n",
        markdown_heading(&article.title),
        article.id,
        tags,
        source,
        url,
        published_at,
        article.annotations.len(),
        indent_lines(&format_summary_body(article)),
        indent_lines(&format_content_body(article)),
        indent_lines(&format_annotations_body(&article.annotations)),
    )
}

fn format_summary(article: &ExportArticleSnapshot) -> String {
    format!("## Summary\n\n{}\n\n", format_summary_body(article))
}

fn format_summary_body(article: &ExportArticleSnapshot) -> String {
    match normalized_multiline(article.summary.as_deref()) {
        Some(summary) => quote_block(&summary),
        None => "No summary recorded.".to_owned(),
    }
}

fn format_content(article: &ExportArticleSnapshot) -> String {
    format!("## Content\n\n{}\n\n", format_content_body(article))
}

fn format_content_body(article: &ExportArticleSnapshot) -> String {
    normalized_multiline(article.content.as_deref())
        .unwrap_or_else(|| "No article body is available.".to_owned())
}

fn format_annotations(annotations: &[ExportAnnotationSnapshot]) -> String {
    format!(
        "## Notes and highlights\n\n{}\n\n",
        format_annotations_body(annotations)
    )
}

fn format_annotations_body(annotations: &[ExportAnnotationSnapshot]) -> String {
    if annotations.is_empty() {
        return "No annotations recorded.".to_owned();
    }

    annotations
        .iter()
        .enumerate()
        .map(|(index, annotation)| format_annotation(index, annotation))
        .collect::<Vec<_>>()
        .join("\n\n")
}

fn format_annotation(index: usize, annotation: &ExportAnnotationSnapshot) -> String {
    let note = normalized_multiline(annotation.note.as_deref())
        .map(|note| format!("\n\nNote: {note}"))
        .unwrap_or_default();
    let created_at = annotation
        .created_at
        .as_deref()
        .map(|value| format!("\n- Created: {}", normalize_inline(value, "Unknown")))
        .unwrap_or_default();
    let color = annotation
        .color
        .as_deref()
        .map(|value| format!("\n- Color: {}", normalize_inline(value, "Unknown")))
        .unwrap_or_default();

    format!(
        "### {}. {}\n\n- Type: {}{}{}\n\n{}{}",
        index + 1,
        annotation_type_label(annotation.annotation_type),
        annotation.annotation_type.as_str(),
        created_at,
        color,
        quote_block(&annotation.selected_text),
        note,
    )
}

fn format_knowledge_links(
    profile: KnowledgeBaseExportProfile,
    article: &ExportArticleSnapshot,
) -> String {
    match profile {
        KnowledgeBaseExportProfile::Obsidian if !article.tags.is_empty() => {
            let links = article
                .tags
                .iter()
                .map(|tag| format!("- [[Tags/{}|{}]]", slugify(tag), tag))
                .collect::<Vec<_>>()
                .join("\n");
            format!("## Knowledge links\n\n{links}\n\n")
        }
        KnowledgeBaseExportProfile::NotionMarkdown if !article.tags.is_empty() => {
            let tags = article
                .tags
                .iter()
                .map(|tag| format!("#{tag}"))
                .collect::<Vec<_>>()
                .join(" ");
            format!("## Notion import hints\n\n- Tags: {tags}\n\n")
        }
        _ => String::new(),
    }
}

fn annotation_type_label(annotation_type: ExportAnnotationType) -> &'static str {
    match annotation_type {
        ExportAnnotationType::Highlight => "Highlight",
        ExportAnnotationType::Note => "Note",
        ExportAnnotationType::Comment => "Comment",
    }
}

fn optional_yaml_field(key: &str, value: Option<&str>) -> String {
    value
        .and_then(|value| normalized_multiline(Some(value)))
        .map(|value| format!("{key}: {}\n", yaml_string(&value)))
        .unwrap_or_default()
}

fn yaml_list_field(key: &str, values: &[String]) -> String {
    if values.is_empty() {
        return format!("{key}: []\n");
    }

    let values = values
        .iter()
        .map(|value| format!("  - {}", yaml_string(value)))
        .collect::<Vec<_>>()
        .join("\n");
    format!("{key}:\n{values}\n")
}

fn yaml_string(value: &str) -> String {
    format!(
        "\"{}\"",
        value
            .replace('\\', "\\\\")
            .replace('"', "\\\"")
            .replace('\n', "\\n")
    )
}

fn optional_logseq_property(key: &str, value: Option<&str>) -> String {
    value
        .and_then(|value| normalized_multiline(Some(value)))
        .map(|value| format!("{key}:: {value}\n"))
        .unwrap_or_default()
}

fn quote_block(value: &str) -> String {
    let normalized = normalized_multiline(Some(value));

    match normalized {
        Some(value) => value
            .lines()
            .map(|line| format!("> {line}"))
            .collect::<Vec<_>>()
            .join("\n"),
        None => "> No text captured.".to_owned(),
    }
}

fn markdown_heading(value: &str) -> String {
    normalize_inline(value, "Untitled article")
        .trim_start_matches('#')
        .trim()
        .to_owned()
}

fn normalized_multiline(value: Option<&str>) -> Option<String> {
    let value = value?.replace("\r\n", "\n").replace('\r', "\n");
    let value = value.trim();

    if value.is_empty() {
        None
    } else {
        Some(value.to_owned())
    }
}

fn normalize_inline(value: &str, fallback: &str) -> String {
    let value = value.split_whitespace().collect::<Vec<_>>().join(" ");

    if value.is_empty() {
        fallback.to_owned()
    } else {
        value
    }
}

fn indent_lines(value: &str) -> String {
    value
        .lines()
        .map(|line| format!("  - {line}"))
        .collect::<Vec<_>>()
        .join("\n")
}
