use serde_json::{Number, Value};

use crate::error::{QueryValidationIssue, RuleEngineError};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum QueryMatch {
    All,
    Any,
}

impl QueryMatch {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::All => "all",
            Self::Any => "any",
        }
    }
}

impl TryFrom<&str> for QueryMatch {
    type Error = ();

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "all" => Ok(Self::All),
            "any" => Ok(Self::Any),
            _ => Err(()),
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum QueryOperator {
    Eq,
    Neq,
    Contains,
    NotContains,
    Gt,
    Gte,
    Lt,
    Lte,
    In,
    NotIn,
}

impl QueryOperator {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Eq => "eq",
            Self::Neq => "neq",
            Self::Contains => "contains",
            Self::NotContains => "notContains",
            Self::Gt => "gt",
            Self::Gte => "gte",
            Self::Lt => "lt",
            Self::Lte => "lte",
            Self::In => "in",
            Self::NotIn => "notIn",
        }
    }
}

impl TryFrom<&str> for QueryOperator {
    type Error = ();

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "eq" => Ok(Self::Eq),
            "neq" => Ok(Self::Neq),
            "contains" => Ok(Self::Contains),
            "notContains" => Ok(Self::NotContains),
            "gt" => Ok(Self::Gt),
            "gte" => Ok(Self::Gte),
            "lt" => Ok(Self::Lt),
            "lte" => Ok(Self::Lte),
            "in" => Ok(Self::In),
            "notIn" => Ok(Self::NotIn),
            _ => Err(()),
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum QueryField {
    AnyText,
    FeedId,
    Title,
    Author,
    Summary,
    Content,
    FeedTitle,
    Tag,
    Language,
    PublishedAt,
    FetchedAt,
    ReadState,
    Starred,
    Liked,
    ReadLater,
    Importance,
    HasAttachment,
}

impl QueryField {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::AnyText => "anyText",
            Self::FeedId => "feedId",
            Self::Title => "title",
            Self::Author => "author",
            Self::Summary => "summary",
            Self::Content => "content",
            Self::FeedTitle => "feedTitle",
            Self::Tag => "tag",
            Self::Language => "language",
            Self::PublishedAt => "publishedAt",
            Self::FetchedAt => "fetchedAt",
            Self::ReadState => "readState",
            Self::Starred => "starred",
            Self::Liked => "liked",
            Self::ReadLater => "readLater",
            Self::Importance => "importance",
            Self::HasAttachment => "hasAttachment",
        }
    }
}

impl TryFrom<&str> for QueryField {
    type Error = ();

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "anyText" => Ok(Self::AnyText),
            "feedId" => Ok(Self::FeedId),
            "title" => Ok(Self::Title),
            "author" => Ok(Self::Author),
            "summary" => Ok(Self::Summary),
            "content" => Ok(Self::Content),
            "feedTitle" => Ok(Self::FeedTitle),
            "tag" => Ok(Self::Tag),
            "language" => Ok(Self::Language),
            "publishedAt" => Ok(Self::PublishedAt),
            "fetchedAt" => Ok(Self::FetchedAt),
            "readState" => Ok(Self::ReadState),
            "starred" => Ok(Self::Starred),
            "liked" => Ok(Self::Liked),
            "readLater" => Ok(Self::ReadLater),
            "importance" => Ok(Self::Importance),
            "hasAttachment" => Ok(Self::HasAttachment),
            _ => Err(()),
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum QuerySortField {
    PublishedAt,
    FetchedAt,
    Title,
    FeedTitle,
    Importance,
}

impl TryFrom<&str> for QuerySortField {
    type Error = ();

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "publishedAt" => Ok(Self::PublishedAt),
            "fetchedAt" => Ok(Self::FetchedAt),
            "title" => Ok(Self::Title),
            "feedTitle" => Ok(Self::FeedTitle),
            "importance" => Ok(Self::Importance),
            _ => Err(()),
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum QuerySortDirection {
    Asc,
    Desc,
}

impl TryFrom<&str> for QuerySortDirection {
    type Error = ();

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "asc" => Ok(Self::Asc),
            "desc" => Ok(Self::Desc),
            _ => Err(()),
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum QuerySortNulls {
    First,
    Last,
}

impl TryFrom<&str> for QuerySortNulls {
    type Error = ();

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "first" => Ok(Self::First),
            "last" => Ok(Self::Last),
            _ => Err(()),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum QueryScalar {
    Boolean(bool),
    Number(Number),
    String(String),
}

impl QueryScalar {
    pub fn as_bool(&self) -> Option<bool> {
        match self {
            Self::Boolean(value) => Some(*value),
            _ => None,
        }
    }

