ALTER TABLE staff ADD COLUMN two_factor_enabled INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS auth_challenges (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('login_2fa', 'password_reset', 'enable_2fa')),
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (username) REFERENCES staff(username)
);

CREATE TABLE IF NOT EXISTS auth_rate_limits (
  rate_key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  window_started_at INTEGER NOT NULL,
  blocked_until INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_auth_challenges_expiry ON auth_challenges(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_challenges_user ON auth_challenges(username, purpose);
