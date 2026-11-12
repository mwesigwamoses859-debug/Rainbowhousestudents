-- Master learner register, confidential attachments, guardian history and
-- Saturday attendance. Existing Terakoya records are linked without deletion.
CREATE TABLE IF NOT EXISTS general_students (id TEXT PRIMARY KEY,registration_number TEXT UNIQUE NOT NULL,school_student_id TEXT UNIQUE,payload TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS general_register_counter (id INTEGER PRIMARY KEY CHECK(id=1),value INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS general_guardian_history (id TEXT PRIMARY KEY,student_id TEXT NOT NULL,before_value TEXT,after_value TEXT NOT NULL,reason TEXT NOT NULL,changed_by TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS general_documents (id TEXT PRIMARY KEY,student_id TEXT NOT NULL,category TEXT NOT NULL,name TEXT NOT NULL,mime TEXT NOT NULL,size INTEGER NOT NULL,data TEXT NOT NULL,uploaded_by TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_general_documents_student ON general_documents(student_id);
CREATE TABLE IF NOT EXISTS general_settings (id INTEGER PRIMARY KEY CHECK(id=1),payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS general_care_days (id TEXT PRIMARY KEY,date TEXT UNIQUE NOT NULL,payload TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS general_care_attendance (student_id TEXT NOT NULL,date TEXT NOT NULL,status TEXT NOT NULL,override_reason TEXT NOT NULL DEFAULT '',recorded_by TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(student_id,date));
CREATE INDEX IF NOT EXISTS idx_general_care_date ON general_care_attendance(date);
CREATE TABLE IF NOT EXISTS general_progression_history (id TEXT PRIMARY KEY,student_id TEXT NOT NULL,academic_year INTEGER NOT NULL,from_level TEXT NOT NULL,to_level TEXT NOT NULL,created_by TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(student_id,academic_year));
