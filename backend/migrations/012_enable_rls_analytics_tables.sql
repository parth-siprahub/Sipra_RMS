-- Migration 012: RLS policies on analytics/billing tables
-- Ticket: RMS-135
-- Status: RLS already enabled on all 4 tables (confirmed 2026-04-23).
--         Existing SELECT policies present. This migration adds missing
--         admin write (INSERT/UPDATE/DELETE) policies.
-- Note: FastAPI uses service_role key (bypasses RLS). These policies protect
--       direct PostgREST/anon key access.

-- jira_timesheet_raw (SELECT policy already exists as 'authenticated_select_jira_timesheet_raw')
ALTER TABLE public.jira_timesheet_raw ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jira_timesheet_raw_write_admin"
  ON public.jira_timesheet_raw
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'manager'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'manager'));

-- aws_timesheet_logs (SELECT policy already exists as 'authenticated_select_aws_timesheet_logs')
ALTER TABLE public.aws_timesheet_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aws_timesheet_logs_write_admin"
  ON public.aws_timesheet_logs
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'manager'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'manager'));

-- aws_timesheet_logs_v2 (SELECT policy already exists as 'authenticated_select_aws_timesheet_logs_v2')
ALTER TABLE public.aws_timesheet_logs_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aws_timesheet_logs_v2_write_admin"
  ON public.aws_timesheet_logs_v2
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'manager'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'manager'));

-- computed_reports (SELECT policy already exists as 'authenticated_select_computed_reports')
ALTER TABLE public.computed_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "computed_reports_write_admin"
  ON public.computed_reports
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'manager'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'manager'));
