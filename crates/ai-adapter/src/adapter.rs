use crate::{AiAdapterError, AiProviderManifest, AiTaskResponse, AiTaskSubmission};

pub trait AiProvider {
    fn manifest(&self) -> &AiProviderManifest;

    fn invoke(&self, submission: AiTaskSubmission) -> Result<AiTaskResponse, AiAdapterError>;
}
