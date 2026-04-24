# SipraHub RMS — PRD Changelog
**Reference PRD:** `docs/RMS_PRD_20260313.docx` (v2, March 13 2026)
**Changelog date:** April 22, 2026
**Branch:** `dashboard`
**Status:** Append these changes to the next PRD revision

---

## What Changed Since March 13, 2026

### MODULE: Dashboard (FR 4.2)

#### New: Two-Tab Dashboard Layout
- Dashboard now has **Overview** and **Analytics** tabs rendered via URL path (`/dashboard/overview`, `/dashboard/analytics`)
- Tab state is URL-driven (no localStorage) — sidebar highlights correctly for both routes
- Zero new top-level routes; tab toggle lives entirely within the existing Dashboard page

#### New: Analytics Tab — 5 Live Charts
All charts are now populated from **active employees (147)**, not the pipeline, fixing a data-accuracy gap.

| Chart | Data Source | What it shows |
|---|---|---|
| Role Distribution (Pie) | `employees → candidates → job_profiles` | Headcount by job profile role |
| Source Channel (Pie) | `employees → candidates → vendors` | Breakdown by recruiting vendor channel |
| Hiring Type (Pie) | `employees → resource_requests.is_backfill` | New hire vs backfill split |
| Payroll Segregation (Doughnut) | `employees.source` | Anten vs SipraHub payroll headcount |
| Daily Status Matrix (Table) | `resource_requests + employees` | Pipeline status per request |

#### Removed from Dashboard Analytics
- `EmploymentType` doughnut (replaced by Hiring Type sourced from employees)
- `PivotExport` data table
- `AnalyticsFunnel` (Pipeline Funnel)
- `ClientDemand` bar chart
- `RequirementTrackerSection` — replaced with live candidate-stage counts

#### Dashboard KPI Card Fix
- "Total Candidates" now only counts active pipeline stages (10 allowlisted statuses: `NEW`, `SCREENING`, `L1_SCHEDULED`, etc.) — excludes `ONBOARDED`, `EXIT`, rejected/closed
- Card subtitle changed to "Active pipeline"

---

### MODULE: Billing Configuration (New — not in original PRD)

A new admin-only **Billing Config** page was introduced to support monthly billing management.

#### FR-BILLING-01: Monthly Billing Configuration
- Admin can set **billable hours** and **working days** per client per month
- Default: 176 hrs / 22 days (DCLI)
- Configurable per client if multi-client is needed later

#### FR-BILLING-02: Freeze / Unfreeze Workflow
- Authorized admins can **lock** a billing month to prevent recalculation
- Locked months block: (a) re-running billing calculation, (b) editing the config, (c) deleting the config
- Unlock is available to authorized admins with a confirmation step
- Full audit trail: `frozen_by`, `frozen_at`, `last_unfrozen_by`, `last_unfrozen_at` stored per record

#### FR-BILLING-03: Access Control
- Page restricted to 3 authorized emails (`jaicind`, `sreenath.reddy`, `rajapv`)
- Email allowlist is a single shared constant (`frontend/src/lib/accessControl.ts`) referenced by App.tsx, Sidebar.tsx, and BillingConfig.tsx
- Backend enforces same allowlist independently at every endpoint

#### FR-BILLING-04: Billing Calculation Engine
- `/api/billing/calculate/{month}` iterates all employees with timesheets for that month
- Computes: total logged hours, capped hours (≤ billable hours cap), OOO days, compliance (75% AWS active threshold), billable flag
- Idempotent: re-running overwrites existing records for that month
- Blocked if month is frozen (409 Conflict response)

#### FR-BILLING-05: UI Safety
- Delete is a 2-step action — only accessible from inside Edit mode (prevents accidental deletion)
- Audit log surfaces contextually only when a row is in edit mode

---

### MODULE: Reports (FR 4.2 — enhancement)

- Fixed a React Hooks violation (crash in production): `useMemo` was called after early `return` — moved above all guard clauses
- Added: search bar, Status filter dropdown, Payroll filter dropdown
- Added: sortable column headers (Name, Month, Hours, OOO Days)
- Null-safety fix: `(c.rms_name || '').toLowerCase()` prevents crash on null names

---

### MODULE: Employee Lifecycle — Exit Workflow (FR 4.8 — enhancement)

- Exit date input field added (defaults to today, editable)
- Confirmation modal on drag-to-Exit (Save / Cancel)
- "Move Back / Revert Exit" option added with confirmation dialog
- Employee count auto-sync when candidate moved to Exit
- Dashboard no longer shows Verification Triad section

---

### MODULE: UI/UX Cleanup (Cross-cutting)

All pages received icon and column cleanup as of April 2026:

| Page | Change |
|---|---|
| Employees | Removed IDs column, plain text Hiring Type/Payroll, removed exit icon |
| SOWs | Removed calendar icon, sticky headers |
| Job Profiles | Removed Code/Layers icons from cards |
| Resource Requests | Renamed "Role / Profile" → "Role", removed tech subtitle |
| Candidates | Removed Company/Exp columns, SOW on kanban cards, drag-scroll |
| Timesheets | Renamed column headers |

---

### DB Schema Changes (Not in original PRD)

| Migration | Description |
|---|---|
| `010_employee_offboarding_dates.sql` | Added `client_offboarding_date`, `siprahub_offboarding_date` to `employees` |
| `011_billing_config_freeze.sql` | Added freeze columns, performance indexes, and RLS policies to `billing_config` |

---

## Acceptance Criteria — New Modules

### Billing Config
- [ ] Admin can create, edit, delete a billing config for any month (when unlocked)
- [ ] Freeze locks month across all operations; unlock restores ability to recalculate
- [ ] Unauthorized users see an Access Restricted screen (not a 403 toast)
- [ ] Audit trail (who froze, when) is visible in edit mode

### Dashboard Analytics
- [ ] Analytics tab shows 5 charts reflecting 147 active employees
- [ ] Role Distribution, Source Channel, Hiring Type all show consistent totals
- [ ] Payroll chart shows Anten vs SipraHub headcount breakdown
- [ ] Daily Status Matrix table scrolls internally without pushing page layout
