use std::collections::HashSet;

use freelyrss_core_domain::{
    ArticleId, AttachmentId, CachePath, FeedId, FolderId, ImportanceLevel, JsonBlob, ReadState,
    RuleId,
};
use serde_json::Value;

use crate::{ActionValidationIssue, RuleEngineError, RuleMatchContext};

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum RuleFolderTarget {
    Root,
    Folder(FolderId),
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct RuleActionDefinition {
    pub read_state: Option<ReadState>,
    pub starred: Option<bool>,
    pub read_later: Option<bool>,
    pub importance: Option<ImportanceLevel>,
    pub tag_names: Vec<String>,
    pub move_to_folder: Option<RuleFolderTarget>,
    pub clear_cached_attachments: bool,
}

impl RuleActionDefinition {
    fn is_empty(&self) -> bool {
        self.read_state.is_none()
            && self.starred.is_none()
            && self.read_later.is_none()
            && self.importance.is_none()
            && self.tag_names.is_empty()
            && self.move_to_folder.is_none()
            && !self.clear_cached_attachments
    }
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct RuleUserStateChanges {
    pub read_state: Option<ReadState>,
    pub starred: Option<bool>,
    pub read_later: Option<bool>,
    pub importance: Option<ImportanceLevel>,
}

impl RuleUserStateChanges {
    fn is_empty(&self) -> bool {
        self.read_state.is_none()
            && self.starred.is_none()
            && self.read_later.is_none()
            && self.importance.is_none()
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RuleAttachmentCacheTarget {
    pub attachment_id: AttachmentId,
    pub cache_path: CachePath,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum RuleActionCommand {
    UpdateUserState {
        article_id: ArticleId,
        changes: RuleUserStateChanges,
    },
    AddArticleTags {
        article_id: ArticleId,
        tag_names: Vec<String>,
    },
    MoveFeedToFolder {
        feed_id: FeedId,
        from_folder_id: Option<FolderId>,
        to_folder_id: Option<FolderId>,
    },
    ClearAttachmentCaches {
        article_id: ArticleId,
        attachments: Vec<RuleAttachmentCacheTarget>,
    },
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RuleActionPlan {
    pub rule_id: RuleId,
    pub commands: Vec<RuleActionCommand>,
}

impl RuleActionPlan {
    pub fn is_empty(&self) -> bool {
        self.commands.is_empty()
    }
}

pub fn parse_rule_actions(actions: &JsonBlob) -> Result<RuleActionDefinition, RuleEngineError> {
    let Value::Object(object) = actions.as_value() else {
        return Err(invalid_action_definition(vec![ActionValidationIssue::new(
            "actions",
            "invalid-json-root",
            "Rule actions must be JSON objects.",
        )]));
    };

    if let Some(action_type) = object.get("type") {
        match action_type {
            Value::String(value) if value == "noop" && object.len() == 1 => {
                return Ok(RuleActionDefinition::default());
            }
            Value::String(value) if value == "noop" => {
                return Err(invalid_action_definition(vec![ActionValidationIssue::new(
                    "actions.type",
                    "unexpected-noop-combination",
                    "The noop action cannot be combined with other action fields.",
                )]));
            }
            Value::String(value) => {
                return Err(invalid_action_definition(vec![ActionValidationIssue::new(
                    "actions.type",
                    "invalid-action-type",
                    format!("Unsupported action type \"{value}\"."),
                )]));
            }
            _ => {
                return Err(invalid_action_definition(vec![ActionValidationIssue::new(
                    "actions.type",
                    "invalid-action-type",
                    "Rule action type must be a string when present.",
                )]));
            }
        }
    }

    let mut issues = Vec::new();

    for key in object.keys() {
        if !matches!(
            key.as_str(),
            "readState"
                | "starred"
                | "readLater"
                | "importance"
                | "tagNames"
                | "moveToFolderId"
                | "clearCachedAttachments"
        ) {
            push_issue(
                &mut issues,
                format!("actions.{key}"),
                "unknown-action-field",
                format!("Unsupported rule action field \"{key}\"."),
            );
        }
    }

    let definition = RuleActionDefinition {
        read_state: read_read_state(&mut issues, object.get("readState")),
        starred: read_bool(&mut issues, "actions.starred", object.get("starred")),
        read_later: read_bool(&mut issues, "actions.readLater", object.get("readLater")),
        importance: read_importance(&mut issues, object.get("importance")),
        tag_names: read_tag_names(&mut issues, object.get("tagNames")),
        move_to_folder: read_folder_target(&mut issues, object.get("moveToFolderId")),
        clear_cached_attachments: read_bool(
            &mut issues,
            "actions.clearCachedAttachments",
            object.get("clearCachedAttachments"),
        )
        .unwrap_or(false),
    };

    if issues.is_empty() && definition.is_empty() {
        push_issue(
            &mut issues,
            "actions",
            "empty-action-definition",
            "Rule actions must define at least one supported action.",
        );
    }

    if issues.is_empty() {
        Ok(definition)
    } else {
        Err(invalid_action_definition(issues))
    }
}

pub fn build_rule_action_plan(
    rule_id: &RuleId,
    definition: &RuleActionDefinition,
    context: &RuleMatchContext<'_>,
) -> RuleActionPlan {
    let mut commands = Vec::new();

    let current_read_state = context
        .user_state
        .map(|state| state.read_state)
        .unwrap_or(ReadState::Unread);
    let current_starred = context
        .user_state
        .map(|state| state.starred)
        .unwrap_or(false);
    let current_read_later = context
        .user_state
        .map(|state| state.read_later)
        .unwrap_or(false);
    let current_importance = context
        .user_state
        .map(|state| state.importance)
        .unwrap_or(ImportanceLevel::Normal);

    let mut user_state_changes = RuleUserStateChanges::default();

    if let Some(read_state) = definition.read_state
        && read_state != current_read_state
    {
        user_state_changes.read_state = Some(read_state);
    }

    if let Some(starred) = definition.starred
        && starred != current_starred
    {
        user_state_changes.starred = Some(starred);
    }

    if let Some(read_later) = definition.read_later
        && read_later != current_read_later
    {
        user_state_changes.read_later = Some(read_later);
    }

    if let Some(importance) = definition.importance
        && importance != current_importance
    {
        user_state_changes.importance = Some(importance);
    }

    if !user_state_changes.is_empty() {
        commands.push(RuleActionCommand::UpdateUserState {
            article_id: context.article.id.clone(),
            changes: user_state_changes,
        });
    }

    if !definition.tag_names.is_empty() {
        let existing_tag_names = context
            .article_tags
            .iter()
            .map(|tag| tag.name.as_str())
            .collect::<HashSet<_>>();
        let tag_names = definition
            .tag_names
            .iter()
            .filter(|tag_name| !existing_tag_names.contains(tag_name.as_str()))
            .cloned()
            .collect::<Vec<_>>();

        if !tag_names.is_empty() {
            commands.push(RuleActionCommand::AddArticleTags {
                article_id: context.article.id.clone(),
                tag_names,
            });
        }
    }

    if let Some(target) = definition.move_to_folder.as_ref() {
        let from_folder_id = context.feed.and_then(|feed| feed.folder_id.clone());
        let to_folder_id = match target {
            RuleFolderTarget::Root => None,
            RuleFolderTarget::Folder(folder_id) => Some(folder_id.clone()),
        };

        if context.feed.is_none() || from_folder_id != to_folder_id {
            commands.push(RuleActionCommand::MoveFeedToFolder {
                feed_id: context.article.feed_id.clone(),
                from_folder_id,
                to_folder_id,
            });
        }
    }

    if definition.clear_cached_attachments {
        let attachments = context
            .attachments
            .iter()
            .filter_map(|attachment| {
                attachment
                    .local_cache_path
                    .clone()
                    .map(|cache_path| RuleAttachmentCacheTarget {
                        attachment_id: attachment.id.clone(),
                        cache_path,
                    })
            })
            .collect::<Vec<_>>();

        if !attachments.is_empty() {
            commands.push(RuleActionCommand::ClearAttachmentCaches {
                article_id: context.article.id.clone(),
                attachments,
            });
        }
    }

    RuleActionPlan {
        rule_id: rule_id.clone(),
        commands,
    }
}

fn invalid_action_definition(issues: Vec<ActionValidationIssue>) -> RuleEngineError {
    RuleEngineError::InvalidActionDefinition { issues }
}

fn push_issue(
    issues: &mut Vec<ActionValidationIssue>,
    path: impl Into<String>,
    code: impl Into<String>,
    message: impl Into<String>,
) {
    issues.push(ActionValidationIssue::new(path, code, message));
}

fn read_bool(
    issues: &mut Vec<ActionValidationIssue>,
    path: &str,
    value: Option<&Value>,
) -> Option<bool> {
    match value {
        Some(Value::Bool(value)) => Some(*value),
        Some(_) => {
            push_issue(
                issues,
                path,
                "invalid-boolean",
                "Rule action field must be a boolean value.",
            );
            None
        }
        None => None,
    }
}

fn read_read_state(
    issues: &mut Vec<ActionValidationIssue>,
    value: Option<&Value>,
) -> Option<ReadState> {
    let path = "actions.readState";

    match value {
        Some(Value::String(value)) => match ReadState::try_from(value.as_str()) {
            Ok(read_state) => Some(read_state),
            Err(_) => {
                push_issue(
                    issues,
                    path,
                    "invalid-read-state",
                    format!("Unsupported read state \"{value}\"."),
                );
                None
            }
        },
        Some(_) => {
            push_issue(
                issues,
                path,
                "invalid-read-state",
                "readState must be a string enum value.",
            );
            None
        }
        None => None,
    }
}

fn read_importance(
    issues: &mut Vec<ActionValidationIssue>,
    value: Option<&Value>,
) -> Option<ImportanceLevel> {
    let path = "actions.importance";

    match value {
        Some(Value::String(value)) => match ImportanceLevel::try_from(value.as_str()) {
            Ok(importance) => Some(importance),
            Err(_) => {
                push_issue(
                    issues,
                    path,
                    "invalid-importance",
                    format!("Unsupported importance value \"{value}\"."),
                );
                None
            }
        },
        Some(_) => {
            push_issue(
                issues,
                path,
                "invalid-importance",
                "importance must be a string enum value.",
            );
            None
        }
        None => None,
    }
}

fn read_tag_names(issues: &mut Vec<ActionValidationIssue>, value: Option<&Value>) -> Vec<String> {
    let Some(value) = value else {
        return Vec::new();
    };

    let Value::Array(values) = value else {
        push_issue(
            issues,
            "actions.tagNames",
            "invalid-tag-list",
            "tagNames must be an array of non-empty strings.",
        );
        return Vec::new();
    };

    let mut tag_names = Vec::new();
    let mut seen = HashSet::new();

    for (index, entry) in values.iter().enumerate() {
        let path = format!("actions.tagNames[{index}]");

        match entry {
            Value::String(tag_name) if !tag_name.trim().is_empty() => {
                let normalized = tag_name.trim().to_owned();
                if seen.insert(normalized.clone()) {
                    tag_names.push(normalized);
                }
            }
            Value::String(_) => {
                push_issue(
                    issues,
                    path,
                    "empty-tag-name",
                    "Tag names must not be empty.",
                );
            }
            _ => {
                push_issue(
                    issues,
                    path,
                    "invalid-tag-name",
                    "Tag names must be strings.",
                );
            }
        }
    }

    if tag_names.is_empty() {
        push_issue(
            issues,
            "actions.tagNames",
            "empty-tag-list",
            "tagNames must include at least one non-empty tag name.",
        );
    }

    tag_names
}

fn read_folder_target(
    issues: &mut Vec<ActionValidationIssue>,
    value: Option<&Value>,
) -> Option<RuleFolderTarget> {
    let value = value?;

    match value {
        Value::Null => Some(RuleFolderTarget::Root),
        Value::String(value) => match FolderId::try_from(value.as_str()) {
            Ok(folder_id) => Some(RuleFolderTarget::Folder(folder_id)),
            Err(error) => {
                push_issue(
                    issues,
                    "actions.moveToFolderId",
                    "invalid-folder-id",
                    error.to_string(),
                );
                None
            }
        },
        _ => {
            push_issue(
                issues,
                "actions.moveToFolderId",
                "invalid-folder-target",
                "moveToFolderId must be a folder id string or null for the root level.",
            );
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use freelyrss_core_domain::{FolderId, ImportanceLevel, JsonBlob, ReadState};
    use serde_json::json;

    use super::{RuleActionDefinition, RuleFolderTarget, parse_rule_actions};
    use crate::RuleEngineError;

    #[test]
    fn parses_supported_rule_action_fields() {
        let definition = parse_rule_actions(&JsonBlob::from(json!({
          "readState": "read",
          "starred": true,
          "readLater": true,
          "importance": "high",
          "tagNames": ["rust", "priority", "rust"],
          "moveToFolderId": "folder-priority",
          "clearCachedAttachments": true
        })))
        .expect("supported actions");

        assert_eq!(
            definition,
            RuleActionDefinition {
                read_state: Some(ReadState::Read),
                starred: Some(true),
                read_later: Some(true),
                importance: Some(ImportanceLevel::High),
                tag_names: vec!["rust".to_owned(), "priority".to_owned()],
                move_to_folder: Some(RuleFolderTarget::Folder(
                    FolderId::try_from("folder-priority").expect("folder id"),
                )),
                clear_cached_attachments: true,
            }
        );
    }

    #[test]
    fn accepts_explicit_noop_action_definition() {
        let definition =
            parse_rule_actions(&JsonBlob::from(json!({ "type": "noop" }))).expect("noop action");

        assert_eq!(definition, RuleActionDefinition::default());
    }

    #[test]
    fn reports_path_based_action_validation_errors() {
        let error = parse_rule_actions(&JsonBlob::from(json!({
          "readState": "later",
          "starred": "yes",
          "tagNames": ["", 12],
          "moveToFolderId": 42,
          "clearCachedAttachments": "now",
          "unexpected": true
        })))
        .expect_err("invalid actions should fail");

        match error {
            RuleEngineError::InvalidActionDefinition { issues } => {
                assert!(
                    issues.iter().any(|issue| issue.path == "actions.readState"
                        && issue.code == "invalid-read-state")
                );
                assert!(issues.iter().any(
                    |issue| issue.path == "actions.starred" && issue.code == "invalid-boolean"
                ));
                assert!(
                    issues
                        .iter()
                        .any(|issue| issue.path == "actions.tagNames[0]"
                            && issue.code == "empty-tag-name")
                );
                assert!(
                    issues
                        .iter()
                        .any(|issue| issue.path == "actions.tagNames[1]"
                            && issue.code == "invalid-tag-name")
                );
                assert!(
                    issues
                        .iter()
                        .any(|issue| issue.path == "actions.moveToFolderId"
                            && issue.code == "invalid-folder-target")
                );
                assert!(
                    issues
                        .iter()
                        .any(|issue| issue.path == "actions.clearCachedAttachments"
                            && issue.code == "invalid-boolean")
                );
                assert!(issues.iter().any(|issue| issue.path == "actions.unexpected"
                    && issue.code == "unknown-action-field"));
            }
            other => panic!("expected invalid action definition error, got {other:?}"),
        }
    }
}
