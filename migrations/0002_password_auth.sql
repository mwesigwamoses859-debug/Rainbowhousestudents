ALTER TABLE staff ADD COLUMN password_hash TEXT;
ALTER TABLE staff ADD COLUMN password_salt TEXT;
ALTER TABLE staff ADD COLUMN password_iterations INTEGER NOT NULL DEFAULT 100000;
ALTER TABLE staff ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE staff ADD COLUMN locked_until INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_staff_active_username ON staff(active, username);
