use std::{
    thread,
    time::{Duration, SystemTime},
};

use chrono::{SecondsFormat, Utc};
use freelyrss_core_domain::{IsoDateTime, UrlString};
use reqwest::{
    blocking::Client,
    header::{
        CONTENT_TYPE, ETAG, HeaderMap, HeaderValue, IF_MODIFIED_SINCE, IF_NONE_MATCH, LAST_MODIFIED,
    },
    redirect::Policy,
};

use crate::{
    FeedEngineError, FeedTransport, FetchRequest, FetchedFeed, NotModifiedFeed,
    TransportFetchOutput,
};

const ACCEPT_HEADER_VALUE: &str = concat!(
    "application/rss+xml, ",
    "application/atom+xml, ",
    "application/feed+json, ",
    "application/xml;q=0.9, ",
    "text/xml;q=0.9, ",
    "text/html;q=0.8, ",
    "application/xhtml+xml;q=0.8, ",
    "*/*;q=0.1"
);

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct FeedTransportOptions {
    max_attempts: usize,
    retry_delay: Duration,
    request_timeout: Duration,
    user_agent: String,
}

impl Default for FeedTransportOptions {
    fn default() -> Self {
        Self {
            max_attempts: 3,
            retry_delay: Duration::from_millis(250),
            request_timeout: Duration::from_secs(15),
            user_agent: format!("FreelyRSS/{}", env!("CARGO_PKG_VERSION")),
        }
    }
}

impl FeedTransportOptions {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_max_attempts(mut self, max_attempts: usize) -> Self {
        self.max_attempts = max_attempts.max(1);
        self
    }

    pub fn with_retry_delay(mut self, retry_delay: Duration) -> Self {
        self.retry_delay = retry_delay;
        self
    }

    pub fn with_request_timeout(mut self, request_timeout: Duration) -> Self {
        self.request_timeout = request_timeout;
        self
    }

    pub fn with_user_agent(mut self, user_agent: impl Into<String>) -> Self {
        self.user_agent = user_agent.into();
        self
    }

    pub fn max_attempts(&self) -> usize {
        self.max_attempts
    }

    pub fn retry_delay(&self) -> Duration {
        self.retry_delay
    }

    pub fn request_timeout(&self) -> Duration {
        self.request_timeout
    }

    pub fn user_agent(&self) -> &str {
        &self.user_agent
    }
}

pub struct ReqwestFeedTransport {
    executor: ReqwestExecutor,
    options: FeedTransportOptions,
}

impl ReqwestFeedTransport {
    pub fn new(options: FeedTransportOptions) -> Result<Self, FeedEngineError> {
        let client = Client::builder()
            .redirect(Policy::limited(10))
            .timeout(options.request_timeout())
            .user_agent(options.user_agent().to_owned())
            .build()
            .map_err(|error| FeedEngineError::fetch(format!("build HTTP client: {error}")))?;

        Ok(Self {
            executor: ReqwestExecutor { client },
            options,
        })
    }

    pub fn options(&self) -> &FeedTransportOptions {
        &self.options
    }
}

