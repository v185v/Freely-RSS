use freelyrss_core_domain::{
    ArticleId, AttachmentId, AttachmentType, ImportanceLevel, IsoDateTime, JsonBlob, ReadState,
    Rule, RuleAudit, RuleAuditId, RuleAuditMatchResult, RuleId,
};
use serde_json::{Value, json};

use crate::{
    RuleActionCommand, RuleActionPlan, RuleAttachmentCacheTarget, RuleEngineError,
    RuleMatchContext, RuleUserStateChanges, build_rule_action_plan, match_rule_conditions,
    parse_rule_actions,
};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RuleAuditUserStateSnapshot {
    pub read_state: ReadState,
    pub starred: bool,
    pub liked: bool,
    pub read_later: bool,
    pub importance: ImportanceLevel,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RuleAuditAttachmentSnapshot {
    pub id: AttachmentId,
    pub attachment_type: AttachmentType,
    pub local_cache_path: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RuleAuditInputSnapshot {
    pub article_id: ArticleId,
    pub feed_id: String,
    pub article_title: String,
    pub article_author: Option<String>,
    pub published_at: Option<IsoDateTime>,
    pub fetched_at: IsoDateTime,
    pub language: Option<String>,
    pub feed_title: Option<String>,
    pub feed_folder_id: Option<String>,
    pub user_state: RuleAuditUserStateSnapshot,
    pub article_tag_names: Vec<String>,
    pub attachments: Vec<RuleAuditAttachmentSnapshot>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RuleEvaluationAudit {
    pub rule_id: RuleId,
    pub article_id: ArticleId,
    pub match_result: RuleAuditMatchResult,
    pub input_snapshot: RuleAuditInputSnapshot,
    pub planned_commands: Vec<RuleActionCommand>,
}

impl RuleEvaluationAudit {
    pub fn into_action_plan(self) -> Option<RuleActionPlan> {
        if self.match_result != RuleAuditMatchResult::Matched {
            return None;
        }

        Some(RuleActionPlan {
            rule_id: self.rule_id,
            commands: self.planned_commands,
        })
    }

    pub fn into_rule_audit(self, audit_id: RuleAuditId, created_at: IsoDateTime) -> RuleAudit {
        RuleAudit {
            id: audit_id,
            rule_id: self.rule_id,
            article_id: self.article_id,
            match_result: self.match_result,
            input_snapshot: input_snapshot_json(&self.input_snapshot),
            planned_commands: planned_commands_json(&self.planned_commands),
            applied_effects: None,
            created_at,
        }
    }
}

pub fn evaluate_rule_with_audit(
    rule: &Rule,
    context: &RuleMatchContext<'_>,
) -> Result<Option<RuleEvaluationAudit>, RuleEngineError> {
    if !rule.enabled {
        return Ok(None);
    }

    let action_definition = parse_rule_actions(&rule.actions)?;
    let matched = match_rule_conditions(&rule.conditions, context)?;
    let planned_commands = if matched {
        build_rule_action_plan(&rule.id, &action_definition, context).commands
    } else {
        Vec::new()
    };

    Ok(Some(RuleEvaluationAudit {
        rule_id: rule.id.clone(),
        article_id: context.article.id.clone(),
        match_result: if matched {
            RuleAuditMatchResult::Matched
        } else {
            RuleAuditMatchResult::NotMatched
        },
        input_snapshot: snapshot_from_context(context),
        planned_commands,
    }))
}

fn snapshot_from_context(context: &RuleMatchContext<'_>) -> RuleAuditInputSnapshot {
    let user_state = context.user_state;
    let article_tag_names = context
        .article_tags
        .iter()
        .map(|tag| tag.name.clone())
        .collect::<Vec<_>>();
    let attachments = context
        .attachments
        .iter()
        .map(|attachment| RuleAuditAttachmentSnapshot {
            id: attachment.id.clone(),
            attachment_type: attachment.attachment_type,
            local_cache_path: attachment
                .local_cache_path
                .as_ref()
                .map(|path| path.as_str().to_owned()),
        })
        .collect::<Vec<_>>();

    RuleAuditInputSnapshot {
        article_id: context.article.id.clone(),
        feed_id: context.article.feed_id.as_str().to_owned(),
        article_title: context.article.title.clone(),
        article_author: context.article.author.clone(),
        published_at: context.article.published_at.clone(),
        fetched_at: context.article.fetched_at.clone(),
        language: context
            .article
            .language
            .as_ref()
            .map(|language| language.as_str().to_owned()),
        feed_title: context.feed.map(|feed| {
            feed.custom_name
                .clone()
                .unwrap_or_else(|| feed.title.clone())
        }),
        feed_folder_id: context.feed.and_then(|feed| {
            feed.folder_id
                .as_ref()
                .map(|folder_id| folder_id.as_str().to_owned())
        }),
        user_state: RuleAuditUserStateSnapshot {
            read_state: user_state
                .map(|state| state.read_state)
                .unwrap_or(ReadState::Unread),
            starred: user_state.map(|state| state.starred).unwrap_or(false),
            liked: user_state.map(|state| state.liked).unwrap_or(false),
            read_later: user_state.map(|state| state.read_later).unwrap_or(false),
            importance: user_state
                .map(|state| state.importance)
                .unwrap_or(ImportanceLevel::Normal),
        },
        article_tag_names,
        attachments,
    }
}

fn input_snapshot_json(snapshot: &RuleAuditInputSnapshot) -> JsonBlob {
    JsonBlob::from(json!({
      "article": {
        "id": snapshot.article_id.as_str(),
        "feedId": snapshot.feed_id.as_str(),
        "title": &snapshot.article_title,
        "author": snapshot.article_author.as_deref(),
        "publishedAt": snapshot.published_at.as_ref().map(IsoDateTime::as_str),
        "fetchedAt": snapshot.fetched_at.as_str(),
        "language": snapshot.language.as_deref()
      },
      "feed": {
        "title": snapshot.feed_title.as_deref(),
        "folderId": snapshot.feed_folder_id.as_deref()
      },
      "userState": {
        "readState": snapshot.user_state.read_state.as_str(),
        "starred": snapshot.user_state.starred,
        "liked": snapshot.user_state.liked,
        "readLater": snapshot.user_state.read_later,
        "importance": snapshot.user_state.importance.as_str()
      },
      "articleTagNames": &snapshot.article_tag_names,
      "attachments": snapshot.attachments.iter().map(attachment_snapshot_json).collect::<Vec<_>>()
    }))
}

fn attachment_snapshot_json(snapshot: &RuleAuditAttachmentSnapshot) -> Value {
    json!({
      "attachmentId": snapshot.id.as_str(),
      "type": snapshot.attachment_type.as_str(),
      "localCachePath": snapshot.local_cache_path.as_deref()
    })
}

fn planned_commands_json(commands: &[RuleActionCommand]) -> JsonBlob {
    JsonBlob::from(Value::Array(
        commands
            .iter()
            .map(rule_action_command_json)
            .collect::<Vec<_>>(),
    ))
}

fn rule_action_command_json(command: &RuleActionCommand) -> Value {
    match command {
        RuleActionCommand::UpdateUserState {
            article_id,
            changes,
        } => json!({
          "type": "updateUserState",
          "articleId": article_id.as_str(),
          "changes": user_state_changes_json(changes)
        }),
        RuleActionCommand::AddArticleTags {
            article_id,
            tag_names,
        } => json!({
          "type": "addArticleTags",
          "articleId": article_id.as_str(),
          "tagNames": tag_names
        }),
        RuleActionCommand::MoveFeedToFolder {
            feed_id,
            from_folder_id,
            to_folder_id,
        } => json!({
          "type": "moveFeedToFolder",
          "feedId": feed_id.as_str(),
          "fromFolderId": from_folder_id.as_ref().map(|folder_id| folder_id.as_str()),
          "toFolderId": to_folder_id.as_ref().map(|folder_id| folder_id.as_str())
        }),
        RuleActionCommand::ClearAttachmentCaches {
            article_id,
            attachments,
        } => json!({
          "type": "clearAttachmentCaches",
          "articleId": article_id.as_str(),
          "attachments": attachments.iter().map(attachment_cache_target_json).collect::<Vec<_>>()
        }),
    }
}

fn user_state_changes_json(changes: &RuleUserStateChanges) -> Value {
    json!({
      "readState": changes.read_state.map(ReadState::as_str),
      "starred": changes.starred,
      "readLater": changes.read_later,
      "importance": changes.importance.map(ImportanceLevel::as_str)
    })
}

fn attachment_cache_target_json(target: &RuleAttachmentCacheTarget) -> Value {
    json!({
      "attachmentId": target.attachment_id.as_str(),
      "cachePath": target.cache_path.as_str()
    })
}

#[cfg(test)]
mod tests {
    use freelyrss_core_domain::{
        Article, ArticleId, Attachment, AttachmentId, AttachmentType, CachePath, CachePolicy, Feed,
        FeedFormat, FeedHealthStatus, FeedId, ImportanceLevel, IsoDateTime, JsonBlob, LanguageCode,
        ReadState, Rule, RuleAuditId, RuleAuditMatchResult, RuleId, Tag, TagId, TagScope,
        UrlString, UserState,
    };
    use serde_json::{Value, json};

    use super::evaluate_rule_with_audit;
    use crate::RuleMatchContext;

    #[test]
    fn captures_not_matched_rule_evaluations_as_audit_history_payload() {
        let target_article = article();
        let context = RuleMatchContext::new(&target_article);
        let rule = rule(
            "rule-miss",
            json!({
              "version": 1,
              "root": {
                "kind": "predicate",
                "field": "title",
                "operator": "contains",
                "value": "podcast"
              },
              "sort": []
            }),
            json!({ "starred": true }),
        );

        let audit = evaluate_rule_with_audit(&rule, &context)
            .expect("rule evaluation should succeed")
            .expect("enabled rules should produce audit entries");

        assert_eq!(audit.match_result, RuleAuditMatchResult::NotMatched);
        assert!(audit.planned_commands.is_empty());
        let action_plan = audit.clone().into_action_plan();
        assert!(action_plan.is_none());

        let stored = audit.into_rule_audit(
            RuleAuditId::try_from("rule-audit-miss").expect("audit id"),
            IsoDateTime::try_from("2026-04-23T10:00:00Z".to_owned()).expect("created at"),
        );

        assert_eq!(stored.match_result, RuleAuditMatchResult::NotMatched);
        assert_eq!(stored.article_id.as_str(), "article-rule-audit");
        assert_eq!(stored.planned_commands, JsonBlob::from(json!([])));
    }

    #[test]
    fn converts_matched_rule_evaluations_into_a_storable_rule_audit() {
        let target_article = article();
        let target_feed = feed();
        let target_state = user_state();
        let tags = article_tags();
        let attachments = attachments();
        let context = RuleMatchContext::new(&target_article)
            .with_feed(&target_feed)
            .with_user_state(&target_state)
            .with_article_tags(&tags)
            .with_attachments(&attachments);
        let rule = rule(
            "rule-hit",
            json!({
              "version": 1,
              "root": {
                "kind": "predicate",
                "field": "title",
                "operator": "contains",
                "value": "shared query boundary"
              },
              "sort": []
            }),
            json!({
              "starred": true,
              "readState": "read",
              "tagNames": ["priority"],
              "clearCachedAttachments": true
            }),
        );

        let audit = evaluate_rule_with_audit(&rule, &context)
            .expect("rule evaluation should succeed")
            .expect("enabled rules should produce audit entries");
        let stored = audit.into_rule_audit(
            RuleAuditId::try_from("rule-audit-hit").expect("audit id"),
            IsoDateTime::try_from("2026-04-23T10:05:00Z".to_owned()).expect("created at"),
        );

        assert_eq!(stored.match_result, RuleAuditMatchResult::Matched);
        assert_eq!(stored.rule_id.as_str(), "rule-hit");
        assert_eq!(stored.article_id.as_str(), "article-rule-audit");
        assert_eq!(
            stored
                .input_snapshot
                .as_value()
                .get("article")
                .and_then(|value| value.get("title"))
                .and_then(Value::as_str),
            Some("Rust rule engine reaches the shared query boundary")
        );
        assert_eq!(
            stored.planned_commands.as_value().as_array().map(Vec::len),
            Some(3)
        );
        assert_eq!(stored.applied_effects, None);
    }

    fn article() -> Article {
        Article {
            id: ArticleId::try_from("article-rule-audit").expect("article id"),
            feed_id: FeedId::try_from("feed-engineering").expect("feed id"),
            source_guid: Some("rule-audit-guid".to_owned()),
            title: "Rust rule engine reaches the shared query boundary".to_owned(),
            author: Some("FreelyRSS Team".to_owned()),
            summary: Some("Rule evaluation now records audit snapshots.".to_owned()),
            content_raw: None,
            content_extracted: Some("Audit snapshots now persist matched commands.".to_owned()),
            canonical_url: Some(
                UrlString::try_from("https://example.com/articles/rule-audit".to_owned())
                    .expect("canonical url"),
            ),
            original_url: Some(
                UrlString::try_from("https://example.com/articles/rule-audit".to_owned())
                    .expect("original url"),
            ),
            published_at: Some(
                IsoDateTime::try_from("2026-04-22T09:00:00Z".to_owned()).expect("published at"),
            ),
            fetched_at: IsoDateTime::try_from("2026-04-23T01:00:00Z".to_owned())
                .expect("fetched at"),
            language: Some(LanguageCode::try_from("en".to_owned()).expect("language")),
            thumbnail: None,
            word_count: Some(320),
            content_hash: Some("sha256:rule-audit".to_owned()),
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
            cache_policy: CachePolicy::Content,
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
            article_id: ArticleId::try_from("article-rule-audit").expect("article id"),
            read_state: ReadState::Reading,
            starred: false,
            liked: false,
            importance: ImportanceLevel::High,
            read_later: true,
            reading_progress: 0.55,
            last_opened_at: Some(
                IsoDateTime::try_from("2026-04-23T02:00:00Z".to_owned()).expect("last opened at"),
            ),
        }
    }

    fn article_tags() -> Vec<Tag> {
        vec![Tag {
            id: TagId::try_from("tag-rust").expect("tag id"),
            name: "rust".to_owned(),
            scope: TagScope::Article,
            color: None,
            created_at: IsoDateTime::try_from("2026-04-22T00:00:00Z".to_owned())
                .expect("created at"),
        }]
    }

    fn attachments() -> Vec<Attachment> {
        vec![Attachment {
            id: AttachmentId::try_from("attachment-rule-audit").expect("attachment id"),
            article_id: ArticleId::try_from("article-rule-audit").expect("article id"),
            attachment_type: AttachmentType::File,
            url: UrlString::try_from("https://example.com/assets/rule-audit.json".to_owned())
                .expect("attachment url"),
            mime_type: Some("application/json".to_owned()),
            duration: None,
            size: Some(1024),
            local_cache_path: Some(
                CachePath::try_from("cache/articles/rule-audit.json".to_owned())
                    .expect("cache path"),
            ),
        }]
    }

    fn rule(id: &str, conditions: Value, actions: Value) -> Rule {
        Rule {
            id: RuleId::try_from(id).expect("rule id"),
            name: id.to_owned(),
            enabled: true,
            priority: 0,
            conditions: JsonBlob::from(conditions),
            actions: JsonBlob::from(actions),
            scope: "article".to_owned(),
        }
    }
}
