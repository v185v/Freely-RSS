CREATE TABLE IF NOT EXISTS app_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

INSERT INTO app_metadata (key, value)
VALUES ('schema.bootstrap', 'ready')
ON CONFLICT(key) DO NOTHING;
