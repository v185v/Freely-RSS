use freelyrss_core_domain::{
    Article, Attachment, Feed, ImportanceLevel, IsoDateTime, JsonBlob, ReadState, Rule, Tag,
    UserState,
};
use time::{OffsetDateTime, format_description::well_known::Rfc3339};

use crate::{
    QueryDefinition, QueryMatch, QueryNode, QueryOperator, QueryPredicateNode, QueryValue,
    RuleEngineError, parse_query_definition,
};

#[derive(Clone, Copy, Debug)]
pub struct RuleMatchContext<'a> {
    pub article: &'a Article,
    pub feed: Option<&'a Feed>,
    pub user_state: Option<&'a UserState>,
    pub article_tags: &'a [Tag],
    pub attachments: &'a [Attachment],
}

impl<'a> RuleMatchContext<'a> {
    pub fn new(article: &'a Article) -> Self {
        Self {
            article,
            feed: None,
            user_state: None,
            article_tags: &[],
            attachments: &[],
        }
    }

    pub fn with_feed(mut self, feed: &'a Feed) -> Self {
        self.feed = Some(feed);
        self
    }

    pub fn with_user_state(mut self, user_state: &'a UserState) -> Self {
        self.user_state = Some(user_state);
        self
    }

    pub fn with_article_tags(mut self, article_tags: &'a [Tag]) -> Self {
        self.article_tags = article_tags;
        self
    }

    pub fn with_attachments(mut self, attachments: &'a [Attachment]) -> Self {
        self.attachments = attachments;
        self
    }

    fn any_text(&self) -> String {
        let mut parts = vec![self.article.title.as_str()];

        if let Some(feed) = self.feed_title() {
            parts.push(feed);
        }

        if let Some(author) = self.article.author.as_deref() {
            parts.push(author);
        }

        if let Some(summary) = self.article.summary.as_deref() {
            parts.push(summary);
        }

        if let Some(content) = self.article.content_extracted.as_deref() {
            parts.push(content);
        }

        if let Some(content) = self.article.content_raw.as_deref() {
            parts.push(content);
        }

        parts.join(" ")
    }

    fn content(&self) -> Option<&str> {
        self.article
            .content_extracted
            .as_deref()
            .or(self.article.content_raw.as_deref())
    }

    fn feed_title(&self) -> Option<&str> {
        self.feed
            .map(|feed| feed.custom_name.as_deref().unwrap_or(feed.title.as_str()))
    }

    fn read_state(&self) -> ReadState {
        self.user_state
            .map(|state| state.read_state)
            .unwrap_or(ReadState::Unread)
    }

    fn starred(&self) -> bool {
        self.user_state.map(|state| state.starred).unwrap_or(false)
    }

    fn liked(&self) -> bool {
        self.user_state.map(|state| state.liked).unwrap_or(false)
    }

    fn read_later(&self) -> bool {
        self.user_state
            .map(|state| state.read_later)
            .unwrap_or(false)
    }

    fn importance(&self) -> ImportanceLevel {
        self.user_state
            .map(|state| state.importance)
            .unwrap_or(ImportanceLevel::Normal)
    }

    fn tag_names(&self) -> impl Iterator<Item = &str> {
        self.article_tags.iter().map(|tag| tag.name.as_str())
    }
}

pub fn match_rule(rule: &Rule, context: &RuleMatchContext<'_>) -> Result<bool, RuleEngineError> {
    if !rule.enabled {
        return Ok(false);
    }

    match_rule_conditions(&rule.conditions, context)
}

pub fn match_rule_conditions(
    conditions: &JsonBlob,
    context: &RuleMatchContext<'_>,
) -> Result<bool, RuleEngineError> {
    let definition = parse_query_definition(conditions.as_value())?;
    Ok(match_query_definition(&definition, context))
}

pub fn match_query_definition(
    definition: &QueryDefinition,
    context: &RuleMatchContext<'_>,
) -> bool {
    match_node(&definition.root, context)
}

