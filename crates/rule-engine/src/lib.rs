//! Rule evaluation engine for FreelyRSS.

mod actions;
mod engine;
mod error;
mod query;

pub use actions::{
    RuleActionCommand, RuleActionDefinition, RuleActionPlan, RuleAttachmentCacheTarget,
    RuleFolderTarget, RuleUserStateChanges, build_rule_action_plan, parse_rule_actions,
};
pub use engine::{
    RuleMatchContext, execute_rule, match_query_definition, match_rule, match_rule_conditions,
};
pub use error::{ActionValidationIssue, QueryValidationIssue, RuleEngineError};
pub use query::{
    QueryDefinition, QueryField, QueryMatch, QueryNode, QueryOperator, QueryPredicateNode,
    QueryScalar, QuerySort, QuerySortDirection, QuerySortField, QuerySortNulls, QueryValue,
    parse_query_definition,
};
