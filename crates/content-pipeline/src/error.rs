use thiserror::Error;

#[derive(Debug, Error)]
pub enum ContentPipelineError {
    #[error("content pipeline could not resolve URL `{value}`")]
    InvalidUrl { value: String },
}
