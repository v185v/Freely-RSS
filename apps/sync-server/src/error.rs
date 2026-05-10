use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use freelyrss_sync_engine::SyncEngineError;
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum SyncServerError {
    #[error("authorization header must contain a bearer token")]
    Unauthorized,
    #[error("{0}")]
    Forbidden(String),
    #[error("{0}")]
    BadRequest(String),
    #[error("{0}")]
    Conflict(String),
    #[error("internal sync server error: {0}")]
    Internal(String),
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ErrorResponse {
    code: &'static str,
    message: String,
}

impl From<SyncEngineError> for SyncServerError {
    fn from(error: SyncEngineError) -> Self {
        match error {
            SyncEngineError::InvalidBatchSize | SyncEngineError::InvalidCursor => {
                Self::BadRequest(error.to_string())
            }
            SyncEngineError::InvalidEventPayload { .. }
            | SyncEngineError::MissingRelationField { .. }
            | SyncEngineError::UnsupportedEvent { .. } => Self::BadRequest(error.to_string()),
        }
    }
}

impl IntoResponse for SyncServerError {
    fn into_response(self) -> Response {
        let (status, code) = match self {
            Self::Unauthorized => (StatusCode::UNAUTHORIZED, "unauthorized"),
            Self::Forbidden(_) => (StatusCode::FORBIDDEN, "forbidden"),
            Self::BadRequest(_) => (StatusCode::BAD_REQUEST, "badRequest"),
            Self::Conflict(_) => (StatusCode::CONFLICT, "conflict"),
            Self::Internal(_) => (StatusCode::INTERNAL_SERVER_ERROR, "internal"),
        };
        let message = self.to_string();

        (status, Json(ErrorResponse { code, message })).into_response()
    }
}
