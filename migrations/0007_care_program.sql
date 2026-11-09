-- Migration 0006: Care Program Sessions
-- Support for Terakoya Day Care sessions (Learning, Lunch, Play, Clean-up, Departure)

CREATE TABLE IF NOT EXISTS care_sessions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  title TEXT NOT NULL,
  facilitator TEXT NOT NULL,
  learning_notes TEXT,
  lunch_menu TEXT,
  play_activities TEXT,
  cleaning_duties TEXT,
  general_notes TEXT,
  attendees TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'completed',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_care_sessions_date ON care_sessions(date DESC);
