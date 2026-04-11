use std::{fs, path::PathBuf};

use freelyrss_core_domain::{AttachmentType, FeedFormat, FeedId, IsoDateTime, UrlString};
use freelyrss_feed_engine::{
    DefaultFeedNormalizer, DefaultFeedParser, FeedNormalizer, FeedParser, FetchRequest,
    FetchedFeed, NormalizeContext,
};

#[test]
fn default_parser_reads_rss_2_rich_media_fixtures() {
    let parser = DefaultFeedParser;
    let fetched = fetched_fixture("rss/rss-2-rich-media.xml", "application/rss+xml");

    let parsed = parser.parse(&fetched).expect("RSS fixture should parse");

    assert_eq!(parsed.format, FeedFormat::Rss);
    assert_eq!(parsed.title.as_deref(), Some("FreelyRSS Rich Media Lab"));
    assert_eq!(
        parsed.site_url,
        Some(url("https://example.com/feeds/rich-media"))
    );
    assert_eq!(parsed.articles.len(), 2);

    let first = &parsed.articles[0];
    assert_eq!(first.source_guid.as_deref(), Some("rss-rich-media-1"));
    assert_eq!(first.title.as_deref(), Some("Podcast launch recap"));
    assert_eq!(first.author.as_deref(), Some("Audio Desk"));
    assert_eq!(first.published_at, Some(timestamp("2026-04-11T07:30:00Z")));
    assert_eq!(
        first.thumbnail,
        Some(url("https://media.example.com/images/podcast-cover.jpg"))
    );
    assert_eq!(first.attachments.len(), 1);
    assert_eq!(first.attachments[0].attachment_type, AttachmentType::Audio);
    assert_eq!(
        first.attachments[0].url,
        url("https://media.example.com/podcast/ep1.mp3")
    );
    assert_eq!(first.attachments[0].size, Some(18_204_421));

    let second = &parsed.articles[1];
    assert_eq!(second.attachments.len(), 1);
    assert_eq!(second.attachments[0].attachment_type, AttachmentType::Image);
    assert_eq!(
        second.attachments[0].mime_type.as_deref(),
        Some("image/png")
    );
    assert!(
        second.content_raw.as_deref().is_some_and(|content| content
            .contains("<img src=\"https://media.example.com/images/launch-diagram.png\"")),
        "second RSS article should retain the inline HTML body"
    );
}

#[test]
fn default_parser_reads_rss_091_legacy_fixture() {
    let parser = DefaultFeedParser;
    let fetched = fetched_fixture("rss/rss-0.91-legacy.xml", "application/rss+xml");

    let parsed = parser
        .parse(&fetched)
        .expect("legacy RSS fixture should parse");

    assert_eq!(parsed.format, FeedFormat::Rss);
    assert_eq!(
        parsed.title.as_deref(),
        Some("Legacy Netscape-style channel")
    );
    assert_eq!(parsed.articles.len(), 1);
    assert_eq!(parsed.articles[0].source_guid, None);
    assert_eq!(parsed.articles[0].author, None);
    assert_eq!(parsed.articles[0].published_at, None);
    assert_eq!(parsed.articles[0].title.as_deref(), Some("Legacy article"));
}

#[test]
fn default_parser_reads_atom_longform_fixture() {
    let parser = DefaultFeedParser;
    let fetched = fetched_fixture(
        "atom/atom-longform-multilingual.xml",
        "application/atom+xml",
    );

    let parsed = parser.parse(&fetched).expect("Atom fixture should parse");

    assert_eq!(parsed.format, FeedFormat::Atom);
    assert_eq!(
        parsed.title.as_deref(),
        Some("FreelyRSS Longform Field Guide")
    );
    assert_eq!(
        parsed.site_url,
        Some(url("https://example.com/series/longform"))
    );
    assert_eq!(parsed.articles.len(), 2);

    let first = &parsed.articles[0];
    assert_eq!(
        first.source_guid.as_deref(),
        Some("tag:example.com,2026:entry-longform-1")
    );
    assert_eq!(first.author.as_deref(), Some("Research Desk"));
    assert_eq!(
        first.language.as_ref().map(|value| value.as_str()),
        Some("en")
    );
    assert_eq!(first.published_at, Some(timestamp("2026-04-11T07:55:00Z")));
    assert!(
        first.content_raw.as_deref().is_some_and(|content| content
            .contains("<div xmlns=\"http://www.w3.org/1999/xhtml\">")
            && content.contains("FreelyRSS uses this entry")),
        "first Atom article should retain XHTML content"
    );

    let second = &parsed.articles[1];
    assert_eq!(second.author.as_deref(), Some("Localization Desk"));
    assert_eq!(second.published_at, Some(timestamp("2026-04-11T08:18:00Z")));
    assert!(
        second
            .content_raw
            .as_deref()
            .is_some_and(|content| content.contains("<p>") && content.contains("segundo")),
        "second Atom article should retain HTML content from CDATA"
    );
}

