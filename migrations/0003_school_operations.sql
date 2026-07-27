CREATE TABLE IF NOT EXISTS staff_assignments (
  username TEXT NOT NULL,
  class_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  active_terms TEXT NOT NULL DEFAULT '[1,2,3]',
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (username, class_name, subject),
  FOREIGN KEY (username) REFERENCES staff(username)
);

INSERT OR IGNORE INTO staff_assignments
  (username, class_name, subject, active_terms, active, created_at, updated_at)
SELECT
  staff.username,
  class_item.value,
  subject_item.value,
  staff.active_terms,
  1,
  CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  CAST(strftime('%s', 'now') AS INTEGER) * 1000
FROM staff, json_each(staff.classes) AS class_item, json_each(staff.subjects) AS subject_item
WHERE staff.role = 'Subject Teacher'
  AND subject_item.value <> 'All'
  AND (
    (
      class_item.value IN ('P.1', 'P.2', 'P.3')
      AND subject_item.value IN (
        'Mathematics', 'English', 'Literacy 1', 'Literacy 2 (Reading and Writing)',
        'Religious Education', 'Luganda', 'Computer/ ICT', 'KUMON'
      )
    )
    OR
    (
      class_item.value IN ('P.4', 'P.5', 'P.6', 'P.7')
      AND subject_item.value IN (
        'English', 'Mathematics', 'Social Studies', 'Science',
        'Religious Education', 'Computer/ ICT'
      )
    )
  );

CREATE TABLE IF NOT EXISTS assessment_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  bot_weight INTEGER NOT NULL DEFAULT 20,
  mot_weight INTEGER NOT NULL DEFAULT 30,
  eot_weight INTEGER NOT NULL DEFAULT 50,
  pass_mark INTEGER NOT NULL DEFAULT 50,
  maximum_score INTEGER NOT NULL DEFAULT 100,
  require_all_subjects INTEGER NOT NULL DEFAULT 1,
  grading_boundaries TEXT NOT NULL DEFAULT '{"D1":80,"D2":75,"C3":70,"C4":65,"C5":60,"C6":50,"P7":45,"P8":35}',
  updated_by TEXT,
  updated_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO assessment_settings
  (id, bot_weight, mot_weight, eot_weight, pass_mark, maximum_score, require_all_subjects, updated_at)
VALUES (1, 20, 30, 50, 50, 100, 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000);

CREATE TABLE IF NOT EXISTS academic_years (
  year INTEGER PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'closed')) DEFAULT 'planned',
  starts_on TEXT,
  ends_on TEXT,
  closed_at INTEGER,
  closed_by TEXT,
  created_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO academic_years (year, status, created_at)
VALUES (2026, 'active', CAST(strftime('%s', 'now') AS INTEGER) * 1000);

CREATE TABLE IF NOT EXISTS mark_submissions (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  class_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  term INTEGER NOT NULL,
  year INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'submitted', 'approved', 'returned')) DEFAULT 'draft',
  teacher_comment TEXT NOT NULL DEFAULT '',
  reviewer_comment TEXT NOT NULL DEFAULT '',
  submitted_at INTEGER,
  reviewed_at INTEGER,
  reviewed_by TEXT,
  updated_at INTEGER NOT NULL,
  UNIQUE (username, class_name, subject, term, year)
);

CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'sick', 'late')),
  recorded_by TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (student_id, date)
);

CREATE TABLE IF NOT EXISTS promotion_history (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  from_class TEXT NOT NULL,
  to_class TEXT NOT NULL,
  academic_year INTEGER NOT NULL,
  decision TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  approved_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_username TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_value TEXT,
  after_value TEXT,
  ip_address TEXT,
  created_at INTEGER NOT NULL
);

ALTER TABLE staff ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;
ALTER TABLE staff ADD COLUMN password_changed_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE staff ADD COLUMN last_login_at INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_assignments_username ON staff_assignments(username, active);
CREATE INDEX IF NOT EXISTS idx_marks_submission_scope ON mark_submissions(class_name, subject, term, year);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_promotion_student ON promotion_history(student_id, academic_year);
