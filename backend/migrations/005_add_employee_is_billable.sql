-- Migration 005: Add is_billable flag to employees table
-- Requirement: Sreenath/Jaicind — "who are billable and who are not billable"
-- Default: true (most employees are DCLI billable resources)

ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS is_billable BOOLEAN DEFAULT TRUE;

-- Backfill: all existing employees are billable by default
UPDATE public.employees SET is_billable = TRUE WHERE is_billable IS NULL;

COMMENT ON COLUMN public.employees.is_billable IS 'Whether this employee is a billable DCLI resource or an internal Sipra resource';
