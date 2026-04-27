use std::fmt;

use super::ModelError;

macro_rules! string_enum {
    ($name:ident => [$($variant:ident = $value:literal),+ $(,)?]) => {
        #[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
        pub enum $name {
            $($variant),+
        }

        impl $name {
            pub const fn as_str(self) -> &'static str {
                match self {
                    $(Self::$variant => $value),+
                }
            }
        }

        impl TryFrom<&str> for $name {
            type Error = ModelError;

            fn try_from(value: &str) -> Result<Self, ModelError> {
                match value {
                    $($value => Ok(Self::$variant),)+
                    _ => Err(ModelError::InvalidEnum {
                        kind: stringify!($name),
                        value: value.to_owned(),
                    }),
                }
            }
        }

        impl TryFrom<String> for $name {
            type Error = ModelError;

            fn try_from(value: String) -> Result<Self, ModelError> {
                Self::try_from(value.as_str())
            }
        }

        impl fmt::Display for $name {
            fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str(self.as_str())
            }
        }
    };
}

string_enum!(FeedFormat => [
    Rss = "rss",
    Atom = "atom",
    JsonFeed = "json-feed",
]);

string_enum!(FeedHealthStatus => [
    Pending = "pending",
    Healthy = "healthy",
    Degraded = "degraded",
    Error = "error",
    Paused = "paused",
]);

string_enum!(FeedErrorKind => [
    Network = "network",
    Permission = "permission",
    Parse = "parse",
    Empty = "empty",
]);

string_enum!(CachePolicy => [
    MetadataOnly = "metadata-only",
    Content = "content",
    ContentAndAttachments = "content-and-attachments",
]);

string_enum!(FolderKind => [
    Regular = "regular",
    System = "system",
    Group = "group",
]);

string_enum!(TagScope => [
    Feed = "feed",
    Article = "article",
]);

string_enum!(AttachmentType => [
    Image = "image",
    Audio = "audio",
    Video = "video",
    File = "file",
]);

string_enum!(ReadState => [
    Unread = "unread",
    Reading = "reading",
    Read = "read",
]);

string_enum!(ImportanceLevel => [
    Low = "low",
    Normal = "normal",
    High = "high",
]);

string_enum!(AnnotationType => [
    Highlight = "highlight",
    Note = "note",
    Comment = "comment",
]);

string_enum!(AIArtifactKind => [
    Summary = "summary",
    Keywords = "keywords",
    Translation = "translation",
    QuestionAnswer = "question-answer",
]);

string_enum!(RuleAuditMatchResult => [
    Matched = "matched",
    NotMatched = "not-matched",
]);
