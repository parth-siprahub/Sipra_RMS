# SipraHub RMS — Feature List (Current State)
**As of:** April 22, 2026
**Reference:** `docs/RMS_Feature_List_20260313.xlsx`
**Branch:** `dashboard`

This Markdown file is the live source of truth for feature status. Update the `.xlsx` from this document at the next sprint review.

---

## Legend
- ✅ **Complete** — Shipped to production or merged to master
- 🔄 **In Progress** — Active on current branch, not yet merged
- 📋 **Backlog** — Planned, not started
- ❌ **Removed** — Descoped

---

## Module 1 — Authentication & RBAC

| # | Feature | Status | Notes |
|---|---|---|---|
| 1.1 | Supabase JWT login (email + password) | ✅ | — |
| 1.2 | Role-based access: SUPER_ADMIN, ADMIN, MANAGER, HR, VENDOR | ✅ | `profiles.role` enum |
| 1.3 | Route guards (protect pages by role) | ✅ | App.tsx guards |
| 1.4 | Billing Config access: email allowlist (3 authorized emails) | ✅ | `lib/accessControl.ts` |
| 1.5 | Vendor portal (separate login + scoped pipeline) | 📋 | Phase 2 |

---

## Module 2 — Dashboard

| # | Feature | Status | Notes |
|---|---|---|---|
| 2.1 | KPI cards: Candidates, Employees, Open Requests, SOWs | ✅ | Active counts only |
| 2.2 | Overview tab: pipeline cards + KPIs | ✅ | — |
| 2.3 | Analytics tab (tab toggle on same page) | ✅ | URL-driven, dashboard branch |
| 2.4 | Role Distribution pie chart (by active employees) | ✅ | Based on 147 active employees |
| 2.5 | Source Channel pie chart | ✅ | Vendor-name normalized |
| 2.6 | Hiring Type pie chart (New vs Backfill) | ✅ | Sourced from `is_backfill` flag |
| 2.7 | Payroll Segregation doughnut (Anten vs SipraHub) | ✅ | `employees.source` |
| 2.8 | Daily Status Matrix table | ✅ | Scrollable; capped at 70vh |
| 2.9 | Admin recruiter drill-down dropdown | ✅ | Filters analytics by recruiter |
| 2.10 | Recruiter role auto-scoped (server-side guard) | ✅ | Cannot see other recruiters |

---

## Module 3 — SOW Tracker

| # | Feature | Status | Notes |
|---|---|---|---|
| 3.1 | List SOWs with filters | ✅ | — |
| 3.2 | Create / Edit SOW (modal) | ✅ | — |
| 3.3 | Convert SOW modal to full page with URL | 📋 | Backlog item |
| 3.4 | SOW shown on Candidate kanban cards | ✅ | — |

---

## Module 4 — Job Profiles

| # | Feature | Status | Notes |
|---|---|---|---|
| 4.1 | List job profiles as cards | ✅ | Icon cleanup done |
| 4.2 | Create / Edit job profile (modal) | ✅ | — |
| 4.3 | Convert job profile modal to full page with URL | 📋 | Backlog item |

---

## Module 5 — Resource Requests

| # | Feature | Status | Notes |
|---|---|---|---|
| 5.1 | List resource requests with filters | ✅ | — |
| 5.2 | Create / Edit request (modal) | ✅ | — |
| 5.3 | Backfill flag (`is_backfill`) | ✅ | Used by analytics |
| 5.4 | Convert request modal to full page with URL | 📋 | Backlog item |
| 5.5 | Search injection fix (`_SEARCH_SAFE_RE`) | 📋 | Security backlog |

---

## Module 6 — Recruiter Pipeline (Candidates)

| # | Feature | Status | Notes |
|---|---|---|---|
| 6.1 | 21-field candidate form | ✅ | — |
| 6.2 | Kanban board with drag-and-drop | ✅ | Drag-scroll added |
| 6.3 | Candidate status progression | ✅ | 15+ statuses |
| 6.4 | Exit workflow (exit date + confirmation + revert) | ✅ | — |
| 6.5 | Convert candidate modal to full page with URL | 📋 | Backlog item |
| 6.6 | Revert button on Edit Candidate page | 📋 | Backlog item |
| 6.7 | Search injection fix (`_SEARCH_SAFE_RE`) | 📋 | Security backlog |

---

## Module 7 — Employee Management

| # | Feature | Status | Notes |
|---|---|---|---|
| 7.1 | Employee list with filters | ✅ | — |
| 7.2 | Active / Exit status | ✅ | — |
| 7.3 | `client_offboarding_date` + `siprahub_offboarding_date` fields | ✅ | Migration 010 |
| 7.4 | System mapping to AWS / Jira emails | ✅ | `employee_system_mappings` |
| 7.5 | Delete button on Employee Edit page (bottom-left) | 📋 | Backlog item |

---

## Module 8 — Timesheets

| # | Feature | Status | Notes |
|---|---|---|---|
| 8.1 | Jira timesheet import (XLS → `jira_timesheet_raw`) | ✅ | — |
| 8.2 | AWS ActiveTrack import (CSV → `aws_timesheet_logs_v2`) | ✅ | — |
| 8.3 | Column header rename (human-readable) | ✅ | — |
| 8.4 | Timesheet comparison (Jira vs AWS vs Billable) | ✅ | — |
| 8.5 | Search icon removal | ✅ | UI cleanup |

---

## Module 9 — Billing

| # | Feature | Status | Notes |
|---|---|---|---|
| 9.1 | Billing Config page (admin-only) | ✅ | `BillingConfig.tsx` |
| 9.2 | Create / edit / delete billing config per month | ✅ | — |
| 9.3 | Freeze / Unfreeze billing month | ✅ | Confirmation modal + audit trail |
| 9.4 | 2-step Delete (inside Edit mode only) | ✅ | Prevents accidental deletion |
| 9.5 | Billing calculation engine | ✅ | `billing/engine.py` |
| 9.6 | Billing calculation API (`/billing/calculate/{month}`) | ✅ | Blocked when frozen |
| 9.7 | Billing Records list view | ✅ | — |
| 9.8 | Reports page (billing report with filters + sort) | ✅ | React hooks bug fixed |

---

## Module 10 — Security & Infrastructure

| # | Feature | Status | Notes |
|---|---|---|---|
| 10.1 | FastAPI JWT auth middleware | ✅ | — |
| 10.2 | Security headers (HSTS, CSP, X-Frame) | ✅ | Decorator pattern (not BaseHTTPMiddleware) |
| 10.3 | RLS enabled: core pipeline tables | ✅ | — |
| 10.4 | RLS: `billing_config` INSERT/UPDATE/DELETE policies | ✅ | Migration 011 |
| 10.5 | RLS: 6 analytics/billing tables (jira_raw, aws_logs, etc.) | 📋 | Security backlog |
| 10.6 | Search injection guard in candidates router | 📋 | Security backlog |
| 10.7 | Search injection guard in resource_requests router | 📋 | Security backlog |
| 10.8 | Fix 3 DB functions with mutable `search_path` | 📋 | Security backlog |

---

## Summary Counts

| Status | Count |
|---|---|
| ✅ Complete | 43 |
| 🔄 In Progress | 0 |
| 📋 Backlog | 12 |
| ❌ Removed | 0 |
