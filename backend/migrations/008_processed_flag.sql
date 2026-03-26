-- Migration 008: Standardise processed_flag columns + partial indexes
-- Run in: Supabase SQL Editor
-- Date: 2026-03-26
--
-- Migration 006 already added processed/processed_date to timesheet_logs,
-- billing_records, and aws_timesheet_logs.  This migration:
--   1) Renames processed_date → processed_at (consistent naming)
--   2) Adds partial indexes on (processed = false) for fast unprocessed queries

-- ── 1. Rename processed_date → processed_at ──────────────────

ALTER TABLE timesheet_logs
  RENAME COLUMN processed_date TO processed_at;

ALTER TABLE billing_records
  RENAME COLUMN processed_date TO processed_at;

ALTER TABLE aws_timesheet_logs
  RENAME COLUMN processed_date TO processed_at;

-- ── 2. Partial indexes for unprocessed record queries ─────────

CREATE INDEX IF NOT EXISTS idx_timesheet_logs_unprocessed
  ON timesheet_logs (import_month)
  WHERE processed = false;

CREATE INDEX IF NOT EXISTS idx_aws_timesheet_logs_unprocessed
  ON aws_timesheet_logs (week_start)
  WHERE processed = false;

CREATE INDEX IF NOT EXISTS idx_billing_records_unprocessed
  ON billing_records (billing_month)
  WHERE processed = false;
