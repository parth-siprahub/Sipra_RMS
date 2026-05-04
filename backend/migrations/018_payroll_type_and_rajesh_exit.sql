-- Migration 018: Add payroll_type to employees + targeted exit_date fix for ID 62.
--
-- STAGED — REQUIRES PARTH SIGN-OFF BEFORE APPLYING IN SUPABASE DASHBOARD.
--
-- Rationale:
--   1. payroll_type column needed for the Anten/SipraHub policy split.
--      Default 'siprahub' preserves existing target calculation behavior.
--   2. Rajesh (id=62) is a known data-hygiene cleanup; exit_date=2024-01-01
--      is the directive-specified value. Verified ID before applying.
--
-- Pre-flight checks (run these manually before applying):
--   SELECT id, rms_name, status, exit_date FROM employees WHERE id = 62;
--   -- Expect: name matches "Rajesh", exit_date IS NULL or != target.
--
-- Rollback:
--   UPDATE employees SET exit_date = NULL WHERE id = 62 AND exit_date = '2024-01-01';
--   ALTER TABLE employees DROP COLUMN payroll_type;

-- ── 1. payroll_type column ────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'employees'
          AND column_name = 'payroll_type'
    ) THEN
        ALTER TABLE public.employees
            ADD COLUMN payroll_type TEXT NOT NULL DEFAULT 'siprahub'
            CHECK (payroll_type IN ('anten', 'siprahub'));
        RAISE NOTICE 'Added employees.payroll_type column with default ''siprahub''.';
    END IF;
END $$;

-- Backfill payroll_type from the existing source column where available.
-- (Keeps default 'siprahub' for any null/unrecognised values.)
UPDATE public.employees
SET payroll_type = 'anten'
WHERE LOWER(COALESCE(source, '')) = 'anten'
  AND payroll_type <> 'anten';

-- ── 2. Rajesh (id=62) exit_date fix ───────────────────────────────────────
-- Idempotent: only updates if currently NULL or a different date.
UPDATE public.employees
SET exit_date = DATE '2024-01-01'
WHERE id = 62
  AND (exit_date IS NULL OR exit_date <> DATE '2024-01-01');
