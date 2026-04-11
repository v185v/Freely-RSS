mod atom;
mod json_feed;
mod rss;

use std::str;

use chrono::{DateTime, SecondsFormat, Utc};
use freelyrss_core_domain::{LanguageCode, UrlString};
use roxmltree::{Document, Node, ParsingOptions};

use crate::{FeedEngineError, FeedParser, FetchedFeed, ParsedFeedDocument};

const ATOM_NAMESPACE: &str = "http://www.w3.org/2005/Atom";
const CONTENT_NAMESPACE: &str = "http://purl.org/rss/1.0/modules/content/";
const MEDIA_NAMESPACE: &str = "http://search.yahoo.com/mrss/";
const XML_NAMESPACE: &str = "http://www.w3.org/XML/1998/namespace";

pub struct DefaultFeedParser;

impl FeedParser for DefaultFeedParser {
    fn parse(&self, fetched: &FetchedFeed) -> Result<ParsedFeedDocument, FeedEngineError> {
        let source = str::from_utf8(&fetched.body).map_err(|error| {
            FeedEngineError::parse(format!("feed body is not valid UTF-8: {error}"))
        })?;
        let source = source.trim_start_matches('\u{feff}').trim();

        if source.starts_with('{') {
            return json_feed::parse(source);
        }

        let document = Document::parse_with_options(
            source,
            ParsingOptions {
                allow_dtd: true,
                ..ParsingOptions::default()
            },
        )
        .map_err(|error| {
            FeedEngineError::parse(format!("feed XML could not be parsed: {error}"))
        })?;
        let root = document.root_element();

        match (root.tag_name().name(), root.tag_name().namespace()) {
            ("rss", _) => rss::parse(source, root),
            ("feed", Some(ATOM_NAMESPACE)) => atom::parse(source, root),
            (name, _) => Err(FeedEngineError::parse(format!(
                "unsupported feed root element: {name}"
            ))),
        }
    }
}

fn child_element<'a, 'input>(
    node: Node<'a, 'input>,
    name: &str,
    namespace: Option<&str>,
) -> Option<Node<'a, 'input>> {
    node.children().find(|child| {
        child.is_element()
            && child.tag_name().name() == name
            && child.tag_name().namespace() == namespace
    })
}

fn child_text<'a, 'input>(
    node: Node<'a, 'input>,
    name: &str,
    namespace: Option<&str>,
) -> Option<String> {
    child_element(node, name, namespace).and_then(descendant_text)
}

fn descendant_text<'a, 'input>(node: Node<'a, 'input>) -> Option<String> {
    let parts = node
        .descendants()
        .filter(|descendant| descendant.is_text())
        .filter_map(|descendant| descendant.text())
        .map(str::trim)
        .filter(|text| !text.is_empty())
        .collect::<Vec<_>>();

    (!parts.is_empty()).then(|| parts.join(" "))
}

fn direct_text<'a, 'input>(node: Node<'a, 'input>) -> Option<String> {
    let value = node
        .children()
        .filter_map(|child| child.text())
        .collect::<String>();
    non_empty(value)
}

fn raw_markup<'a, 'input>(source: &str, node: Node<'a, 'input>) -> Option<String> {
    let element_children = node
        .children()
        .filter(|child| child.is_element())
        .collect::<Vec<_>>();

    if !element_children.is_empty() {
        let markup = element_children
            .into_iter()
            .map(|child| source[child.range()].to_owned())
            .collect::<String>();

        return non_empty(markup);
    }

    direct_text(node)
}

fn attribute_text<'a, 'input>(
    node: Node<'a, 'input>,
    name: &str,
    namespace: Option<&str>,
) -> Option<String> {
    node.attributes()
        .find(|attribute| attribute.name() == name && attribute.namespace() == namespace)
        .and_then(|attribute| non_empty(attribute.value().to_owned()))
}

fn parse_url(value: Option<String>) -> Option<UrlString> {
    value.and_then(|value| UrlString::try_from(value).ok())
}

fn parse_language(value: Option<String>) -> Option<LanguageCode> {
    value.and_then(|value| LanguageCode::try_from(value).ok())
}

fn parse_timestamp(value: Option<String>) -> Option<freelyrss_core_domain::IsoDateTime> {
    let value = value?;

    let date_time = DateTime::parse_from_rfc3339(&value)
        .or_else(|_| DateTime::parse_from_rfc2822(&value))
        .ok()?;

    freelyrss_core_domain::IsoDateTime::try_from(
        date_time
            .with_timezone(&Utc)
            .to_rfc3339_opts(SecondsFormat::Secs, true),
    )
    .ok()
}

fn non_empty(value: String) -> Option<String> {
    let trimmed = value.trim();
    (!trimmed.is_empty()).then(|| trimmed.to_owned())
}
