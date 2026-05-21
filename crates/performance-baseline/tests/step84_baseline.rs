use std::{
    error::Error,
    path::Path,
    time::{Duration, Instant},
};

use freelyrss_content_pipeline::{ContentPipelineInput, DefaultContentPipeline};
use freelyrss_core_domain::{
    FeedId, IsoDateTime, UrlString,
    sqlite::{
        ArticleSearchStore, DatabaseInitializationOptions, initialize_database,
        latest_schema_version, prepare_database_connection,
    },
};
use freelyrss_feed_engine::{
    DefaultFeedNormalizer, DefaultFeedParser, FeedEngineError, FeedFetcher, FeedTransport,
    FetchRequest, FetchedFeed, TransportFetchOutput,
};
use freelyrss_performance_baseline::{
    BULK_UPDATE_ARTICLE_COUNT, BULK_UPDATE_BUDGET_MS, BaselineObservation,
    COLD_FETCH_100_FEEDS_BUDGET_MS, CONTENT_EXTRACTION_BUDGET_MS,
    CONTENT_EXTRACTION_DOCUMENT_COUNT, LARGE_LIBRARY_ARTICLE_COUNT, LARGE_LIBRARY_FEED_COUNT,
    LARGE_LIBRARY_PAYLOAD_BUDGET_BYTES, QUEUE_WINDOW_ARTICLE_COUNT, QUEUE_WINDOW_BUDGET_MS,
    SEARCH_BUDGET_MS, STARTUP_BUDGET_MS,
};
use rusqlite::{Connection, params};
use tempfile::tempdir;

type TestResult<T> = Result<T, Box<dyn Error>>;

#[test]
fn step84_large_library_baseline_stays_within_budgets() -> TestResult<()> {
    let temp_dir = tempdir()?;
    let database_path = temp_dir.path().join("step84-large-library.sqlite3");

    initialize_database(&database_path, &DatabaseInitializationOptions::default())?;
    let mut seed_connection = Connection::open(&database_path)?;
    prepare_database_connection(&seed_connection)?;
    seed_large_library(&mut seed_connection)?;
    drop(seed_connection);

    let mut observations = Vec::new();
    observations.push(measure_repeated_millis(
        "startup-open-and-count-10k",
        STARTUP_BUDGET_MS,
        3,
        || measure_startup(&database_path),
    )?);

    let mut connection = Connection::open(&database_path)?;
    prepare_database_connection(&connection)?;
    observations.push(measure_repeated_millis(
        "queue-window-120-of-10k",
        QUEUE_WINDOW_BUDGET_MS,
        3,
        || query_queue_window(&connection),
    )?);
    observations.push(measure_repeated_millis(
        "fts-search-2k-hits",
        SEARCH_BUDGET_MS,
        3,
        || search_baseline_signal(&mut connection),
    )?);
    observations.push(measure_bulk_update(&mut connection)?);
    observations.push(measure_payload_budget(&connection)?);
    drop(connection);

    observations.push(measure_content_extraction()?);
    observations.push(measure_cold_fetch_throughput(temp_dir.path())?);

    for observation in &observations {
        observation.assert_within_budget();
        eprintln!("{}", observation.summary());
    }

    Ok(())
}

