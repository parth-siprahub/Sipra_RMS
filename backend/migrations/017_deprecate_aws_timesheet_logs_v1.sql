-- Migration 017: Soft-rename legacy aws_timesheet_logs (v1) → _deprecated_20260504
--
-- DO NOT DROP. The v2 table (aws_timesheet_logs_v2) is now authoritative.
-- This rename preserves data for a 7-day cool-off period; a follow-up migration
-- (018+) may DROP after verification that no router or report references v1.
--
-- Rollback:
--   ALTER TABLE public.aws_timesheet_logs_deprecated_20260504 RENAME TO aws_timesheet_logs;
--
-- Verification before applying:
--   1. grep -r 'aws_timesheet_logs[^_v]' backend/ frontend/   → must be empty
--   2. SELECT count(*) FROM aws_timesheet_logs                → record current size in audit
--   3. Confirm v2 row count is healthy: SELECT count(*) FROM aws_timesheet_logs_v2

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'aws_timesheet_logs'
    ) THEN
        ALTER TABLE public.aws_timesheet_logs
            RENAME TO aws_timesheet_logs_deprecated_20260504;
        RAISE NOTICE 'Renamed aws_timesheet_logs → aws_timesheet_logs_deprecated_20260504';
    ELSE
        RAISE NOTICE 'aws_timesheet_logs does not exist; skipping rename';
    END IF;
END $$;

-- Add a deprecation marker comment so future engineers know why this is here.
COMMENT ON TABLE public.aws_timesheet_logs_deprecated_20260504 IS
    'DEPRECATED 2026-05-04. Replaced by aws_timesheet_logs_v2. '
    'Scheduled for DROP after 2026-05-11 if no regressions.';
