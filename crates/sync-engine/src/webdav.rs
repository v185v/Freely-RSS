use std::collections::BTreeMap;

use ring::digest;
use serde::{Deserialize, Serialize};

use crate::{
    EncryptedSyncEventBatch, EncryptedSyncEventEnvelope, EncryptedSyncPayload,
    SYNC_ENCRYPTION_ALGORITHM, SyncCursor, SyncEngineError, package_encrypted_event_batch,
};

pub const WEBDAV_SYNC_MANIFEST_CONTENT_TYPE: &str =
    "application/vnd.freelyrss.webdav-sync-manifest+json";
pub const WEBDAV_SYNC_EVENT_CONTENT_TYPE: &str =
    "application/vnd.freelyrss.encrypted-sync-event+json";
pub const WEBDAV_BLOB_MANIFEST_CONTENT_TYPE: &str =
    "application/vnd.freelyrss.encrypted-blob-manifest+json";

const WEBDAV_SCHEMA_VERSION: u16 = 1;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WebDavSyncNamespace {
    root: String,
}

impl WebDavSyncNamespace {
    pub fn new(root: impl Into<String>) -> Result<Self, SyncEngineError> {
        let root = root.into();
        let root = root.trim().trim_matches('/').to_owned();
        ensure_relative_key(None, &root)?;

        Ok(Self { root })
    }

    pub fn root(&self) -> &str {
        &self.root
    }

    pub fn manifest_key(&self) -> String {
        format!("{}/manifest.json", self.root)
    }

    pub fn event_prefix(&self) -> String {
        format!("{}/events/", self.root)
    }

    pub fn event_object_key(&self, event: &EncryptedSyncEventEnvelope) -> String {
        format!(
            "{}{}--{}.json",
            self.event_prefix(),
            escape_object_segment(&event.created_at),
            escape_object_segment(&event.id)
        )
    }

    pub fn blob_manifest_prefix(&self) -> String {
        format!("{}/blob-manifests/", self.root)
    }