fn seed_large_library(connection: &mut Connection) -> TestResult<()> {
    let transaction = connection.transaction()?;

    {
        let mut feed_statement = transaction.prepare(
            "INSERT INTO Feed (id, title, feed_url, format, health_status)
            VALUES (?1, ?2, ?3, 'rss', 'healthy')",
        )?;

        for feed_index in 0..LARGE_LIBRARY_FEED_COUNT {
            let feed_id = format!("feed-{feed_index:03}");
            let title = format!("Performance Feed {feed_index:03}");
            let feed_url = format!("https://example.com/performance/{feed_index:03}.xml");

            feed_statement.execute(params![feed_id, title, feed_url])?;
        }
    }

    {
        let mut article_statement = transaction.prepare(
            "INSERT INTO Article (
                id,
                feed_id,
                source_guid,
                title,
                summary,
                content_raw,
                content_extracted,
                canonical_url,
                original_url,
                published_at,
                fetched_at,
                language,
                word_count,
                content_hash
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 'en', ?12, ?13)",
        )?;
        let mut state_statement = transaction.prepare(
            "INSERT INTO UserState (
                article_id,
                read_state,
                starred,
                liked,
                importance,
                read_later,
                reading_progress,
                last_opened_at
            ) VALUES (?1, 'unread', ?2, 0, ?3, ?4, 0.0, NULL)",
        )?;

        for article_index in 0..LARGE_LIBRARY_ARTICLE_COUNT {
            let feed_index = article_index % LARGE_LIBRARY_FEED_COUNT;
            let article_id = format!("article-{article_index:05}");
            let feed_id = format!("feed-{feed_index:03}");
            let source_guid = format!("guid-{article_index:05}");
            let title = format!("Performance baseline article {article_index:05}");
            let summary =
                format!("Summary for article {article_index:05} in feed {feed_index:03}.");
            let signal = if article_index % 5 == 0 {
                "baselinesignal"
            } else {
                "ordinarytoken"
            };
            let content = format!(
                "This local-first performance fixture article {article_index:05} carries {signal} \
                text for search, queue, and memory baseline measurement without network access."
            );
            let content_raw = format!("<article><p>{content}</p></article>");
            let canonical_url =
                format!("https://example.com/performance/{feed_index:03}/{article_index:05}");
            let original_url = format!("{canonical_url}?utm=feed");
            let published_at = baseline_timestamp(article_index);
            let content_hash = format!("hash-{article_index:05}");
            let starred = i64::from(article_index % 17 == 0);
            let read_later = i64::from(article_index % 19 == 0);
            let importance = if article_index % 23 == 0 {
                "high"
            } else {
                "normal"
            };

            article_statement.execute(params![
                article_id,
                feed_id,
                source_guid,
                title,
                summary,
                content_raw,
                content,
                canonical_url,
                original_url,
                published_at,
                "2026-05-21T00:00:00Z",
                24_i64,
                content_hash,
            ])?;
            state_statement.execute(params![
                format!("article-{article_index:05}"),
                starred,
                importance,
                read_later
            ])?;
        }
    }

    transaction.commit()?;
    Ok(())
}

fn measure_startup(database_path: &Path) -> TestResult<usize> {
    let connection = Connection::open(database_path)?;
    prepare_database_connection(&connection)?;
    let schema_version = latest_schema_version();
    let article_count: usize =
        connection.query_row("SELECT COUNT(*) FROM Article", [], |row| row.get(0))?;

    assert_eq!(schema_version, 8);
    assert_eq!(article_count, LARGE_LIBRARY_ARTICLE_COUNT);

    Ok(article_count)
}

fn query_queue_window(connection: &Connection) -> TestResult<usize> {
    let mut statement = connection.prepare(
        "SELECT
            article.id,
            article.title,
            COALESCE(feed.custom_name, feed.title) AS feed_display_title,
            COALESCE(user_state.read_state, 'unread') AS read_state
        FROM Article article
        INNER JOIN Feed feed ON feed.id = article.feed_id
        LEFT JOIN UserState user_state ON user_state.article_id = article.id
        ORDER BY
            CASE WHEN article.published_at IS NULL THEN 1 ELSE 0 END ASC,
            article.published_at DESC,
            article.title ASC
        LIMIT ?1 OFFSET ?2",
    )?;
    let rows = statement.query_map(
        params![QUEUE_WINDOW_ARTICLE_COUNT as i64, 4_800_i64],
        |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
            ))
        },
    )?;
    let items = rows.collect::<Result<Vec<_>, _>>()?;

    assert_eq!(items.len(), QUEUE_WINDOW_ARTICLE_COUNT);

    Ok(items.len())
}

fn search_baseline_signal(connection: &mut Connection) -> TestResult<usize> {
    let mut store = ArticleSearchStore::new(connection);
    let matches = store.search_article_ids("baselinesignal", &[])?;

    assert_eq!(matches.len(), LARGE_LIBRARY_ARTICLE_COUNT / 5);

    Ok(matches.len())
}

fn measure_bulk_update(connection: &mut Connection) -> TestResult<BaselineObservation> {
    let mut slowest = Duration::ZERO;
    let mut changed_count = 0;

    for _ in 0..3 {
        reset_bulk_fixture(connection)?;
        let article_ids = first_article_ids(connection, BULK_UPDATE_ARTICLE_COUNT)?;
        let started = Instant::now();
        changed_count = mark_articles_read(connection, &article_ids)?;
        slowest = slowest.max(started.elapsed());

        assert_eq!(changed_count, BULK_UPDATE_ARTICLE_COUNT);
    }

    Ok(BaselineObservation::milliseconds(
        "bulk-mark-1000-read",
        slowest.as_millis(),
        BULK_UPDATE_BUDGET_MS,
        changed_count,
    ))
}

