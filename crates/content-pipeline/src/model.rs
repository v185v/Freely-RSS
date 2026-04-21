use freelyrss_core_domain::{LanguageCode, UrlString};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ContentPipelineInput {
    pub document_url: Option<UrlString>,
    pub html: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProcessedContent {
    pub cleaned_html: Option<String>,
    pub extracted_text: Option<String>,
    pub thumbnail_url: Option<UrlString>,
    pub language: Option<LanguageCode>,
    pub word_count: Option<usize>,
}