fn parse_datetime(value: &str) -> Option<OffsetDateTime> {
    OffsetDateTime::parse(value, &Rfc3339).ok()
}

fn match_missing_scalar(operator: QueryOperator) -> bool {
    matches!(operator, QueryOperator::Neq | QueryOperator::NotContains)
}

fn contains_ignore_case(actual: &str, expected: &str) -> bool {
    actual.to_lowercase().contains(&expected.to_lowercase())
}

fn match_string(actual: &str, operator: QueryOperator, value: &QueryValue) -> bool {
    if let Some(values) = value.as_string_list() {
        let has_match = values.contains(&actual);

        return match operator {
            QueryOperator::In => has_match,
            QueryOperator::NotIn => !has_match,
            _ => false,
        };
    }

    let Some(expected) = value.as_str() else {
        return false;
    };

    match operator {
        QueryOperator::Eq => actual == expected,
        QueryOperator::Neq => actual != expected,
        QueryOperator::Contains => contains_ignore_case(actual, expected),
        QueryOperator::NotContains => !contains_ignore_case(actual, expected),
        QueryOperator::Gt => actual > expected,
        QueryOperator::Gte => actual >= expected,
        QueryOperator::Lt => actual < expected,
        QueryOperator::Lte => actual <= expected,
        QueryOperator::In | QueryOperator::NotIn => false,
    }
}

fn match_optional_string(
    actual: Option<&str>,
    operator: QueryOperator,
    value: &QueryValue,
) -> bool {
    match actual {
        Some(actual) => match_string(actual, operator, value),
        None => match_missing_scalar(operator),
    }
}

fn match_string_list<'a>(
    values: impl Iterator<Item = &'a str>,
    operator: QueryOperator,
    value: &QueryValue,
) -> bool {
    let actual_values = values.collect::<Vec<_>>();

    let expected_values = match value {
        QueryValue::Scalar(_) => value.as_str().map(|value| vec![value]),
        QueryValue::List(_) => value.as_string_list(),
    };

    let Some(expected_values) = expected_values else {
        return false;
    };

    let has_match = actual_values
        .iter()
        .any(|actual| expected_values.iter().any(|expected| actual == expected));

    match operator {
        QueryOperator::Eq | QueryOperator::In => has_match,
        QueryOperator::Neq | QueryOperator::NotIn => !has_match,
        _ => false,
    }
}

fn match_bool(actual: bool, operator: QueryOperator, value: &QueryValue) -> bool {
    let Some(expected) = value.as_bool() else {
        return false;
    };

    match operator {
        QueryOperator::Eq => actual == expected,
        QueryOperator::Neq => actual != expected,
        _ => false,
    }
}

fn match_datetime(
    actual: Option<&IsoDateTime>,
    operator: QueryOperator,
    value: &QueryValue,
) -> bool {
    let Some(actual) = actual.and_then(|value| parse_datetime(value.as_str())) else {
        return match_missing_scalar(operator);
    };

    let Some(expected) = value.as_str().and_then(parse_datetime) else {
        return false;
    };

    match operator {
        QueryOperator::Eq => actual == expected,
        QueryOperator::Neq => actual != expected,
        QueryOperator::Gt => actual > expected,
        QueryOperator::Gte => actual >= expected,
        QueryOperator::Lt => actual < expected,
        QueryOperator::Lte => actual <= expected,
        _ => false,
    }
}

