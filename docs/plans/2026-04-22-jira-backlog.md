# SipraHub RMS — Jira Backlog
**Sprint:** Post-April-22 2026
**Branch scope:** Features not yet started (not on any active branch)
**Maintained by:** Parth Joshi (Dev Lead)

Import these tickets into Jira. Each ticket follows: ID, Title, Priority, Story Points, Acceptance Criteria, Technical Notes.

---

## Epic: Full-Page Modals (URL-Driven Detail Views)
**Goal:** Replace modal overlays with dedicated full-page views at `/entity/:id/edit` so that deep-links, browser back/forward, and sharing work correctly.

---

### RMS-101 · Convert Resource Request modal → Full Page
**Priority:** High | **Points:** 3 | **Type:** Frontend

**User Story:**
As a recruiter, when I click on a resource request, I want it to open at its own URL so I can share a direct link with a colleague.

**Acceptance Criteria:**
- [ ] Route: `GET /resource-requests/:id` renders the full detail/edit view
- [ ] Clicking a request in the list navigates to the new route (no modal)
- [ ] Browser Back returns to the list with filters intact
- [ ] Page title is `{role} — Resource Request #{id}`
- [ ] Delete button is in the bottom-left corner of the edit page

**Technical Notes:**
- Use React Router `useParams` for `id`
- Move form JSX from modal to `pages/ResourceRequestDetail.tsx`
- Keep existing `ResourceRequests.tsx` list view unchanged

---

### RMS-102 · Convert SOW modal → Full Page
**Priority:** High | **Points:** 3 | **Type:** Frontend

**User Story:**
As an admin, when I open a SOW I want a dedicated page I can bookmark and share.

**Acceptance Criteria:**
- [ ] Route: `GET /sows/:id` renders full SOW detail/edit view
- [ ] SOW list view keeps its current filters
- [ ] Delete button in bottom-left corner of edit page
- [ ] Page title: `{sow_name} — SOW #{id}`

**Technical Notes:**
- New page: `pages/SOWDetail.tsx`
- Add route in `App.tsx` (role-guarded)

---

### RMS-103 · Convert Job Profile modal → Full Page
**Priority:** Medium | **Points:** 2 | **Type:** Frontend

**User Story:**
As a recruiter, I want to open a job profile at its own URL to check requirements while writing a candidate note.

**Acceptance Criteria:**
- [ ] Route: `GET /job-profiles/:id` renders full detail/edit view
- [ ] Job profile cards link to the new route
- [ ] Delete button in bottom-left corner

**Technical Notes:**
- New page: `pages/JobProfileDetail.tsx`

---

### RMS-104 · Convert Candidate modal → Full Page
**Priority:** High | **Points:** 5 | **Type:** Frontend

**User Story:**
As an admin reviewing profiles, I want each candidate to have a URL so I can open multiple tabs and compare.

**Acceptance Criteria:**
- [ ] Route: `GET /candidates/:id` renders full candidate detail/edit view
- [ ] Kanban card click navigates to the URL (not modal)
- [ ] All 21 fields editable on the page
- [ ] Revert button (discard unsaved changes) is visible at all times above Save
- [ ] Delete button in bottom-left corner
- [ ] After save, navigates back to Kanban with the candidate in its updated column

**Technical Notes:**
- New page: `pages/CandidateDetail.tsx`
- Revert = reset form state to initial values (no API call)
- Kanban must refresh on return to reflect status change

---

## Epic: Edit Page UX Standards
**Goal:** All entity edit pages follow a consistent layout with Delete (bottom-left, red) and Revert/Cancel (beside Save).

---

### RMS-105 · Delete Button on Edit Pages (Employees, SOWs, JPs, Requests)
**Priority:** Medium | **Points:** 2 | **Type:** Frontend

**Acceptance Criteria:**
- [ ] Each edit page has a `Delete` button in the **bottom-left** corner
- [ ] Button is `btn-danger` style (red)
- [ ] Clicking opens a confirmation modal before executing delete
- [ ] After delete, navigates to the parent list page with a success toast

**Pages affected:** `EmployeeEdit.tsx`, `SOWDetail.tsx`, `JobProfileDetail.tsx`, `ResourceRequestDetail.tsx`

---

### RMS-106 · Revert Button on Edit Candidate Page
**Priority:** Low | **Points:** 1 | **Type:** Frontend

