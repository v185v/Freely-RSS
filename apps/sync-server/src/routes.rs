use axum::{
    Json, Router,
    extract::State,
    http::{HeaderMap, header::AUTHORIZATION},
    routing::{get, post},
};

use crate::{
    error::SyncServerError,
    model::{
        HealthResponse, LoginRequest, LoginResponse, PullEventsRequest, PullEventsResponse,
        RegisterDeviceRequest, RegisterDeviceResponse, RegisterEncryptedBlobRequest,
        RegisterEncryptedBlobResponse, UploadEventsRequest, UploadEventsResponse,
    },
    state::SyncServerState,
};

pub fn router(state: SyncServerState) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/v1/auth/login", post(login))
        .route("/v1/devices", get(list_devices).post(register_device))
        .route("/v1/sync/events", post(upload_events))
        .route("/v1/sync/events/pull", post(pull_events))
        .route("/v1/sync/blobs", get(list_blobs).post(register_blob))
        .with_state(state)
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse { status: "ok" })
}

async fn login(
    State(state): State<SyncServerState>,
    Json(request): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, SyncServerError> {
    Ok(Json(state.login(request)?))
}

async fn register_device(
    State(state): State<SyncServerState>,
    headers: HeaderMap,
    Json(request): Json<RegisterDeviceRequest>,
) -> Result<Json<RegisterDeviceResponse>, SyncServerError> {
    let user = authenticate(&state, &headers)?;
    Ok(Json(state.register_device(&user.id, request)?))
}

async fn list_devices(
    State(state): State<SyncServerState>,
    headers: HeaderMap,
) -> Result<Json<crate::model::ListDevicesResponse>, SyncServerError> {
    let user = authenticate(&state, &headers)?;
    Ok(Json(state.list_devices(&user.id)?))
}

async fn upload_events(
    State(state): State<SyncServerState>,
    headers: HeaderMap,
    Json(request): Json<UploadEventsRequest>,
) -> Result<Json<UploadEventsResponse>, SyncServerError> {
    let user = authenticate(&state, &headers)?;
    Ok(Json(state.upload_events(&user.id, request)?))
}

async fn pull_events(
    State(state): State<SyncServerState>,
    headers: HeaderMap,
    Json(request): Json<PullEventsRequest>,
) -> Result<Json<PullEventsResponse>, SyncServerError> {
    let user = authenticate(&state, &headers)?;
    Ok(Json(state.pull_events(&user.id, request)?))
}

async fn register_blob(
    State(state): State<SyncServerState>,
    headers: HeaderMap,
    Json(request): Json<RegisterEncryptedBlobRequest>,
) -> Result<Json<RegisterEncryptedBlobResponse>, SyncServerError> {
    let user = authenticate(&state, &headers)?;
    Ok(Json(state.register_blob(&user.id, request)?))
}

async fn list_blobs(
    State(state): State<SyncServerState>,
    headers: HeaderMap,
) -> Result<Json<crate::model::ListEncryptedBlobsResponse>, SyncServerError> {
    let user = authenticate(&state, &headers)?;
    Ok(Json(state.list_blobs(&user.id)?))
}

fn authenticate(
    state: &SyncServerState,
    headers: &HeaderMap,
) -> Result<crate::model::SyncUserRecord, SyncServerError> {
    let header = headers
        .get(AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .ok_or(SyncServerError::Unauthorized)?;
    let token = header
        .strip_prefix("Bearer ")
        .ok_or(SyncServerError::Unauthorized)?;

    state.authenticate(token)
}

#[cfg(test)]
mod tests {
    use axum::{
        Router,
        body::{Body, to_bytes},
        http::{Method, Request, StatusCode, header},
    };
    use serde_json::{Value, json};
    use tower::ServiceExt;

    use crate::{SyncServerState, app};

    #[tokio::test]
    async fn completes_minimal_sync_api_flow_without_business_table_endpoints() {
        let app = app(SyncServerState::default());

        let (login_status, login_body) = request_json(
            app.clone(),
            Method::POST,
            "/v1/auth/login",
            None,
            json!({
                "accountHint": "local-dev",
                "primaryEmailHash": "sha256:reader@example.test"
            }),
        )
        .await;
        assert_eq!(login_status, StatusCode::OK);
        let token = login_body["accessToken"]
            .as_str()
            .expect("login access token")
            .to_owned();
        assert_eq!(login_body["user"]["disabledAt"], Value::Null);

        let (articles_status, _) =
            request_empty(app.clone(), Method::GET, "/v1/articles", Some(&token)).await;
        assert_eq!(articles_status, StatusCode::NOT_FOUND);

        let (empty_pull_status, empty_pull_body) = request_json(
            app.clone(),
            Method::POST,
            "/v1/sync/events/pull",
            Some(&token),
            json!({ "cursor": {}, "limit": 10 }),
        )
        .await;
        assert_eq!(empty_pull_status, StatusCode::OK);
        assert_eq!(
            empty_pull_body["events"].as_array().expect("events").len(),
            0
        );

        let (device_status, device_body) = request_json(
            app.clone(),
            Method::POST,
            "/v1/devices",
            Some(&token),
            json!({
                "displayName": "Desktop dev shell",
                "publicKey": "test-public-key"
            }),
        )
        .await;
        assert_eq!(device_status, StatusCode::OK);
        let device_id = device_body["device"]["id"]
            .as_str()
            .expect("device id")
            .to_owned();

        let event = json!({
            "id": "event-state-1",
            "entityType": "user-state",
            "entityId": "article-1",
            "changeType": "update",
            "payload": {
                "changedFields": ["read_state"],
                "value": { "read_state": "read" }
            },
            "deviceId": device_id,
            "createdAt": "2026-05-10T00:00:00Z"
        });
        let (upload_status, upload_body) = request_json(
            app.clone(),
            Method::POST,
            "/v1/sync/events",
            Some(&token),
            json!({
                "deviceId": device_id,
                "events": [event]
            }),
        )
        .await;
        assert_eq!(upload_status, StatusCode::OK);
        assert_eq!(upload_body["acceptedEventIds"], json!(["event-state-1"]));
        assert_eq!(upload_body["duplicateEventIds"], json!([]));

        let (pull_status, pull_body) = request_json(
            app.clone(),
            Method::POST,
            "/v1/sync/events/pull",
            Some(&token),
            json!({ "cursor": {}, "limit": 10 }),
        )
        .await;
        assert_eq!(pull_status, StatusCode::OK);
        assert_eq!(pull_body["events"][0]["id"], "event-state-1");
        assert_eq!(pull_body["events"][0]["entityType"], "user-state");
        assert_eq!(pull_body["nextCursor"]["lastEventId"], "event-state-1");

        let (final_pull_status, final_pull_body) = request_json(
            app.clone(),
            Method::POST,
            "/v1/sync/events/pull",
            Some(&token),
            json!({
                "cursor": pull_body["nextCursor"],
                "limit": 10
            }),
        )
        .await;
        assert_eq!(final_pull_status, StatusCode::OK);
        assert_eq!(final_pull_body["events"], json!([]));

        let (blobs_status, blobs_body) =
            request_empty(app.clone(), Method::GET, "/v1/sync/blobs", Some(&token)).await;
        assert_eq!(blobs_status, StatusCode::OK);
        assert_eq!(blobs_body["blobs"], json!([]));
    }

    #[tokio::test]
    async fn rejects_client_business_entities_as_sync_events() {
        let app = app(SyncServerState::default());
        let (_, login_body) = request_json(
            app.clone(),
            Method::POST,
            "/v1/auth/login",
            None,
            json!({ "primaryEmailHash": "sha256:boundary@example.test" }),
        )
        .await;
        let token = login_body["accessToken"]
            .as_str()
            .expect("token")
            .to_owned();
        let (_, device_body) = request_json(
            app.clone(),
            Method::POST,
            "/v1/devices",
            Some(&token),
            json!({
                "displayName": "Desktop",
                "publicKey": "test-public-key"
            }),
        )
        .await;
        let device_id = device_body["device"]["id"]
            .as_str()
            .expect("device")
            .to_owned();

        let (status, body) = request_json(
            app,
            Method::POST,
            "/v1/sync/events",
            Some(&token),
            json!({
                "deviceId": device_id,
                "events": [{
                    "id": "event-article-1",
                    "entityType": "article",
                    "entityId": "article-1",
                    "changeType": "update",
                    "payload": {
                        "changedFields": ["title"],
                        "value": { "title": "Server must not mirror Article" }
                    },
                    "deviceId": device_id,
                    "createdAt": "2026-05-10T00:00:00Z"
                }]
            }),
        )
        .await;

        assert_eq!(status, StatusCode::BAD_REQUEST);
        assert!(
            body["message"]
                .as_str()
                .expect("error message")
                .contains("not a sync-event entity")
        );
    }

    async fn request_json(
        app: Router,
        method: Method,
        uri: &str,
        token: Option<&str>,
        body: Value,
    ) -> (StatusCode, Value) {
        request(app, method, uri, token, Some(body)).await
    }

    async fn request_empty(
        app: Router,
        method: Method,
        uri: &str,
        token: Option<&str>,
    ) -> (StatusCode, Value) {
        request(app, method, uri, token, None).await
    }

    async fn request(
        app: Router,
        method: Method,
        uri: &str,
        token: Option<&str>,
        body: Option<Value>,
    ) -> (StatusCode, Value) {
        let mut builder = Request::builder().method(method).uri(uri);
        if let Some(token) = token {
            builder = builder.header(header::AUTHORIZATION, format!("Bearer {token}"));
        }

        let request = match body {
            Some(body) => builder
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(body.to_string()))
                .expect("request"),
            None => builder.body(Body::empty()).expect("request"),
        };
        let response = app.oneshot(request).await.expect("response");
        let status = response.status();
        let bytes = to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("body bytes");
        let body = if bytes.is_empty() {
            Value::Null
        } else {
            serde_json::from_slice(&bytes).unwrap_or(Value::Null)
        };

        (status, body)
    }
}
