use std::{convert::TryInto, num::NonZeroU32};

use base64::{Engine, engine::general_purpose::STANDARD_NO_PAD};
use ring::{
    aead::{self, Aad, LessSafeKey, Nonce, UnboundKey},
    digest, pbkdf2,
};
use serde_json::Value;

use crate::{SyncCursor, SyncEngineError, SyncEventKey};

pub const SYNC_ENCRYPTION_ALGORITHM: &str = "AES-256-GCM";
pub const SYNC_RECOVERY_KDF: &str = "PBKDF2-HMAC-SHA256:210000";

const MASTER_KEY_LEN: usize = 32;
const NONCE_LEN: usize = 12;
const RECOVERY_SALT_LEN: usize = 16;
const RECOVERY_ITERATIONS: u32 = 210_000;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ClientMasterKey {
    bytes: [u8; MASTER_KEY_LEN],
    key_id: String,
}

impl ClientMasterKey {
    pub fn from_bytes(bytes: [u8; MASTER_KEY_LEN]) -> Self {
        let digest = digest::digest(&digest::SHA256, &bytes);
        let key_id = encode_bytes(&digest.as_ref()[..16]);

        Self { bytes, key_id }
    }

    pub fn as_bytes(&self) -> &[u8; MASTER_KEY_LEN] {
        &self.bytes
    }