fn reset_bulk_fixture(connection: &Connection) -> TestResult<()> {
    connection.execute(
        "UPDATE UserState
        SET read_state = 'unread',
            reading_progress = 0.0,
            last_opened_at = NULL
        WHERE article_id IN (
            SELECT id
            FROM Article
            ORDER BY id ASC
            LIMIT ?1
        )",
        params![BULK_UPDATE_ARTICLE_COUNT as i64],
    )?;

    Ok(())
}

fn first_article_ids(connection: &Connection, count: usize) -> TestResult<Vec<String>> {
    let mut statement = connection.prepare(
        "SELECT id
        FROM Article
        ORDER BY id ASC
        LIMIT ?1",
    )?;
    let rows = statement.query_map(params![count as i64], |row| row.get::<_, String>(0))?;

    Ok(rows.collect::<Result<Vec<_>, _>>()?)
}

fn mark_articles_read(connection: &mut Connection, article_ids: &[String]) -> TestResult<usize> {
    let transaction = connection.transaction()?;
    let mut statement = transaction.prepare(
        "UPDATE UserState
        SET read_state = 'read',
            reading_progress = 1.0,
            last_opened_at = ?2
        WHERE article_id = ?1
          AND read_state != 'read'",
    )?;
    let mut changed_count = 0;

    for article_id in article_ids {
        changed_count += statement.execute(params![article_id, "2026-05-21T12:00:00Z"])?;
    }

    drop(statement);
    transaction.commit()?;

    Ok(changed_count)
}

fn measure_payload_budget(connection: &Connection) -> TestResult<BaselineObservation> {
    let payload_bytes: i64 = connection.query_row(
        "SELECT COALESCE(SUM(
            LENGTH(title) +
            LENGTH(COALESCE(summary, '')) +
            LENGTH(COALESCE(content_raw, '')) +
            LENGTH(COALESCE(content_extracted, ''))
        ), 0)
        FROM Article",
        [],
        |row| row.get(0),
    )?;

    Ok(BaselineObservation::bytes(
        "large-library-text-payload",
        payload_bytes as u128,
        LARGE_LIBRARY_PAYLOAD_BUDGET_BYTES,
        LARGE_LIBRARY_ARTICLE_COUNT,
    ))
}

fn measure_content_extraction() -> TestResult<BaselineObservation> {
    let pipeline = DefaultContentPipeline;
    let mut slowest = Duration::ZERO;
    let mut processed_count = 0;

    for run in 0..3 {
        let started = Instant::now();

        for article_index in 0..CONTENT_EXTRACTION_DOCUMENT_COUNT {
            let result = pipeline.process(&ContentPipelineInput {
                document_url: Some(url(&format!(
                    "https://example.com/performance/extraction-{run}-{article_index}"
                ))),
                html: extraction_fixture_html(article_index),
            })?;

            assert!(result.extracted_text.as_deref().is_some_and(|text| {
                text.contains("The article body keeps enough text for scoring")
            }));
            processed_count += 1;
        }

        slowest = slowest.max(started.elapsed());
    }

    Ok(BaselineObservation::milliseconds(
        "content-extraction-25-documents",
        slowest.as_millis(),
        CONTENT_EXTRACTION_BUDGET_MS,
        processed_count / 3,
    ))
}

fn measure_cold_fetch_throughput(parent_dir: &Path) -> TestResult<BaselineObservation> {
    let database_path = parent_dir.join("step84-cold-fetch.sqlite3");
    initialize_database(&database_path, &DatabaseInitializationOptions::default())?;
    let mut slowest = Duration::ZERO;

    for run in 0..2 {
        reset_fetch_database(&database_path)?;
        let started = Instant::now();
        let stored_count = run_cold_fetch_batch(&database_path, run)?;
        slowest = slowest.max(started.elapsed());

        assert_eq!(stored_count, LARGE_LIBRARY_FEED_COUNT * 3);
    }

    Ok(BaselineObservation::milliseconds(
        "cold-fetch-100-feeds",
        slowest.as_millis(),
        COLD_FETCH_100_FEEDS_BUDGET_MS,
        LARGE_LIBRARY_FEED_COUNT,
    ))
}

fn reset_fetch_database(database_path: &Path) -> TestResult<()> {
    let connection = Connection::open(database_path)?;
    prepare_database_connection(&connection)?;
    connection.execute("DELETE FROM Feed", [])?;

    Ok(())
}

