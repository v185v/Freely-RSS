use std::collections::BTreeMap;

use crate::{
    IntegrationAdapter, IntegrationEngineError, IntegrationKind, IntegrationManifest,
    IntegrationRequest, IntegrationResponse,
};

#[derive(Default)]
pub struct IntegrationRegistry {
    adapters_by_id: BTreeMap<String, Box<dyn IntegrationAdapter>>,
}

impl IntegrationRegistry {
    pub fn register(
        &mut self,
        adapter: Box<dyn IntegrationAdapter>,
    ) -> Result<(), IntegrationEngineError> {
        adapter.manifest().validate()?;
        let adapter_id = adapter.manifest().id.clone();

        if self.adapters_by_id.contains_key(&adapter_id) {
            return Err(IntegrationEngineError::AdapterAlreadyRegistered { adapter_id });
        }

        self.adapters_by_id.insert(adapter_id, adapter);
        Ok(())
    }

    pub fn manifests_for_kind(&self, kind: IntegrationKind) -> Vec<&IntegrationManifest> {
        self.adapters_by_id
            .values()
            .map(|adapter| adapter.manifest())
            .filter(|manifest| manifest.supports_kind(kind))
            .collect()
    }

    pub fn invoke(
        &self,
        adapter_id: &str,
        request: IntegrationRequest,
    ) -> Result<IntegrationResponse, IntegrationEngineError> {
        let adapter = self.adapters_by_id.get(adapter_id).ok_or_else(|| {
            IntegrationEngineError::AdapterNotFound {
                adapter_id: adapter_id.to_owned(),
            }
        })?;

        if !adapter.manifest().supports_capability(request.capability()) {
            return Err(IntegrationEngineError::UnsupportedOperation {
                adapter_id: adapter_id.to_owned(),
                operation: request.capability().operation(),
            });
        }

        adapter.invoke(request)
    }
}
