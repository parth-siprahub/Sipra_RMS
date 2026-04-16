# Dashboard Analytics Integration — Design

**Date:** 2026-04-16
**Branch:** `dashboard`
**Status:** Design approved — ready for plan-writing

---

## 1. Purpose

The RMS codebase already contains a complete, self-contained analytics component (`DashboardAnalytics.tsx`) and a fully-built backend analytics router (`backend/app/analytics/`). Both were written in a prior session but were **never wired into the app** — the frontend component is not referenced, the router is not mounted, and `AnalyticsProvider` is not wrapped around any route.

The Talent Acquisition team (admin = TA lead, recruiters = individual contributors) needs these analytics available from the existing Dashboard page without any change to the sidebar or other pages. This design describes how to connect the latent system and fill four specific analytical gaps that are not yet built.

---

## 2. Constraints

- **No sidebar changes.** Users are happy with current navigation.
- **No new top-level routes.** Everything lives at `/` (Dashboard).
- **No other page touched.** Only `Dashboard.tsx` (frontend) and `main.py` + `App.tsx` for wiring.
- **Role-aware scoping:**
  - Admin: sees all recruiters aggregated, can drill into a single recruiter via dropdown of names.
  - Recruiter: auto-scoped to own data, recruiter filter hidden, cannot bypass via URL manipulation.
- **Default date range:** all-time (no filter applied on load).
- **Dashboard branch only.** No push — user commits/pushes manually.

---

## 3. Page Architecture

The Dashboard gets a **two-tab toggle** immediately below the header badge:

```
┌─────────────────────────────────────────────────────────┐
│ Dashboard            Real-time resource analytics       │
│                                  🟢 LIVE SYSTEM DATA    │
├─────────────────────────────────────────────────────────┤
│  ╔═════════╗ ╔═════════╗                                │
│  ║ Overview ║ │ Analytics │                              │
│  ╚═════════╝ ╚═════════╝                                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   [ Active tab content renders here ]                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

- Active tab state: `useState<'overview' | 'analytics'>('overview')` in `Dashboard.tsx`
- Persisted to `localStorage` under key `rms.dashboard.tab` so a refresh lands on the last-used tab
- Styled using the existing `ViewToggle` component from `OverviewTab.tsx` for visual consistency with the chart/table toggles already on the page
- Both tabs live at route `/` — no new routes

---

## 4. Tab Contents

### Overview tab
`<OverviewTab metrics={metrics} />` — **zero changes.** Preserves the 5 KPI cards, status donut, pipeline funnel view-toggle, vendor charts, timeline with rolling avg, Skill Intelligence, Pipeline Health, and SOW Utilization.

### Analytics tab
`<DashboardAnalytics />` — extended layout:

| Row | Content | Status |
|---|---|---|
| Filter bar (sticky) | Date-range + recruiter dropdown (Admin only) | Wire existing + swap UUID input for name dropdown |
| 1 | **Requirement Tracker** — 6 horizontal stat cards per pipeline stage | NEW |
| 2 | Skill Distribution · Employment Type | Already built |
| 3 | **Hiring Type (New vs Backfill)** · **Payroll Segregation** | NEW · NEW |
| 4 | Source Channel (renamed from Hiring Source) · Client Demand | Already built (1 rename) |
| 5 | Pipeline Funnel (full-width) | Already built |
| 6 | **Daily Status Matrix** — Job Profiles × Stages | NEW |
| 7 | Smart Export (pivot + xlsx) | Already built |

Filter bar uses `position: sticky` top-0 so it stays visible while scrolling through all 7 rows.

---

## 5. Role-Based Recruiter Scoping

### Backend
- All `/analytics/*` endpoints already accept `?recruiter_id=<uuid>` query param.
- **Add a server-side guard** in the shared `_fetch_candidates` helper: if `current_user.role == 'recruiter'`, overwrite `recruiter_id` with `current_user.id` regardless of the incoming query string. This prevents URL manipulation bypass.
- Admin role: `recruiter_id` param is passed through unchanged (or omitted for aggregated view).

### Frontend
- **New endpoint** `GET /users/recruiters` returns `[{id: uuid, full_name: string}]` where `role IN ('recruiter', 'admin')`. Cached in React state after first fetch.
- `AnalyticsFilterBar` conditionally renders:
  - Admin → `<select>` of recruiter names with an "All Recruiters" option at the top
  - Recruiter → no recruiter control (scoping is implicit and enforced by backend)
- `AnalyticsContext.recruiterId` defaults to empty string for Admin ("all"), and the Recruiter role never sees or sets it.

---

## 6. The 4 New Sections (technical detail)

### 6.1 Requirement Tracker
**Endpoint:** `GET /analytics/pipeline/requirement-tracker`
**Returns:** `{stages: [{stage: 'NEW', open_count: N, color: 'blue'}, ...]}`
**Logic:** For each `resource_request` with `status IN ('OPEN', 'IN_PROGRESS')`, compute the furthest-reached stage across all its candidates. Bucket by stage:
1. New Requests (no candidates yet)
2. Screening
3. L1 Interview
4. L2 / Interview
5. With Client
6. Closing (selected, not onboarded)

**Render:** Horizontal strip of 6 stat cards with stage name, count, and subtle color-coding by urgency.

### 6.2 Hiring Type (New vs Backfill)
**Endpoint:** `GET /analytics/ta/hiring-type-split`
**Returns:** `[{label: 'New', value: N}, {label: 'Backfill', value: M}]`
**Source:** `resource_requests.is_backfill` boolean, filtered by date range on `created_at`.
**Render:** Pie chart (`PieChartWidget` reused).

**Existing "Hiring Source" chart stays** but gets relabeled to "Source Channel" (PORTAL / LINKEDIN / INTERNAL etc.) to avoid confusion with the new Hiring Type chart.

### 6.3 Payroll Segregation
**Endpoint:** `GET /analytics/resources/payroll`
**Returns:** `[{label: 'Internal', value: N}, {label: 'Vendor', value: M}, {label: 'Contractor', value: P}]`
**Source:** `employees.source` column (already comments say "payroll type: internal / vendor / contractor").
**Render:** Doughnut chart (`DoughnutChart` reused).

### 6.4 Daily Status Matrix
**Endpoint:** `GET /analytics/ta/daily-status-matrix`
**Returns:**
```json
{
  "rows": [
    {
      "job_profile_id": 12,
      "job_profile_name": "Senior Java Dev",
      "client_name": "Acme",
      "total_requirements": 5,
      "by_stage": {"OPEN": 2, "SCREENING": 1, "L1": 0, "L2": 1, "SELECTED": 1}
    }
  ]
}
```
**Render:** Sticky-header matrix table with rows = active Job Profiles, columns = `[Job Profile | Client | Open | Screening | L1 | L2 | Selected | Total]`. Row click opens a filtered candidate list modal (reuses existing modal pattern).

---

## 7. Technical Wiring (minimal delta)

Three single-line changes unlock ~80% of the already-built code:

1. **`backend/app/main.py`** — add `from app.analytics.router import router as analytics_router` and `app.include_router(analytics_router, prefix=API_PREFIX)`
2. **`frontend/src/App.tsx`** — wrap protected routes with `<AnalyticsProvider>` (import from `context/AnalyticsContext`)
3. **`frontend/src/pages/Dashboard.tsx`** — replace `<OverviewTab metrics={metrics} />` with a tab switcher that conditionally renders `<OverviewTab>` or `<DashboardAnalytics>`

**Additional work** for the 4 new sections + role scoping:
- 4 new service functions in `backend/app/analytics/service.py`
- 4 new endpoints in `backend/app/analytics/router.py`
- 1 new endpoint `backend/app/users/router.py` (or reuse existing employees router) for `/users/recruiters`
- 4 new React components inside `DashboardAnalytics.tsx`
- Recruiter dropdown refactor in `FilterBar`
- Role-aware scoping dependency in the analytics router

**No schema changes. No new libraries. No migrations.**

---

## 8. Data Dependencies Verified

| Field | Table | Status |
|---|---|---|
| `is_backfill` | `resource_requests` | ✅ Exists, used in dashboard/router.py |
| `source` (payroll type) | `employees` | ✅ Exists, commented as "payroll type" |
| `role`, `full_name` | `profiles` | ✅ Exists, used in auth/router.py |
| `status` | `resource_requests` + `candidates` | ✅ Exists |
| `created_by_id` | `candidates` | ✅ Exists (used for recruiter_id filter) |

---

## 9. Testing Strategy

- **Backend:** pytest for each new service function + one integration test per new endpoint exercising role-scoping bypass prevention.
- **Frontend:** Vitest for the tab-switch persistence behavior + role-conditional rendering of recruiter dropdown.
- **Manual:** Playwright/manual walkthrough of Admin → Analytics tab → switch recruiter → see data scoped; Recruiter → Analytics tab → no recruiter picker visible → data pre-scoped.

---

## 10. Out of Scope

- Sidebar / navigation changes
- Other pages (Candidates, Resource Requests, SOWs, etc.)
- Removing the stale `frontend/src/pages/analytics/*` page files (orphaned, unrouted — can be cleaned up in a follow-up ticket)
- Migrating from Context API to Zustand (current context is sufficient)
- Replacing custom pivot with nicolaskruchten/pivottable jQuery lib (custom React implementation is better)
- Backfilling missing skill data on candidates (data-quality task, separate ticket)

---

## 11. Success Criteria

- Admin navigates to `/` → sees two tabs → clicks Analytics → sees filter bar with recruiter dropdown, 7 rows of analytics, can export pivot to xlsx.
- Recruiter navigates to `/` → sees two tabs → clicks Analytics → filter bar has no recruiter picker → all data is scoped to their own records.
- Overview tab is byte-identical to current behavior.
- No changes to sidebar, no new routes, no other page affected.
- Page remains responsive on desktop widths down to 1280px.
