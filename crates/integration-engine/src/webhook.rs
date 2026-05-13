use std::time::Duration;

use reqwest::{
    blocking::Client,
    header::{CONTENT_TYPE, HeaderName, HeaderValue},
};
use serde::Serialize;

use crate::{
    ArticleIntegrationSnapshot, AutomationEventRequest, AutomationEventResponse,
    IntegrationAdapter, IntegrationCapability, IntegrationEngineError, IntegrationKind,
    IntegrationManifest, IntegrationProperty, IntegrationRequest, IntegrationResponse,
    IntegrationRunStatus,
};

pub const WEBHOOK_AUTOMATION_ADAPTER_ID: &str = "freelyrss.webhook";

const DEFAULT_TIMEOUT: Duration = Duration::from_secs(10);
const JSON_CONTENT_TYPE: &str = "application/json";
const USER_AGENT: &str = concat!("FreelyRSS/", env!("CARGO_PKG_VERSION"));

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WebhookEndpoint {
    url: String,
    headers: Vec<IntegrationProperty>,
}

impl WebhookEndpoint {
    pub fn new(url: impl Into<String>) -> Result<Self, IntegrationEngineError> {
        let url = url.into().trim().to_owned();
        validate_endpoint_url(&url)?;

        Ok(Self {
            url,
            headers: Vec::new(),
        })
    }

    pub fn with_header(
        mut self,
        key: impl Into<String>,
        value: impl Into<String>,
    ) -> Result<Self, IntegrationEngineError> {
        let key = key.into();
        let value = value.into();
        ensure_not_blank(&key, "webhook header name must not be empty")?;
        ensure_not_blank(&value, "webhook header value must not be empty")?;
        self.headers.push(IntegrationProperty { key, value });
        Ok(self)
    }

    pub fn url(&self) -> &str {
        &self.url
    }

    pub fn headers(&self) -> &[IntegrationProperty] {
        &self.headers
    }
}

pub struct WebhookAutomationAdapter {
    manifest: IntegrationManifest,
    endpoint: WebhookEndpoint,
    client: Client,
}

impl WebhookAutomationAdapter {
    pub fn new(endpoint: WebhookEndpoint) -> Result<Self, IntegrationEngineError> {
        Self::with_timeout(endpoint, DEFAULT_TIMEOUT)
    }

    pub fn with_timeout(
        endpoint: WebhookEndpoint,
        timeout: Duration,
    ) -> Result<Self, IntegrationEngineError> {
        if timeout.is_zero() {
            return Err(IntegrationEngineError::InvalidRequest {
                reason: "webhook timeout must be greater than zero",
            });
        }

        let manifest = IntegrationManifest::new(
            WEBHOOK_AUTOMATION_ADAPTER_ID,
            "FreelyRSS webhook automation adapter",
            vec![IntegrationKind::Automation],
            vec![IntegrationCapability::DispatchAutomationEvent],
        )?;
        let client = Client::builder()
            .timeout(timeout)
            .user_agent(USER_AGENT)
            .build()
            .map_err(|error| IntegrationEngineError::WebhookDeliveryFailed {
                adapter_id: WEBHOOK_AUTOMATION_ADAPTER_ID.to_owned(),
                reason: format!("build HTTP client: {error}"),
            })?;

        Ok(Self {
            manifest,
            endpoint,
            client,
        })
    }

    pub fn endpoint(&self) -> &WebhookEndpoint {
        &self.endpoint
    }
}

impl IntegrationAdapter for WebhookAutomationAdapter {
    fn manifest(&self) -> &IntegrationManifest {
        &self.manifest
    }

    fn invoke(
        &self,
        request: IntegrationRequest,
    ) -> Result<IntegrationResponse, IntegrationEngineError> {
        let capability = request.capability();
        let IntegrationRequest::Automation(request) = request else {
            return Err(IntegrationEngineError::UnsupportedOperation {
                adapter_id: self.manifest.id.clone(),
                operation: capability.operation(),
            });
        };

        self.deliver(request).map(IntegrationResponse::Automation)
    }
}