fn run_cold_fetch_batch(database_path: &Path, run: usize) -> TestResult<usize> {
    let repository = freelyrss_feed_engine::SqliteFeedRepository::new(database_path);
    let fetcher = FeedFetcher::new(
        BaselineTransport,
        DefaultFeedParser,
        DefaultFeedNormalizer,
        repository,
    );
    let mut stored_count = 0;

    for feed_index in 0..LARGE_LIBRARY_FEED_COUNT {
        let output = fetcher.run(FetchRequest {
            feed_id: Some(feed_id(&format!("feed-cold-{run}-{feed_index:03}"))),
            feed_url: url(&format!(
                "https://example.com/performance/cold-{run}-{feed_index:03}.xml"
            )),
            etag: None,
            last_modified: None,
        })?;

        let freelyrss_feed_engine::FetchRunOutput::Persisted(report) = output else {
            panic!("cold fetch baseline should persist each feed");
        };

        stored_count += report.stored_article_count;
    }

    Ok(stored_count)
}

fn measure_repeated_millis<F>(
    name: &'static str,
    budget_ms: u128,
    repeats: usize,
    mut operation: F,
) -> TestResult<BaselineObservation>
where
    F: FnMut() -> TestResult<usize>,
{
    let mut slowest = Duration::ZERO;
    let mut sample_count = 0;

    for _ in 0..repeats {
        let started = Instant::now();
        sample_count = operation()?;
        slowest = slowest.max(started.elapsed());
    }

    Ok(BaselineObservation::milliseconds(
        name,
        slowest.as_millis(),
        budget_ms,
        sample_count,
    ))
}

struct BaselineTransport;

impl FeedTransport for BaselineTransport {
    fn fetch(&self, request: &FetchRequest) -> Result<TransportFetchOutput, FeedEngineError> {
        Ok(TransportFetchOutput::Modified(FetchedFeed {
            request: request.clone(),
            final_url: request.feed_url.clone(),
            status_code: 200,
            content_type: Some("application/rss+xml".to_owned()),
            body: baseline_rss_body(),
            fetched_at: time("2026-05-21T10:00:00Z"),
            etag: None,
            last_modified: None,
        }))
    }
}

fn baseline_rss_body() -> Vec<u8> {
    br#"<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Performance Feed</title>
    <link>https://example.com/performance</link>
    <description>Performance baseline feed</description>
    <item>
      <guid>entry-1</guid>
      <title>Cold fetch entry one</title>
      <link>https://example.com/performance/entry-1</link>
      <description>First baseline fetch entry with stable content.</description>
      <pubDate>Thu, 21 May 2026 10:00:00 GMT</pubDate>
    </item>
    <item>
      <guid>entry-2</guid>
      <title>Cold fetch entry two</title>
      <link>https://example.com/performance/entry-2</link>
      <description>Second baseline fetch entry with stable content.</description>
      <pubDate>Thu, 21 May 2026 10:01:00 GMT</pubDate>
    </item>
    <item>
      <guid>entry-3</guid>
      <title>Cold fetch entry three</title>
      <link>https://example.com/performance/entry-3</link>
      <description>Third baseline fetch entry with stable content.</description>
      <pubDate>Thu, 21 May 2026 10:02:00 GMT</pubDate>
    </item>
  </channel>
</rss>"#
        .to_vec()
}

fn extraction_fixture_html(article_index: usize) -> String {
    let paragraphs = (0..16)
        .map(|paragraph_index| {
            format!(
                "<p>The article body keeps enough text for scoring in article {article_index} \
                paragraph {paragraph_index}. Local-first reader performance remains stable.</p>"
            )
        })
        .collect::<Vec<_>>()
        .join("");

    format!(
        "<html><head><meta property=\"og:image\" content=\"/images/{article_index}.png\"></head>\
        <body><nav><a href=\"/\">Home</a></nav><article class=\"post-content\">{paragraphs}\
        <img src=\"/images/fallback-{article_index}.png\" alt=\"fallback\"></article>\
        <aside>Promoted links should not dominate extraction.</aside></body></html>"
    )
}

fn baseline_timestamp(article_index: usize) -> String {
    let day = (article_index % 28) + 1;
    let hour = (article_index / 60) % 24;
    let minute = article_index % 60;

    format!("2026-05-{day:02}T{hour:02}:{minute:02}:00Z")
}

fn time(value: &str) -> IsoDateTime {
    IsoDateTime::try_from(value).expect("valid timestamp")
}

fn feed_id(value: &str) -> FeedId {
    FeedId::try_from(value).expect("valid feed id")
}

fn url(value: &str) -> UrlString {
    UrlString::try_from(value).expect("valid url")
}
