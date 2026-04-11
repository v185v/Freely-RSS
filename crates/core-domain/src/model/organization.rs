use super::{ArticleId, FeedId, FolderId, FolderKind, HexColor, IsoDateTime, TagId, TagScope};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Folder {
    pub id: FolderId,
    pub name: String,
    pub parent_id: Option<FolderId>,
    pub sort_order: i64,
    pub kind: FolderKind,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Tag {
    pub id: TagId,
    pub name: String,
    pub scope: TagScope,
    pub color: Option<HexColor>,
    pub created_at: IsoDateTime,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct FeedTag {
    pub feed_id: FeedId,
    pub tag_id: TagId,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ArticleTag {
    pub article_id: ArticleId,
    pub tag_id: TagId,
}
