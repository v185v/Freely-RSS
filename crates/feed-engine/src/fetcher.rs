use crate::{
    FeedEngineError, FeedNormalizer, FeedParser, FeedRepository, FeedTransport, FetchRequest,
    FetchRunReport, NormalizeContext,
};

pub struct FeedFetcher<TTransport, TParser, TNormalizer, TRepository> {
    transport: TTransport,
    parser: TParser,
    normalizer: TNormalizer,
    repository: TRepository,
}

impl<TTransport, TParser, TNormalizer, TRepository>
    FeedFetcher<TTransport, TParser, TNormalizer, TRepository>
where
    TTransport: FeedTransport,
    TParser: FeedParser,
    TNormalizer: FeedNormalizer,
    TRepository: FeedRepository,
{
    pub fn new(
        transport: TTransport,
        parser: TParser,
        normalizer: TNormalizer,
        repository: TRepository,
    ) -> Self {
        Self {
            transport,
            parser,
            normalizer,
            repository,
        }
    }

    pub fn run(&self, request: FetchRequest) -> Result<FetchRunReport, FeedEngineError> {
        let fetched = self.transport.fetch(&request)?;
        let parsed = self.parser.parse(&fetched)?;
        let parsed_article_count = parsed.articles.len();
        let format = parsed.format;
        let context = NormalizeContext::from_fetched_feed(&fetched);
        let normalized = self.normalizer.normalize(parsed, &context)?;
        let normalized_article_count = normalized.articles.len();
        let persisted = self.repository.persist(normalized)?;

        Ok(FetchRunReport {
            feed_id: persisted.feed_id,
            requested_url: request.feed_url,
            final_url: fetched.final_url,
            format,
            response_status_code: fetched.status_code,
            fetched_at: fetched.fetched_at,
            parsed_article_count,
            normalized_article_count,
            stored_article_count: persisted.stored_article_count,
        })
    }
}
