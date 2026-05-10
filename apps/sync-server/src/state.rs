use std::{
    collections::BTreeMap,
    sync::{Arc, RwLock},
};

use chrono::{SecondsFormat, Utc};
use freelyrss_sync_engine::{SyncCursor, SyncEventEnvelope};

use crate::{
    error::SyncServerError,
    model::{
        EncryptedBlobRecord, ListDevicesResponse, ListEncryptedBlobsResponse, LoginRequest,
        LoginResponse, PullEventsRequest, PullEventsResponse, RegisterDeviceRequest,
        RegisterDeviceResponse, RegisterEncryptedBlobRequest, RegisterEncryptedBlobResponse,
        SyncDeviceRecord, SyncEventDto, SyncUserRecord, UploadEventsRequest, UploadEventsResponse,
        batch_response,
    },
};

#[derive(Clone, Default)]
pub struct SyncServerState {
    inner: Arc<RwLock<SyncServerStore>>,
}

#[derive(Default)]
struct SyncServerStore {
    next_user_id: u64,
    next_device_id: u64,
    next_token_id: u64,
    next_blob_id: u64,
    users: BTreeMap<String, SyncUserRecord>,
    user_ids_by_email_hash: BTreeMap<String, String>,
    tokens: BTreeMap<String, String>,
    devices: BTreeMap<String, SyncDeviceRecord>,
    events_by_user: BTreeMap<String, BTreeMap<String, SyncEventEnvelope>>,
    blobs_by_user: BTreeMap<String, BTreeMap<String, EncryptedBlobRecord>>,
}

impl SyncServerState {
    pub fn login(&self, request: LoginRequest) -> Result<LoginResponse, SyncServerError> {
        let mut store = self.write_store()?;
        let user_id = match request
            .primary_email_hash
            .as_deref()
            .and_then(|hash| store.user_ids_by_email_hash.get(hash))
        {
            Some(existing_id) => existing_id.clone(),
            None => {
                let user_id = store.allocate_user_id();
                let user = SyncUserRecord {
                    id: user_id.clone(),
                    created_at: now_rfc3339(),
                    disabled_at: None,
                    primary_email_hash: request.primary_email_hash.clone(),
                };

                if let Some(email_hash) = request.primary_email_hash {
                    store
                        .user_ids_by_email_hash
                        .insert(email_hash, user_id.clone());
                }

                store.users.insert(user_id.clone(), user);
                user_id
            }
        };

        let user = store.users.get(&user_id).cloned().ok_or_else(|| {
            SyncServerError::Internal("authenticated user disappeared".to_owned())
        })?;
        let access_token = store.allocate_token(&user_id, request.account_hint.as_deref());

        Ok(LoginResponse { access_token, user })
    }

    pub fn authenticate(&self, token: &str) -> Result<SyncUserRecord, SyncServerError> {
        let store = self.read_store()?;
        let user_id = store
            .tokens
            .get(token)
            .ok_or(SyncServerError::Unauthorized)?;
        let user = store
            .users
            .get(user_id)
            .cloned()
            .ok_or(SyncServerError::Unauthorized)?;

        if user.disabled_at.is_some() {
            return Err(SyncServerError::Forbidden(
                "disabled users cannot access sync resources".to_owned(),
            ));
        }

        Ok(user)
    }

    pub fn register_device(
        &self,
        user_id: &str,
        request: RegisterDeviceRequest,
    ) -> Result<RegisterDeviceResponse, SyncServerError> {
        if request.display_name.trim().is_empty() {
            return Err(SyncServerError::BadRequest(
                "device displayName must not be empty".to_owned(),
            ));
        }
        if request.public_key.trim().is_empty() {
            return Err(SyncServerError::BadRequest(
                "device publicKey must not be empty".to_owned(),
            ));
        }

        let mut store = self.write_store()?;
        store.ensure_user_exists(user_id)?;

        let device = SyncDeviceRecord {
            id: store.allocate_device_id(),
            user_id: user_id.to_owned(),
            display_name: request.display_name,
            public_key: request.public_key,
            registered_at: now_rfc3339(),
            last_seen_at: None,
        };

        store.devices.insert(device.id.clone(), device.clone());

        Ok(RegisterDeviceResponse { device })
    }

