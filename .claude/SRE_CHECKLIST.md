# SRE_CHECKLIST.md — Pre-Azure Deployment Gate
> **This checklist is MANDATORY before any `git push origin master`.**
> No exceptions. Not even "quick fixes." Not even "just a typo."
> Master = Production = Azure. Treat every push as a live deployment.

---

## 🚨 GATE 0 — May 4 Pivot (THIS PUSH ONLY)

> Stakeholder directive (Jaicind, May 4 2026): billing engine is hours-only.
> LOP/payroll branching is **out of scope** for this production push.

- [ ] **G0.1 — Re-ingest Jira:** Pull the file forwarded by Jaicind ~11:29 AM May 4
      (`docs/SipraHub-Monthly_Timesheet_01_Apr_26_30_Apr_26 (3) (1).xls`).
      Diff row counts: `SELECT count(*) FROM jira_timesheet_raw WHERE billing_month='2026-04';`
      against the file totals. Jaicind: "couple more added" — counts MUST differ post-import.
- [ ] **G0.2 — AWS confirm no-op:** Jaicind: "I didn't do anything". No re-ingestion of
      `aws_timesheet_logs_v2` for April. Verify last-modified timestamp unchanged.
- [ ] **G0.3 — Migration 017 applied** (soft-rename `aws_timesheet_logs` → `_deprecated_20260504`).
      Run in Supabase dashboard. Verify v2 row count healthy after.
- [ ] **G0.4 — Migration 018 NOT APPLIED.** `payroll_type` column is staged-only.
      Per Jaicind: "Don't go into LOP. Let's not even look at it now."
      Defer to next sprint.
- [ ] **G0.5 — Hours-only billing verified:** `grep -rn "payroll_type\|is_lop\|LOP" backend/app/`
      → must return zero hits in active billing path.
- [ ] **G0.6 — May 1 holiday-billing test passes:** `pytest tests/test_billing_engine.py::TestHolidayWorkedIsBillable -v`
- [ ] **G0.7 — Pathak mid-month exit test passes:** `pytest tests/test_date_utils.py::TestProratedTargetHours::test_pathak_mid_month_exit -v`
- [ ] **G0.8 — UTC→IST shift test passes:** `pytest tests/test_timezone_shift.py -v`
- [ ] **G0.9 — Finance leaves-taken export available:** `GET /api/exports/leaves-taken?month=2026-04`
      returns CSV with columns `[employee_id, employee_name, month, total_leaves_taken]`.
      RMS does NOT compute payout/LOP — Finance handles policy externally.
- [ ] **G0.10 — Onboard 3 users:** KJ Prakash, Venkat Madhulam, Shiva Kumar — RMS login + role.

---

## 🔴 GATE 1 — Local Test Pass (Backend)

```bash
cmd /c cd D:\RMS_Siprahub\backend && venv\Scripts\python.exe -m pytest tests/ -v --tb=short 2>&1
```

**Pass criteria:** 0 failures, 0 errors.
**If failing:** Do NOT push. Fix tests first. Tests are the minimum bar, not a bonus.

- [ ] All pytest tests passing locally
- [ ] No new `DeprecationWarning` that could become an error on Azure's Python version
- [ ] `py_compile` check on all modified `.py` files

---

## 🔴 GATE 2 — TypeScript Compile Check (Frontend)

```bash
cmd /c cd D:\RMS_Siprahub\frontend && npm run typecheck 2>&1
```

**Pass criteria:** Zero TypeScript errors.
**If failing:** Do NOT push. The Azure build will fail identically.

- [ ] `tsc --noEmit` exits with code 0
- [ ] No `any` types added without documented justification in code comment
- [ ] No raw `fetch()` calls added outside `api/client.ts`

---

## 🟡 GATE 3 — Supabase Schema Sync Verification

**Before pushing any migration or backend change that touches DB:**

```bash
# Check what migrations are applied in production
# Run in Supabase dashboard → SQL Editor:
SELECT name, executed_at FROM supabase_migrations.schema_migrations ORDER BY executed_at DESC LIMIT 10;
```

- [ ] Any new tables have RLS enabled (`ALTER TABLE x ENABLE ROW LEVEL SECURITY;`)
- [ ] Any new tables have appropriate policies for `anon` and `authenticated` roles
- [ ] Financial columns use `NUMERIC(18,4)` — not `FLOAT` or `REAL`
- [ ] `docs/rms_security_source-of-truth.md` updated with schema changes
- [ ] No column was dropped (only additive migrations to production)

---

## 🟡 GATE 4 — Environment Variable Audit

**Azure App Service env vars must match `.env.example`:**

Checklist of critical vars:
- [ ] `SUPABASE_URL` — correct production URL (not local)
- [ ] `SUPABASE_SERVICE_KEY` — service role key (never anon key in backend)
- [ ] `SUPABASE_ANON_KEY` — anon key (frontend only, via `VITE_SUPABASE_ANON_KEY`)
- [ ] `API_PREFIX` is set to `/api`
- [ ] `VITE_API_URL` includes `/api` suffix
- [ ] No `DEBUG=True` or `RELOAD=True` in production env vars
- [ ] CORS `ALLOWED_ORIGINS` does NOT include `*` in production

**Azure verification command (run after deploy):**
```bash
# Check Azure app is responding
curl -s https://<your-azure-domain>/api/health | python -m json.tool
```

---

## 🟢 GATE 5 — Rollback Plan

**Every push must have a documented rollback before it goes out.**

Template:
```
CHANGE SUMMARY: [One sentence — what changed]
ROLLBACK COMMAND:
  git revert <commit-sha> && git push origin master
  # OR for schema changes:
  # Run reverse migration SQL in Supabase dashboard
HEALTH CHECK URL: https://<azure-domain>/api/health
SMOKE TEST: [What manual check confirms the feature works in prod]
ROLLBACK TRIGGER: [What symptom means you must rollback immediately]
```

- [ ] Rollback command documented and tested locally
- [ ] Rollback SQL ready (if schema migration was applied)
- [ ] Azure deployment slot / backup snapshot confirmed (if available)

---

## 🟢 GATE 6 — Post-Deploy Health Verification

**Run within 5 minutes of Azure pulling the new code:**

```bash
# Full health check script — run from local terminal
cmd /c curl -s -o NUL -w "HTTP Status: %%{http_code}\nResponse Time: %%{time_total}s\n" https://<your-azure-domain>/api/health

# Critical endpoint smoke test
cmd /c curl -s https://<your-azure-domain>/api/health
```

**Expected response:**
```json
{"status": "ok", "version": "x.x.x", "db": "connected"}
```

- [ ] `/api/health` returns `200`
- [ ] `/api/health` shows `"db": "connected"` (Supabase reachable from Azure)
- [ ] Login flow works in browser (not just API)
- [ ] No 500 errors in Azure App Service logs within 2 minutes of deploy

---

## 🚨 ABORT CONDITIONS

Stop the push immediately and investigate if:
- Any pytest test fails
- TypeScript compilation throws errors
- `SUPABASE_SERVICE_KEY` is not set in Azure env vars
- The previous deploy had a rollback in the last 7 days (double-check, don't rush)

---

## QUICK REFERENCE — Rollback Command Template

```bash
# Identify last good commit
cmd /c git log --oneline -10

# Revert last commit (safe — creates new revert commit)
cmd /c git revert HEAD --no-edit && git push origin master

# Nuclear option — force reset (ONLY if no team members on repo)
# git reset --hard <last-good-sha> && git push origin master --force
# ⚠️ This rewrites history. Confirm with Parth only.
```
