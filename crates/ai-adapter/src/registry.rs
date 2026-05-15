use std::collections::BTreeMap;

use crate::{
    AiAdapterError, AiProvider, AiProviderCapability, AiProviderKind, AiProviderManifest,
    AiTaskResponse, AiTaskSubmission,
};

#[derive(Default)]
pub struct AiProviderRegistry {
    providers_by_id: BTreeMap<String, Box<dyn AiProvider>>,
}

impl AiProviderRegistry {
    pub fn register(&mut self, provider: Box<dyn AiProvider>) -> Result<(), AiAdapterError> {
        provider.manifest().validate()?;
        let provider_id = provider.manifest().id.clone();

        if self.providers_by_id.contains_key(&provider_id) {
            return Err(AiAdapterError::ProviderAlreadyRegistered { provider_id });
        }

        self.providers_by_id.insert(provider_id, provider);
        Ok(())
    }

    pub fn manifests_for_kind(&self, provider_kind: AiProviderKind) -> Vec<&AiProviderManifest> {
        self.providers_by_id
            .values()
            .map(|provider| provider.manifest())
            .filter(|manifest| manifest.provider_kind == provider_kind)
            .collect()
    }

    pub fn manifests_for_capability(
        &self,
        capability: AiProviderCapability,
    ) -> Vec<&AiProviderManifest> {
        self.providers_by_id
            .values()
            .map(|provider| provider.manifest())
            .filter(|manifest| manifest.supports_capability(capability))
            .collect()
    }

    pub fn submit(
        &self,
        provider_id: &str,
        submission: AiTaskSubmission,
    ) -> Result<AiTaskResponse, AiAdapterError> {
        submission.validate()?;
        let capability = submission.input.capability();
        let provider = self.providers_by_id.get(provider_id).ok_or_else(|| {
            AiAdapterError::ProviderNotFound {
                provider_id: provider_id.to_owned(),
            }
        })?;

        if !provider.manifest().supports_capability(capability) {
            return Err(AiAdapterError::UnsupportedCapability {
                provider_id: provider_id.to_owned(),
                capability,
            });
        }

        provider.invoke(submission)
    }
}
