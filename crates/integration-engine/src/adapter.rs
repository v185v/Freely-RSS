use crate::{IntegrationEngineError, IntegrationManifest, IntegrationRequest, IntegrationResponse};

pub trait IntegrationAdapter {
    fn manifest(&self) -> &IntegrationManifest;

    fn invoke(
        &self,
        request: IntegrationRequest,
    ) -> Result<IntegrationResponse, IntegrationEngineError>;
}
