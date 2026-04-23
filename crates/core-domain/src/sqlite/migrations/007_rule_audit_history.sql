CREATE TABLE IF NOT EXISTS RuleAudit (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  article_id TEXT NOT NULL,
  match_result TEXT NOT NULL CHECK (match_result IN ('matched', 'not-matched')),
  input_snapshot TEXT NOT NULL,
  planned_commands TEXT NOT NULL,
  applied_effects TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rule_id) REFERENCES Rule(id) ON DELETE CASCADE,
  FOREIGN KEY (article_id) REFERENCES Article(id) ON DELETE CASCADE
) STRICT;

CREATE INDEX IF NOT EXISTS idx_rule_audit_rule_id_match_result_created_at
ON RuleAudit(rule_id, match_result, created_at);

CREATE INDEX IF NOT EXISTS idx_rule_audit_article_id_created_at
ON RuleAudit(article_id, created_at);
