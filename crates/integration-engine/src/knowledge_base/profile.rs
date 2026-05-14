use std::path::{Path, PathBuf};

use crate::{ExportArticleSnapshot, IntegrationEngineError};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum KnowledgeBaseExportProfile {
    GenericMarkdown,
    Obsidian,
    Logseq,
    NotionMarkdown,
}

impl KnowledgeBaseExportProfile {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::GenericMarkdown => "generic-markdown",
            Self::Obsidian => "obsidian",
            Self::Logseq => "logseq",
            Self::NotionMarkdown => "notion-markdown",
        }
    }

    pub const fn display_name(self) -> &'static str {
        match self {
            Self::GenericMarkdown => "Generic Markdown directory",
            Self::Obsidian => "Obsidian vault Markdown",
            Self::Logseq => "Logseq pages Markdown",
            Self::NotionMarkdown => "Notion Markdown import",
        }
    }

    pub(super) fn accepts_target(self, target: &str) -> bool {
        let target = target.trim();

        target == "knowledge-base"
            || target == self.as_str()
            || matches!(
                (self, target),
                (Self::GenericMarkdown, "markdown-directory") | (Self::NotionMarkdown, "notion")
            )
    }

    fn article_dir(self) -> &'static str {
        match self {
            Self::GenericMarkdown => "articles",
            Self::Obsidian => "Articles",
            Self::Logseq => "pages",
            Self::NotionMarkdown => "notion-import",
        }
    }

    fn tag_dir(self) -> &'static str {
        match self {
            Self::GenericMarkdown => "tags",
            Self::Obsidian => "Tags",
            Self::Logseq => "pages",
            Self::NotionMarkdown => "notion-import/tags",
        }
    }

    pub(super) fn index_path(self) -> PathBuf {
        match self {
            Self::GenericMarkdown => PathBuf::from("index.md"),
            Self::Obsidian => PathBuf::from("Home.md"),
            Self::Logseq => PathBuf::from("pages/freelyrss-export-index.md"),
            Self::NotionMarkdown => PathBuf::from("notion-import/README.md"),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct KnowledgeBaseExportTarget {
    root_dir: PathBuf,
    profile: KnowledgeBaseExportProfile,
}

impl KnowledgeBaseExportTarget {
    pub fn new(
        root_dir: impl Into<PathBuf>,
        profile: KnowledgeBaseExportProfile,
    ) -> Result<Self, IntegrationEngineError> {
        let root_dir = root_dir.into();

        if root_dir.as_os_str().is_empty() {
            return Err(IntegrationEngineError::InvalidRequest {
                reason: "knowledge-base export root directory must not be empty",
            });
        }

        Ok(Self { root_dir, profile })
    }

    pub fn root_dir(&self) -> &Path {
        &self.root_dir
    }

    pub const fn profile(&self) -> KnowledgeBaseExportProfile {
        self.profile
    }
}

pub(super) fn article_path(
    profile: KnowledgeBaseExportProfile,
    article: &ExportArticleSnapshot,
) -> PathBuf {
    let mut path = PathBuf::from(profile.article_dir());
    path.push(format!(
        "{}-{}.md",
        slugify(&article.title),
        slugify(&article.id)
    ));
    path
}

pub(super) fn tag_path(profile: KnowledgeBaseExportProfile, tag: &str) -> PathBuf {
    let mut path = PathBuf::from(profile.tag_dir());
    let prefix = if profile == KnowledgeBaseExportProfile::Logseq {
        "tag-"
    } else {
        ""
    };
    path.push(format!("{prefix}{}.md", slugify(tag)));
    path
}

pub(super) fn markdown_path(path: &Path) -> String {
    path.iter()
        .map(|component| component.to_string_lossy())
        .collect::<Vec<_>>()
        .join("/")
}

pub(super) fn tag_page_article_link(
    profile: KnowledgeBaseExportProfile,
    article_path: &Path,
) -> String {
    let file_name = article_path
        .file_name()
        .map(|value| value.to_string_lossy().into_owned())
        .unwrap_or_else(|| markdown_path(article_path));

    match profile {
        KnowledgeBaseExportProfile::GenericMarkdown | KnowledgeBaseExportProfile::Obsidian => {
            format!("../{}", markdown_path(article_path))
        }
        KnowledgeBaseExportProfile::Logseq => file_name,
        KnowledgeBaseExportProfile::NotionMarkdown => format!("../{file_name}"),
    }
}

pub(super) fn index_page_link(profile: KnowledgeBaseExportProfile, target_path: &Path) -> String {
    match profile {
        KnowledgeBaseExportProfile::GenericMarkdown | KnowledgeBaseExportProfile::Obsidian => {
            markdown_path(target_path)
        }
        KnowledgeBaseExportProfile::Logseq => target_path
            .file_name()
            .map(|value| value.to_string_lossy().into_owned())
            .unwrap_or_else(|| markdown_path(target_path)),
        KnowledgeBaseExportProfile::NotionMarkdown => target_path
            .strip_prefix("notion-import")
            .map(markdown_path)
            .unwrap_or_else(|_| markdown_path(target_path)),
    }
}

pub(super) fn slugify(value: &str) -> String {
    let mut slug = String::new();
    let mut last_was_dash = false;

    for character in value.chars().flat_map(char::to_lowercase) {
        if character.is_ascii_alphanumeric() {
            slug.push(character);
            last_was_dash = false;
        } else if !last_was_dash && !slug.is_empty() {
            slug.push('-');
            last_was_dash = true;
        }
    }

    while slug.ends_with('-') {
        slug.pop();
    }

    if slug.is_empty() {
        "item".to_owned()
    } else {
        slug
    }
}
