use freelyrss_core_domain::{AttachmentType, FeedFormat};
use roxmltree::Node;

use crate::{FeedEngineError, ParsedArticle, ParsedAttachment, ParsedFeedDocument};

use super::{
    CONTENT_NAMESPACE, MEDIA_NAMESPACE, attribute_text, child_element, child_text, parse_language,
    parse_timestamp, parse_url, raw_markup,
};

pub(super) fn parse(
    source: &str,
    root: Node<'_, '_>,
) -> Result<ParsedFeedDocument, FeedEngineError> {
    let channel = child_element(root, "channel", None)
        .ok_or_else(|| FeedEngineError::parse("RSS feed is missing a <channel> element"))?;
    let feed_language = parse_language(child_text(channel, "language", None));

    Ok(ParsedFeedDocument {
        format: FeedFormat::Rss,
        title: child_text(channel, "title", None),
        site_url: parse_url(child_text(channel, "link", None)),
        icon: parse_url(
            child_element(channel, "image", None).and_then(|image| child_text(image, "url", None)),
        ),
        articles: channel
            .children()
            .filter(|child| child.is_element() && child.tag_name().name() == "item")
            .map(|item| parse_item(source, item, feed_language.clone()))
            .collect(),
    })
}

fn parse_item(
    source: &str,
    item: Node<'_, '_>,
    feed_language: Option<freelyrss_core_domain::LanguageCode>,
) -> ParsedArticle {
    let original_url = parse_url(child_text(item, "link", None));
    let (attachments, thumbnail) = parse_media(item);

    ParsedArticle {
        source_guid: child_text(item, "guid", None),
        title: child_text(item, "title", None),
        author: child_text(item, "author", None).map(|author| normalize_author(&author)),
        summary: child_text(item, "description", None),
        content_raw: child_element(item, "encoded", Some(CONTENT_NAMESPACE))
            .and_then(|encoded| raw_markup(source, encoded)),
        content_extracted: None,
        canonical_url: original_url.clone(),
        original_url,
        published_at: parse_timestamp(child_text(item, "pubDate", None)),
        language: feed_language,
        thumbnail,
        attachments,
    }
}

fn parse_media(
    item: Node<'_, '_>,
) -> (
    Vec<ParsedAttachment>,
    Option<freelyrss_core_domain::UrlString>,
) {
    let mut attachments = Vec::new();
    let mut thumbnail = None;

    if let Some(enclosure) = child_element(item, "enclosure", None)
        && let Some(url) = parse_url(attribute_text(enclosure, "url", None))
    {
        attachments.push(ParsedAttachment {
            attachment_type: classify_attachment(
                attribute_text(enclosure, "type", None).as_deref(),
                None,
            ),
            url,
            mime_type: attribute_text(enclosure, "type", None),
            duration: None,
            size: attribute_text(enclosure, "length", None)
                .and_then(|value| value.parse::<i64>().ok()),
        });
    }

    for child in item
        .children()
        .filter(|child| child.is_element() && child.tag_name().namespace() == Some(MEDIA_NAMESPACE))
    {
        match child.tag_name().name() {
            "thumbnail" if thumbnail.is_none() => {
                thumbnail = parse_url(attribute_text(child, "url", None));
            }
            "content" => {
                if let Some(url) = parse_url(attribute_text(child, "url", None)) {
                    attachments.push(ParsedAttachment {
                        attachment_type: classify_attachment(
                            attribute_text(child, "type", None).as_deref(),
                            attribute_text(child, "medium", None).as_deref(),
                        ),
                        url,
                        mime_type: attribute_text(child, "type", None),
                        duration: attribute_text(child, "duration", None)
                            .and_then(|value| value.parse::<i64>().ok()),
                        size: attribute_text(child, "fileSize", None)
                            .or_else(|| attribute_text(child, "length", None))
                            .and_then(|value| value.parse::<i64>().ok()),
                    });
                }
            }
            _ => {}
        }
    }

    (attachments, thumbnail)
}

fn normalize_author(value: &str) -> String {
    let trimmed = value.trim();

    if let Some(start) = trimmed.find('(')
        && let Some(end) = trimmed[start + 1..].find(')')
    {
        let name = trimmed[start + 1..start + 1 + end].trim();

        if !name.is_empty() {
            return name.to_owned();
        }
    }

    trimmed.to_owned()
}

fn classify_attachment(mime_type: Option<&str>, medium: Option<&str>) -> AttachmentType {
    match medium {
        Some("image") => AttachmentType::Image,
        Some("audio") => AttachmentType::Audio,
        Some("video") => AttachmentType::Video,
        _ => match mime_type {
            Some(value) if value.starts_with("image/") => AttachmentType::Image,
            Some(value) if value.starts_with("audio/") => AttachmentType::Audio,
            Some(value) if value.starts_with("video/") => AttachmentType::Video,
            _ => AttachmentType::File,
        },
    }
}
