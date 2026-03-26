-- Migration 006: Audit columns for timesheet_logs/billing_records + AWS ActiveTrack table
-- Run in: Supabase SQL Editor
-- Date: 2026-03-24

-- Audit columns for timesheet_logs (Raja's requirement)
ALTER TABLE timesheet_logs
  ADD COLUMN IF NOT EXISTS load_date TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS processed_date TIMESTAMPTZ;

-- Audit columns for billing_records
ALTER TABLE billing_records
  ADD COLUMN IF NOT EXISTS load_date TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS processed_date TIMESTAMPTZ;

-- AWS ActiveTrack weekly logs (stored historically, never overwritten)
CREATE TABLE IF NOT EXISTS aws_timesheet_logs (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id),
  aws_email TEXT NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  work_time_secs INTEGER NOT NULL DEFAULT 0,
  productive_secs INTEGER NOT NULL DEFAULT 0,
  unproductive_secs INTEGER NOT NULL DEFAULT 0,
  active_secs INTEGER NOT NULL DEFAULT 0,
  passive_secs INTEGER NOT NULL DEFAULT 0,
  screen_time_secs INTEGER NOT NULL DEFAULT 0,
  work_time_hours NUMERIC(7,2) NOT NULL DEFAULT 0,
  is_below_threshold BOOLEAN DEFAULT FALSE,
  load_date TIMESTAMPTZ DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  processed_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(aws_email, week_start)
);

CREATE INDEX IF NOT EXISTS idx_aws_logs_employee ON aws_timesheet_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_aws_logs_week ON aws_timesheet_logs(week_start);
CREATE INDEX IF NOT EXISTS idx_aws_logs_email ON aws_timesheet_logs(aws_email);

-- DB-level unique constraint for SOW numbers (currently only Python-enforced)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sow_number_unique ON sows(sow_number) WHERE is_active = true;
