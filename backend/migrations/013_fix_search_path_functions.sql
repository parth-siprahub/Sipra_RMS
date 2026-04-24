-- Migration 013: Fix mutable search_path on 3 DB functions
-- Ticket: RMS-136
-- Status: Already resolved. All 3 functions confirmed to have
--         SET search_path TO 'public', 'pg_catalog' as of 2026-04-23.
--         This migration is a no-op kept for audit trail completeness.
--
-- Functions verified:
--   public.get_jira_raw_all          -- SET search_path TO 'public', 'pg_catalog' ✓
--   public.handle_new_user           -- SET search_path TO 'public', 'pg_catalog' ✓
--   public.update_updated_at_column  -- SET search_path TO 'public', 'pg_catalog' ✓
--
-- Supabase Advisor lint 0011 should show 0 warnings after this verification.

SELECT 'search_path already fixed on all 3 functions — no action needed' AS status;
