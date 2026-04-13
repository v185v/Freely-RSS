use crate::{
    FeedEngineError, FetchRequest, FetchedFeed, NormalizeContext, NormalizedFeedBatch,
    ParsedFeedDocument, ParsedSource, PersistedFeedBatch,
};

pub trait FeedTransport {
    fn fetch(&self, request: &FetchRequest) -> Result<FetchedFeed, FeedEngineError>;
}

pub trait FeedParser {
    fn parse(&self, fetched: &FetchedFeed) -> Result<ParsedSource, FeedEngineError>;
}

pub trait FeedNormalizer {
    fn normalize(
        &self,
        parsed: ParsedFeedDocument,
        context: &NormalizeContext,
    ) -> Result<NormalizedFeedBatch, FeedEngineError>;
}

pub trait FeedRepository {
    fn persist(&self, batch: NormalizedFeedBatch) -> Result<PersistedFeedBatch, FeedEngineError>;
}
