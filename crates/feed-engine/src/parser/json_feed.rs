use freelyrss_core_domain::{AttachmentType, FeedFormat, LanguageCode, UrlString};
use serde::Deserialize;

use crate::{FeedEngineError, ParsedArticle, ParsedAttachment, ParsedFeedDocument};

use super::{non_empty, parse_timestamp, parse_url};

const JSON_FEED_V1: &str = "https://jsonfeed.org/version/1";
const JSON_FEED_V1_1: &str = "https://jsonfeed.org/version/1.1";

#[derive(Debug, Deserialize)]
struct JsonFeedDocument {
    version: String,
    title: Option<String>,
    home_page_url: Option<String>,
    icon: Option<String>,
    favicon: Option<String>,
    authors: Option<Vec<JsonFeedAuthor>>,
    #[serde(default)]
    items: Vec<JsonFeedItem>,
}

#[derive(Clone, Debug, Deserialize)]
struct JsonFeedAuthor {
    name: Option<String>,
}

#[derive(Debug, Deserialize)]
struct JsonFeedItem {
    id: Option<String>,
    url: Option<String>,
    external_url: Option<String>,
    title: Option<String>,
    summary: Option<String>,
    content_html: Option<String>,
    content_text: Option<String>,
    image: Option<String>,
    date_published: Option<String>,
    date_modified: Option<String>,
    authors: Option<Vec<JsonFeedAuthor>>,
    author: Option<JsonFeedAuthor>,
    #[serde(default)]
    attachments: Vec<JsonFeedAttachment>,
}

#[derive(Debug, Deserialize)]
struct JsonFeedAttachment {
    url: String,
    mime_type: Option<String>,
    size_in_bytes: Option<i64>,
    duration_in_seconds: Option<i64>,
}

pub(super) fn parse(source: &str) -> Result<ParsedFeedDocument, FeedEngineError> {
    let document: JsonFeedDocument = serde_json::from_str(source).map_err(|error| {
        FeedEngineError::parse(format!("feed JSON could not be parsed: {error}"))
    })?;

    if !matches!(document.version.as_str(), JSON_FEED_V1 | JSON_FEED_V1_1) {
        return Err(FeedEngineError::parse(format!(
            "unsupported JSON Feed version: {}",
            document.version
        )));
    }

    let feed_author = primary_author(document.authors.as_deref());

    Ok(ParsedFeedDocument {
        format: FeedFormat::JsonFeed,
        title: document.title.and_then(non_empty),
        site_url: parse_url(document.home_page_url),
        icon: parse_url(document.icon.or(document.favicon)),
        articles: document
            .items
            .into_iter()
            .map(|item| parse_item(item, feed_author.clone()))
            .collect(),
    })
}

fn parse_item(item: JsonFeedItem, feed_author: Option<String>) -> ParsedArticle {
    let JsonFeedItem {
        id,
        url,
        external_url,
        title,
        summary,
        content_html,
        content_text,
        image,
        date_published,
        date_modified,
        authors,
        author,
        attachments,
    } = item;

    let canonical_url = parse_url(url.clone());
    let original_url = parse_url(external_url.clone().or(url.clone()));
    let attachments = parse_attachments(attachments);
    let thumbnail = parse_url(image).or_else(|| first_image_attachment(&attachments));

    ParsedArticle {
        source_guid: id
            .and_then(non_empty)
            .or_else(|| url.and_then(non_empty))
            .or_else(|| external_url.and_then(non_empty)),
        title: title.and_then(non_empty),
        author: primary_author(authors.as_deref())
            .or_else(|| author.and_then(|author| author.name).and_then(non_empty))
            .or(feed_author),
        summary: summary.and_then(non_empty),
        content_raw: content_html
            .or_else(|| content_text.clone())
            .and_then(non_empty),
        content_extracted: content_text.and_then(non_empty),
        canonical_url,
        original_url,
        published_at: parse_timestamp(date_published.or(date_modified)),
        language: None::<LanguageCode>,
        thumbnail,
        attachments,
    }
}

fn parse_attachments(attachments: Vec<JsonFeedAttachment>) -> Vec<ParsedAttachment> {
    attachments
        .into_iter()
        .filter_map(|attachment| {
            let url = UrlString::try_from(attachment.url).ok()?;

            Some(ParsedAttachment {
                attachment_type: classify_attachment(attachment.mime_type.as_deref()),
                url,
                mime_type: attachment.mime_type.and_then(non_empty),
                duration: attachment.duration_in_seconds,
                size: attachment.size_in_bytes,
            })
        })
        .collect()
}

fn primary_author(authors: Option<&[JsonFeedAuthor]>) -> Option<String> {
    authors
        .into_iter()
        .flatten()
        .find_map(|author| author.name.clone().and_then(non_empty))
}

fn first_image_attachment(attachments: &[ParsedAttachment]) -> Option<UrlString> {
    attachments.iter().find_map(|attachment| {
        (attachment.attachment_type == AttachmentType::Image).then(|| attachment.url.clone())
    })
}

fn classify_attachment(mime_type: Option<&str>) -> AttachmentType {
    match mime_type {
        Some(value) if value.starts_with("image/") => AttachmentType::Image,
        Some(value) if value.starts_with("audio/") => AttachmentType::Audio,
        Some(value) if value.starts_with("video/") => AttachmentType::Video,
        _ => AttachmentType::File,
    }
}
