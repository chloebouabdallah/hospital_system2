-- AI checker cache + admin review queue.
-- Run once against your database (same style as the other .sql scripts), then `npx prisma generate`.
CREATE TABLE IF NOT EXISTS ai_checker_cache (
  id           SERIAL PRIMARY KEY,
  cache_key    VARCHAR(64)  NOT NULL UNIQUE,
  kind         VARCHAR(20)  NOT NULL CHECK (kind IN ('question', 'assessment')),
  symptom_text VARCHAR(300) NOT NULL,
  payload      JSONB        NOT NULL,
  status       VARCHAR(20)  NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  hits         INTEGER      NOT NULL DEFAULT 0,
  created_at   TIMESTAMP(6) DEFAULT NOW(),
  updated_at   TIMESTAMP(6) DEFAULT NOW(),
  reviewed_at  TIMESTAMP(6)
);
CREATE INDEX IF NOT EXISTS idx_ai_cache_kind_status ON ai_checker_cache (kind, status);