fn match_predicate(predicate: &QueryPredicateNode, context: &RuleMatchContext<'_>) -> bool {
    match predicate.field {
        crate::QueryField::AnyText => {
            match_string(&context.any_text(), predicate.operator, &predicate.value)
        }
        crate::QueryField::FeedId => match_string(
            context.article.feed_id.as_str(),
            predicate.operator,
            &predicate.value,
        ),
        crate::QueryField::Title => match_string(
            context.article.title.as_str(),
            predicate.operator,
            &predicate.value,
        ),
        crate::QueryField::Author => match_optional_string(
            context.article.author.as_deref(),
            predicate.operator,
            &predicate.value,
        ),
        crate::QueryField::Summary => match_optional_string(
            context.article.summary.as_deref(),
            predicate.operator,
            &predicate.value,
        ),
        crate::QueryField::Content => {
            match_optional_string(context.content(), predicate.operator, &predicate.value)
        }
        crate::QueryField::FeedTitle => {
            match_optional_string(context.feed_title(), predicate.operator, &predicate.value)
        }
        crate::QueryField::Tag => {
            match_string_list(context.tag_names(), predicate.operator, &predicate.value)
        }
        crate::QueryField::Language => match_optional_string(
            context
                .article
                .language
                .as_ref()
                .map(|language| language.as_str()),
            predicate.operator,
            &predicate.value,
        ),
        crate::QueryField::PublishedAt => match_datetime(
            context.article.published_at.as_ref(),
            predicate.operator,
            &predicate.value,
        ),
        crate::QueryField::FetchedAt => match_datetime(
            Some(&context.article.fetched_at),
            predicate.operator,
            &predicate.value,
        ),
        crate::QueryField::ReadState => match_string(
            context.read_state().as_str(),
            predicate.operator,
            &predicate.value,
        ),
        crate::QueryField::Starred => {
            match_bool(context.starred(), predicate.operator, &predicate.value)
        }
        crate::QueryField::Liked => {
            match_bool(context.liked(), predicate.operator, &predicate.value)
        }
        crate::QueryField::ReadLater => {
            match_bool(context.read_later(), predicate.operator, &predicate.value)
        }
        crate::QueryField::Importance => match_string(
            context.importance().as_str(),
            predicate.operator,
            &predicate.value,
        ),
        crate::QueryField::HasAttachment => match_bool(
            !context.attachments.is_empty(),
            predicate.operator,
            &predicate.value,
        ),
    }
}

fn match_node(node: &QueryNode, context: &RuleMatchContext<'_>) -> bool {
    match node {
        QueryNode::Group {
            group_match,
            children,
        } => match group_match {
            QueryMatch::All => children.iter().all(|child| match_node(child, context)),
            QueryMatch::Any => children.iter().any(|child| match_node(child, context)),
        },
        QueryNode::Not { child } => !match_node(child, context),
        QueryNode::Predicate(predicate) => match_predicate(predicate, context),
    }
}

#[cfg(test)]
mod tests {
    use freelyrss_core_domain::{
        Article, ArticleId, Attachment, AttachmentId, AttachmentType, Feed, FeedFormat,
        FeedHealthStatus, FeedId, ImportanceLevel, IsoDateTime, JsonBlob, LanguageCode, ReadState,
        Rule, RuleId, Tag, TagId, TagScope, UrlString, UserState,
    };
    use serde_json::json;

    use super::{RuleMatchContext, match_rule, match_rule_conditions};
    use crate::RuleEngineError;

    fn article() -> Article {
        Article {
            id: ArticleId::try_from("article-rule-target").expect("article id"),
            feed_id: FeedId::try_from("feed-engineering").expect("feed id"),
            source_guid: Some("rule-target-guid".to_owned()),
            title: "Rust rule engine reaches the shared query boundary".to_owned(),
            author: Some("FreelyRSS Team".to_owned()),
            summary: Some("Rule evaluation now consumes shared query JSON.".to_owned()),
            content_raw: Some(
                "<article><p>Shared query execution now runs in Rust.</p></article>".to_owned(),
            ),
            content_extracted: Some(
                "Shared query execution now runs in Rust and evaluates durable article facts."
                    .to_owned(),
            ),
            canonical_url: Some(
                UrlString::try_from("https://example.com/articles/rule-engine".to_owned())
                    .expect("canonical url"),
            ),
            original_url: Some(
                UrlString::try_from("https://example.com/articles/rule-engine".to_owned())
                    .expect("original url"),
            ),
            published_at: Some(
                IsoDateTime::try_from("2026-04-22T09:00:00Z".to_owned()).expect("published at"),
            ),
            fetched_at: IsoDateTime::try_from("2026-04-23T01:00:00Z".to_owned())
                .expect("fetched at"),
            language: Some(LanguageCode::try_from("en".to_owned()).expect("language")),
            thumbnail: None,
            word_count: Some(420),
            content_hash: Some("sha256:rule-engine".to_owned()),
        }
    }