    pub fn list_devices(&self, user_id: &str) -> Result<ListDevicesResponse, SyncServerError> {
        let store = self.read_store()?;
        store.ensure_user_exists(user_id)?;

        Ok(ListDevicesResponse {
            devices: store
                .devices
                .values()
                .filter(|device| device.user_id == user_id)
                .cloned()
                .collect(),
        })
    }

    pub fn upload_events(
        &self,
        user_id: &str,
        request: UploadEventsRequest,
    ) -> Result<UploadEventsResponse, SyncServerError> {
        let mut store = self.write_store()?;
        store.ensure_device_owned_by_user(user_id, &request.device_id)?;

        let mut accepted_event_ids = Vec::new();
        let mut duplicate_event_ids = Vec::new();
        let events_by_id = store.events_by_user.entry(user_id.to_owned()).or_default();

        for event in request.events {
            ensure_event_is_remote_sync_entity(&event)?;
            if event.device_id != request.device_id {
                return Err(SyncServerError::Forbidden(format!(
                    "event {} belongs to device {}, not request device {}",
                    event.id, event.device_id, request.device_id
                )));
            }

            if events_by_id.contains_key(&event.id) {
                duplicate_event_ids.push(event.id);
                continue;
            }

            let envelope = SyncEventEnvelope::from(event);
            accepted_event_ids.push(envelope.id.clone());
            events_by_id.insert(envelope.id.clone(), envelope);
        }

        Ok(UploadEventsResponse {
            accepted_event_ids,
            duplicate_event_ids,
            next_cursor: latest_cursor(events_by_id.values()).into(),
        })
    }

    pub fn pull_events(
        &self,
        user_id: &str,
        request: PullEventsRequest,
    ) -> Result<PullEventsResponse, SyncServerError> {
        let store = self.read_store()?;
        store.ensure_user_exists(user_id)?;

        let events = store
            .events_by_user
            .get(user_id)
            .map(|events_by_id| events_by_id.values().cloned().collect::<Vec<_>>())
            .unwrap_or_default();

        batch_response(&events, request.cursor.into(), request.limit)
    }

    pub fn register_blob(
        &self,
        user_id: &str,
        request: RegisterEncryptedBlobRequest,
    ) -> Result<RegisterEncryptedBlobResponse, SyncServerError> {
        let mut store = self.write_store()?;
        store.ensure_device_owned_by_user(user_id, &request.device_id)?;
        ensure_encrypted_blob_kind(&request.kind)?;

        if request.storage_key.trim().is_empty() {
            return Err(SyncServerError::BadRequest(
                "encrypted blob storageKey must not be empty".to_owned(),
            ));
        }

        let blob_id = request.id.unwrap_or_else(|| store.allocate_blob_id());
        let blob = EncryptedBlobRecord {
            id: blob_id,
            user_id: user_id.to_owned(),
            kind: request.kind,
            storage_key: request.storage_key,
            byte_size: request.byte_size,
            checksum: request.checksum,
            created_at: now_rfc3339(),
            referenced_by_event_id: request.referenced_by_event_id,
        };

        store
            .blobs_by_user
            .entry(user_id.to_owned())
            .or_default()
            .insert(blob.id.clone(), blob.clone());

        Ok(RegisterEncryptedBlobResponse { blob })
    }

    pub fn list_blobs(&self, user_id: &str) -> Result<ListEncryptedBlobsResponse, SyncServerError> {
        let store = self.read_store()?;
        store.ensure_user_exists(user_id)?;

        Ok(ListEncryptedBlobsResponse {
            blobs: store
                .blobs_by_user
                .get(user_id)
                .map(|blobs_by_id| blobs_by_id.values().cloned().collect())
                .unwrap_or_default(),
        })
    }

