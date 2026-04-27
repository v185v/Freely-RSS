ALTER TABLE Feed
ADD COLUMN cache_policy TEXT NOT NULL DEFAULT 'content'
CHECK (cache_policy IN ('metadata-only', 'content', 'content-and-attachments'));
