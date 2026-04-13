use std::{cell::RefCell, rc::Rc};

use freelyrss_core_domain::{AttachmentType, FeedFormat, FeedId, IsoDateTime, UrlString};
use freelyrss_feed_engine::{
    DiscoveredFeed, FeedDiscoveryResult, FeedEngineError, FeedFetcher, FeedNormalizer, FeedParser,
    FeedRepository, FeedTransport, FetchRequest, FetchRunOutput, FetchedFeed, NormalizeContext,
    NormalizedArticleRecord, NormalizedAttachmentRecord, NormalizedFeedBatch, NormalizedFeedRecord,
    ParsedArticle, ParsedAttachment, ParsedFeedDocument, ParsedSource, PersistedFeedBatch,
};

#[derive(Clone)]
struct CallLog {
    entries: Rc<RefCell<Vec<&'static str>>>,
}

impl CallLog {
    fn new() -> Self {
        Self {
            entries: Rc::new(RefCell::new(Vec::new())),
        }
    }

    fn push(&self, value: &'static str) {
        self.entries.borrow_mut().push(value);
    }

    fn snapshot(&self) -> Vec<&'static str> {
        self.entries.borrow().clone()
    }
}

struct StubTransport {
    calls: CallLog,
}

impl FeedTransport for StubTransport {
    fn fetch(&self, request: &FetchRequest) -> Result<FetchedFeed, FeedEngineError> {
        self.calls.push("fetch");
        assert_eq!(request.feed_url, url("https://example.com/feed.xml"));
        assert_eq!(request.feed_id, Some(feed_id("feed-existing")));

        Ok(FetchedFeed {
            request: request.clone(),
            final_url: url("https://cdn.example.com/feed.xml"),
            status_code: 200,
            content_type: Some("application/rss+xml".into()),
            body: b"<rss />".to_vec(),
            fetched_at: time("2026-04-11T12:00:00Z"),
            etag: Some("\"etag-v2\"".into()),
            last_modified: Some("Fri, 11 Apr 2026 11:59:00 GMT".into()),
        })
    }
}

struct DiscoveryTransport {
    calls: CallLog,
}

impl FeedTransport for DiscoveryTransport {
    fn fetch(&self, request: &FetchRequest) -> Result<FetchedFeed, FeedEngineError> {
        self.calls.push("fetch");
        assert_eq!(request.feed_url, url("https://example.com"));
        assert_eq!(request.feed_id, None);

        Ok(FetchedFeed {
            request: request.clone(),
            final_url: url("https://example.com"),
            status_code: 200,
            content_type: Some("text/html; charset=utf-8".into()),
            body: b"<!doctype html><title>Discovery</title>".to_vec(),
            fetched_at: time("2026-04-11T12:00:00Z"),
            etag: None,
            last_modified: None,
        })
    }
}

struct StubParser {
    calls: CallLog,
}

impl FeedParser for StubParser {
    fn parse(&self, fetched: &FetchedFeed) -> Result<ParsedSource, FeedEngineError> {
        self.calls.push("parse");
        assert_eq!(fetched.final_url, url("https://cdn.example.com/feed.xml"));
        assert_eq!(fetched.body, b"<rss />".to_vec());

        Ok(ParsedSource::Feed(ParsedFeedDocument {
            format: FeedFormat::Rss,
            title: Some("Example Feed".into()),
            site_url: Some(url("https://example.com")),
            icon: Some(url("https://example.com/icon.png")),
            articles: vec![ParsedArticle {
                source_guid: Some("entry-1".into()),
                title: Some("First entry".into()),
                author: Some("FreelyRSS".into()),
                summary: Some("Pipeline test article".into()),
                content_raw: Some("<p>Pipeline test article</p>".into()),
                content_extracted: Some("Pipeline test article".into()),
                canonical_url: Some(url("https://example.com/articles/1")),
                original_url: Some(url("https://example.com/articles/1?utm=feed")),
                published_at: Some(time("2026-04-11T11:30:00Z")),
                language: None,
                thumbnail: Some(url("https://example.com/thumb.png")),
                attachments: vec![ParsedAttachment {
                    attachment_type: AttachmentType::Audio,
                    url: url("https://example.com/audio.mp3"),
                    mime_type: Some("audio/mpeg".into()),
                    duration: Some(120),
                    size: Some(4096),
                }],
            }],
        }))
    }
}

struct StubNormalizer {
    calls: CallLog,
}

