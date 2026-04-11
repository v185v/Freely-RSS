CREATE UNIQUE INDEX IF NOT EXISTS ux_feed_feed_url
ON Feed(feed_url);

CREATE UNIQUE INDEX IF NOT EXISTS ux_tag_scope_name
ON Tag(scope, name);

CREATE INDEX IF NOT EXISTS idx_folder_parent_id_sort_order
ON Folder(parent_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_feed_folder_id_sort_order
ON Feed(folder_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_feed_health_status_last_checked_at
ON Feed(health_status, last_checked_at DESC);

CREATE INDEX IF NOT EXISTS idx_article_feed_id_source_guid
ON Article(feed_id, source_guid)
WHERE source_guid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_article_feed_id_published_at
ON Article(feed_id, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_article_fetched_at
ON Article(fetched_at DESC);

CREATE INDEX IF NOT EXISTS idx_attachment_article_id
ON Attachment(article_id);

CREATE INDEX IF NOT EXISTS idx_annotation_article_id_created_at
ON Annotation(article_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_state_read_state_article_id
ON UserState(read_state, article_id);

CREATE INDEX IF NOT EXISTS idx_user_state_starred_article_id
ON UserState(starred, article_id);

CREATE INDEX IF NOT EXISTS idx_user_state_liked_article_id
ON UserState(liked, article_id);

CREATE INDEX IF NOT EXISTS idx_user_state_read_later_article_id
ON UserState(read_later, article_id);

CREATE INDEX IF NOT EXISTS idx_user_state_importance_article_id
ON UserState(importance, article_id);

CREATE INDEX IF NOT EXISTS idx_feed_tag_tag_id_feed_id
ON FeedTag(tag_id, feed_id);

CREATE INDEX IF NOT EXISTS idx_article_tag_tag_id_article_id
ON ArticleTag(tag_id, article_id);

CREATE INDEX IF NOT EXISTS idx_ai_artifact_article_id_created_at
ON AIArtifact(article_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_event_entity_created_at
ON SyncEvent(entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_event_device_created_at
ON SyncEvent(device_id, created_at DESC);
