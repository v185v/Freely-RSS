//! Content extraction and cleanup pipeline for FreelyRSS.

mod error;
mod extraction;
mod model;
mod sanitize;

pub use error::ContentPipelineError;
pub use extraction::DefaultContentPipeline;
pub use model::{ContentPipelineInput, ProcessedContent};
