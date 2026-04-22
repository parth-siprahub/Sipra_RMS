# Session Handoff — Security Sprint
**Date:** April 22, 2026
**Prepared by:** Claude (session summary for new chat)
**Next focus:** Security hardening — RMS-107, RMS-108, RMS-109, RMS-110

---

## HOW TO USE THIS DOCUMENT

Paste the **"NEW CHAT STARTER PROMPT"** section below verbatim into a new Claude Code chat. Everything else is reference context.

---

---
# ─── NEW CHAT STARTER PROMPT ───────────────────────────────────────────────
---

You are continuing work on **SipraHub RMS** — a FastAPI + React + Supabase resource management system for internal staffing operations.

## Project Location
```
D:\RMS_Siprahub\
  backend\app\          ← FastAPI source
  frontend\src\         ← React + TypeScript + Vite
  backend\migrations\   ← SQL migration files (001–011 applied)
```

## Dev Servers
- **Backend:** `http://localhost:8000/api` (FastAPI, uvicorn)
- **Frontend:** `http://localhost:5173` (Vite)
- **Supabase project:** `zeyngroegksnobeqafag` (ap-south-1)

## Active Branch
```
git checkout dashboard    ← ALL work goes on this branch
git push official dashboard
```
Remote `official` = `https://github.com/Siprahub-Org/RMS.git`

---

## What Was Done Before This Session (Context)

1. **Dashboard Analytics** — Full analytics tab wired with 5 charts based on 147 active employees (Role Distribution, Source Channel, Hiring Type, Payroll Segregation, Daily Status Matrix)
2. **Billing Config** — Freeze/unfreeze workflow, audit trail, 2-step Delete (inside Edit mode)
3. **DB Migration 011** — Applied via Supabase MCP: freeze columns on billing_config, indexes, RLS INSERT/UPDATE/DELETE policies
4. **Docs pushed** — PRD changelog, feature list (43 ✅ / 12 📋), Jira backlog (RMS-101 to RMS-110) all committed at `dbe349c` on `dashboard` branch

---

## YOUR TASK THIS SESSION — Security Sprint

Work the 4 security tickets in this order: RMS-107, RMS-108, RMS-109, RMS-110.

---

## RMS-107 — Search Injection Fix: Candidates Router
**Priority:** HIGH | **Points:** 1 | **Type:** Backend Security

### Problem
`backend/app/candidates/router.py` line 143–151 — the `search` param is interpolated directly into PostgREST `ilike` filters without any validation:

```python
if search:
    search = search.strip()
    query = query.or_(
        f"first_name.ilike.%{search}%,"   # ← NO VALIDATION
        f"last_name.ilike.%{search}%,"
        f"email.ilike.%{search}%,"
        f"phone.ilike.%{search}%"
    )
```

### Fix Pattern (copy from employees/router.py line 13)
```python
_SEARCH_SAFE_RE = re.compile(r'^[\w\s@.\-]+$')
```

Apply at the TOP of the file (module level), then in `list_candidates`:
```python
if search:
    search = search.strip()
    if not _SEARCH_SAFE_RE.match(search):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid characters in search query")
    query = query.or_(...)
```

### Also add `import re` at the top if not present.

### Acceptance Criteria
- [ ] `_SEARCH_SAFE_RE` defined at module level in candidates/router.py
- [ ] Guard applied before the `query.or_()` call
- [ ] Returns HTTP 400 on invalid input
- [ ] Write test: `backend/tests/test_candidates_search_injection.py`

---

## RMS-108 — Search Injection Fix: Resource Requests Router
**Priority:** HIGH | **Points:** 1 | **Type:** Backend Security

### Problem
`backend/app/resource_requests/router.py` line 50–57 — identical issue:

```python
if search:
    search = search.strip()
    query = query.or_(
        f"client_name.ilike.%{search}%,"   # ← NO VALIDATION
        f"job_profile.ilike.%{search}%,"
        f"request_display_id.ilike.%{search}%,"
        f"location.ilike.%{search}%"
    )
```

### Fix (identical pattern to RMS-107)
Add `import re` and `_SEARCH_SAFE_RE` at module level, guard before `query.or_()`.

### Acceptance Criteria
- [ ] Same `_SEARCH_SAFE_RE` guard applied
- [ ] Returns HTTP 400 on invalid input
- [ ] Write test: `backend/tests/test_requests_search_injection.py`

---

## RMS-109 — Enable RLS on 6 Analytics/Billing Tables
**Priority:** HIGH | **Points:** 2 | **Type:** DB Security (Supabase MCP)

### Problem
6 tables have RLS disabled. Backend uses service-role client (bypasses RLS), so currently not directly exploitable, but this is a compliance gap. RLS must be enabled with explicit policies.

### Tables to Fix
```
1. jira_timesheet_raw
2. aws_timesheet_logs
3. aws_timesheet_logs_v2
4. billing_records        ← already has policies, just needs RLS enabled
5. computed_reports
```
Note: `billing_config` RLS was already enabled in Migration 011 — skip it.