    fn feed() -> Feed {
        Feed {
            id: FeedId::try_from("feed-engineering").expect("feed id"),
            title: "FreelyRSS Engineering".to_owned(),
            site_url: Some(
                UrlString::try_from("https://example.com".to_owned()).expect("site url"),
            ),
            feed_url: UrlString::try_from("https://example.com/feed.xml".to_owned())
                .expect("feed url"),
            format: FeedFormat::Rss,
            icon: None,
            folder_id: None,
            custom_name: Some("Engineering Desk".to_owned()),
            sort_order: 0,
            update_interval: None,
            health_status: FeedHealthStatus::Healthy,
            last_checked_at: None,
            last_success_at: None,
            etag: None,
            last_modified: None,
            last_error_kind: None,
            last_error_message: None,
            last_error_at: None,
            consecutive_failures: 0,
        }
    }

    fn user_state() -> UserState {
        UserState {
            article_id: ArticleId::try_from("article-rule-target").expect("article id"),
            read_state: ReadState::Reading,
            starred: true,
            liked: false,
            importance: ImportanceLevel::High,
            read_later: true,
            reading_progress: 0.65,
            last_opened_at: Some(
                IsoDateTime::try_from("2026-04-23T02:00:00Z".to_owned()).expect("last opened at"),
            ),
        }
    }

    fn article_tags() -> Vec<Tag> {
        vec![
            Tag {
                id: TagId::try_from("tag-rust").expect("tag id"),
                name: "rust".to_owned(),
                scope: TagScope::Article,
                color: None,
                created_at: IsoDateTime::try_from("2026-04-22T00:00:00Z".to_owned())
                    .expect("created at"),
            },
            Tag {
                id: TagId::try_from("tag-automation").expect("tag id"),
                name: "automation".to_owned(),
                scope: TagScope::Article,
                color: None,
                created_at: IsoDateTime::try_from("2026-04-22T00:00:00Z".to_owned())
                    .expect("created at"),
            },
        ]
    }

    fn attachments() -> Vec<Attachment> {
        vec![Attachment {
            id: AttachmentId::try_from("attachment-rule-json").expect("attachment id"),
            article_id: ArticleId::try_from("article-rule-target").expect("article id"),
            attachment_type: AttachmentType::File,
            url: UrlString::try_from("https://example.com/assets/rule.json".to_owned())
                .expect("attachment url"),
            mime_type: Some("application/json".to_owned()),
            duration: None,
            size: Some(2_048),
            local_cache_path: None,
        }]
    }

    fn rule(id: &str, enabled: bool, conditions: serde_json::Value) -> Rule {
        Rule {
            id: RuleId::try_from(id).expect("rule id"),
            name: id.to_owned(),
            enabled,
            priority: 0,
            conditions: JsonBlob::from(conditions),
            actions: JsonBlob::from(json!({ "type": "noop" })),
            scope: "article".to_owned(),
        }
    }

