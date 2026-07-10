-- ============================================================
-- SQL Schema Setup for Career Compass Flow
-- ============================================================

-- 1. Create users table
CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL    DEFAULT NOW(),
  fullname      TEXT        NOT NULL, -- Stores username
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  is_active     BOOLEAN     DEFAULT true
);

-- Index for fast email lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow insert for all" ON users;
DROP POLICY IF EXISTS "Allow select for all" ON users;
DROP POLICY IF EXISTS "Allow update for all" ON users;

CREATE POLICY "Allow insert for all" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select for all" ON users FOR SELECT USING (true);
CREATE POLICY "Allow update for all" ON users FOR UPDATE USING (true);


-- 2. Create resumes table
CREATE TABLE IF NOT EXISTS resumes (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ NOT NULL    DEFAULT NOW(),
  user_email     TEXT,
  user_name      TEXT,
  degree         TEXT,
  career_path    TEXT,
  location       TEXT,
  file_name      TEXT        NOT NULL,
  file_size_kb   INTEGER,
  storage_path   TEXT        NOT NULL,
  public_url     TEXT,
  ats_score      INTEGER,
  ats_feedback   JSONB,
  ats_status     TEXT        DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_resumes_career_path ON resumes(career_path);
CREATE INDEX IF NOT EXISTS idx_resumes_created_at  ON resumes(created_at DESC);

-- Enable RLS for resumes
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow insert for all" ON resumes;
DROP POLICY IF EXISTS "Allow select for all" ON resumes;
DROP POLICY IF EXISTS "Allow update for all" ON resumes;

CREATE POLICY "Allow insert for all" ON resumes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select for all" ON resumes FOR SELECT USING (true);
CREATE POLICY "Allow update for all" ON resumes FOR UPDATE USING (true);