### How to Apply
Use the Supabase MCP tool:
- Project ID: `zeyngroegksnobeqafag`
- Tool: `mcp__87b70ba5-bde6-4d7a-8369-4033e3934d31__apply_migration`
- Migration name: `enable_rls_analytics_tables`

### SQL Template for Each Table
```sql
-- Enable RLS
ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "authenticated_select_<table_name>"
    ON public.<table_name>
    FOR SELECT TO authenticated USING (true);

-- Allow admin/manager to write
CREATE POLICY "admins_write_<table_name>"
    ON public.<table_name>
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role::text IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role::text IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')
        )
    );
```

### Save migration file to disk
`backend/migrations/012_enable_rls_analytics_tables.sql`

### Acceptance Criteria
- [ ] RLS enabled on all 5 tables (billing_config already done — skip)
- [ ] SELECT policy for authenticated users
- [ ] ALL (write) policy restricted to SUPER_ADMIN/ADMIN/MANAGER
- [ ] Migration file saved to disk
- [ ] Verify: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('jira_timesheet_raw', 'aws_timesheet_logs', 'aws_timesheet_logs_v2', 'billing_records', 'computed_reports');`

---

## RMS-110 — Fix Mutable search_path on 3 DB Functions
**Priority:** MEDIUM | **Points:** 1 | **Type:** DB Security

### Problem
Supabase security lint (rule 0011) flags these 3 functions as having a mutable `search_path`, which allows a malicious schema to shadow system functions:

1. `get_jira_raw_all`
2. `handle_new_user`
3. `update_updated_at_column`

### Fix Pattern
Add `SET search_path = public` to each function definition.

### Steps
1. First, read each function's current definition:
```sql
SELECT prosrc FROM pg_proc WHERE proname = 'update_updated_at_column';
SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';
SELECT prosrc FROM pg_proc WHERE proname = 'get_jira_raw_all';
```
2. Recreate with `SET search_path = public`
3. Save as `backend/migrations/013_fix_function_search_paths.sql`
4. Apply via Supabase MCP

### Example (update_updated_at_column)
```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```

### Acceptance Criteria
- [ ] All 3 functions recreated with `SET search_path = public`
- [ ] Migration 013 saved to disk
- [ ] Supabase Advisor shows 0 lint 0011 warnings
- [ ] Verify: `SELECT proname, proconfig FROM pg_proc WHERE proname IN ('get_jira_raw_all','handle_new_user','update_updated_at_column');` — should show `search_path=public` in proconfig

---

## Commit & Push Pattern (after all 4 tickets)
```bash
git add backend/app/candidates/router.py
git add backend/app/resource_requests/router.py
git add backend/migrations/012_enable_rls_analytics_tables.sql
git add backend/migrations/013_fix_function_search_paths.sql
git add backend/tests/test_candidates_search_injection.py
git add backend/tests/test_requests_search_injection.py

git commit -m "fix(security): search injection guards + RLS + search_path hardening

- RMS-107: _SEARCH_SAFE_RE guard on candidates search param
- RMS-108: _SEARCH_SAFE_RE guard on resource_requests search param
- RMS-109: RLS enabled on jira_timesheet_raw, aws_timesheet_logs,
  aws_timesheet_logs_v2, billing_records, computed_reports (migration 012)
- RMS-110: SET search_path=public on get_jira_raw_all, handle_new_user,
  update_updated_at_column (migration 013)"

git push official dashboard
```

---

## Key Files Reference

| File | Purpose |
|---|---|
| `backend/app/candidates/router.py` | Candidates CRUD — fix search here (RMS-107) |
| `backend/app/resource_requests/router.py` | Requests CRUD — fix search here (RMS-108) |
| `backend/app/employees/router.py` | **Reference** — `_SEARCH_SAFE_RE` already applied here, copy pattern |
| `backend/migrations/011_billing_config_freeze.sql` | Most recent migration (reference for style) |
| `backend/app/billing_config/router.py` | Reference for RLS policy pattern |
| `backend/app/auth/dependencies.py` | `get_current_user`, `require_admin` — use these for auth checks |
| `backend/app/database.py` | `get_supabase_admin_async()` — async DB client |

## Supabase MCP Tool Info
- **Project ID:** `zeyngroegksnobeqafag`
- **execute_sql:** for SELECT queries and verification
- **apply_migration:** for DDL (ALTER TABLE, CREATE POLICY, CREATE OR REPLACE FUNCTION)
- **MCP prefix:** `mcp__87b70ba5-bde6-4d7a-8369-4033e3934d31__`

## Coding Standards (MUST follow)
- All shell commands: `cmd /c` prefix (Windows)
- No hardcoded colors in frontend — use CSS variables (`var(--cta)`, etc.)
- TypeScript strict mode — no `any` types
- Async/await everywhere in Python and TypeScript
- Use existing `.card`, `.btn`, `.input-field` CSS classes

---
# ─── END OF PROMPT ───────────────────────────────────────────────────────────
---
