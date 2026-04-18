CREATE INDEX IF NOT EXISTS idx_article_feed_id_canonical_url
ON Article(feed_id, canonical_url)
WHERE canonical_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_article_feed_id_original_url
ON Article(feed_id, original_url)
WHERE original_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_article_feed_id_title_published_at
ON Article(feed_id, title, published_at)
WHERE published_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_article_feed_id_content_hash
ON Article(feed_id, content_hash)
WHERE content_hash IS NOT NULL;
