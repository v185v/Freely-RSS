use freelyrss_core_domain::{AttachmentType, FeedFormat, LanguageCode};
use roxmltree::Node;

use crate::{FeedEngineError, ParsedArticle, ParsedAttachment, ParsedFeedDocument};

use super::{
    ATOM_NAMESPACE, XML_NAMESPACE, attribute_text, child_element, child_text, parse_language,
    parse_timestamp, parse_url, raw_markup,
};

pub(super) fn parse(
    source: &str,
    root: Node<'_, '_>,
) -> Result<ParsedFeedDocument, FeedEngineError> {
    let feed_language = parse_language(attribute_text(root, "lang", Some(XML_NAMESPACE)));

    Ok(ParsedFeedDocument {
        format: FeedFormat::Atom,
        title: child_text(root, "title", Some(ATOM_NAMESPACE)),
        site_url: select_link(root, "alternate"),
        icon: parse_url(
            child_text(root, "icon", Some(ATOM_NAMESPACE))
                .or_else(|| child_text(root, "logo", Some(ATOM_NAMESPACE))),
        ),
        articles: root
            .children()
            .filter(|child| {
                child.is_element()
                    && child.tag_name().name() == "entry"
                    && child.tag_name().namespace() == Some(ATOM_NAMESPACE)
            })
            .map(|entry| parse_entry(source, entry, feed_language.clone()))
            .collect(),
    })
}

fn parse_entry(
    source: &str,
    entry: Node<'_, '_>,
    feed_language: Option<LanguageCode>,
) -> ParsedArticle {
    let original_url = select_link(entry, "alternate");
    let content = child_element(entry, "content", Some(ATOM_NAMESPACE));
    let content_raw = content.and_then(|content| raw_markup(source, content));

    ParsedArticle {
        source_guid: child_text(entry, "id", Some(ATOM_NAMESPACE)),
        title: child_text(entry, "title", Some(ATOM_NAMESPACE)),
        author: child_element(entry, "author", Some(ATOM_NAMESPACE)).and_then(parse_author),
        summary: child_text(entry, "summary", Some(ATOM_NAMESPACE)),
        content_raw,
        content_extracted: None,
        canonical_url: original_url.clone(),
        original_url,
        published_at: parse_timestamp(
            child_text(entry, "published", Some(ATOM_NAMESPACE))
                .or_else(|| child_text(entry, "updated", Some(ATOM_NAMESPACE))),
        ),
        language: parse_language(attribute_text(entry, "lang", Some(XML_NAMESPACE)))
            .or(feed_language),
        thumbnail: None,
        attachments: parse_enclosures(entry),
    }
}

fn parse_author(author: Node<'_, '_>) -> Option<String> {
    child_text(author, "name", Some(ATOM_NAMESPACE))
        .or_else(|| child_text(author, "email", Some(ATOM_NAMESPACE)))
}

fn select_link(node: Node<'_, '_>, expected_rel: &str) -> Option<freelyrss_core_domain::UrlString> {
    let mut first_link = None;

    for link in node.children().filter(|child| {
        child.is_element()
            && child.tag_name().name() == "link"
            && child.tag_name().namespace() == Some(ATOM_NAMESPACE)
    }) {
        let href = parse_url(attribute_text(link, "href", None));

        if first_link.is_none() {
            first_link = href.clone();
        }

        let rel = attribute_text(link, "rel", None).unwrap_or_else(|| "alternate".to_owned());
        if rel == expected_rel {
            return href;
        }
    }

    first_link
}

fn parse_enclosures(entry: Node<'_, '_>) -> Vec<ParsedAttachment> {
    entry
        .children()
        .filter(|child| {
            child.is_element()
                && child.tag_name().name() == "link"
                && child.tag_name().namespace() == Some(ATOM_NAMESPACE)
        })
        .filter_map(|link| {
            let rel = attribute_text(link, "rel", None).unwrap_or_else(|| "alternate".to_owned());
            if rel != "enclosure" {
                return None;
            }

            let url = parse_url(attribute_text(link, "href", None))?;
            let mime_type = attribute_text(link, "type", None);

            Some(ParsedAttachment {
                attachment_type: classify_attachment(mime_type.as_deref()),
                url,
                mime_type,
                duration: None,
                size: attribute_text(link, "length", None)
                    .and_then(|value| value.parse::<i64>().ok()),
            })
        })
        .collect()
}

fn classify_attachment(mime_type: Option<&str>) -> AttachmentType {
    match mime_type {
        Some(value) if value.starts_with("image/") => AttachmentType::Image,
        Some(value) if value.starts_with("audio/") => AttachmentType::Audio,
        Some(value) if value.starts_with("video/") => AttachmentType::Video,
        _ => AttachmentType::File,
    }
}
