use crate::{
    FailedFeedCheck, FeedEngineError, FeedNormalizer, FeedParser, FeedRepository, FeedTransport,
    FetchNotModifiedReport, FetchRequest, FetchRunOutput, FetchRunReport, NormalizeContext,
    ParsedSource, TransportFetchOutput,
};
use chrono::{SecondsFormat, Utc};
use freelyrss_core_domain::{IsoDateTime, UrlString};

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

    pub fn run(&self, request: FetchRequest) -> Result<FetchRunOutput, FeedEngineError> {
        let fetched = match self.transport.fetch(&request) {
            Ok(transport_output) => match transport_output {
                TransportFetchOutput::Modified(fetched) => fetched,
                TransportFetchOutput::NotModified(not_modified) => {
                    let recorded = self.repository.record_not_modified(not_modified.clone())?;

                    return Ok(FetchRunOutput::NotModified(FetchNotModifiedReport {
                        feed_id: recorded.feed_id,
                        requested_url: not_modified.request.feed_url,
                        final_url: not_modified.final_url,
                        response_status_code: not_modified.status_code,
                        fetched_at: not_modified.fetched_at,
                    }));
                }
            },
            Err(error) => {
                self.record_failure(&request, None, None, &error)?;
                return Err(error);
            }
        };
        let parsed = match self.parser.parse(&fetched) {
            Ok(parsed) => match parsed {
                ParsedSource::Feed(parsed) => parsed,
                ParsedSource::Discovery(discovery) => {
                    return Ok(FetchRunOutput::Discovery(discovery));
                }
            },
            Err(error) => {
                self.record_failure(
                    &request,
                    Some(fetched.final_url.clone()),
                    Some(fetched.fetched_at.clone()),
                    &error,
                )?;
                return Err(error);
            }
        };

        let parsed_article_count = parsed.articles.len();
        let format = parsed.format;
        let context = NormalizeContext::from_fetched_feed(&fetched);
        let normalized = self.normalizer.normalize(parsed, &context)?;
        let normalized_article_count = normalized.articles.len();
        let persisted = self.repository.persist(normalized)?;

        Ok(FetchRunOutput::Persisted(FetchRunReport {
            feed_id: persisted.feed_id,
            requested_url: request.feed_url,
            final_url: fetched.final_url,
            format,
            response_status_code: fetched.status_code,
            fetched_at: fetched.fetched_at,
            parsed_article_count,
            normalized_article_count,
            stored_article_count: persisted.stored_article_count,
        }))
    }

    fn record_failure(
        &self,
        request: &FetchRequest,
        final_url: Option<UrlString>,
        checked_at: Option<IsoDateTime>,
        error: &FeedEngineError,
    ) -> Result<(), FeedEngineError> {
        let Some(error_kind) = error.error_kind() else {
            return Ok(());
        };
        let checked_at = match checked_at {
            Some(checked_at) => checked_at,
            None => current_iso_timestamp().map_err(|timestamp_error| {
                FeedEngineError::persist(format!(
                    "capture feed failure timestamp after {error}: {timestamp_error}"
                ))
            })?,
        };
        let failure = FailedFeedCheck {
            request: request.clone(),
            final_url,
            checked_at,
            error_kind,
            error_message: error.message().to_owned(),
        };

        self.repository
            .record_failure(failure)
            .map_err(|record_error| {
                FeedEngineError::persist(format!(
                    "record feed failure after {error}: {record_error}"
                ))
            })
    }
}

fn current_iso_timestamp() -> Result<IsoDateTime, FeedEngineError> {
    let now = chrono::DateTime::<Utc>::from(std::time::SystemTime::now())
        .to_rfc3339_opts(SecondsFormat::Secs, true);

    IsoDateTime::try_from(now)
        .map_err(|error| FeedEngineError::persist(format!("capture failure timestamp: {error}")))
}
