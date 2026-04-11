mod article;
mod automation;
mod enums;
mod error;
mod feed;
mod ids;
mod organization;
mod primitives;

pub use article::{Annotation, Article, Attachment, UserState};
pub use automation::{AIArtifact, Rule, SmartFolder, SyncEvent};
pub use enums::{
    AIArtifactKind, AnnotationType, AttachmentType, FeedFormat, FeedHealthStatus, FolderKind,
    ImportanceLevel, ReadState, TagScope,
};
pub use error::ModelError;
pub use feed::Feed;
pub use ids::{
    AIArtifactId, AnnotationId, ArticleId, AttachmentId, DeviceId, FeedId, FolderId, RuleId,
    SmartFolderId, SyncEventId, TagId,
};
pub use organization::{ArticleTag, FeedTag, Folder, Tag};
pub use primitives::{CachePath, HexColor, IsoDateTime, JsonBlob, LanguageCode, UrlString};
