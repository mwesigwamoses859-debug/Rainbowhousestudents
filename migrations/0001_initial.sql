CREATE TABLE IF NOT EXISTS staff (
  username TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  role TEXT NOT NULL CHECK (role IN ('Headteacher', 'DOS', 'Subject Teacher')),
  subjects TEXT NOT NULL DEFAULT '[]',
  classes TEXT NOT NULL DEFAULT '[]',
  active_terms TEXT NOT NULL DEFAULT '[1,2,3]',
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS login_codes (
  email TEXT PRIMARY KEY COLLATE NOCASE,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  requested_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS marks (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  term INTEGER NOT NULL,
  year INTEGER NOT NULL,
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(student_id, subject, term, year)
);

INSERT OR IGNORE INTO staff (username, name, email, role, subjects, classes)
VALUES
  ('admin', 'Headteacher / Administrator', 'mwesigwa.m@ashinaga.org', 'Headteacher', '["All"]', '["P.1","P.2","P.3","P.4","P.5","P.6","P.7"]'),
  ('teacher1', 'Mr. John Mukasa', 'john.mukasa@ashinaga.org', 'Subject Teacher', '["Mathematics","Science"]', '["P.5","P.6","P.7"]'),
  ('teacher2', 'Mrs. Sarah Babirye', 'sarah.babirye@ashinaga.org', 'Subject Teacher', '["English","Social Studies","Religious Education"]', '["P.1","P.2","P.3","P.4"]');