    fn read_store(
        &self,
    ) -> Result<std::sync::RwLockReadGuard<'_, SyncServerStore>, SyncServerError> {
        self.inner
            .read()
            .map_err(|_| SyncServerError::Internal("sync store lock was poisoned".to_owned()))
    }

    fn write_store(
        &self,
    ) -> Result<std::sync::RwLockWriteGuard<'_, SyncServerStore>, SyncServerError> {
        self.inner
            .write()
            .map_err(|_| SyncServerError::Internal("sync store lock was poisoned".to_owned()))
    }
}

impl SyncServerStore {
    fn allocate_user_id(&mut self) -> String {
        self.next_user_id += 1;
        format!("user-{}", self.next_user_id)
    }

    fn allocate_device_id(&mut self) -> String {
        self.next_device_id += 1;
        format!("device-{}", self.next_device_id)
    }

    fn allocate_blob_id(&mut self) -> String {
        self.next_blob_id += 1;
        format!("blob-{}", self.next_blob_id)
    }

    fn allocate_token(&mut self, user_id: &str, account_hint: Option<&str>) -> String {
        self.next_token_id += 1;
        let account_scope = account_hint.unwrap_or("local");
        let token = format!("dev-token-{user_id}-{account_scope}-{}", self.next_token_id);
        self.tokens.insert(token.clone(), user_id.to_owned());
        token
    }

    fn ensure_user_exists(&self, user_id: &str) -> Result<(), SyncServerError> {
        if self.users.contains_key(user_id) {
            Ok(())
        } else {
            Err(SyncServerError::Unauthorized)
        }
    }

    fn ensure_device_owned_by_user(
        &self,
        user_id: &str,
        device_id: &str,
    ) -> Result<(), SyncServerError> {
        self.ensure_user_exists(user_id)?;

        match self.devices.get(device_id) {
            Some(device) if device.user_id == user_id => Ok(()),
            Some(_) => Err(SyncServerError::Forbidden(format!(
                "device {device_id} belongs to a different user"
            ))),
            None => Err(SyncServerError::Forbidden(format!(
                "device {device_id} is not registered"
            ))),
        }
    }
}

fn latest_cursor<'events>(events: impl Iterator<Item = &'events SyncEventEnvelope>) -> SyncCursor {
    events
        .max_by_key(|event| event.key())
        .map(SyncCursor::from_event)
        .unwrap_or_default()
}

fn ensure_event_is_remote_sync_entity(event: &SyncEventDto) -> Result<(), SyncServerError> {
    if !ALLOWED_SYNC_ENTITY_TYPES.contains(&event.entity_type.as_str()) {
        return Err(SyncServerError::BadRequest(format!(
            "remote sync API only accepts SyncEvent entities; {} is not a sync-event entity",
            event.entity_type
        )));
    }

    if !ALLOWED_SYNC_CHANGE_TYPES.contains(&event.change_type.as_str()) {
        return Err(SyncServerError::BadRequest(format!(
            "remote sync API does not support change type {}",
            event.change_type
        )));
    }

    Ok(())
}

fn ensure_encrypted_blob_kind(kind: &str) -> Result<(), SyncServerError> {
    if ALLOWED_ENCRYPTED_BLOB_KINDS.contains(&kind) {
        Ok(())
    } else {
        Err(SyncServerError::BadRequest(format!(
            "encrypted blob kind {kind} is not supported"
        )))
    }
}

fn now_rfc3339() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true)
}

const ALLOWED_SYNC_ENTITY_TYPES: &[&str] = &[
    "feed",
    "folder",
    "tag",
    "feed-tag",
    "article-tag",
    "user-state",
    "annotation",
    "rule",
    "smart-folder",
];

const ALLOWED_SYNC_CHANGE_TYPES: &[&str] =
    &["create", "update", "delete", "attach", "detach", "snapshot"];

const ALLOWED_ENCRYPTED_BLOB_KINDS: &[&str] = &[
    "article-content",
    "attachment-content",
    "event-batch",
    "snapshot",
];
