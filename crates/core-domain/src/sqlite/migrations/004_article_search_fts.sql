CREATE VIEW IF NOT EXISTS ArticleSearchSource AS
SELECT
  Article.rowid AS article_rowid,
  Article.id AS article_id,
  Article.feed_id AS feed_id,
  COALESCE(Article.title, '') AS title,
  COALESCE(Article.summary, '') AS summary,
  COALESCE(Article.content_extracted, Article.content_raw, '') AS content,
  COALESCE(Article.author, '') AS author,
  COALESCE(Feed.custom_name, Feed.title, '') AS feed_title,
  COALESCE((
    SELECT group_concat(tag_name, ' ')
    FROM (
      SELECT Tag.name AS tag_name
      FROM ArticleTag
      INNER JOIN Tag ON Tag.id = ArticleTag.tag_id
      WHERE ArticleTag.article_id = Article.id
        AND Tag.scope = 'article'
      ORDER BY Tag.name
    )
  ), '') AS tag_names
FROM Article
INNER JOIN Feed ON Feed.id = Article.feed_id;

CREATE VIRTUAL TABLE IF NOT EXISTS ArticleSearch
USING fts5(
  article_id UNINDEXED,
  feed_id UNINDEXED,
  title,
  summary,
  content,
  author,
  feed_title,
  tag_names,
  tokenize = 'unicode61 remove_diacritics 2'
);

INSERT INTO ArticleSearch (
  rowid,
  article_id,
  feed_id,
  title,
  summary,
  content,
  author,
  feed_title,
  tag_names
)
SELECT
  article_rowid,
  article_id,
  feed_id,
  title,
  summary,
  content,
  author,
  feed_title,
  tag_names
FROM ArticleSearchSource;

CREATE TRIGGER IF NOT EXISTS article_search_after_article_insert
AFTER INSERT ON Article
BEGIN
  INSERT INTO ArticleSearch (
    rowid,
    article_id,
    feed_id,
    title,
    summary,
    content,
    author,
    feed_title,
    tag_names
  )
  SELECT
    article_rowid,
    article_id,
    feed_id,
    title,
    summary,
    content,
    author,
    feed_title,
    tag_names
  FROM ArticleSearchSource
  WHERE article_id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS article_search_after_article_update
AFTER UPDATE ON Article
BEGIN
  DELETE FROM ArticleSearch
  WHERE rowid = OLD.rowid;

  INSERT INTO ArticleSearch (
    rowid,
    article_id,
    feed_id,
    title,
    summary,
    content,
    author,
    feed_title,
    tag_names
  )
  SELECT
    article_rowid,
    article_id,
    feed_id,
    title,
    summary,
    content,
    author,
    feed_title,
    tag_names
  FROM ArticleSearchSource
  WHERE article_id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS article_search_after_article_delete
AFTER DELETE ON Article
BEGIN
  DELETE FROM ArticleSearch
  WHERE rowid = OLD.rowid;
END;

CREATE TRIGGER IF NOT EXISTS article_search_after_feed_label_update
AFTER UPDATE OF title, custom_name ON Feed
BEGIN
  DELETE FROM ArticleSearch
  WHERE rowid IN (
    SELECT rowid
    FROM Article
    WHERE feed_id = NEW.id
  );

  INSERT INTO ArticleSearch (
    rowid,
    article_id,
    feed_id,
    title,
    summary,
    content,
    author,
    feed_title,
    tag_names
  )
  SELECT
    article_rowid,
    article_id,
    feed_id,
    title,
    summary,
    content,
    author,
    feed_title,
    tag_names
  FROM ArticleSearchSource
  WHERE feed_id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS article_search_after_article_tag_insert
AFTER INSERT ON ArticleTag
BEGIN
  DELETE FROM ArticleSearch
  WHERE rowid = (
    SELECT rowid
    FROM Article
    WHERE id = NEW.article_id
  );

  INSERT INTO ArticleSearch (
    rowid,
    article_id,
    feed_id,
    title,
    summary,
    content,
    author,
    feed_title,
    tag_names
  )
  SELECT
    article_rowid,
    article_id,
    feed_id,
    title,
    summary,
    content,
    author,
    feed_title,
    tag_names
  FROM ArticleSearchSource
  WHERE article_id = NEW.article_id;
END;

CREATE TRIGGER IF NOT EXISTS article_search_after_article_tag_delete
AFTER DELETE ON ArticleTag
BEGIN
  DELETE FROM ArticleSearch
  WHERE rowid = (
    SELECT rowid
    FROM Article
    WHERE id = OLD.article_id
  );

  INSERT INTO ArticleSearch (
    rowid,
    article_id,
    feed_id,
    title,
    summary,
    content,
    author,
    feed_title,
    tag_names
  )
  SELECT
    article_rowid,
    article_id,
    feed_id,
    title,
    summary,
    content,
    author,
    feed_title,
    tag_names
  FROM ArticleSearchSource
  WHERE article_id = OLD.article_id;
END;

CREATE TRIGGER IF NOT EXISTS article_search_after_article_tag_update
AFTER UPDATE ON ArticleTag
BEGIN
  DELETE FROM ArticleSearch
  WHERE rowid IN (
    SELECT rowid
    FROM Article
    WHERE id IN (OLD.article_id, NEW.article_id)
  );

  INSERT INTO ArticleSearch (
    rowid,
    article_id,
    feed_id,
    title,
    summary,
    content,
    author,
    feed_title,
    tag_names
  )
  SELECT
    article_rowid,
    article_id,
    feed_id,
    title,
    summary,
    content,
    author,
    feed_title,
    tag_names
  FROM ArticleSearchSource
  WHERE article_id IN (OLD.article_id, NEW.article_id);
END;

CREATE TRIGGER IF NOT EXISTS article_search_after_article_tag_scope_update
AFTER UPDATE OF name, scope ON Tag
WHEN OLD.scope = 'article' OR NEW.scope = 'article'
BEGIN
  DELETE FROM ArticleSearch
  WHERE rowid IN (
    SELECT Article.rowid
    FROM Article
    INNER JOIN ArticleTag ON ArticleTag.article_id = Article.id
    WHERE ArticleTag.tag_id = NEW.id
  );

  INSERT INTO ArticleSearch (
    rowid,
    article_id,
    feed_id,
    title,
    summary,
    content,
    author,
    feed_title,
    tag_names
  )
  SELECT
    article_rowid,
    article_id,
    feed_id,
    title,
    summary,
    content,
    author,
    feed_title,
    tag_names
  FROM ArticleSearchSource
  WHERE article_id IN (
    SELECT article_id
    FROM ArticleTag
    WHERE tag_id = NEW.id
  );
END;
