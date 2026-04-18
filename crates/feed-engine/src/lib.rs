//! Feed fetching and normalization for FreelyRSS.

mod error;
mod fetcher;
mod model;
mod normalizer;
mod parser;
mod ports;
mod sqlite_repository;
mod transport;

pub use error::FeedEngineError;
pub use fetcher::FeedFetcher;
pub use model::{
    DiscoveredFeed, FeedDiscoveryResult, FetchNotModifiedReport, FetchRequest, FetchRunOutput,
    FetchRunReport, FetchedFeed, NormalizeContext, NormalizedArticleRecord,
    NormalizedAttachmentRecord, NormalizedFeedBatch, NormalizedFeedRecord, NotModifiedFeed,
    ParsedArticle, ParsedAttachment, ParsedFeedDocument, ParsedSource, PersistedFeedBatch,
    RecordedFeedCheck, TransportFetchOutput,
};
pub use normalizer::DefaultFeedNormalizer;
pub use parser::DefaultFeedParser;
pub use ports::{FeedNormalizer, FeedParser, FeedRepository, FeedTransport};
pub use sqlite_repository::SqliteFeedRepository;
pub use transport::{FeedTransportOptions, ReqwestFeedTransport};
