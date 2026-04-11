use crate::{
    FeedEngineError, FeedNormalizer, NormalizeContext, NormalizedArticleRecord,
    NormalizedAttachmentRecord, NormalizedFeedBatch, NormalizedFeedRecord, ParsedArticle,
    ParsedAttachment, ParsedFeedDocument,
};

pub struct DefaultFeedNormalizer;

impl FeedNormalizer for DefaultFeedNormalizer {
    fn normalize(
        &self,
        parsed: ParsedFeedDocument,
        context: &NormalizeContext,
    ) -> Result<NormalizedFeedBatch, FeedEngineError> {
        let ParsedFeedDocument {
            format,
            title,
            site_url,
            icon,
            articles,
        } = parsed;

        Ok(NormalizedFeedBatch {
            feed: NormalizedFeedRecord {
                feed_id: context.feed_id.clone(),
                title: normalized_feed_title(title),
                site_url,
                feed_url: context.final_url.clone(),
                format,
                icon,
                etag: context.etag.clone(),
                last_modified: context.last_modified.clone(),
                last_checked_at: context.fetched_at.clone(),
                last_success_at: context.fetched_at.clone(),
            },
            articles: articles
                .into_iter()
                .map(|article| normalize_article(article, context))
                .collect(),
        })
    }
}

fn normalize_article(
    article: ParsedArticle,
    context: &NormalizeContext,
) -> NormalizedArticleRecord {
    let ParsedArticle {
        source_guid,
        title,
        author,
        summary,
        content_raw,
        content_extracted,
        canonical_url,
        original_url,
        published_at,
        language,
        thumbnail,
        attachments,
    } = article;

    NormalizedArticleRecord {
        source_guid,
        title: normalized_article_title(title, canonical_url.as_ref(), original_url.as_ref()),
        author,
        summary,
        content_raw,
        content_extracted,
        canonical_url,
        original_url,
        published_at,
        fetched_at: context.fetched_at.clone(),
        language,
        thumbnail,
        attachments: attachments.into_iter().map(normalize_attachment).collect(),
    }
}

fn normalize_attachment(attachment: ParsedAttachment) -> NormalizedAttachmentRecord {
    NormalizedAttachmentRecord {
        attachment_type: attachment.attachment_type,
        url: attachment.url,
        mime_type: attachment.mime_type,
        duration: attachment.duration,
        size: attachment.size,
    }
}

fn normalized_feed_title(title: Option<String>) -> String {
    title
        .and_then(non_empty)
        .unwrap_or_else(|| "Untitled feed".to_owned())
}

fn normalized_article_title(
    title: Option<String>,
    canonical_url: Option<&freelyrss_core_domain::UrlString>,
    original_url: Option<&freelyrss_core_domain::UrlString>,
) -> String {
    title
        .and_then(non_empty)
        .or_else(|| canonical_url.map(|value| value.as_str().to_owned()))
        .or_else(|| original_url.map(|value| value.as_str().to_owned()))
        .unwrap_or_else(|| "Untitled article".to_owned())
}

fn non_empty(value: String) -> Option<String> {
    let trimmed = value.trim();
    (!trimmed.is_empty()).then(|| trimmed.to_owned())
}