impl FeedNormalizer for StubNormalizer {
    fn normalize(
        &self,
        parsed: ParsedFeedDocument,
        context: &NormalizeContext,
    ) -> Result<NormalizedFeedBatch, FeedEngineError> {
        self.calls.push("normalize");
        assert_eq!(context.feed_id, Some(feed_id("feed-existing")));
        assert_eq!(context.requested_url, url("https://example.com/feed.xml"));
        assert_eq!(context.final_url, url("https://cdn.example.com/feed.xml"));
        assert_eq!(context.fetched_at, time("2026-04-11T12:00:00Z"));
        assert_eq!(parsed.articles.len(), 1);

        Ok(NormalizedFeedBatch {
            feed: NormalizedFeedRecord {
                feed_id: context.feed_id.clone(),
                title: parsed.title.unwrap_or_else(|| "Untitled".into()),
                site_url: parsed.site_url,
                feed_url: context.final_url.clone(),
                format: parsed.format,
                icon: parsed.icon,
                etag: context.etag.clone(),
                last_modified: context.last_modified.clone(),
                last_checked_at: context.fetched_at.clone(),
                last_success_at: context.fetched_at.clone(),
            },
            articles: vec![NormalizedArticleRecord {
                source_guid: Some("entry-1".into()),
                title: "First entry".into(),
                author: Some("FreelyRSS".into()),
                summary: Some("Pipeline test article".into()),
                content_raw: Some("<p>Pipeline test article</p>".into()),
                content_extracted: Some("Pipeline test article".into()),
                canonical_url: Some(url("https://example.com/articles/1")),
                original_url: Some(url("https://example.com/articles/1?utm=feed")),
                published_at: Some(time("2026-04-11T11:30:00Z")),
                fetched_at: context.fetched_at.clone(),
                language: None,
                thumbnail: Some(url("https://example.com/thumb.png")),
                attachments: vec![NormalizedAttachmentRecord {
                    attachment_type: AttachmentType::Audio,
                    url: url("https://example.com/audio.mp3"),
                    mime_type: Some("audio/mpeg".into()),
                    duration: Some(120),
                    size: Some(4096),
                }],
            }],
        })
    }
}

struct StubRepository {
    calls: CallLog,
}

impl FeedRepository for StubRepository {
    fn persist(&self, batch: NormalizedFeedBatch) -> Result<PersistedFeedBatch, FeedEngineError> {
        self.calls.push("persist");
        assert_eq!(batch.feed.feed_id, Some(feed_id("feed-existing")));
        assert_eq!(batch.feed.format, FeedFormat::Rss);
        assert_eq!(batch.articles.len(), 1);

        Ok(PersistedFeedBatch {
            feed_id: batch.feed.feed_id.expect("existing feed id"),
            stored_article_count: batch.articles.len(),
        })
    }
}

struct FailingParser {
    calls: CallLog,
}

impl FeedParser for FailingParser {
    fn parse(&self, _fetched: &FetchedFeed) -> Result<ParsedSource, FeedEngineError> {
        self.calls.push("parse");
        Err(FeedEngineError::parse("fixture parser failure"))
    }
}

struct DiscoveryParser {
    calls: CallLog,
}

impl FeedParser for DiscoveryParser {
    fn parse(&self, fetched: &FetchedFeed) -> Result<ParsedSource, FeedEngineError> {
        self.calls.push("parse");
        assert_eq!(fetched.final_url, url("https://example.com"));

        Ok(ParsedSource::Discovery(FeedDiscoveryResult::Multiple {
            page_url: fetched.final_url.clone(),
            page_title: Some("FreelyRSS Discovery Page".into()),
            candidates: vec![
                DiscoveredFeed {
                    title: Some("RSS".into()),
                    feed_url: url("https://example.com/rss.xml"),
                    content_type: Some("application/rss+xml".into()),
                    format: Some(FeedFormat::Rss),
                },
                DiscoveredFeed {
                    title: Some("JSON Feed".into()),
                    feed_url: url("https://example.com/feed.json"),
                    content_type: Some("application/feed+json".into()),
                    format: Some(FeedFormat::JsonFeed),
                },
            ],
        }))
    }
}

struct UnexpectedNormalizer;

impl FeedNormalizer for UnexpectedNormalizer {
    fn normalize(
        &self,
        _parsed: ParsedFeedDocument,
        _context: &NormalizeContext,
    ) -> Result<NormalizedFeedBatch, FeedEngineError> {
        panic!("normalizer should not run after parse failure");
    }
}

