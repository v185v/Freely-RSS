//! Rule evaluation engine for FreelyRSS.

mod engine;
mod error;
mod query;

pub use engine::{RuleMatchContext, match_query_definition, match_rule, match_rule_conditions};
pub use error::{QueryValidationIssue, RuleEngineError};
pub use query::{
    QueryDefinition, QueryField, QueryMatch, QueryNode, QueryOperator, QueryPredicateNode,
    QueryScalar, QuerySort, QuerySortDirection, QuerySortField, QuerySortNulls, QueryValue,
    parse_query_definition,
};
