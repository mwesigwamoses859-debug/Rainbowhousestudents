-- Migration 0005: Historical report cards and academic year archives
-- Stores permanent past-year report cards and census archives

CREATE TABLE IF NOT EXISTS historical_report_cards (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  academic_year INTEGER NOT NULL,
  term INTEGER NOT NULL CHECK (term IN (1, 2, 3)),
  class_name TEXT NOT NULL,
  total_score REAL NOT NULL,
  average_score REAL NOT NULL,
  division TEXT NOT NULL DEFAULT 'Division 1',
  aggregates INTEGER NOT NULL DEFAULT 4,
  rank_position INTEGER NOT NULL DEFAULT 1,
  total_pupils INTEGER NOT NULL DEFAULT 1,
  head_teacher_comment TEXT NOT NULL DEFAULT '',
  class_teacher_comment TEXT NOT NULL DEFAULT '',
  marks_summary TEXT NOT NULL DEFAULT '[]',
  finalized_at INTEGER NOT NULL,
  finalized_by TEXT NOT NULL DEFAULT 'system',
  created_at INTEGER NOT NULL,
  UNIQUE(student_id, academic_year, term)
);

CREATE TABLE IF NOT EXISTS academic_year_archives (
  id TEXT PRIMARY KEY,
  year INTEGER UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'closed',
  closed_at INTEGER NOT NULL,
  closed_by TEXT NOT NULL DEFAULT 'system',
  total_students INTEGER NOT NULL DEFAULT 0,
  total_report_cards INTEGER NOT NULL DEFAULT 0,
  snapshot_payload TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hist_report_student ON historical_report_cards(student_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_hist_report_year_term ON historical_report_cards(academic_year, term);
CREATE INDEX IF NOT EXISTS idx_year_archives_year ON academic_year_archives(year);
