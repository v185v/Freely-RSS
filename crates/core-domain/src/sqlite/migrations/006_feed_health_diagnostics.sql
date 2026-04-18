ALTER TABLE Feed
ADD COLUMN last_error_kind TEXT CHECK (
  last_error_kind IS NULL OR last_error_kind IN ('network', 'permission', 'parse', 'empty')
);

ALTER TABLE Feed
ADD COLUMN last_error_message TEXT;

ALTER TABLE Feed
ADD COLUMN last_error_at TEXT;

ALTER TABLE Feed
ADD COLUMN consecutive_failures INTEGER NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0);

CREATE INDEX IF NOT EXISTS idx_feed_last_error_kind_last_checked_at
ON Feed(last_error_kind, last_checked_at DESC)
WHERE last_error_kind IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_feed_consecutive_failures_last_checked_at
ON Feed(consecutive_failures, last_checked_at DESC)
WHERE consecutive_failures > 0;