    pub fn key_id(&self) -> &str {
        &self.key_id
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct EncryptionNonce([u8; NONCE_LEN]);

impl EncryptionNonce {
    pub fn from_bytes(bytes: [u8; NONCE_LEN]) -> Self {
        Self(bytes)
    }

    fn as_bytes(self) -> [u8; NONCE_LEN] {
        self.0
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct RecoverySalt([u8; RECOVERY_SALT_LEN]);

impl RecoverySalt {
    pub fn from_bytes(bytes: [u8; RECOVERY_SALT_LEN]) -> Self {
        Self(bytes)
    }

    fn as_bytes(self) -> [u8; RECOVERY_SALT_LEN] {
        self.0
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EncryptedSyncPayload {
    pub algorithm: String,
    pub key_id: String,
    pub nonce: String,
    pub ciphertext: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EncryptedSyncEventEnvelope {
    pub id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub change_type: String,
    pub encrypted_payload: EncryptedSyncPayload,
    pub device_id: String,
    pub created_at: String,
}

impl EncryptedSyncEventEnvelope {
    pub fn key(&self) -> SyncEventKey {
        SyncEventKey {
            created_at: self.created_at.clone(),
            event_id: self.id.clone(),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EncryptedSyncEventBatch {
    pub previous_cursor: SyncCursor,
    pub next_cursor: SyncCursor,
    pub events: Vec<EncryptedSyncEventEnvelope>,
    pub has_more: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MasterKeyRecoveryKit {
    pub algorithm: String,
    pub key_derivation: String,
    pub salt: String,
    pub nonce: String,
    pub wrapped_master_key: String,
    pub master_key_id: String,
}

pub fn encrypt_sync_event(
    event: &crate::SyncEventEnvelope,
    master_key: &ClientMasterKey,
    nonce: EncryptionNonce,
) -> Result<EncryptedSyncEventEnvelope, SyncEngineError> {
    let plaintext =
        serde_json::to_vec(&event.payload).map_err(|_| SyncEngineError::EncryptionFailed {
            reason: "payload JSON could not be serialized",
        })?;
    let aad = clear_event_aad(event, master_key.key_id());
    let encrypted_payload = encrypt_bytes(&plaintext, master_key, nonce, &aad)?;

    Ok(EncryptedSyncEventEnvelope {
        id: event.id.clone(),
        entity_type: event.entity_type.clone(),
        entity_id: event.entity_id.clone(),
        change_type: event.change_type.clone(),
        encrypted_payload,
        device_id: event.device_id.clone(),
        created_at: event.created_at.clone(),
    })
}

pub fn decrypt_sync_event(
    event: &EncryptedSyncEventEnvelope,
    master_key: &ClientMasterKey,
) -> Result<crate::SyncEventEnvelope, SyncEngineError> {
    if event.encrypted_payload.key_id != master_key.key_id() {
        return Err(SyncEngineError::InvalidCryptoKey {
            reason: "encrypted payload key id does not match the provided master key",
        });
    }

    let aad = encrypted_event_aad(event);
    let plaintext = decrypt_bytes(&event.encrypted_payload, master_key, &aad, Some(&event.id))?;
    let payload: Value =
        serde_json::from_slice(&plaintext).map_err(|_| SyncEngineError::InvalidEventPayload {
            event_id: event.id.clone(),
            reason: "decrypted payload is not valid JSON",
        })?;

    Ok(crate::SyncEventEnvelope::new(
        event.id.clone(),
        event.entity_type.clone(),
        event.entity_id.clone(),
        event.change_type.clone(),
        payload,
        event.device_id.clone(),
        event.created_at.clone(),
    ))
}

pub fn package_encrypted_event_batch(
    events: &[EncryptedSyncEventEnvelope],
    cursor: &SyncCursor,
    max_events: usize,
) -> Result<EncryptedSyncEventBatch, SyncEngineError> {
    if max_events == 0 {
        return Err(SyncEngineError::InvalidBatchSize);
    }

    if !cursor.is_start() && (cursor.last_created_at.is_none() || cursor.last_event_id.is_none()) {
        return Err(SyncEngineError::InvalidCursor);
    }

    let mut available = Vec::new();

    for event in events {
        if encrypted_event_is_after(cursor, event)? {
            available.push(event.clone());
        }
    }

    available.sort_by_key(EncryptedSyncEventEnvelope::key);

    let selected = available
        .iter()
        .take(max_events)
        .cloned()
        .collect::<Vec<_>>();
    let next_cursor = selected
        .last()
        .map(cursor_from_encrypted_event)
        .unwrap_or_else(|| cursor.clone());

    Ok(EncryptedSyncEventBatch {
        previous_cursor: cursor.clone(),
        next_cursor,
        has_more: selected.len() < available.len(),
        events: selected,
    })
}

pub fn export_master_key_recovery_kit(
    master_key: &ClientMasterKey,
    recovery_secret: &str,
    salt: RecoverySalt,
    nonce: EncryptionNonce,
) -> Result<MasterKeyRecoveryKit, SyncEngineError> {
    if recovery_secret.trim().is_empty() {
        return Err(SyncEngineError::InvalidCryptoKey {
            reason: "recovery secret must not be empty",
        });
    }

    let wrapping_key = derive_recovery_key(recovery_secret, &salt);
    let aad = recovery_aad(master_key.key_id());
    let mut bytes = master_key.as_bytes().to_vec();
    let less_safe_key = less_safe_key(&wrapping_key)?;

    less_safe_key
        .seal_in_place_append_tag(
            nonce_from_bytes(nonce.as_bytes()),
            Aad::from(aad.as_bytes()),
            &mut bytes,
        )
        .map_err(|_| SyncEngineError::EncryptionFailed {
            reason: "master key could not be wrapped for recovery",
        })?;

    Ok(MasterKeyRecoveryKit {
        algorithm: SYNC_ENCRYPTION_ALGORITHM.to_owned(),
        key_derivation: SYNC_RECOVERY_KDF.to_owned(),
        salt: encode_bytes(&salt.as_bytes()),
        nonce: encode_bytes(&nonce.as_bytes()),
        wrapped_master_key: encode_bytes(&bytes),
        master_key_id: master_key.key_id().to_owned(),
    })
}

pub fn restore_master_key_from_recovery_kit(
    kit: &MasterKeyRecoveryKit,
    recovery_secret: &str,
) -> Result<ClientMasterKey, SyncEngineError> {
    if kit.algorithm != SYNC_ENCRYPTION_ALGORITHM {
        return Err(SyncEngineError::InvalidEncryptedPayload {
            event_id: None,
            reason: "unsupported recovery encryption algorithm",
        });
    }
    if kit.key_derivation != SYNC_RECOVERY_KDF {
        return Err(SyncEngineError::InvalidEncryptedPayload {
            event_id: None,
            reason: "unsupported recovery key derivation",
        });
    }
    if recovery_secret.trim().is_empty() {
        return Err(SyncEngineError::InvalidCryptoKey {
            reason: "recovery secret must not be empty",
        });
    }

    let salt = decode_fixed::<RECOVERY_SALT_LEN>(None, "recovery salt", &kit.salt)?;
    let nonce = decode_fixed::<NONCE_LEN>(None, "recovery nonce", &kit.nonce)?;
    let wrapping_key = derive_recovery_key(recovery_secret, &RecoverySalt::from_bytes(salt));
    let less_safe_key = less_safe_key(&wrapping_key)?;
    let mut wrapped_key = decode_bytes(None, "wrapped master key", &kit.wrapped_master_key)?;
    let aad = recovery_aad(&kit.master_key_id);

    let plaintext = less_safe_key
        .open_in_place(
            nonce_from_bytes(nonce),
            Aad::from(aad.as_bytes()),
            &mut wrapped_key,
        )
        .map_err(|_| SyncEngineError::DecryptionFailed {
            event_id: None,
            reason: "recovery secret did not unwrap the master key",
        })?;
    let key_bytes: [u8; MASTER_KEY_LEN] =
        plaintext
            .try_into()
            .map_err(|_| SyncEngineError::InvalidCryptoKey {
                reason: "recovered master key has an unexpected length",
            })?;
    let master_key = ClientMasterKey::from_bytes(key_bytes);

    if master_key.key_id() != kit.master_key_id {
        return Err(SyncEngineError::InvalidCryptoKey {
            reason: "recovered master key id does not match the recovery kit",
        });
    }

    Ok(master_key)
}

fn encrypt_bytes(
    plaintext: &[u8],
    master_key: &ClientMasterKey,
    nonce: EncryptionNonce,
    aad: &str,
) -> Result<EncryptedSyncPayload, SyncEngineError> {
    let less_safe_key = less_safe_key(master_key.as_bytes())?;
    let mut buffer = plaintext.to_vec();

    less_safe_key
        .seal_in_place_append_tag(
            nonce_from_bytes(nonce.as_bytes()),
            Aad::from(aad.as_bytes()),
            &mut buffer,
        )
        .map_err(|_| SyncEngineError::EncryptionFailed {
            reason: "payload could not be sealed",
        })?;

    Ok(EncryptedSyncPayload {
        algorithm: SYNC_ENCRYPTION_ALGORITHM.to_owned(),
        key_id: master_key.key_id().to_owned(),
        nonce: encode_bytes(&nonce.as_bytes()),
        ciphertext: encode_bytes(&buffer),
    })
}

fn decrypt_bytes(
    encrypted_payload: &EncryptedSyncPayload,
    master_key: &ClientMasterKey,
    aad: &str,
    event_id: Option<&str>,
) -> Result<Vec<u8>, SyncEngineError> {
    if encrypted_payload.algorithm != SYNC_ENCRYPTION_ALGORITHM {
        return Err(SyncEngineError::InvalidEncryptedPayload {
            event_id: event_id.map(ToOwned::to_owned),
            reason: "unsupported sync encryption algorithm",
        });
    }

    let nonce = decode_fixed::<NONCE_LEN>(event_id, "payload nonce", &encrypted_payload.nonce)?;
    let mut ciphertext = decode_bytes(
        event_id,
        "payload ciphertext",
        &encrypted_payload.ciphertext,
    )?;
    let less_safe_key = less_safe_key(master_key.as_bytes())?;
    let plaintext = less_safe_key
        .open_in_place(
            nonce_from_bytes(nonce),
            Aad::from(aad.as_bytes()),
            &mut ciphertext,
        )
        .map_err(|_| SyncEngineError::DecryptionFailed {
            event_id: event_id.map(ToOwned::to_owned),
            reason: "ciphertext, metadata, or key did not authenticate",
        })?;

    Ok(plaintext.to_vec())
}

fn derive_recovery_key(recovery_secret: &str, salt: &RecoverySalt) -> [u8; MASTER_KEY_LEN] {
    let mut key = [0_u8; MASTER_KEY_LEN];
    pbkdf2::derive(
        pbkdf2::PBKDF2_HMAC_SHA256,
        recovery_iterations(),
        &salt.0,
        recovery_secret.as_bytes(),
        &mut key,
    );
    key
}

fn less_safe_key(key_bytes: &[u8; MASTER_KEY_LEN]) -> Result<LessSafeKey, SyncEngineError> {
    let unbound_key = UnboundKey::new(&aead::AES_256_GCM, key_bytes).map_err(|_| {
        SyncEngineError::InvalidCryptoKey {
            reason: "master key must be usable with AES-256-GCM",
        }
    })?;

    Ok(LessSafeKey::new(unbound_key))
}

fn nonce_from_bytes(bytes: [u8; NONCE_LEN]) -> Nonce {
    Nonce::assume_unique_for_key(bytes)
}

fn recovery_iterations() -> NonZeroU32 {
    NonZeroU32::new(RECOVERY_ITERATIONS).expect("recovery iterations must be non-zero")
}

fn clear_event_aad(event: &crate::SyncEventEnvelope, key_id: &str) -> String {
    event_aad(
        &event.id,
        &event.entity_type,
        &event.entity_id,
        &event.change_type,
        &event.device_id,
        &event.created_at,
        key_id,
    )
}

fn encrypted_event_aad(event: &EncryptedSyncEventEnvelope) -> String {
    event_aad(
        &event.id,
        &event.entity_type,
        &event.entity_id,
        &event.change_type,
        &event.device_id,
        &event.created_at,
        &event.encrypted_payload.key_id,
    )
}

fn event_aad(
    id: &str,
    entity_type: &str,
    entity_id: &str,
    change_type: &str,
    device_id: &str,
    created_at: &str,
    key_id: &str,
) -> String {
    [
        "freelyrss-sync-event-v1",
        id,
        entity_type,
        entity_id,
        change_type,
        device_id,
        created_at,
        key_id,
    ]
    .join("\n")
}

fn recovery_aad(key_id: &str) -> String {
    ["freelyrss-master-key-recovery-v1", key_id].join("\n")
}

fn encrypted_event_is_after(
    cursor: &SyncCursor,
    event: &EncryptedSyncEventEnvelope,
) -> Result<bool, SyncEngineError> {
    if cursor.is_start() {
        return Ok(true);
    }

    let Some(last_created_at) = cursor.last_created_at.as_deref() else {
        return Err(SyncEngineError::InvalidCursor);
    };
    let Some(last_event_id) = cursor.last_event_id.as_deref() else {
        return Err(SyncEngineError::InvalidCursor);
    };

    Ok(event.created_at.as_str() > last_created_at
        || (event.created_at.as_str() == last_created_at && event.id.as_str() > last_event_id))
}

fn cursor_from_encrypted_event(event: &EncryptedSyncEventEnvelope) -> SyncCursor {
    SyncCursor::new(event.created_at.clone(), event.id.clone())
}

fn encode_bytes(bytes: &[u8]) -> String {
    STANDARD_NO_PAD.encode(bytes)
}

fn decode_bytes(
    event_id: Option<&str>,
    label: &'static str,
    value: &str,
) -> Result<Vec<u8>, SyncEngineError> {
    STANDARD_NO_PAD
        .decode(value)
        .map_err(|_| SyncEngineError::InvalidEncryptedPayload {
            event_id: event_id.map(ToOwned::to_owned),
            reason: label,
        })
}

fn decode_fixed<const N: usize>(
    event_id: Option<&str>,
    label: &'static str,
    value: &str,
) -> Result<[u8; N], SyncEngineError> {
    let bytes = decode_bytes(event_id, label, value)?;
    bytes
        .try_into()
        .map_err(|_| SyncEngineError::InvalidEncryptedPayload {
            event_id: event_id.map(ToOwned::to_owned),
            reason: label,
        })
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::{
        ClientMasterKey, EncryptionNonce, RecoverySalt, decrypt_sync_event, encrypt_sync_event,
        export_master_key_recovery_kit, package_encrypted_event_batch,
        restore_master_key_from_recovery_kit,
    };
    use crate::{SyncCursor, SyncEventEnvelope};

    #[test]
    fn encrypts_event_payload_without_leaking_plaintext_and_decrypts_it() {
        let master_key = test_key(7);
        let event = SyncEventEnvelope::new(
            "event-private-state",
            "user-state",
            "article-private",
            "update",
            json!({
                "changedFields": ["read_state", "reading_progress"],
                "value": { "read_state": "read", "reading_progress": 0.7 }
            }),
            "device-a",
            "2026-05-10T12:00:00Z",
        );

        let encrypted = encrypt_sync_event(&event, &master_key, nonce(1)).expect("encrypt event");
        let stored_payload = format!("{:?}", encrypted.encrypted_payload);

        assert!(!stored_payload.contains("read_state"));
        assert!(!stored_payload.contains("reading_progress"));
        assert!(!stored_payload.contains("\"read\""));

        let decrypted = decrypt_sync_event(&encrypted, &master_key).expect("decrypt event");
        assert_eq!(decrypted, event);
    }

    #[test]
    fn encrypted_payload_is_bound_to_event_metadata() {
        let master_key = test_key(9);
        let event = SyncEventEnvelope::new(
            "event-note",
            "annotation",
            "annotation-1",
            "create",
            json!({
                "changedFields": ["note"],
                "value": { "note": "private note" }
            }),
            "device-a",
            "2026-05-10T12:00:00Z",
        );
        let mut encrypted = encrypt_sync_event(&event, &master_key, nonce(2)).expect("encrypt");

        encrypted.entity_id = "annotation-2".to_owned();

        assert!(decrypt_sync_event(&encrypted, &master_key).is_err());
    }

    #[test]
    fn packages_encrypted_events_without_decrypting_them() {
        let master_key = test_key(11);
        let events = ["event-a", "event-b"]
            .into_iter()
            .enumerate()
            .map(|(index, id)| {
                encrypt_sync_event(
                    &SyncEventEnvelope::new(
                        id,
                        "user-state",
                        "article-private",
                        "update",
                        json!({ "value": { "read_state": "read" } }),
                        "device-a",
                        format!("2026-05-10T12:0{index}:00Z"),
                    ),
                    &master_key,
                    nonce(index as u8 + 3),
                )
                .expect("encrypt")
            })
            .collect::<Vec<_>>();

        let batch = package_encrypted_event_batch(&events, &SyncCursor::start(), 1).expect("batch");

        assert_eq!(batch.events.len(), 1);
        assert_eq!(batch.events[0].id, "event-a");
        assert!(batch.has_more);
    }

    #[test]
    fn recovery_kit_restores_client_held_master_key() {
        let master_key = test_key(13);
        let recovery_secret = "correct horse battery staple";
        let kit = export_master_key_recovery_kit(
            &master_key,
            recovery_secret,
            RecoverySalt::from_bytes([5; 16]),
            nonce(4),
        )
        .expect("export recovery kit");

        let recovered =
            restore_master_key_from_recovery_kit(&kit, recovery_secret).expect("restore key");

        assert_eq!(recovered.as_bytes(), master_key.as_bytes());
        assert_eq!(recovered.key_id(), master_key.key_id());
        assert!(restore_master_key_from_recovery_kit(&kit, "wrong secret").is_err());
    }

    fn test_key(byte: u8) -> ClientMasterKey {
        ClientMasterKey::from_bytes([byte; 32])
    }

    fn nonce(byte: u8) -> EncryptionNonce {
        EncryptionNonce::from_bytes([byte; 12])
    }
}