impl FeedTransport for ReqwestFeedTransport {
    fn fetch(&self, request: &FetchRequest) -> Result<TransportFetchOutput, FeedEngineError> {
        fetch_with_executor(&self.executor, &self.options, request)
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct HttpRequestSpec {
    url: String,
    headers: Vec<(String, String)>,
}

impl HttpRequestSpec {
    #[cfg(test)]
    fn header_value(&self, name: &str) -> Option<&str> {
        self.headers
            .iter()
            .find(|(header_name, _)| header_name.eq_ignore_ascii_case(name))
            .map(|(_, value)| value.as_str())
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct HttpResponse {
    final_url: String,
    status_code: u16,
    content_type: Option<String>,
    body: Vec<u8>,
    etag: Option<String>,
    last_modified: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
enum HttpExecutorError {
    Retryable { message: String },
    Fatal { message: String },
}

impl HttpExecutorError {
    fn retryable(message: impl Into<String>) -> Self {
        Self::Retryable {
            message: message.into(),
        }
    }

    fn fatal(message: impl Into<String>) -> Self {
        Self::Fatal {
            message: message.into(),
        }
    }

    fn is_retryable(&self) -> bool {
        matches!(self, Self::Retryable { .. })
    }

    fn message(&self) -> &str {
        match self {
            Self::Retryable { message } | Self::Fatal { message } => message,
        }
    }
}

trait HttpExecutor {
    fn execute(&self, request: &HttpRequestSpec) -> Result<HttpResponse, HttpExecutorError>;
}

struct ReqwestExecutor {
    client: Client,
}

impl HttpExecutor for ReqwestExecutor {
    fn execute(&self, request: &HttpRequestSpec) -> Result<HttpResponse, HttpExecutorError> {
        let mut http_request = self.client.get(&request.url);

        for (name, value) in &request.headers {
            let header_name =
                reqwest::header::HeaderName::try_from(name.as_str()).map_err(|error| {
                    HttpExecutorError::fatal(format!("invalid request header `{name}`: {error}"))
                })?;
            let header_value = HeaderValue::from_str(value).map_err(|error| {
                HttpExecutorError::fatal(format!(
                    "invalid request header value for `{name}`: {error}"
                ))
            })?;
            http_request = http_request.header(header_name, header_value);
        }

        let response = http_request.send().map_err(map_reqwest_error)?;
        let final_url = response.url().to_string();
        let status_code = response.status().as_u16();
        let headers = response.headers().clone();
        let body = response.bytes().map_err(map_reqwest_error)?.to_vec();

        Ok(HttpResponse {
            final_url,
            status_code,
            content_type: header_text(&headers, &CONTENT_TYPE),
            body,
            etag: header_text(&headers, &ETAG),
            last_modified: header_text(&headers, &LAST_MODIFIED),
        })
    }
}

fn fetch_with_executor(
    executor: &impl HttpExecutor,
    options: &FeedTransportOptions,
    request: &FetchRequest,
) -> Result<TransportFetchOutput, FeedEngineError> {
    let spec = build_request_spec(request);
    let max_attempts = options.max_attempts();
    let mut last_error = None;

    for attempt in 1..=max_attempts {
        match executor.execute(&spec) {
            Ok(response) if should_retry_status(response.status_code) && attempt < max_attempts => {
                last_error = Some(format!(
                    "feed request received retryable HTTP status {} for {}",
                    response.status_code, request.feed_url
                ));
                sleep_retry_delay(options.retry_delay());
            }
            Ok(response) => return map_http_response(request.clone(), response),
            Err(error) if error.is_retryable() && attempt < max_attempts => {
                last_error = Some(error.message().to_owned());
                sleep_retry_delay(options.retry_delay());
            }
            Err(error) => return Err(FeedEngineError::fetch(error.message())),
        }
    }

    Err(FeedEngineError::fetch(last_error.unwrap_or_else(|| {
        format!("feed request exhausted retries for {}", request.feed_url)
    })))
}

fn build_request_spec(request: &FetchRequest) -> HttpRequestSpec {
    let mut headers = vec![("Accept".to_owned(), ACCEPT_HEADER_VALUE.to_owned())];

    if let Some(etag) = request.etag.as_ref() {
        headers.push((IF_NONE_MATCH.as_str().to_owned(), etag.clone()));
    }

    if let Some(last_modified) = request.last_modified.as_ref() {
        headers.push((IF_MODIFIED_SINCE.as_str().to_owned(), last_modified.clone()));
    }

    HttpRequestSpec {
        url: request.feed_url.as_str().to_owned(),
        headers,
    }
}

fn map_http_response(
    request: FetchRequest,
    response: HttpResponse,
) -> Result<TransportFetchOutput, FeedEngineError> {
    let final_url = UrlString::try_from(response.final_url.clone()).map_err(|error| {
        FeedEngineError::fetch(format!(
            "final response URL `{}` is invalid: {error}",
            response.final_url
        ))
    })?;
    let fetched_at = current_iso_timestamp()?;

    if response.status_code == 304 {
        return Ok(TransportFetchOutput::NotModified(NotModifiedFeed {
            request: request.clone(),
            final_url,
            status_code: response.status_code,
            fetched_at,
            etag: response.etag.or(request.etag),
            last_modified: response.last_modified.or(request.last_modified),
        }));
    }

    if matches!(response.status_code, 401 | 403) {
        return Err(FeedEngineError::fetch_permission(format!(
            "feed request failed with HTTP status {} for {}",
            response.status_code, request.feed_url
        )));
    }

    if !(200..=299).contains(&response.status_code) {
        return Err(FeedEngineError::fetch(format!(
            "feed request failed with HTTP status {} for {}",
            response.status_code, request.feed_url
        )));
    }

    Ok(TransportFetchOutput::Modified(FetchedFeed {
        request,
        final_url,
        status_code: response.status_code,
        content_type: response.content_type,
        body: response.body,
        fetched_at,
        etag: response.etag,
        last_modified: response.last_modified,
    }))
}

fn current_iso_timestamp() -> Result<IsoDateTime, FeedEngineError> {
    let now =
        chrono::DateTime::<Utc>::from(SystemTime::now()).to_rfc3339_opts(SecondsFormat::Secs, true);

    IsoDateTime::try_from(now)
        .map_err(|error| FeedEngineError::fetch(format!("capture fetch timestamp: {error}")))
}

fn header_text(headers: &HeaderMap, name: &reqwest::header::HeaderName) -> Option<String> {
    headers
        .get(name)
        .and_then(|value| value.to_str().ok())
        .map(str::to_owned)
}

fn should_retry_status(status_code: u16) -> bool {
    matches!(status_code, 408 | 429) || (500..=599).contains(&status_code)
}

fn sleep_retry_delay(delay: Duration) {
    if !delay.is_zero() {
        thread::sleep(delay);
    }
}

fn map_reqwest_error(error: reqwest::Error) -> HttpExecutorError {
    if error.is_timeout() || error.is_connect() || error.is_request() || error.is_body() {
        return HttpExecutorError::retryable(format!("HTTP transport error: {error}"));
    }

    HttpExecutorError::fatal(format!("HTTP transport error: {error}"))
}

#[cfg(test)]
mod tests {
    use std::cell::RefCell;

    use super::*;

    struct ScriptedExecutor {
        requests: RefCell<Vec<HttpRequestSpec>>,
        responses: RefCell<Vec<Result<HttpResponse, HttpExecutorError>>>,
    }

    impl ScriptedExecutor {
        fn new(responses: Vec<Result<HttpResponse, HttpExecutorError>>) -> Self {
            Self {
                requests: RefCell::new(Vec::new()),
                responses: RefCell::new(responses),
            }
        }

        fn requests(&self) -> Vec<HttpRequestSpec> {
            self.requests.borrow().clone()
        }
    }

    impl HttpExecutor for ScriptedExecutor {
        fn execute(&self, request: &HttpRequestSpec) -> Result<HttpResponse, HttpExecutorError> {
            self.requests.borrow_mut().push(request.clone());

            self.responses.borrow_mut().remove(0)
        }
    }

    #[test]
    fn sends_conditional_headers_and_preserves_cached_metadata_on_not_modified() {
        let executor = ScriptedExecutor::new(vec![Ok(HttpResponse {
            final_url: "https://example.com/feed.xml".into(),
            status_code: 304,
            content_type: None,
            body: Vec::new(),
            etag: None,
            last_modified: None,
        })]);
        let request = FetchRequest {
            feed_id: Some(feed_id("feed-1")),
            feed_url: url("https://example.com/feed.xml"),
            etag: Some("\"etag-v1\"".into()),
            last_modified: Some("Wed, 16 Apr 2026 10:00:00 GMT".into()),
        };

        let result = fetch_with_executor(
            &executor,
            &FeedTransportOptions::new()
                .with_max_attempts(1)
                .with_retry_delay(Duration::ZERO),
            &request,
        )
        .expect("304 response should be treated as a successful incremental fetch");

        let requests = executor.requests();
        assert_eq!(requests.len(), 1);
        assert_eq!(
            requests[0].header_value(IF_NONE_MATCH.as_str()),
            Some("\"etag-v1\"")
        );
        assert_eq!(
            requests[0].header_value(IF_MODIFIED_SINCE.as_str()),
            Some("Wed, 16 Apr 2026 10:00:00 GMT")
        );

        let TransportFetchOutput::NotModified(not_modified) = result else {
            panic!("304 response should produce a not-modified transport output");
        };

        assert_eq!(not_modified.request.feed_id, Some(feed_id("feed-1")));
        assert_eq!(not_modified.final_url, url("https://example.com/feed.xml"));
        assert_eq!(not_modified.status_code, 304);
        assert_eq!(not_modified.etag.as_deref(), Some("\"etag-v1\""));
        assert_eq!(
            not_modified.last_modified.as_deref(),
            Some("Wed, 16 Apr 2026 10:00:00 GMT")
        );
        assert!(not_modified.fetched_at.as_str().ends_with('Z'));
    }

    #[test]
    fn retries_retryable_http_statuses_before_returning_a_modified_response() {
        let executor = ScriptedExecutor::new(vec![
            Ok(HttpResponse {
                final_url: "https://example.com/feed.xml".into(),
                status_code: 503,
                content_type: Some("text/plain".into()),
                body: b"temporary outage".to_vec(),
                etag: None,
                last_modified: None,
            }),
            Ok(HttpResponse {
                final_url: "https://cdn.example.com/feed.xml".into(),
                status_code: 200,
                content_type: Some("application/rss+xml".into()),
                body: b"<rss />".to_vec(),
                etag: Some("\"etag-v2\"".into()),
                last_modified: Some("Thu, 16 Apr 2026 10:30:00 GMT".into()),
            }),
        ]);
        let request = FetchRequest {
            feed_id: Some(feed_id("feed-1")),
            feed_url: url("https://example.com/feed.xml"),
            etag: Some("\"etag-v1\"".into()),
            last_modified: Some("Wed, 16 Apr 2026 10:00:00 GMT".into()),
        };

        let result = fetch_with_executor(
            &executor,
            &FeedTransportOptions::new()
                .with_max_attempts(2)
                .with_retry_delay(Duration::ZERO),
            &request,
        )
        .expect("transport should retry one transient 503 and then succeed");

        let requests = executor.requests();
        assert_eq!(requests.len(), 2);
        assert_eq!(
            requests[0].header_value(IF_NONE_MATCH.as_str()),
            Some("\"etag-v1\"")
        );
        assert_eq!(
            requests[1].header_value(IF_MODIFIED_SINCE.as_str()),
            Some("Wed, 16 Apr 2026 10:00:00 GMT")
        );

        let TransportFetchOutput::Modified(fetched) = result else {
            panic!("successful retry should return a modified feed response");
        };

        assert_eq!(fetched.request.feed_id, Some(feed_id("feed-1")));
        assert_eq!(fetched.final_url, url("https://cdn.example.com/feed.xml"));
        assert_eq!(fetched.status_code, 200);
        assert_eq!(fetched.content_type.as_deref(), Some("application/rss+xml"));
        assert_eq!(fetched.body, b"<rss />".to_vec());
        assert_eq!(fetched.etag.as_deref(), Some("\"etag-v2\""));
        assert_eq!(
            fetched.last_modified.as_deref(),
            Some("Thu, 16 Apr 2026 10:30:00 GMT")
        );
        assert!(fetched.fetched_at.as_str().ends_with('Z'));
    }

    #[test]
    fn classifies_permission_responses_without_retrying() {
        let executor = ScriptedExecutor::new(vec![Ok(HttpResponse {
            final_url: "https://example.com/private.xml".into(),
            status_code: 403,
            content_type: Some("text/plain".into()),
            body: b"forbidden".to_vec(),
            etag: None,
            last_modified: None,
        })]);
        let request = FetchRequest {
            feed_id: Some(feed_id("feed-1")),
            feed_url: url("https://example.com/private.xml"),
            etag: None,
            last_modified: None,
        };

        let error = fetch_with_executor(
            &executor,
            &FeedTransportOptions::new()
                .with_max_attempts(3)
                .with_retry_delay(Duration::ZERO),
            &request,
        )
        .expect_err("403 response should be surfaced as a permission failure");

        assert_eq!(executor.requests().len(), 1);
        assert_eq!(
            error,
            FeedEngineError::fetch_permission(
                "feed request failed with HTTP status 403 for https://example.com/private.xml",
            )
        );
    }

    fn feed_id(value: &str) -> freelyrss_core_domain::FeedId {
        freelyrss_core_domain::FeedId::try_from(value).expect("valid feed id")
    }

    fn url(value: &str) -> UrlString {
        UrlString::try_from(value).expect("valid url")
    }
}