**Acceptance Criteria:**
- [ ] "Revert Changes" button appears beside Save when any field has been modified (form is dirty)
- [ ] Clicking Revert resets all fields to the values loaded from the API (no API call needed)
- [ ] If form is clean (no changes), Revert button is hidden or disabled

---

## Epic: Security Hardening
**Goal:** Close the remaining security gaps identified in the Apr 21 2026 audit.

---

### RMS-107 · Search Injection Fix — Candidates Router
**Priority:** High | **Points:** 1 | **Type:** Backend Security

**Description:**
The `search` query parameter in `backend/app/candidates/router.py` is interpolated into `ilike` filters without sanitization. A crafted input could inject PostgREST operators.

**Acceptance Criteria:**
- [ ] `_SEARCH_SAFE_RE = re.compile(r'^[a-zA-Z0-9 @._-]{0,100}$')` guard applied (copy from `employees/router.py`)
- [ ] Search param validated before any query; returns 400 if pattern fails
- [ ] Unit test: `test_candidate_search_injection_returns_400`

**Reference:** `backend/app/employees/router.py` line ~35 for the guard pattern

---

### RMS-108 · Search Injection Fix — Resource Requests Router
**Priority:** High | **Points:** 1 | **Type:** Backend Security

**Same pattern as RMS-107, applied to:**
`backend/app/resource_requests/router.py`

**Acceptance Criteria:** identical to RMS-107

---

### RMS-109 · Enable RLS on 6 Analytics/Billing Tables
**Priority:** High | **Points:** 2 | **Type:** DB Security

**Description:**
6 tables currently have RLS disabled. The backend uses the service-role client (bypasses RLS), so this doesn't affect current functionality, but it is a compliance gap.

**Tables:**
1. `jira_timesheet_raw`
2. `aws_timesheet_logs`
3. `aws_timesheet_logs_v2`
4. `billing_records`
5. `computed_reports`
6. ~~`billing_config`~~ — **Done (Migration 011)**

**Acceptance Criteria:**
- [ ] RLS enabled (`ALTER TABLE x ENABLE ROW LEVEL SECURITY`)
- [ ] At minimum: `SELECT` policy for `authenticated` role
- [ ] `INSERT/UPDATE/DELETE` restricted to admin/manager roles
- [ ] Supabase Advisor shows 0 "RLS Disabled" warnings for public tables

**Migration file:** `backend/migrations/012_enable_rls_analytics_tables.sql`

---

### RMS-110 · Fix Mutable search_path on 3 DB Functions
**Priority:** Medium | **Points:** 1 | **Type:** DB Security

**Description:**
Supabase security lint (0011) flags 3 functions without a fixed `search_path`:
1. `get_jira_raw_all`
2. `handle_new_user`
3. `update_updated_at_column`

**Acceptance Criteria:**
- [ ] Each function has `SET search_path = public` in its definition
- [ ] Supabase Advisor shows 0 lint 0011 warnings

**Example fix:**
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

---

## Backlog Summary

| ID | Title | Priority | Points | Epic |
|---|---|---|---|---|
| RMS-101 | Resource Request → Full Page | High | 3 | Full-Page Modals |
| RMS-102 | SOW → Full Page | High | 3 | Full-Page Modals |
| RMS-103 | Job Profile → Full Page | Medium | 2 | Full-Page Modals |
| RMS-104 | Candidate → Full Page | High | 5 | Full-Page Modals |
| RMS-105 | Delete Button on Edit Pages | Medium | 2 | Edit Page UX |
| RMS-106 | Revert Button on Edit Candidate | Low | 1 | Edit Page UX |
| RMS-107 | Search Injection Fix — Candidates | High | 1 | Security |
| RMS-108 | Search Injection Fix — Requests | High | 1 | Security |
| RMS-109 | Enable RLS on 6 tables | High | 2 | Security |
| RMS-110 | Fix Mutable search_path (3 functions) | Medium | 1 | Security |

**Total estimated points:** 21
**Recommended sprint split:**
- Sprint A (this week): RMS-107, RMS-108, RMS-101, RMS-102 (high priority, manageable scope)
- Sprint B: RMS-104, RMS-109, RMS-110 (higher effort)
- Sprint C: RMS-103, RMS-105, RMS-106