    pub fn blob_manifest_key(&self, blob: &WebDavEncryptedBlobMetadata) -> String {
        format!(
            "{}{}--{}.json",
            self.blob_manifest_prefix(),
            escape_object_segment(&blob.kind),
            escape_object_segment(&blob.id)
        )
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebDavSyncManifest {
    pub schema_version: u16,
    pub event_prefix: String,
    pub blob_manifest_prefix: String,
    pub event_content_type: String,
    pub blob_manifest_content_type: String,
}

impl WebDavSyncManifest {
    pub fn for_namespace(namespace: &WebDavSyncNamespace) -> Self {
        Self {
            schema_version: WEBDAV_SCHEMA_VERSION,
            event_prefix: namespace.event_prefix(),
            blob_manifest_prefix: namespace.blob_manifest_prefix(),
            event_content_type: WEBDAV_SYNC_EVENT_CONTENT_TYPE.to_owned(),
            blob_manifest_content_type: WEBDAV_BLOB_MANIFEST_CONTENT_TYPE.to_owned(),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WebDavObject {
    pub key: String,
    pub content_type: String,
    pub bytes: Vec<u8>,
    pub checksum: String,
}

impl WebDavObject {
    pub fn new(
        key: impl Into<String>,
        content_type: impl Into<String>,
        bytes: Vec<u8>,
    ) -> Result<Self, SyncEngineError> {
        let key = key.into();
        ensure_relative_key(Some(&key), &key)?;
        let content_type = content_type.into();

        if content_type.trim().is_empty() {
            return Err(SyncEngineError::InvalidWebDavObject {
                key: Some(key),
                reason: "content type must not be empty",
            });
        }

        let checksum = checksum_bytes(&bytes);

        Ok(Self {
            key,
            content_type,
            bytes,
            checksum,
        })
    }
}

pub trait WebDavObjectStore {
    fn put_object(&mut self, object: WebDavObject) -> Result<(), SyncEngineError>;

    fn list_objects(&self, prefix: &str) -> Result<Vec<WebDavObject>, SyncEngineError>;
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct InMemoryWebDavObjectStore {
    objects_by_key: BTreeMap<String, WebDavObject>,
}

impl InMemoryWebDavObjectStore {
    pub fn get_object(&self, key: &str) -> Option<&WebDavObject> {
        self.objects_by_key.get(key)
    }
}

impl WebDavObjectStore for InMemoryWebDavObjectStore {
    fn put_object(&mut self, object: WebDavObject) -> Result<(), SyncEngineError> {
        ensure_relative_key(Some(&object.key), &object.key)?;
        self.objects_by_key.insert(object.key.clone(), object);
        Ok(())
    }

    fn list_objects(&self, prefix: &str) -> Result<Vec<WebDavObject>, SyncEngineError> {
        ensure_relative_key(Some(prefix), prefix.trim_end_matches('/'))?;

        Ok(self
            .objects_by_key
            .values()
            .filter(|object| object.key.starts_with(prefix))
            .cloned()
            .collect())
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebDavEncryptedBlobMetadata {
    pub id: String,
    pub user_id: String,
    pub kind: String,
    pub storage_key: String,
    pub byte_size: u64,
    pub checksum: String,
    pub created_at: String,
    pub referenced_by_event_id: Option<String>,
}

pub fn put_webdav_manifest<S: WebDavObjectStore>(
    store: &mut S,
    namespace: &WebDavSyncNamespace,
) -> Result<String, SyncEngineError> {
    let object = json_object(
        namespace.manifest_key(),
        WEBDAV_SYNC_MANIFEST_CONTENT_TYPE,
        &WebDavSyncManifest::for_namespace(namespace),
    )?;
    let key = object.key.clone();
    store.put_object(object)?;

    Ok(key)
}

pub fn put_webdav_event_objects<S: WebDavObjectStore>(
    store: &mut S,
    namespace: &WebDavSyncNamespace,
    events: &[EncryptedSyncEventEnvelope],
) -> Result<Vec<String>, SyncEngineError> {
    let mut keys = Vec::with_capacity(events.len());

    for event in events {
        ensure_webdav_event_contract(event)?;
        let key = namespace.event_object_key(event);
        let object = json_object(
            key,
            WEBDAV_SYNC_EVENT_CONTENT_TYPE,
            &EncryptedSyncEventObjectDto::from(event),
        )?;
        keys.push(object.key.clone());
        store.put_object(object)?;
    }

    Ok(keys)
}

pub fn pull_webdav_event_batch<S: WebDavObjectStore>(
    store: &S,
    namespace: &WebDavSyncNamespace,
    cursor: &SyncCursor,
    max_events: usize,
) -> Result<EncryptedSyncEventBatch, SyncEngineError> {
    let objects = store.list_objects(&namespace.event_prefix())?;
    let mut events = Vec::with_capacity(objects.len());

    for object in objects {
        if object.content_type != WEBDAV_SYNC_EVENT_CONTENT_TYPE {
            continue;
        }

        let event = event_from_webdav_object(&object)?;
        let expected_key = namespace.event_object_key(&event);

        if object.key != expected_key {
            return Err(SyncEngineError::InvalidWebDavObject {
                key: Some(object.key),
                reason: "event object key does not match encrypted event metadata",
            });
        }

        events.push(event);
    }

    package_encrypted_event_batch(&events, cursor, max_events)
}

pub fn put_webdav_blob_manifests<S: WebDavObjectStore>(
    store: &mut S,
    namespace: &WebDavSyncNamespace,
    blobs: &[WebDavEncryptedBlobMetadata],
) -> Result<Vec<String>, SyncEngineError> {
    let mut keys = Vec::with_capacity(blobs.len());

    for blob in blobs {
        ensure_webdav_blob_metadata(blob)?;
        let object = json_object(
            namespace.blob_manifest_key(blob),
            WEBDAV_BLOB_MANIFEST_CONTENT_TYPE,
            blob,
        )?;
        keys.push(object.key.clone());
        store.put_object(object)?;
    }

    Ok(keys)
}

pub fn list_webdav_blob_manifests<S: WebDavObjectStore>(
    store: &S,
    namespace: &WebDavSyncNamespace,
) -> Result<Vec<WebDavEncryptedBlobMetadata>, SyncEngineError> {
    let objects = store.list_objects(&namespace.blob_manifest_prefix())?;
    let mut blobs = Vec::with_capacity(objects.len());

    for object in objects {
        if object.content_type != WEBDAV_BLOB_MANIFEST_CONTENT_TYPE {
            continue;
        }

        let blob: WebDavEncryptedBlobMetadata =
            serde_json::from_slice(&object.bytes).map_err(|_| {
                SyncEngineError::InvalidWebDavObject {
                    key: Some(object.key.clone()),
                    reason: "blob manifest JSON could not be parsed",
                }
            })?;
        let expected_key = namespace.blob_manifest_key(&blob);

        if object.key != expected_key {
            return Err(SyncEngineError::InvalidWebDavObject {
                key: Some(object.key),
                reason: "blob manifest object key does not match blob metadata",
            });
        }

        ensure_webdav_blob_metadata(&blob)?;
        blobs.push(blob);
    }

    blobs.sort_by(|left, right| {
        left.created_at
            .cmp(&right.created_at)
            .then(left.id.cmp(&right.id))
    });

    Ok(blobs)
}

fn event_from_webdav_object(
    object: &WebDavObject,
) -> Result<EncryptedSyncEventEnvelope, SyncEngineError> {
    let dto: EncryptedSyncEventObjectDto = serde_json::from_slice(&object.bytes).map_err(|_| {
        SyncEngineError::InvalidWebDavObject {
            key: Some(object.key.clone()),
            reason: "encrypted event object JSON could not be parsed",
        }
    })?;
    let event = EncryptedSyncEventEnvelope::from(dto);
    ensure_webdav_event_contract(&event)?;

    Ok(event)
}

fn json_object<T: Serialize>(
    key: String,
    content_type: &str,
    value: &T,
) -> Result<WebDavObject, SyncEngineError> {
    let bytes = serde_json::to_vec(value).map_err(|_| SyncEngineError::InvalidWebDavObject {
        key: Some(key.clone()),
        reason: "object JSON could not be serialized",
    })?;

    WebDavObject::new(key, content_type, bytes)
}

fn ensure_webdav_event_contract(event: &EncryptedSyncEventEnvelope) -> Result<(), SyncEngineError> {
    ensure_non_empty(Some(&event.id), "event id", &event.id)?;
    ensure_non_empty(Some(&event.id), "entity id", &event.entity_id)?;
    ensure_non_empty(Some(&event.id), "device id", &event.device_id)?;
    ensure_non_empty(Some(&event.id), "created timestamp", &event.created_at)?;

    if !ALLOWED_SYNC_ENTITY_TYPES.contains(&event.entity_type.as_str()) {
        return Err(SyncEngineError::InvalidWebDavObject {
            key: Some(event.id.clone()),
            reason: "WebDAV sync events must use sync-event entity types, not client business tables",
        });
    }

    if !ALLOWED_SYNC_CHANGE_TYPES.contains(&event.change_type.as_str()) {
        return Err(SyncEngineError::InvalidWebDavObject {
            key: Some(event.id.clone()),
            reason: "WebDAV sync event change type is not supported",
        });
    }

    if event.encrypted_payload.algorithm != SYNC_ENCRYPTION_ALGORITHM {
        return Err(SyncEngineError::InvalidWebDavObject {
            key: Some(event.id.clone()),
            reason: "WebDAV sync events must use the current encrypted payload algorithm",
        });
    }

    ensure_non_empty(
        Some(&event.id),
        "encrypted payload key id",
        &event.encrypted_payload.key_id,
    )?;
    ensure_non_empty(
        Some(&event.id),
        "encrypted payload nonce",
        &event.encrypted_payload.nonce,
    )?;
    ensure_non_empty(
        Some(&event.id),
        "encrypted payload ciphertext",
        &event.encrypted_payload.ciphertext,
    )?;

    Ok(())
}

fn ensure_webdav_blob_metadata(blob: &WebDavEncryptedBlobMetadata) -> Result<(), SyncEngineError> {
    ensure_non_empty(Some(&blob.id), "blob id", &blob.id)?;
    ensure_non_empty(Some(&blob.id), "blob user id", &blob.user_id)?;
    ensure_non_empty(Some(&blob.id), "blob storage key", &blob.storage_key)?;
    ensure_non_empty(Some(&blob.id), "blob checksum", &blob.checksum)?;
    ensure_non_empty(Some(&blob.id), "blob created timestamp", &blob.created_at)?;

    if !ALLOWED_ENCRYPTED_BLOB_KINDS.contains(&blob.kind.as_str()) {
        return Err(SyncEngineError::InvalidWebDavObject {
            key: Some(blob.id.clone()),
            reason: "encrypted blob kind is not supported",
        });
    }

    let storage_key = blob.storage_key.to_ascii_lowercase();
    if storage_key.ends_with(".sqlite")
        || storage_key.ends_with(".sqlite3")
        || storage_key.ends_with(".db")
    {
        return Err(SyncEngineError::InvalidWebDavObject {
            key: Some(blob.id.clone()),
            reason: "WebDAV sync stores encrypted objects, not SQLite database files",
        });
    }

    Ok(())
}

fn ensure_non_empty(
    key: Option<&str>,
    label: &'static str,
    value: &str,
) -> Result<(), SyncEngineError> {
    if value.trim().is_empty() {
        Err(SyncEngineError::InvalidWebDavObject {
            key: key.map(ToOwned::to_owned),
            reason: label,
        })
    } else {
        Ok(())
    }
}

fn ensure_relative_key(key: Option<&str>, value: &str) -> Result<(), SyncEngineError> {
    if value.trim().is_empty() {
        return Err(SyncEngineError::InvalidWebDavObject {
            key: key.map(ToOwned::to_owned),
            reason: "object key must not be empty",
        });
    }
    if value.starts_with('/') || value.contains('\\') || value.contains("//") {
        return Err(SyncEngineError::InvalidWebDavObject {
            key: key.map(ToOwned::to_owned),
            reason: "object key must be a relative WebDAV path",
        });
    }
    if value
        .split('/')
        .any(|segment| segment == "." || segment == "..")
    {
        return Err(SyncEngineError::InvalidWebDavObject {
            key: key.map(ToOwned::to_owned),
            reason: "object key must not contain relative path segments",
        });
    }

    Ok(())
}

fn checksum_bytes(bytes: &[u8]) -> String {
    let digest = digest::digest(&digest::SHA256, bytes);
    let mut checksum = String::with_capacity(digest.as_ref().len() * 2);

    for byte in digest.as_ref() {
        checksum.push(hex_char(byte >> 4));
        checksum.push(hex_char(byte & 0x0f));
    }

    checksum
}

fn hex_char(value: u8) -> char {
    match value {
        0..=9 => (b'0' + value) as char,
        10..=15 => (b'a' + value - 10) as char,
        _ => unreachable!("hex nybble must be in range"),
    }
}

fn escape_object_segment(value: &str) -> String {
    let mut escaped = String::new();

    for byte in value.as_bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' => {
                escaped.push(*byte as char);
            }
            _ => {
                escaped.push('%');
                escaped.push(hex_char(byte >> 4).to_ascii_uppercase());
                escaped.push(hex_char(byte & 0x0f).to_ascii_uppercase());
            }
        }
    }

    escaped
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EncryptedSyncPayloadObjectDto {
    algorithm: String,
    key_id: String,
    nonce: String,
    ciphertext: String,
}

impl From<&EncryptedSyncPayload> for EncryptedSyncPayloadObjectDto {
    fn from(payload: &EncryptedSyncPayload) -> Self {
        Self {
            algorithm: payload.algorithm.clone(),
            key_id: payload.key_id.clone(),
            nonce: payload.nonce.clone(),
            ciphertext: payload.ciphertext.clone(),
        }
    }
}

impl From<EncryptedSyncPayloadObjectDto> for EncryptedSyncPayload {
    fn from(payload: EncryptedSyncPayloadObjectDto) -> Self {
        Self {
            algorithm: payload.algorithm,
            key_id: payload.key_id,
            nonce: payload.nonce,
            ciphertext: payload.ciphertext,
        }
    }
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EncryptedSyncEventObjectDto {
    id: String,
    entity_type: String,
    entity_id: String,
    change_type: String,
    encrypted_payload: EncryptedSyncPayloadObjectDto,
    device_id: String,
    created_at: String,
}

impl From<&EncryptedSyncEventEnvelope> for EncryptedSyncEventObjectDto {
    fn from(event: &EncryptedSyncEventEnvelope) -> Self {
        Self {
            id: event.id.clone(),
            entity_type: event.entity_type.clone(),
            entity_id: event.entity_id.clone(),
            change_type: event.change_type.clone(),
            encrypted_payload: (&event.encrypted_payload).into(),
            device_id: event.device_id.clone(),
            created_at: event.created_at.clone(),
        }
    }
}

impl From<EncryptedSyncEventObjectDto> for EncryptedSyncEventEnvelope {
    fn from(event: EncryptedSyncEventObjectDto) -> Self {
        Self {
            id: event.id,
            entity_type: event.entity_type,
            entity_id: event.entity_id,
            change_type: event.change_type,
            encrypted_payload: event.encrypted_payload.into(),
            device_id: event.device_id,
            created_at: event.created_at,
        }
    }
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

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::{
        InMemoryWebDavObjectStore, WEBDAV_BLOB_MANIFEST_CONTENT_TYPE, WebDavEncryptedBlobMetadata,
        WebDavObject, WebDavObjectStore, WebDavSyncNamespace, list_webdav_blob_manifests,
        pull_webdav_event_batch, put_webdav_blob_manifests, put_webdav_event_objects,
        put_webdav_manifest,
    };
    use crate::{
        ClientMasterKey, EncryptedSyncEventBatch, EncryptedSyncEventEnvelope, EncryptionNonce,
        SyncCursor, SyncEventBatch, SyncEventEnvelope, SyncReplayState, decrypt_sync_event,
        encrypt_sync_event, package_encrypted_event_batch, replay_event_batch,
    };

    #[test]
    fn webdav_event_objects_pull_like_official_encrypted_batches() {
        let namespace = namespace();
        let master_key = ClientMasterKey::from_bytes([42; 32]);
        let encrypted_events = vec![
            encrypted_event(
                &master_key,
                EventFixture {
                    id: "event-state",
                    entity_type: "user-state",
                    entity_id: "article-1",
                    change_type: "update",
                    payload: json!({
                        "changedFields": ["read_state", "reading_progress"],
                        "value": { "read_state": "read", "reading_progress": 0.8 }
                    }),
                    created_at: "2026-05-11T10:00:00Z",
                    nonce_byte: 1,
                },
            ),
            encrypted_event(
                &master_key,
                EventFixture {
                    id: "event-note",
                    entity_type: "annotation",
                    entity_id: "annotation-1",
                    change_type: "create",
                    payload: json!({
                        "changedFields": ["type", "note"],
                        "value": { "type": "note", "note": "self-hosted sync" }
                    }),
                    created_at: "2026-05-11T10:01:00Z",
                    nonce_byte: 2,
                },
            ),
        ];
        let official_batch =
            package_encrypted_event_batch(&encrypted_events, &SyncCursor::start(), 10)
                .expect("official encrypted batch");
        let mut store = InMemoryWebDavObjectStore::default();

        put_webdav_manifest(&mut store, &namespace).expect("manifest");
        let keys = put_webdav_event_objects(&mut store, &namespace, &encrypted_events)
            .expect("put events");
        let webdav_batch = pull_webdav_event_batch(&store, &namespace, &SyncCursor::start(), 10)
            .expect("pull webdav");

        assert_eq!(keys.len(), encrypted_events.len());
        assert_eq!(webdav_batch, official_batch);
        assert_converges_to_same_state(&official_batch, &webdav_batch, &master_key);
        assert!(
            keys.iter()
                .all(|key| !key.ends_with(".sqlite") && !key.ends_with(".db"))
        );
    }

    #[test]
    fn webdav_blob_manifests_preserve_encrypted_blob_metadata_only() {
        let namespace = namespace();
        let mut store = InMemoryWebDavObjectStore::default();
        let blob = WebDavEncryptedBlobMetadata {
            id: "blob-article-body".to_owned(),
            user_id: "user-1".to_owned(),
            kind: "article-content".to_owned(),
            storage_key: "freelyrss/user-1/objects/blob-article-body.bin".to_owned(),
            byte_size: 4096,
            checksum: "sha256:encrypted-body".to_owned(),
            created_at: "2026-05-11T10:02:00Z".to_owned(),
            referenced_by_event_id: Some("event-state".to_owned()),
        };

        let keys = put_webdav_blob_manifests(&mut store, &namespace, std::slice::from_ref(&blob))
            .expect("put blob manifests");
        let listed = list_webdav_blob_manifests(&store, &namespace).expect("list blobs");

        assert_eq!(listed, vec![blob]);
        assert_eq!(keys.len(), 1);
        assert_eq!(
            store
                .get_object(&keys[0])
                .expect("blob manifest object")
                .content_type,
            WEBDAV_BLOB_MANIFEST_CONTENT_TYPE
        );
    }

    #[test]
    fn webdav_adapter_rejects_business_table_events_and_sqlite_blob_paths() {
        let namespace = namespace();
        let mut store = InMemoryWebDavObjectStore::default();
        let master_key = ClientMasterKey::from_bytes([7; 32]);
        let business_event = encrypted_event(
            &master_key,
            EventFixture {
                id: "event-business-table",
                entity_type: "article",
                entity_id: "article-1",
                change_type: "update",
                payload: json!({ "value": { "title": "must stay local" } }),
                created_at: "2026-05-11T10:00:00Z",
                nonce_byte: 3,
            },
        );
        let sqlite_blob = WebDavEncryptedBlobMetadata {
            id: "blob-sqlite".to_owned(),
            user_id: "user-1".to_owned(),
            kind: "snapshot".to_owned(),
            storage_key: "shared/freelyrss.sqlite".to_owned(),
            byte_size: 10,
            checksum: "sha256:nope".to_owned(),
            created_at: "2026-05-11T10:02:00Z".to_owned(),
            referenced_by_event_id: None,
        };

        assert!(
            put_webdav_event_objects(&mut store, &namespace, &[business_event]).is_err(),
            "WebDAV adapter must not accept client business tables as remote events"
        );
        assert!(
            put_webdav_blob_manifests(&mut store, &namespace, &[sqlite_blob]).is_err(),
            "WebDAV adapter must not model SQLite file sharing as sync"
        );
    }

    #[test]
    fn webdav_pull_ignores_non_sync_objects_under_the_same_account_root() {
        let namespace = namespace();
        let mut store = InMemoryWebDavObjectStore::default();

        store
            .put_object(
                WebDavObject::new(
                    format!("{}/scratch.txt", namespace.root()),
                    "text/plain",
                    b"not part of sync".to_vec(),
                )
                .expect("object"),
            )
            .expect("put scratch");

        let batch = pull_webdav_event_batch(&store, &namespace, &SyncCursor::start(), 10)
            .expect("empty event batch");

        assert!(batch.events.is_empty());
        assert_eq!(batch.next_cursor, SyncCursor::start());
    }

    fn assert_converges_to_same_state(
        official_batch: &EncryptedSyncEventBatch,
        webdav_batch: &EncryptedSyncEventBatch,
        master_key: &ClientMasterKey,
    ) {
        let official = decrypt_batch(official_batch, master_key);
        let webdav = decrypt_batch(webdav_batch, master_key);
        let mut official_state = SyncReplayState::default();
        let mut webdav_state = SyncReplayState::default();

        replay_event_batch(&mut official_state, &official).expect("replay official batch");
        replay_event_batch(&mut webdav_state, &webdav).expect("replay WebDAV batch");

        assert_eq!(official_state, webdav_state);
    }

    fn decrypt_batch(
        batch: &EncryptedSyncEventBatch,
        master_key: &ClientMasterKey,
    ) -> SyncEventBatch {
        SyncEventBatch {
            previous_cursor: batch.previous_cursor.clone(),
            next_cursor: batch.next_cursor.clone(),
            events: batch
                .events
                .iter()
                .map(|event| decrypt_sync_event(event, master_key).expect("decrypt event"))
                .collect(),
            has_more: batch.has_more,
        }
    }

    struct EventFixture<'a> {
        id: &'a str,
        entity_type: &'a str,
        entity_id: &'a str,
        change_type: &'a str,
        payload: serde_json::Value,
        created_at: &'a str,
        nonce_byte: u8,
    }

    fn encrypted_event(
        master_key: &ClientMasterKey,
        fixture: EventFixture<'_>,
    ) -> EncryptedSyncEventEnvelope {
        let event = SyncEventEnvelope::new(
            fixture.id,
            fixture.entity_type,
            fixture.entity_id,
            fixture.change_type,
            fixture.payload,
            "device-a",
            fixture.created_at,
        );

        encrypt_sync_event(
            &event,
            master_key,
            EncryptionNonce::from_bytes([fixture.nonce_byte; 12]),
        )
        .expect("encrypt event")
    }

    fn namespace() -> WebDavSyncNamespace {
        WebDavSyncNamespace::new("freelyrss/users/user-1").expect("namespace")
    }
}
