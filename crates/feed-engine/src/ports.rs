use crate::{
    FailedFeedCheck, FeedEngineError, FetchRequest, FetchedFeed, NormalizeContext,
    NormalizedFeedBatch, NotModifiedFeed, ParsedFeedDocument, ParsedSource, PersistedFeedBatch,
    RecordedFeedCheck, TransportFetchOutput,
};

pub trait FeedTransport {
    fn fetch(&self, request: &FetchRequest) -> Result<TransportFetchOutput, FeedEngineError>;
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

    fn record_not_modified(
        &self,
        response: NotModifiedFeed,
    ) -> Result<RecordedFeedCheck, FeedEngineError>;

    fn record_failure(&self, failure: FailedFeedCheck) -> Result<(), FeedEngineError>;
}
