-- ============================================================
-- Migration 007: Import Headers + Employee System Mappings
-- Source: Mar 24, 2026 call with Raja PV
--   - Audit trail for every file import (Raja: "auditing should be very tight")
--   - Child table for external system ID mapping (extensible for future systems)
-- ============================================================

-- 1. Import Headers — tracks every file import (Jira, AWS, Master)
CREATE TABLE IF NOT EXISTS import_headers (
  id SERIAL PRIMARY KEY,
  import_type TEXT NOT NULL CHECK (import_type IN ('JIRA_TIMESHEET', 'AWS_TIMESHEET', 'MASTER_DATA')),
  filename TEXT NOT NULL,
  import_month TEXT,                     -- YYYY-MM for Jira, NULL for AWS
  week_start DATE,                       -- for AWS weekly imports
  week_end DATE,                         -- for AWS weekly imports
  records_total INTEGER NOT NULL DEFAULT 0,
  records_matched INTEGER NOT NULL DEFAULT 0,
  records_unmatched INTEGER NOT NULL DEFAULT 0,
  records_skipped INTEGER NOT NULL DEFAULT 0,
  imported_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'FAILED', 'ROLLED_BACK')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_headers_type ON import_headers(import_type);
CREATE INDEX IF NOT EXISTS idx_import_headers_created ON import_headers(created_at DESC);

-- 2. Employee System Mappings — child table for external system IDs
-- Instead of adding columns to employees table for each new system,
-- one row per (employee, system) pair. Extensible for future systems.
CREATE TABLE IF NOT EXISTS employee_system_mappings (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  system_name TEXT NOT NULL CHECK (system_name IN ('JIRA', 'AWS', 'GITHUB', 'SHAREPOINT')),
  external_uid TEXT NOT NULL,             -- e.g., "sachin@dcli.com" for AWS, "Sachin Mishra" for JIRA
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, system_name, external_uid)
);

CREATE INDEX IF NOT EXISTS idx_esm_employee ON employee_system_mappings(employee_id);
CREATE INDEX IF NOT EXISTS idx_esm_system ON employee_system_mappings(system_name);
CREATE INDEX IF NOT EXISTS idx_esm_lookup ON employee_system_mappings(system_name, external_uid);

-- 3. Add import_header_id FK to timesheet_logs and aws_timesheet_logs
ALTER TABLE timesheet_logs
  ADD COLUMN IF NOT EXISTS import_header_id INTEGER REFERENCES import_headers(id);

ALTER TABLE aws_timesheet_logs
  ADD COLUMN IF NOT EXISTS import_header_id INTEGER REFERENCES import_headers(id);

-- 4. Seed employee_system_mappings from existing jira_username and aws_email
INSERT INTO employee_system_mappings (employee_id, system_name, external_uid, verified)
SELECT id, 'JIRA', jira_username, TRUE
FROM employees
WHERE jira_username IS NOT NULL AND jira_username != ''
ON CONFLICT (employee_id, system_name, external_uid) DO NOTHING;

INSERT INTO employee_system_mappings (employee_id, system_name, external_uid, verified)
SELECT id, 'AWS', aws_email, FALSE
FROM employees
WHERE aws_email IS NOT NULL AND aws_email != ''
ON CONFLICT (employee_id, system_name, external_uid) DO NOTHING;