struct UnexpectedRepository;

impl FeedRepository for UnexpectedRepository {
    fn persist(&self, _batch: NormalizedFeedBatch) -> Result<PersistedFeedBatch, FeedEngineError> {
        panic!("repository should not run after parse failure");
    }
}

#[test]
fn feed_fetcher_wires_all_stages_without_real_network_requests() {
    let calls = CallLog::new();
    let fetcher = FeedFetcher::new(
        StubTransport {
            calls: calls.clone(),
        },
        StubParser {
            calls: calls.clone(),
        },
        StubNormalizer {
            calls: calls.clone(),
        },
        StubRepository {
            calls: calls.clone(),
        },
    );

    let report = fetcher
        .run(FetchRequest {
            feed_id: Some(feed_id("feed-existing")),
            feed_url: url("https://example.com/feed.xml"),
            etag: Some("\"etag-v1\"".into()),
            last_modified: Some("Thu, 10 Apr 2026 10:00:00 GMT".into()),
        })
        .expect("pipeline should complete");
    let FetchRunOutput::Persisted(report) = report else {
        panic!("normal feed parsing should continue through normalization and persistence");
    };

    assert_eq!(
        calls.snapshot(),
        vec!["fetch", "parse", "normalize", "persist"]
    );
    assert_eq!(report.feed_id, feed_id("feed-existing"));
    assert_eq!(report.requested_url, url("https://example.com/feed.xml"));
    assert_eq!(report.final_url, url("https://cdn.example.com/feed.xml"));
    assert_eq!(report.format, FeedFormat::Rss);
    assert_eq!(report.response_status_code, 200);
    assert_eq!(report.fetched_at, time("2026-04-11T12:00:00Z"));
    assert_eq!(report.parsed_article_count, 1);
    assert_eq!(report.normalized_article_count, 1);
    assert_eq!(report.stored_article_count, 1);
}

#[test]
fn feed_fetcher_stops_after_parse_failure() {
    let calls = CallLog::new();
    let fetcher = FeedFetcher::new(
        StubTransport {
            calls: calls.clone(),
        },
        FailingParser {
            calls: calls.clone(),
        },
        UnexpectedNormalizer,
        UnexpectedRepository,
    );

    let error = fetcher
        .run(FetchRequest {
            feed_id: Some(feed_id("feed-existing")),
            feed_url: url("https://example.com/feed.xml"),
            etag: None,
            last_modified: None,
        })
        .expect_err("parse failure should bubble up");

    assert_eq!(calls.snapshot(), vec!["fetch", "parse"]);
    assert_eq!(error, FeedEngineError::parse("fixture parser failure"));
}

#[test]
fn feed_fetcher_returns_discovery_result_without_running_normalizer_or_repository() {
    let calls = CallLog::new();
    let fetcher = FeedFetcher::new(
        DiscoveryTransport {
            calls: calls.clone(),
        },
        DiscoveryParser {
            calls: calls.clone(),
        },
        UnexpectedNormalizer,
        UnexpectedRepository,
    );

    let outcome = fetcher
        .run(FetchRequest {
            feed_id: None,
            feed_url: url("https://example.com"),
            etag: None,
            last_modified: None,
        })
        .expect("HTML discovery should be returned as a success outcome");

    assert_eq!(calls.snapshot(), vec!["fetch", "parse"]);
    assert_eq!(
        outcome,
        FetchRunOutput::Discovery(FeedDiscoveryResult::Multiple {
            page_url: url("https://example.com"),
            page_title: Some("FreelyRSS Discovery Page".into()),
            candidates: vec![
                DiscoveredFeed {
                    title: Some("RSS".into()),
                    feed_url: url("https://example.com/rss.xml"),
                    content_type: Some("application/rss+xml".into()),
                    format: Some(FeedFormat::Rss),
                },
                DiscoveredFeed {
                    title: Some("JSON Feed".into()),
                    feed_url: url("https://example.com/feed.json"),
                    content_type: Some("application/feed+json".into()),
                    format: Some(FeedFormat::JsonFeed),
                },
            ],
        })
    );
}

fn feed_id(value: &str) -> FeedId {
    FeedId::try_from(value).expect("valid feed id")
}

fn time(value: &str) -> IsoDateTime {
    IsoDateTime::try_from(value).expect("valid timestamp")
}

fn url(value: &str) -> UrlString {
    UrlString::try_from(value).expect("valid url")
}
