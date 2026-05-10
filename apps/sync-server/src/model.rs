use freelyrss_sync_engine::{SyncCursor, SyncEventBatch, SyncEventEnvelope, package_event_batch};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::error::SyncServerError;

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginRequest {
    pub account_hint: Option<String>,
    pub primary_email_hash: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginResponse {
    pub access_token: String,
    pub user: SyncUserRecord,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncUserRecord {
    pub id: String,
    pub created_at: String,
    pub disabled_at: Option<String>,
    pub primary_email_hash: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegisterDeviceRequest {
    pub display_name: String,
    pub public_key: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RegisterDeviceResponse {
    pub device: SyncDeviceRecord,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncDeviceRecord {
    pub id: String,
    pub user_id: String,
    pub display_name: String,
    pub public_key: String,
    pub registered_at: String,
    pub last_seen_at: Option<String>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncCursorDto {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_created_at: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_event_id: Option<String>,
}

impl From<SyncCursorDto> for SyncCursor {
    fn from(cursor: SyncCursorDto) -> Self {
        Self {
            last_created_at: cursor.last_created_at,
            last_event_id: cursor.last_event_id,
        }
    }
}

impl From<SyncCursor> for SyncCursorDto {
    fn from(cursor: SyncCursor) -> Self {
        Self {
            last_created_at: cursor.last_created_at,
            last_event_id: cursor.last_event_id,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncEventDto {
    pub id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub change_type: String,
    pub payload: Value,
    pub device_id: String,
    pub created_at: String,
}

impl From<SyncEventEnvelope> for SyncEventDto {
    fn from(event: SyncEventEnvelope) -> Self {
        Self {
            id: event.id,
            entity_type: event.entity_type,
            entity_id: event.entity_id,
            change_type: event.change_type,
            payload: event.payload,
            device_id: event.device_id,
            created_at: event.created_at,
        }
    }
}

impl From<SyncEventDto> for SyncEventEnvelope {
    fn from(event: SyncEventDto) -> Self {
        Self::new(
            event.id,
            event.entity_type,
            event.entity_id,
            event.change_type,
            event.payload,
            event.device_id,
            event.created_at,
        )
    }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadEventsRequest {
    pub device_id: String,
    pub events: Vec<SyncEventDto>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadEventsResponse {
    pub accepted_event_ids: Vec<String>,
    pub duplicate_event_ids: Vec<String>,
    pub next_cursor: SyncCursorDto,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PullEventsRequest {
    #[serde(default)]
    pub cursor: SyncCursorDto,
    #[serde(default = "default_event_limit")]
    pub limit: usize,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PullEventsResponse {
    pub previous_cursor: SyncCursorDto,
    pub next_cursor: SyncCursorDto,
    pub events: Vec<SyncEventDto>,
    pub has_more: bool,
}

impl TryFrom<SyncEventBatch> for PullEventsResponse {
    type Error = SyncServerError;

    fn try_from(batch: SyncEventBatch) -> Result<Self, Self::Error> {
        Ok(Self {
            previous_cursor: batch.previous_cursor.into(),
            next_cursor: batch.next_cursor.into(),
            events: batch.events.into_iter().map(SyncEventDto::from).collect(),
            has_more: batch.has_more,
        })
    }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegisterEncryptedBlobRequest {
    pub id: Option<String>,
    pub device_id: String,
    pub kind: String,
    pub storage_key: String,
    pub byte_size: u64,
    pub checksum: String,
    pub referenced_by_event_id: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RegisterEncryptedBlobResponse {
    pub blob: EncryptedBlobRecord,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EncryptedBlobRecord {
    pub id: String,
    pub user_id: String,
    pub kind: String,
    pub storage_key: String,
    pub byte_size: u64,
    pub checksum: String,
    pub created_at: String,
    pub referenced_by_event_id: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListDevicesResponse {
    pub devices: Vec<SyncDeviceRecord>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListEncryptedBlobsResponse {
    pub blobs: Vec<EncryptedBlobRecord>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthResponse {
    pub status: &'static str,
}

pub fn batch_response(
    events: &[SyncEventEnvelope],
    cursor: SyncCursor,
    limit: usize,
) -> Result<PullEventsResponse, SyncServerError> {
    package_event_batch(events, &cursor, limit)?.try_into()
}

fn default_event_limit() -> usize {
    100
}