    #[test]
    fn matches_nested_rule_conditions_against_article_context() {
        let target_article = article();
        let target_feed = feed();
        let target_state = user_state();
        let tags = article_tags();
        let attachment_list = attachments();
        let context = RuleMatchContext::new(&target_article)
            .with_feed(&target_feed)
            .with_user_state(&target_state)
            .with_article_tags(&tags)
            .with_attachments(&attachment_list);

        let matching_rule = rule(
            "rule-complex-hit",
            true,
            json!({
              "version": 1,
              "root": {
                "kind": "group",
                "match": "all",
                "children": [
                  { "kind": "predicate", "field": "feedId", "operator": "eq", "value": "feed-engineering" },
                  {
                    "kind": "group",
                    "match": "any",
                    "children": [
                      { "kind": "predicate", "field": "tag", "operator": "eq", "value": "rust" },
                      { "kind": "predicate", "field": "title", "operator": "contains", "value": "podcast" }
                    ]
                  },
                  { "kind": "not", "child": { "kind": "predicate", "field": "readState", "operator": "eq", "value": "read" } },
                  { "kind": "predicate", "field": "feedTitle", "operator": "contains", "value": "Engineering" },
                  { "kind": "predicate", "field": "importance", "operator": "eq", "value": "high" },
                  { "kind": "predicate", "field": "hasAttachment", "operator": "eq", "value": true },
                  { "kind": "predicate", "field": "publishedAt", "operator": "gte", "value": "2026-04-01T00:00:00Z" },
                  { "kind": "predicate", "field": "anyText", "operator": "contains", "value": "durable article facts" }
                ]
              },
              "sort": [
                { "field": "publishedAt", "direction": "desc", "nulls": "last" }
              ]
            }),
        );

        let non_matching_rule = rule(
            "rule-miss",
            true,
            json!({
              "version": 1,
              "root": {
                "kind": "group",
                "match": "all",
                "children": [
                  { "kind": "predicate", "field": "feedTitle", "operator": "contains", "value": "Mobile" },
                  { "kind": "predicate", "field": "readState", "operator": "eq", "value": "reading" }
                ]
              },
              "sort": []
            }),
        );

        let disabled_rule = rule(
            "rule-disabled",
            false,
            json!({
              "version": 1,
              "root": { "kind": "predicate", "field": "title", "operator": "contains", "value": "Rust" },
              "sort": []
            }),
        );

        assert!(match_rule(&matching_rule, &context).expect("match complex rule"));
        assert!(!match_rule(&non_matching_rule, &context).expect("miss rule"));
        assert!(!match_rule(&disabled_rule, &context).expect("disabled rule"));
    }

    #[test]
    fn falls_back_to_default_user_state_when_optional_context_is_missing() {
        let target_article = article();
        let context = RuleMatchContext::new(&target_article);

        let conditions = JsonBlob::from(json!({
          "version": 1,
          "root": {
            "kind": "group",
            "match": "all",
            "children": [
              { "kind": "predicate", "field": "readState", "operator": "eq", "value": "unread" },
              { "kind": "predicate", "field": "importance", "operator": "eq", "value": "normal" },
              { "kind": "predicate", "field": "starred", "operator": "eq", "value": false },
              { "kind": "predicate", "field": "readLater", "operator": "eq", "value": false },
              { "kind": "predicate", "field": "hasAttachment", "operator": "eq", "value": false }
            ]
          },
          "sort": []
        }));

        assert!(match_rule_conditions(&conditions, &context).expect("default match"));
    }

    #[test]
    fn reports_path_based_validation_errors_for_invalid_conditions() {
        let invalid_rule = rule(
            "rule-invalid",
            true,
            json!({
              "version": 1,
              "root": {
                "kind": "predicate",
                "field": "readState",
                "operator": "contains",
                "value": "read"
              },
              "sort": []
            }),
        );

        let error = match_rule(&invalid_rule, &RuleMatchContext::new(&article()))
            .expect_err("invalid rule should fail");

        match error {
            RuleEngineError::InvalidQueryDefinition { issues } => {
                assert!(issues.iter().any(|issue| issue.path == "root.operator"));
                assert!(
                    issues
                        .iter()
                        .any(|issue| issue.code == "operator-not-allowed")
                );
            }
        }
    }
}