    pub fn as_f64(&self) -> Option<f64> {
        match self {
            Self::Number(value) => value.as_f64(),
            _ => None,
        }
    }

    pub fn as_str(&self) -> Option<&str> {
        match self {
            Self::String(value) => Some(value.as_str()),
            _ => None,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum QueryValue {
    Scalar(QueryScalar),
    List(Vec<QueryScalar>),
}

impl QueryValue {
    pub fn as_bool(&self) -> Option<bool> {
        match self {
            Self::Scalar(value) => value.as_bool(),
            Self::List(_) => None,
        }
    }

    pub fn as_f64(&self) -> Option<f64> {
        match self {
            Self::Scalar(value) => value.as_f64(),
            Self::List(_) => None,
        }
    }

    pub fn as_str(&self) -> Option<&str> {
        match self {
            Self::Scalar(value) => value.as_str(),
            Self::List(_) => None,
        }
    }

    pub fn as_string_list(&self) -> Option<Vec<&str>> {
        match self {
            Self::Scalar(_) => None,
            Self::List(values) => values.iter().map(QueryScalar::as_str).collect(),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct QueryPredicateNode {
    pub field: QueryField,
    pub operator: QueryOperator,
    pub value: QueryValue,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum QueryNode {
    Group {
        group_match: QueryMatch,
        children: Vec<QueryNode>,
    },
    Not {
        child: Box<QueryNode>,
    },
    Predicate(QueryPredicateNode),
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct QuerySort {
    pub field: QuerySortField,
    pub direction: QuerySortDirection,
    pub nulls: QuerySortNulls,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct QueryDefinition {
    pub version: u64,
    pub root: QueryNode,
    pub sort: Vec<QuerySort>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum QueryFieldKind {
    Boolean,
    DateTime,
    Enum,
    Text,
}

#[derive(Clone, Copy)]
struct QueryFieldSchema {
    kind: QueryFieldKind,
    operators: &'static [QueryOperator],
    values: &'static [&'static str],
}

const READ_STATE_VALUES: &[&str] = &["unread", "reading", "read"];
const IMPORTANCE_VALUES: &[&str] = &["low", "normal", "high"];

const BOOLEAN_OPERATORS: &[QueryOperator] = &[QueryOperator::Eq, QueryOperator::Neq];
const DATETIME_OPERATORS: &[QueryOperator] = &[
    QueryOperator::Eq,
    QueryOperator::Neq,
    QueryOperator::Gt,
    QueryOperator::Gte,
    QueryOperator::Lt,
    QueryOperator::Lte,
];
const TEXT_OPERATORS: &[QueryOperator] = &[
    QueryOperator::Contains,
    QueryOperator::NotContains,
    QueryOperator::Eq,
    QueryOperator::Neq,
];
const TEXT_LIST_OPERATORS: &[QueryOperator] = &[
    QueryOperator::Contains,
    QueryOperator::NotContains,
    QueryOperator::Eq,
    QueryOperator::Neq,
    QueryOperator::In,
    QueryOperator::NotIn,
];
const EXACT_LIST_OPERATORS: &[QueryOperator] = &[
    QueryOperator::Eq,
    QueryOperator::Neq,
    QueryOperator::In,
    QueryOperator::NotIn,
];

impl QueryField {
    const fn schema(self) -> QueryFieldSchema {
        match self {
            Self::AnyText => QueryFieldSchema {
                kind: QueryFieldKind::Text,
                operators: &[QueryOperator::Contains, QueryOperator::NotContains],
                values: &[],
            },
            Self::FeedId => QueryFieldSchema {
                kind: QueryFieldKind::Text,
                operators: EXACT_LIST_OPERATORS,
                values: &[],
            },
            Self::Title | Self::Author | Self::Summary | Self::FeedTitle => QueryFieldSchema {
                kind: QueryFieldKind::Text,
                operators: TEXT_LIST_OPERATORS,
                values: &[],
            },
            Self::Content => QueryFieldSchema {
                kind: QueryFieldKind::Text,
                operators: TEXT_OPERATORS,
                values: &[],
            },
            Self::Tag | Self::Language => QueryFieldSchema {
                kind: QueryFieldKind::Text,
                operators: EXACT_LIST_OPERATORS,
                values: &[],
            },
            Self::PublishedAt | Self::FetchedAt => QueryFieldSchema {
                kind: QueryFieldKind::DateTime,
                operators: DATETIME_OPERATORS,
                values: &[],
            },
            Self::ReadState => QueryFieldSchema {
                kind: QueryFieldKind::Enum,
                operators: EXACT_LIST_OPERATORS,
                values: READ_STATE_VALUES,
            },
            Self::Starred | Self::Liked | Self::ReadLater | Self::HasAttachment => {
                QueryFieldSchema {
                    kind: QueryFieldKind::Boolean,
                    operators: BOOLEAN_OPERATORS,
                    values: &[],
                }
            }
            Self::Importance => QueryFieldSchema {
                kind: QueryFieldKind::Enum,
                operators: EXACT_LIST_OPERATORS,
                values: IMPORTANCE_VALUES,
            },
        }
    }
}

fn invalid_query_definition(issues: Vec<QueryValidationIssue>) -> RuleEngineError {
    RuleEngineError::InvalidQueryDefinition { issues }
}

fn push_issue(
    issues: &mut Vec<QueryValidationIssue>,
    path: impl Into<String>,
    code: impl Into<String>,
    message: impl Into<String>,
) {
    issues.push(QueryValidationIssue::new(path, code, message));
}

fn read_string(
    issues: &mut Vec<QueryValidationIssue>,
    path: &str,
    value: Option<&Value>,
    message: &str,
) -> Option<String> {
    match value {
        Some(Value::String(value)) => Some(value.clone()),
        _ => {
            push_issue(issues, path, "invalid-json-string", message);
            None
        }
    }
}

fn read_scalar(
    issues: &mut Vec<QueryValidationIssue>,
    path: &str,
    value: Option<&Value>,
) -> Option<QueryScalar> {
    match value {
        Some(Value::Bool(value)) => Some(QueryScalar::Boolean(*value)),
        Some(Value::Number(value)) => Some(QueryScalar::Number(value.clone())),
        Some(Value::String(value)) => Some(QueryScalar::String(value.clone())),
        _ => {
            push_issue(
                issues,
                path,
                "invalid-json-scalar",
                "Query predicate values must be string, number, or boolean scalars.",
            );
            None
        }
    }
}

fn read_value(
    issues: &mut Vec<QueryValidationIssue>,
    path: &str,
    value: Option<&Value>,
) -> Option<QueryValue> {
    match value {
        Some(Value::Array(values)) => {
            let scalars = values
                .iter()
                .enumerate()
                .filter_map(|(index, entry)| {
                    read_scalar(issues, &format!("{path}[{index}]"), Some(entry))
                })
                .collect::<Vec<_>>();

            Some(QueryValue::List(scalars))
        }
        _ => read_scalar(issues, path, value).map(QueryValue::Scalar),
    }
}

fn validate_predicate_value(
    issues: &mut Vec<QueryValidationIssue>,
    path: &str,
    field: QueryField,
    operator: QueryOperator,
    value: &QueryValue,
) {
    let schema = field.schema();

    if let QueryValue::List(values) = value {
        if values.is_empty() {
            push_issue(
                issues,
                path,
                "empty-list",
                "List predicates must provide at least one value.",
            );
            return;
        }

        if operator != QueryOperator::In && operator != QueryOperator::NotIn {
            push_issue(
                issues,
                path,
                "unexpected-list",
                format!(
                    "Operator \"{}\" does not accept an array value.",
                    operator.as_str()
                ),
            );
            return;
        }

        if values.iter().any(|entry| entry.as_str().is_none()) {
            push_issue(
                issues,
                path,
                "invalid-list-value",
                "List predicates currently accept string values only.",
            );
            return;
        }

        if !schema.values.is_empty() {
            for entry in values.iter().filter_map(QueryScalar::as_str) {
                if !schema.values.contains(&entry) {
                    push_issue(
                        issues,
                        path,
                        "invalid-enum-member",
                        format!(
                            "\"{entry}\" is not a valid value for field \"{}\".",
                            field.as_str()
                        ),
                    );
                }
            }
        }

        return;
    }

    match schema.kind {
        QueryFieldKind::Boolean if value.as_bool().is_none() => push_issue(
            issues,
            path,
            "invalid-boolean",
            format!("Field \"{}\" expects a boolean value.", field.as_str()),
        ),
        QueryFieldKind::DateTime if value.as_str().is_none() => push_issue(
            issues,
            path,
            "invalid-datetime",
            format!(
                "Field \"{}\" expects an ISO date-time string.",
                field.as_str()
            ),
        ),
        QueryFieldKind::Text | QueryFieldKind::Enum if value.as_str().is_none() => push_issue(
            issues,
            path,
            "invalid-string",
            format!("Field \"{}\" expects a string value.", field.as_str()),
        ),
        _ => {}
    }

    if !schema.values.is_empty()
        && let Some(value) = value.as_str()
        && !schema.values.contains(&value)
    {
        push_issue(
            issues,
            path,
            "invalid-enum-value",
            format!(
                "\"{value}\" is not a valid value for field \"{}\".",
                field.as_str()
            ),
        );
    }
}

fn read_node(
    issues: &mut Vec<QueryValidationIssue>,
    path: &str,
    value: Option<&Value>,
) -> Option<QueryNode> {
    let Some(Value::Object(node)) = value else {
        push_issue(
            issues,
            path,
            "invalid-json-node",
            "Query nodes must be JSON objects.",
        );
        return None;
    };

    let kind = read_string(
        issues,
        &format!("{path}.kind"),
        node.get("kind"),
        "Query nodes must define a string kind.",
    )?;

    match kind.as_str() {
        "group" => {
            let group_match = read_string(
                issues,
                &format!("{path}.match"),
                node.get("match"),
                "Group nodes must define a string \"match\" value.",
            )
            .and_then(|value| match QueryMatch::try_from(value.as_str()) {
                Ok(group_match) => Some(group_match),
                Err(()) => {
                    push_issue(
                        issues,
                        format!("{path}.match"),
                        "invalid-match",
                        format!("Unsupported group match \"{value}\"."),
                    );
                    None
                }
            })?;

            let Some(Value::Array(children)) = node.get("children") else {
                push_issue(
                    issues,
                    format!("{path}.children"),
                    "invalid-json-children",
                    "Group nodes must define a children array.",
                );
                return None;
            };

            let children = children
                .iter()
                .enumerate()
                .filter_map(|(index, child)| {
                    read_node(issues, &format!("{path}.children[{index}]"), Some(child))
                })
                .collect::<Vec<_>>();

            if children.is_empty() {
                push_issue(
                    issues,
                    path,
                    "empty-group",
                    "Query groups must contain at least one child.",
                );
            }

            Some(QueryNode::Group {
                group_match,
                children,
            })
        }
        "not" => read_node(issues, &format!("{path}.child"), node.get("child")).map(|child| {
            QueryNode::Not {
                child: Box::new(child),
            }
        }),
        "predicate" => {
            let field = read_string(
                issues,
                &format!("{path}.field"),
                node.get("field"),
                "Predicate nodes must define a string field.",
            )
            .and_then(|value| match QueryField::try_from(value.as_str()) {
                Ok(field) => Some(field),
                Err(()) => {
                    push_issue(
                        issues,
                        format!("{path}.field"),
                        "invalid-field",
                        format!("Unsupported field \"{value}\"."),
                    );
                    None
                }
            })?;

            let operator = read_string(
                issues,
                &format!("{path}.operator"),
                node.get("operator"),
                "Predicate nodes must define a string operator.",
            )
            .and_then(|value| match QueryOperator::try_from(value.as_str()) {
                Ok(operator) => Some(operator),
                Err(()) => {
                    push_issue(
                        issues,
                        format!("{path}.operator"),
                        "invalid-operator",
                        format!("Unsupported operator \"{value}\"."),
                    );
                    None
                }
            })?;

            let value = read_value(issues, &format!("{path}.value"), node.get("value"))?;
            let schema = field.schema();

            if !schema.operators.contains(&operator) {
                push_issue(
                    issues,
                    format!("{path}.operator"),
                    "operator-not-allowed",
                    format!(
                        "Operator \"{}\" is not allowed for field \"{}\".",
                        operator.as_str(),
                        field.as_str()
                    ),
                );
            }

            validate_predicate_value(issues, &format!("{path}.value"), field, operator, &value);

            Some(QueryNode::Predicate(QueryPredicateNode {
                field,
                operator,
                value,
            }))
        }
        _ => {
            push_issue(
                issues,
                format!("{path}.kind"),
                "invalid-json-node-kind",
                format!("Unsupported query node kind \"{kind}\"."),
            );
            None
        }
    }
}

fn read_sort(
    issues: &mut Vec<QueryValidationIssue>,
    path: &str,
    value: &Value,
) -> Option<QuerySort> {
    let Value::Object(sort) = value else {
        push_issue(
            issues,
            path,
            "invalid-json-sort",
            "Sort definitions must be JSON objects.",
        );
        return None;
    };

    let field = read_string(
        issues,
        &format!("{path}.field"),
        sort.get("field"),
        "Sort definitions must define a string field.",
    )
    .and_then(|value| match QuerySortField::try_from(value.as_str()) {
        Ok(field) => Some(field),
        Err(()) => {
            push_issue(
                issues,
                format!("{path}.field"),
                "invalid-sort-field",
                format!("Unsupported sort field \"{value}\"."),
            );
            None
        }
    })?;

    let direction = read_string(
        issues,
        &format!("{path}.direction"),
        sort.get("direction"),
        "Sort definitions must define a string direction.",
    )
    .and_then(|value| match QuerySortDirection::try_from(value.as_str()) {
        Ok(direction) => Some(direction),
        Err(()) => {
            push_issue(
                issues,
                format!("{path}.direction"),
                "invalid-sort-direction",
                format!("Unsupported sort direction \"{value}\"."),
            );
            None
        }
    })?;

    let nulls = read_string(
        issues,
        &format!("{path}.nulls"),
        sort.get("nulls"),
        "Sort definitions must define a string null ordering.",
    )
    .and_then(|value| match QuerySortNulls::try_from(value.as_str()) {
        Ok(nulls) => Some(nulls),
        Err(()) => {
            push_issue(
                issues,
                format!("{path}.nulls"),
                "invalid-sort-nulls",
                format!("Unsupported null ordering \"{value}\"."),
            );
            None
        }
    })?;

    Some(QuerySort {
        field,
        direction,
        nulls,
    })
}

pub fn parse_query_definition(value: &Value) -> Result<QueryDefinition, RuleEngineError> {
    let Value::Object(definition) = value else {
        return Err(invalid_query_definition(vec![QueryValidationIssue::new(
            "root",
            "invalid-json-root",
            "Serialized query definitions must be JSON objects.",
        )]));
    };

    let mut issues = Vec::new();

    let version = match definition.get("version").and_then(Value::as_u64) {
        Some(version) => version,
        None => {
            push_issue(
                &mut issues,
                "version",
                "invalid-json-version",
                "Serialized query definitions must define a numeric version.",
            );
            0
        }
    };

    let root = read_node(&mut issues, "root", definition.get("root"));
    let sort = match definition.get("sort") {
        Some(Value::Array(sorts)) => sorts
            .iter()
            .enumerate()
            .filter_map(|(index, sort)| read_sort(&mut issues, &format!("sort[{index}]"), sort))
            .collect::<Vec<_>>(),
        _ => {
            push_issue(
                &mut issues,
                "sort",
                "invalid-json-sort-list",
                "Serialized query definitions must define a sort array.",
            );
            Vec::new()
        }
    };

    if version != 1 {
        push_issue(
            &mut issues,
            "version",
            "unsupported-version",
            "Only query definition version 1 is supported.",
        );
    }

    if issues.is_empty()
        && let Some(root) = root
    {
        return Ok(QueryDefinition {
            version,
            root,
            sort,
        });
    }

    Err(invalid_query_definition(issues))
}