#[test]
fn default_parser_reads_json_feed_fixture() {
    let parser = DefaultFeedParser;
    let fetched = fetched_fixture("json-feed/json-feed-podcast.json", "application/feed+json");

    let parsed = parser
        .parse(&fetched)
        .expect("JSON Feed fixture should parse");

    assert_eq!(parsed.format, FeedFormat::JsonFeed);
    assert_eq!(parsed.title.as_deref(), Some("FreelyRSS JSON Feed Podcast"));
    assert_eq!(
        parsed.site_url,
        Some(url("https://example.com/podcasts/freelyrss"))
    );
    assert_eq!(parsed.articles.len(), 2);

    let first = &parsed.articles[0];
    assert_eq!(first.source_guid.as_deref(), Some("json-media-1"));
    assert_eq!(first.author.as_deref(), Some("Podcast Desk"));
    assert_eq!(first.published_at, Some(timestamp("2026-04-11T06:30:00Z")));
    assert_eq!(
        first.content_extracted.as_deref(),
        Some(
            "This entry is meant to exercise JSON Feed parsing, attachment discovery, and audio metadata normalization without relying on remote media files."
        )
    );
    assert_eq!(
        first.thumbnail,
        Some(url("https://media.example.com/images/dispatch-cover.jpg"))
    );
    assert_eq!(first.attachments.len(), 2);
    assert_eq!(first.attachments[0].attachment_type, AttachmentType::Audio);
    assert_eq!(first.attachments[0].duration, Some(1_260));
    assert_eq!(first.attachments[1].attachment_type, AttachmentType::Image);

    let second = &parsed.articles[1];
    assert_eq!(second.author.as_deref(), Some("Video Desk"));
    assert_eq!(second.published_at, Some(timestamp("2026-04-11T07:10:00Z")));
    assert!(second.content_raw.as_deref().is_some_and(|content| {
        content.contains("<p>") && content.contains("video attachment")
    }));
    assert_eq!(second.attachments.len(), 1);
    assert_eq!(second.attachments[0].attachment_type, AttachmentType::Video);
    assert_eq!(second.attachments[0].size, Some(8_421_042));
}

#[test]
fn default_normalizer_projects_parsed_feed_into_normalized_records() {
    let parser = DefaultFeedParser;
    let normalizer = DefaultFeedNormalizer;
    let fetched = fetched_fixture(
        "rss/rss-2-duplicates-and-missing-fields.xml",
        "application/rss+xml",
    );
    let parsed = parser.parse(&fetched).expect("RSS fixture should parse");
    let context = NormalizeContext::from_fetched_feed(&fetched);

    let normalized = normalizer
        .normalize(parsed, &context)
        .expect("parsed feed should normalize");

    assert_eq!(normalized.feed.feed_id, Some(feed_id("feed-rss")));
    assert_eq!(normalized.feed.format, FeedFormat::Rss);
    assert_eq!(
        normalized.feed.feed_url,
        url("https://example.com/feeds/current.xml")
    );
    assert_eq!(
        normalized.feed.last_checked_at,
        timestamp("2026-04-11T12:30:00Z")
    );
    assert_eq!(normalized.articles.len(), 3);
    assert_eq!(
        normalized.articles[0].canonical_url,
        Some(url("https://example.com/articles/duplicate-story"))
    );
    assert_eq!(
        normalized.articles[2].title,
        "Sparse article without optional fields"
    );
    assert_eq!(
        normalized.articles[2].fetched_at,
        timestamp("2026-04-11T12:30:00Z")
    );
}

#[test]
fn default_normalizer_projects_json_feed_into_normalized_records() {
    let parser = DefaultFeedParser;
    let normalizer = DefaultFeedNormalizer;
    let fetched = fetched_fixture("json-feed/json-feed-podcast.json", "application/feed+json");
    let parsed = parser
        .parse(&fetched)
        .expect("JSON Feed fixture should parse");
    let context = NormalizeContext::from_fetched_feed(&fetched);

    let normalized = normalizer
        .normalize(parsed, &context)
        .expect("JSON Feed should normalize");

    assert_eq!(normalized.feed.feed_id, Some(feed_id("feed-rss")));
    assert_eq!(normalized.feed.format, FeedFormat::JsonFeed);
    assert_eq!(normalized.feed.title, "FreelyRSS JSON Feed Podcast");
    assert_eq!(normalized.articles.len(), 2);
    assert_eq!(
        normalized.articles[0].canonical_url,
        Some(url("https://example.com/podcasts/dispatch-1"))
    );
    assert_eq!(
        normalized.articles[0].thumbnail,
        Some(url("https://media.example.com/images/dispatch-cover.jpg"))
    );
    assert_eq!(
        normalized.articles[1].attachments[0].attachment_type,
        AttachmentType::Video
    );
}

fn fetched_fixture(relative_path: &str, content_type: &str) -> FetchedFeed {
    FetchedFeed {
        request: FetchRequest {
            feed_id: Some(feed_id("feed-rss")),
            feed_url: url("https://example.com/feeds/original.xml"),
            etag: Some("\"etag-v1\"".to_owned()),
            last_modified: Some("Fri, 10 Apr 2026 23:00:00 GMT".to_owned()),
        },
        final_url: url("https://example.com/feeds/current.xml"),
        status_code: 200,
        content_type: Some(content_type.to_owned()),
        body: fs::read(fixture_path(relative_path)).expect("fixture should be readable"),
        fetched_at: timestamp("2026-04-11T12:30:00Z"),
        etag: Some("\"etag-v2\"".to_owned()),
        last_modified: Some("Sat, 11 Apr 2026 12:00:00 GMT".to_owned()),
    }
}

fn fixture_path(relative_path: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("fixtures")
        .join(relative_path)
}

fn feed_id(value: &str) -> FeedId {
    FeedId::try_from(value).expect("valid feed id")
}

fn timestamp(value: &str) -> IsoDateTime {
    IsoDateTime::try_from(value).expect("valid timestamp")
}

fn url(value: &str) -> UrlString {
    UrlString::try_from(value).expect("valid url")
}
