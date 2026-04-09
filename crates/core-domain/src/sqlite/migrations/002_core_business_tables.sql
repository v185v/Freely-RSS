CREATE TABLE IF NOT EXISTS Folder (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  kind TEXT NOT NULL CHECK (kind IN ('regular', 'system', 'group')),
  FOREIGN KEY (parent_id) REFERENCES Folder(id) ON DELETE SET NULL
) STRICT;

CREATE TABLE IF NOT EXISTS Tag (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('feed', 'article')),
  color TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE IF NOT EXISTS Feed (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  site_url TEXT,
  feed_url TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('rss', 'atom', 'json-feed')),
  icon TEXT,
  folder_id TEXT,
  custom_name TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  update_interval INTEGER,
  health_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    health_status IN ('pending', 'healthy', 'degraded', 'error', 'paused')
  ),
  last_checked_at TEXT,
  last_success_at TEXT,
  etag TEXT,
  last_modified TEXT,
  FOREIGN KEY (folder_id) REFERENCES Folder(id) ON DELETE SET NULL
) STRICT;

CREATE TABLE IF NOT EXISTS Article (
  id TEXT PRIMARY KEY,
  feed_id TEXT NOT NULL,
  source_guid TEXT,
  title TEXT NOT NULL,
  author TEXT,
  summary TEXT,
  content_raw TEXT,
  content_extracted TEXT,
  canonical_url TEXT,
  original_url TEXT,
  published_at TEXT,
  fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  language TEXT,
  thumbnail TEXT,
  word_count INTEGER,
  content_hash TEXT,
  FOREIGN KEY (feed_id) REFERENCES Feed(id) ON DELETE CASCADE
) STRICT;

CREATE TABLE IF NOT EXISTS FeedTag (
  feed_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (feed_id, tag_id),
  FOREIGN KEY (feed_id) REFERENCES Feed(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES Tag(id) ON DELETE CASCADE
) STRICT;

CREATE TABLE IF NOT EXISTS ArticleTag (
  article_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (article_id, tag_id),
  FOREIGN KEY (article_id) REFERENCES Article(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES Tag(id) ON DELETE CASCADE
) STRICT;

CREATE TABLE IF NOT EXISTS Attachment (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'audio', 'video', 'file')),
  url TEXT NOT NULL,
  mime_type TEXT,
  duration INTEGER,
  size INTEGER,
  local_cache_path TEXT,
  FOREIGN KEY (article_id) REFERENCES Article(id) ON DELETE CASCADE
) STRICT;

CREATE TABLE IF NOT EXISTS UserState (
  article_id TEXT PRIMARY KEY,
  read_state TEXT NOT NULL DEFAULT 'unread' CHECK (read_state IN ('unread', 'reading', 'read')),
  starred INTEGER NOT NULL DEFAULT 0 CHECK (starred IN (0, 1)),
  liked INTEGER NOT NULL DEFAULT 0 CHECK (liked IN (0, 1)),
  importance TEXT NOT NULL DEFAULT 'normal' CHECK (importance IN ('low', 'normal', 'high')),
  read_later INTEGER NOT NULL DEFAULT 0 CHECK (read_later IN (0, 1)),
  reading_progress REAL NOT NULL DEFAULT 0.0 CHECK (
    reading_progress >= 0.0 AND reading_progress <= 1.0
  ),
  last_opened_at TEXT,
  FOREIGN KEY (article_id) REFERENCES Article(id) ON DELETE CASCADE
) STRICT;

CREATE TABLE IF NOT EXISTS Annotation (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('highlight', 'note', 'comment')),
  selected_text TEXT NOT NULL,
  anchor TEXT NOT NULL,
  note TEXT,
  color TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES Article(id) ON DELETE CASCADE
) STRICT;

CREATE TABLE IF NOT EXISTS Rule (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  priority INTEGER NOT NULL DEFAULT 0,
  conditions TEXT NOT NULL,
  actions TEXT NOT NULL,
  scope TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS SmartFolder (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  query_definition TEXT NOT NULL,
  sort_definition TEXT
) STRICT;

CREATE TABLE IF NOT EXISTS AIArtifact (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('summary', 'keywords', 'translation', 'question-answer')),
  provider TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  result TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES Article(id) ON DELETE CASCADE
) STRICT;

CREATE TABLE IF NOT EXISTS SyncEvent (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  change_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  device_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;
