-- Additive, idempotent recovery and pupil-record storage. Existing records are retained.

CREATE TABLE IF NOT EXISTS school_backups (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, note TEXT NOT NULL, size INTEGER NOT NULL, record_count INTEGER NOT NULL, iv TEXT NOT NULL, checksum TEXT NOT NULL, key_source TEXT NOT NULL, created_by TEXT NOT NULL, verified_at TEXT);

CREATE TABLE IF NOT EXISTS school_backup_chunks (backup_id TEXT NOT NULL, part INTEGER NOT NULL, content TEXT NOT NULL, PRIMARY KEY (backup_id, part));

CREATE TABLE IF NOT EXISTS school_backup_state (id INTEGER PRIMARY KEY CHECK (id=1), last_attempt TEXT, last_error TEXT);

CREATE TABLE IF NOT EXISTS pupil_support_notes (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, note TEXT NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS pupil_documents (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, data TEXT NOT NULL, uploaded_by TEXT NOT NULL, created_at TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS support_records (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, payload TEXT NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL);