impl WebhookAutomationAdapter {
    fn deliver(
        &self,
        request: AutomationEventRequest,
    ) -> Result<AutomationEventResponse, IntegrationEngineError> {
        validate_automation_request(&request)?;

        let payload = WebhookPayload::from_request(request);
        let body = serde_json::to_vec(&payload).map_err(|error| {
            IntegrationEngineError::WebhookDeliveryFailed {
                adapter_id: self.manifest.id.clone(),
                reason: format!("serialize webhook payload: {error}"),
            }
        })?;

        let mut http_request = self
            .client
            .post(self.endpoint.url())
            .header(CONTENT_TYPE, JSON_CONTENT_TYPE)
            .header("X-FreelyRSS-Webhook-Event", payload.event_name.as_str());

        for header in self.endpoint.headers() {
            let header_name = HeaderName::try_from(header.key.as_str()).map_err(|_| {
                IntegrationEngineError::InvalidRequest {
                    reason: "webhook header name is invalid",
                }
            })?;
            let header_value = HeaderValue::from_str(header.value.as_str()).map_err(|_| {
                IntegrationEngineError::InvalidRequest {
                    reason: "webhook header value is invalid",
                }
            })?;
            http_request = http_request.header(header_name, header_value);
        }

        let response = http_request.body(body).send().map_err(|error| {
            IntegrationEngineError::WebhookDeliveryFailed {
                adapter_id: self.manifest.id.clone(),
                reason: format!("HTTP transport error: {error}"),
            }
        })?;
        let status = response.status();

        if !status.is_success() {
            return Err(IntegrationEngineError::WebhookDeliveryFailed {
                adapter_id: self.manifest.id.clone(),
                reason: format!("endpoint returned HTTP status {}", status.as_u16()),
            });
        }

        Ok(AutomationEventResponse {
            status: IntegrationRunStatus::Accepted,
            dispatched_count: 1,
            delivery_ids: vec![format!(
                "webhook:{}:{}",
                payload.event_name,
                status.as_u16()
            )],
        })
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WebhookPayload {
    pub event_name: String,
    pub article_ids: Vec<String>,
    pub articles: Vec<ArticleIntegrationSnapshot>,
    pub properties: Vec<IntegrationProperty>,
}

impl WebhookPayload {
    pub fn from_request(request: AutomationEventRequest) -> Self {
        let article_ids = if request.article_ids.is_empty() {
            request
                .articles
                .iter()
                .map(|article| article.id.clone())
                .collect()
        } else {
            request.article_ids
        };

        Self {
            event_name: request.event_name,
            article_ids,
            articles: request.articles,
            properties: request.properties,
        }
    }
}

fn validate_endpoint_url(url: &str) -> Result<(), IntegrationEngineError> {
    ensure_not_blank(url, "webhook endpoint URL must not be empty")?;

    if !(url.starts_with("http://") || url.starts_with("https://")) {
        return Err(IntegrationEngineError::InvalidRequest {
            reason: "webhook endpoint URL must use http or https",
        });
    }

    Ok(())
}

fn validate_automation_request(
    request: &AutomationEventRequest,
) -> Result<(), IntegrationEngineError> {
    ensure_not_blank(
        &request.event_name,
        "automation event name must not be empty",
    )?;

    for article_id in &request.article_ids {
        ensure_not_blank(article_id, "automation article id must not be empty")?;
    }

    for article in &request.articles {
        ensure_not_blank(&article.id, "automation article id must not be empty")?;
        ensure_not_blank(&article.title, "automation article title must not be empty")?;
    }

    for property in &request.properties {
        ensure_not_blank(&property.key, "automation property key must not be empty")?;
    }

    Ok(())
}

fn ensure_not_blank(value: &str, reason: &'static str) -> Result<(), IntegrationEngineError> {
    if value.trim().is_empty() {
        Err(IntegrationEngineError::InvalidRequest { reason })
    } else {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use std::{
        io::{Read, Write},
        net::TcpListener,
        sync::mpsc,
        thread,
    };

    use serde_json::Value;

    use super::*;
    use crate::{IntegrationRegistry, IntegrationRequest};

    #[test]
    fn webhook_adapter_posts_article_metadata_to_external_endpoint() {
        let (endpoint_url, received) = spawn_test_webhook_endpoint(202);
        let adapter =
            WebhookAutomationAdapter::new(WebhookEndpoint::new(endpoint_url).expect("endpoint"))
                .expect("webhook adapter");
        let mut registry = IntegrationRegistry::default();
        registry
            .register(Box::new(adapter))
            .expect("register webhook adapter");

        let response = registry
            .invoke(
                WEBHOOK_AUTOMATION_ADAPTER_ID,
                IntegrationRequest::Automation(AutomationEventRequest {
                    event_name: "article.share".to_owned(),
                    article_ids: Vec::new(),
                    articles: vec![article("article-1")],
                    properties: vec![IntegrationProperty {
                        key: "trigger".to_owned(),
                        value: "manual-share".to_owned(),
                    }],
                }),
            )
            .expect("deliver webhook");

        let IntegrationResponse::Automation(response) = response else {
            panic!("expected automation response");
        };
        assert_eq!(response.status, IntegrationRunStatus::Accepted);
        assert_eq!(response.dispatched_count, 1);
        assert_eq!(
            response.delivery_ids,
            vec!["webhook:article.share:202".to_owned()]
        );

        let request = received.recv().expect("captured webhook request");
        assert!(request.headers.contains("post /webhook http/1.1"));
        assert!(
            request
                .headers
                .contains("x-freelyrss-webhook-event: article.share")
        );
        assert!(request.headers.contains("content-type: application/json"));

        let body: Value = serde_json::from_str(&request.body).expect("JSON webhook body");
        assert_eq!(body["eventName"], "article.share");
        assert_eq!(body["articleIds"][0], "article-1");
        assert_eq!(body["articles"][0]["title"], "Article article-1");
        assert_eq!(body["articles"][0]["url"], "https://example.com/article-1");
        assert_eq!(body["articles"][0]["tags"][0], "rss");
        assert_eq!(body["properties"][0]["key"], "trigger");
    }

    #[test]
    fn webhook_adapter_rejects_failed_endpoint_status() {
        let (endpoint_url, _received) = spawn_test_webhook_endpoint(500);
        let adapter =
            WebhookAutomationAdapter::new(WebhookEndpoint::new(endpoint_url).expect("endpoint"))
                .expect("webhook adapter");

        let error = adapter
            .invoke(IntegrationRequest::Automation(AutomationEventRequest {
                event_name: "article.share".to_owned(),
                article_ids: vec!["article-1".to_owned()],
                articles: Vec::new(),
                properties: Vec::new(),
            }))
            .expect_err("500 response must fail delivery");

        assert_eq!(
            error,
            IntegrationEngineError::WebhookDeliveryFailed {
                adapter_id: WEBHOOK_AUTOMATION_ADAPTER_ID.to_owned(),
                reason: "endpoint returned HTTP status 500".to_owned(),
            }
        );
    }

    fn article(id: &str) -> ArticleIntegrationSnapshot {
        ArticleIntegrationSnapshot {
            id: id.to_owned(),
            title: format!("Article {id}"),
            url: Some(format!("https://example.com/{id}")),
            summary: Some("Summary text".to_owned()),
            tags: vec!["rss".to_owned()],
        }
    }

    #[derive(Debug)]
    struct CapturedRequest {
        headers: String,
        body: String,
    }

    fn spawn_test_webhook_endpoint(status_code: u16) -> (String, mpsc::Receiver<CapturedRequest>) {
        let listener = TcpListener::bind("127.0.0.1:0").expect("bind test webhook endpoint");
        let addr = listener.local_addr().expect("test endpoint address");
        let (sender, receiver) = mpsc::channel();

        thread::spawn(move || {
            let (mut stream, _) = listener.accept().expect("accept webhook request");
            let mut buffer = [0; 4096];
            let mut request = Vec::new();
            let header_end;

            loop {
                let read = stream.read(&mut buffer).expect("read request bytes");
                assert!(read > 0, "webhook request ended before headers");
                request.extend_from_slice(&buffer[..read]);

                if let Some(index) = find_header_end(&request) {
                    header_end = index;
                    break;
                }
            }

            let headers = String::from_utf8_lossy(&request[..header_end]).to_lowercase();
            let content_length = content_length(&headers);
            let body_start = header_end + 4;

            while request.len() < body_start + content_length {
                let read = stream.read(&mut buffer).expect("read request body");
                assert!(read > 0, "webhook request ended before body");
                request.extend_from_slice(&buffer[..read]);
            }

            let body = String::from_utf8_lossy(&request[body_start..body_start + content_length])
                .into_owned();
            sender
                .send(CapturedRequest { headers, body })
                .expect("send captured webhook request");

            let status_text = if status_code == 202 {
                "Accepted"
            } else {
                "Internal Server Error"
            };
            let response = format!(
                "HTTP/1.1 {status_code} {status_text}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
            );
            stream
                .write_all(response.as_bytes())
                .expect("write response");
        });

        (format!("http://{addr}/webhook"), receiver)
    }

    fn find_header_end(bytes: &[u8]) -> Option<usize> {
        bytes.windows(4).position(|window| window == b"\r\n\r\n")
    }

    fn content_length(headers: &str) -> usize {
        headers
            .lines()
            .find_map(|line| {
                line.strip_prefix("content-length:")
                    .and_then(|value| value.trim().parse().ok())
            })
            .expect("content-length header")
    }
}
