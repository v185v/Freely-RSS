use std::collections::BTreeSet;

use freelyrss_core_domain::{FeedFormat, UrlString};
use scraper::{Html, Selector};
use url::Url;

use crate::{DiscoveredFeed, FeedDiscoveryResult, FeedEngineError};

pub(super) fn discover(
    source: &str,
    page_url: &UrlString,
) -> Result<FeedDiscoveryResult, FeedEngineError> {
    let document = Html::parse_document(source);
    let page_title = extract_page_title(&document);
    let base_url = discovery_base_url(&document, page_url);
    let mut candidates = Vec::new();
    let mut seen_urls = BTreeSet::new();

    for element in document.select(link_selector()) {
        let Some(rel_value) = element.value().attr("rel") else {
            continue;
        };

        if !rel_contains_alternate(rel_value) {
            continue;
        }

        let Some(raw_type) = element.value().attr("type") else {
            continue;
        };
        let Some((content_type, format)) = supported_feed_type(raw_type) else {
            continue;
        };

        let Some(href) = element
            .value()
            .attr("href")
            .map(str::trim)
            .filter(|href| !href.is_empty())
        else {
            continue;
        };

        let Some(feed_url) = resolve_url(base_url.as_ref(), page_url, href) else {
            continue;
        };

        if !seen_urls.insert(feed_url.as_str().to_owned()) {
            continue;
        }

        candidates.push(DiscoveredFeed {
            title: element
                .value()
                .attr("title")
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(ToOwned::to_owned),
            feed_url,
            content_type: Some(content_type.to_owned()),
            format: Some(format),
        });
    }

    match candidates.len() {
        0 => Ok(FeedDiscoveryResult::None {
            page_url: page_url.clone(),
            page_title,
        }),
        1 => Ok(FeedDiscoveryResult::Single {
            page_url: page_url.clone(),
            page_title,
            candidate: candidates.remove(0),
        }),
        _ => Ok(FeedDiscoveryResult::Multiple {
            page_url: page_url.clone(),
            page_title,
            candidates,
        }),
    }
}

fn extract_page_title(document: &Html) -> Option<String> {
    document
        .select(title_selector())
        .next()
        .map(|node| node.text().collect::<String>())
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
}

fn discovery_base_url(document: &Html, page_url: &UrlString) -> Option<Url> {
    let resolved_page_url = Url::parse(page_url.as_str()).ok();
    let base_href = document
        .select(base_selector())
        .next()
        .and_then(|node| node.value().attr("href"))
        .map(str::trim)
        .filter(|href| !href.is_empty());

    match (resolved_page_url, base_href) {
        (Some(page_url), Some(base_href)) => page_url.join(base_href).ok(),
        (Some(page_url), None) => Some(page_url),
        (None, Some(base_href)) => Url::parse(base_href).ok(),
        (None, None) => None,
    }
}

fn resolve_url(base_url: Option<&Url>, page_url: &UrlString, href: &str) -> Option<UrlString> {
    if let Some(base_url) = base_url
        && let Ok(resolved) = base_url.join(href)
    {
        return UrlString::try_from(resolved.to_string()).ok();
    }

    Url::parse(href)
        .ok()
        .map(|resolved| resolved.to_string())
        .or_else(|| {
            Url::parse(page_url.as_str())
                .ok()
                .and_then(|base| base.join(href).ok())
                .map(|resolved| resolved.to_string())
        })
        .and_then(|resolved| UrlString::try_from(resolved).ok())
}

fn rel_contains_alternate(value: &str) -> bool {
    value
        .split_ascii_whitespace()
        .any(|token| token.eq_ignore_ascii_case("alternate"))
}

fn supported_feed_type(value: &str) -> Option<(&'static str, FeedFormat)> {
    match value
        .split(';')
        .next()
        .map(str::trim)
        .map(|value| value.to_ascii_lowercase())
        .as_deref()
    {
        Some("application/rss+xml") => Some(("application/rss+xml", FeedFormat::Rss)),
        Some("application/atom+xml") => Some(("application/atom+xml", FeedFormat::Atom)),
        Some("application/feed+json") => Some(("application/feed+json", FeedFormat::JsonFeed)),
        _ => None,
    }
}

fn base_selector() -> &'static Selector {
    static BASE_SELECTOR: std::sync::LazyLock<Selector> =
        std::sync::LazyLock::new(|| Selector::parse("base[href]").expect("valid selector"));
    &BASE_SELECTOR
}

fn link_selector() -> &'static Selector {
    static LINK_SELECTOR: std::sync::LazyLock<Selector> =
        std::sync::LazyLock::new(|| Selector::parse("link[href]").expect("valid selector"));
    &LINK_SELECTOR
}

fn title_selector() -> &'static Selector {
    static TITLE_SELECTOR: std::sync::LazyLock<Selector> =
        std::sync::LazyLock::new(|| Selector::parse("title").expect("valid selector"));
    &TITLE_SELECTOR
}
