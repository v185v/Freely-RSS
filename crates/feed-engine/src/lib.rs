//! Feed fetching and normalization for FreelyRSS.

mod error;
mod fetcher;
mod model;
mod normalizer;
mod parser;
mod ports;

pub use error::FeedEngineError;
pub use fetcher::FeedFetcher;
pub use model::{
    DiscoveredFeed, FeedDiscoveryResult, FetchRequest, FetchRunOutput, FetchRunReport, FetchedFeed,
    NormalizeContext, NormalizedArticleRecord, NormalizedAttachmentRecord, NormalizedFeedBatch,
    NormalizedFeedRecord, ParsedArticle, ParsedAttachment, ParsedFeedDocument, ParsedSource,
    PersistedFeedBatch,
};
pub use normalizer::DefaultFeedNormalizer;
pub use parser::DefaultFeedParser;
pub use ports::{FeedNormalizer, FeedParser, FeedRepository, FeedTransport};
