# Dashboard Analytics Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Wire the already-built `DashboardAnalytics` component and `/analytics/*` backend router into the Dashboard page via a two-tab toggle, add role-scoped recruiter filtering, and build 4 missing analytics sections — without touching any other page or the sidebar.

**Architecture:** Two-tab toggle (Overview / Analytics) on the existing Dashboard page. Admin sees a recruiter dropdown to drill into one person; Recruiter role is auto-scoped to own data with server-side guard against URL manipulation. Four new analytics sections (Requirement Tracker, Hiring Type New-vs-Backfill, Payroll Segregation, Daily Status Matrix) are added as React components rendered inside the existing `DashboardAnalytics.tsx`.

**Tech Stack:** React 18 + TypeScript (Vite), FastAPI + Pydantic, Supabase Postgres, Recharts, React Context API, pytest, Vitest.

**Branch:** `dashboard` — **do not push**. User will push manually.

**Source design:** `docs/plans/2026-04-16-dashboard-analytics-integration-design.md`

---

## Scope Constraints (enforced throughout)

- **Frontend pages touched:** `pages/Dashboard.tsx` only.
- **Wiring files:** `backend/app/main.py`, `frontend/src/App.tsx`, `frontend/src/context/AnalyticsContext.tsx` (already exists).
- **New work happens inside components/**, not pages/. Specifically:
  - `components/dashboard/DashboardAnalytics.tsx` gets the 4 new sub-sections inlined or as sibling components
  - `components/analytics/AnalyticsFilterBar.tsx` gets the dropdown refactor
- **Backend:** `backend/app/analytics/` (router, service, schemas) + one new helper in `backend/app/users/` or reuse of existing auth router
- **No sidebar changes. No new routes. No other page touched.**

---

## Phase Overview

| Phase | Tasks | Outcome |
|---|---|---|
| **1. Wire-up (unblocks 80% of existing code)** | 1, 2, 3 | Analytics tab is reachable and renders existing sections |
| **2. Role scoping** | 4, 5, 6 | Admin drill-down dropdown + server-side guard |
| **3. Four new sections** | 7, 8, 9, 10 | Requirement Tracker, Hiring Type, Payroll, Daily Status Matrix |
| **4. Polish & verify** | 11, 12 | Sticky filter bar + tsc/pytest/manual verification |

---

## Phase 1 — Wire-up

### Task 1: Mount analytics router in FastAPI

**Files:**
- Modify: `backend/app/main.py` (imports block + router includes block)
- Test: `backend/tests/test_analytics_mounted.py` (create)

**Step 1: Write the failing test**

Create `backend/tests/test_analytics_mounted.py`:

```python
"""Verify the /analytics/* router is mounted on the FastAPI app."""
from fastapi.testclient import TestClient
from app.main import app


def test_analytics_router_is_mounted():
    """Confirm /api/analytics/resources-skills returns 401 (not 404) when unauthenticated.

    A 404 would indicate the router was never included. A 401 means the route is
    registered and the auth dependency rejected the request — which is the expected
    state for an unauthenticated call.
    """
    client = TestClient(app)
    response = client.get("/api/analytics/resources-skills")
    assert response.status_code != 404, "analytics router not mounted"
    assert response.status_code in (401, 403), f"expected auth rejection, got {response.status_code}"
```

**Step 2: Run test to verify it fails**

```
cd D:\RMS_Siprahub\backend
cmd /c venv\Scripts\python.exe -m pytest tests/test_analytics_mounted.py -v
```
Expected: FAIL with `404` (router not mounted).

**Step 3: Mount the router**

In `backend/app/main.py`, in the imports block (around lines 24-40), add:

```python
from app.analytics.router import router as analytics_router
```

In the router includes block (around lines 210-227), add at the end of the `include_router` calls:

```python
app.include_router(analytics_router, prefix=API_PREFIX)
```

**Step 4: Run test to verify it passes**

```
cmd /c venv\Scripts\python.exe -m pytest tests/test_analytics_mounted.py -v
```
Expected: PASS.

**Step 5: Commit**

```bash
cd D:\RMS_Siprahub
git add backend/app/main.py backend/tests/test_analytics_mounted.py
git commit -m "feat(analytics): mount /analytics router on FastAPI app"
```

---

### Task 2: Wrap app in AnalyticsProvider

**Files:**
- Modify: `frontend/src/App.tsx` (add import + wrap AuthProvider subtree)
- Verify: `frontend/src/context/AnalyticsContext.tsx` (already exists, no change)

**Step 1: Verify AnalyticsContext exists and exposes AnalyticsProvider**

Run:
```
cmd /c dir frontend\src\context\AnalyticsContext.tsx
```
Expected: file listed. If missing, halt and investigate.

**Step 2: Import the provider**

In `frontend/src/App.tsx`, after line 4 (`import { ThemeProvider } from './context/ThemeContext';`), add:

```typescript
import { AnalyticsProvider } from './context/AnalyticsContext';
```

**Step 3: Wrap the protected-routes subtree**

Inside `<AuthProvider>` (line 100) and before `<Routes>` (line 101), insert `<AnalyticsProvider>` so the wrap is:

```tsx
<AuthProvider>
  <AnalyticsProvider>
    <Routes>
      {/* ...existing routes unchanged... */}
    </Routes>
  </AnalyticsProvider>
</AuthProvider>
```

Also close `</AnalyticsProvider>` before `</AuthProvider>` (line 163).

**Step 4: Type-check**

```
cd D:\RMS_Siprahub\frontend
cmd /c npx tsc --noEmit
```
Expected: no new errors.

**Step 5: Commit**

```bash
cd D:\RMS_Siprahub
git add frontend/src/App.tsx
git commit -m "feat(analytics): wrap routes with AnalyticsProvider"
```

---

### Task 3: Add tab toggle to Dashboard.tsx

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx` (only file in `pages/` we touch)
- Test: `frontend/src/pages/__tests__/Dashboard.tabs.test.tsx` (create)

**Step 1: Write the failing test**

Create `frontend/src/pages/__tests__/Dashboard.tabs.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Dashboard } from '../Dashboard';

// Stub API so effect resolves immediately with a valid metrics object.
vi.mock('../../api/client', () => ({
  api: { get: vi.fn().mockResolvedValue({}) },
}));

// Stub the two tab components so the test focuses on the switcher itself.
vi.mock('../../components/dashboard/OverviewTab', () => ({
  OverviewTab: () => <div data-testid="overview-tab">Overview</div>,
}));
vi.mock('../../components/dashboard/DashboardAnalytics', () => ({
  DashboardAnalytics: () => <div data-testid="analytics-tab">Analytics</div>,
}));

describe('Dashboard tab toggle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to Overview tab on first load', async () => {
    render(<Dashboard />);
    expect(await screen.findByTestId('overview-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('analytics-tab')).toBeNull();
  });

  it('switches to Analytics and persists choice to localStorage', async () => {
    render(<Dashboard />);
    await screen.findByTestId('overview-tab');
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    expect(screen.getByTestId('analytics-tab')).toBeInTheDocument();
    expect(localStorage.getItem('rms.dashboard.tab')).toBe('analytics');
  });

  it('restores persisted tab on remount', async () => {
    localStorage.setItem('rms.dashboard.tab', 'analytics');
    render(<Dashboard />);
    expect(await screen.findByTestId('analytics-tab')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

```
cd D:\RMS_Siprahub\frontend
cmd /c npx vitest run src/pages/__tests__/Dashboard.tabs.test.tsx
```
Expected: FAIL (no tab toggle, no `DashboardAnalytics` import).

**Step 3: Implement the tab switcher**

Rewrite `frontend/src/pages/Dashboard.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Skeleton, CardSkeleton } from '../components/ui/Skeleton';
import { OverviewTab } from '../components/dashboard/OverviewTab';
import { DashboardAnalytics } from '../components/dashboard/DashboardAnalytics';
import type { DashboardMetrics } from '../components/dashboard/types';

type DashboardTab = 'overview' | 'analytics';
const TAB_STORAGE_KEY = 'rms.dashboard.tab';

function readPersistedTab(): DashboardTab {
  try {
    const stored = localStorage.getItem(TAB_STORAGE_KEY);
    return stored === 'analytics' ? 'analytics' : 'overview';
  } catch {
    return 'overview';
  }
}

export function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DashboardTab>(readPersistedTab);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await api.get<DashboardMetrics>('/dashboard/metrics');
        setMetrics(data);
      } catch (error) {
        console.error('Failed to fetch dashboard metrics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab);
    try {
      localStorage.setItem(TAB_STORAGE_KEY, tab);
    } catch {
      /* storage disabled — ignore */
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-8 w-32 rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => <CardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-96 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-muted">Real-time resource and candidate analytics</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-text-muted bg-surface-hover px-3 py-1.5 rounded-full border border-border">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          LIVE SYSTEM DATA
        </div>
      </div>

      {/* Tab toggle */}
      <div
        role="tablist"
        aria-label="Dashboard view"
        className="inline-flex items-center gap-1 p-1 rounded-lg border border-border bg-surface"
      >
        {(['overview', 'analytics'] as const).map(tab => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleTabChange(tab)}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                isActive
                  ? 'bg-cta text-white shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {tab === 'overview' ? 'Overview' : 'Analytics'}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && metrics ? <OverviewTab metrics={metrics} /> : null}
      {activeTab === 'analytics' ? <DashboardAnalytics /> : null}
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

```
cmd /c npx vitest run src/pages/__tests__/Dashboard.tabs.test.tsx
```
Expected: all 3 tests PASS.

**Step 5: Type-check**

```
cmd /c npx tsc --noEmit
```
Expected: no new errors.

**Step 6: Commit**

```bash
cd D:\RMS_Siprahub
git add frontend/src/pages/Dashboard.tsx frontend/src/pages/__tests__/Dashboard.tabs.test.tsx
git commit -m "feat(dashboard): two-tab toggle Overview/Analytics with localStorage persistence"
```

---

## Phase 2 — Role-based recruiter scoping

### Task 4: Backend role-aware recruiter_id guard

**Files:**
- Modify: `backend/app/analytics/router.py` (enforce scoping in `_fetch_candidates` or via a dedicated dependency)
- Test: `backend/tests/test_analytics_role_scoping.py` (create)

**Step 1: Understand current state**

Open `backend/app/analytics/router.py`. The helper `_fetch_candidates(recruiter_id: str | None, ...)` currently trusts the caller-supplied `recruiter_id`. We need to pass the current user into the helper and overwrite `recruiter_id` when role == 'recruiter'.

**Step 2: Write the failing test**

Create `backend/tests/test_analytics_role_scoping.py`:

```python
"""Verify a recruiter cannot read another recruiter's data via URL manipulation."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.auth.dependencies import get_current_user


RECRUITER_A_ID = "00000000-0000-0000-0000-00000000000a"
RECRUITER_B_ID = "00000000-0000-0000-0000-00000000000b"


@pytest.fixture
def as_recruiter_a():
    """Override auth dependency to return recruiter A."""
    def _override():
        return {"id": RECRUITER_A_ID, "role": "recruiter", "email": "a@example.com"}
    app.dependency_overrides[get_current_user] = _override
    yield
    app.dependency_overrides.clear()


def test_recruiter_cannot_spoof_recruiter_id(as_recruiter_a, monkeypatch):
    """When recruiter A passes ?recruiter_id=B, the helper must coerce it back to A."""
    captured = {}

    def fake_fetch(recruiter_id, start_date, end_date):
        captured["recruiter_id"] = recruiter_id
        return []

    from app.analytics import router as analytics_router
    monkeypatch.setattr(analytics_router, "_fetch_candidates", fake_fetch)

    client = TestClient(app)
    resp = client.get(
        f"/api/analytics/resources-skills?recruiter_id={RECRUITER_B_ID}"
    )
    assert resp.status_code == 200
    assert captured["recruiter_id"] == RECRUITER_A_ID, (
        "Recruiter was able to query another recruiter's data"
    )
```

**Step 3: Run test to verify it fails**

```
cd D:\RMS_Siprahub\backend
cmd /c venv\Scripts\python.exe -m pytest tests/test_analytics_role_scoping.py -v
```
Expected: FAIL — recruiter_id B leaks through.

**Step 4: Implement the guard**

In `backend/app/analytics/router.py`:

1. Add a helper at module scope:
   ```python
   def _scope_recruiter_id(
       requested_recruiter_id: str | None,
       current_user: dict,
   ) -> str | None:
       """Enforce role-based scoping.

       Recruiters can only see their own data regardless of the query param.
       Admins (and other elevated roles) pass through unchanged.
       """
       role = (current_user.get("role") or "").lower()
       if role == "recruiter":
           return current_user["id"]
       return requested_recruiter_id
   ```

2. In every endpoint that currently reads a `recruiter_id` query param, replace:
   ```python
   recruiter_id: str | None = Query(default=None),
   current_user: dict = Depends(get_current_user),
   ```
   …with the same signature plus one line after entering the handler:
   ```python
   recruiter_id = _scope_recruiter_id(recruiter_id, current_user)
   ```

**Step 5: Run test to verify it passes**

```
cmd /c venv\Scripts\python.exe -m pytest tests/test_analytics_role_scoping.py -v
```
Expected: PASS.

**Step 6: Run full analytics test suite**

```
cmd /c venv\Scripts\python.exe -m pytest tests/ -k analytics -v
```
Expected: PASS.

**Step 7: Commit**

```bash
cd D:\RMS_Siprahub
git add backend/app/analytics/router.py backend/tests/test_analytics_role_scoping.py
git commit -m "feat(analytics): server-side role scoping prevents recruiter_id spoofing"
```

---

### Task 5: Add GET /users/recruiters endpoint

**Files:**
- Modify: `backend/app/users/router.py` (or `auth/router.py` if `users` doesn't exist — check first)
- Test: `backend/tests/test_users_recruiters.py` (create)

**Step 1: Locate the right router**

```
cmd /c dir backend\app\users 2>nul
cmd /c dir backend\app\auth 2>nul
```

If `backend/app/users/router.py` exists, use it. Otherwise add the endpoint to `backend/app/auth/router.py` (admin-only guarded).

**Step 2: Write the failing test**

Create `backend/tests/test_users_recruiters.py`:

```python
"""GET /users/recruiters returns profiles with role IN ('recruiter', 'admin')."""
from fastapi.testclient import TestClient
from app.main import app
from app.auth.dependencies import get_current_user


def test_admin_sees_recruiter_list(monkeypatch):
    app.dependency_overrides[get_current_user] = lambda: {
        "id": "admin-id", "role": "admin", "email": "admin@example.com"
    }

    from app.users import router as users_router  # adjust import if using auth router
    monkeypatch.setattr(
        users_router,
        "_fetch_recruiters",
        lambda: [
            {"id": "r1", "full_name": "Alice Recruiter"},
            {"id": "r2", "full_name": "Bob Admin"},
        ],
    )

    client = TestClient(app)
    resp = client.get("/api/users/recruiters")
    app.dependency_overrides.clear()

    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert {r["full_name"] for r in data} == {"Alice Recruiter", "Bob Admin"}


def test_recruiter_cannot_list_recruiters():
    app.dependency_overrides[get_current_user] = lambda: {
        "id": "recr-id", "role": "recruiter", "email": "r@example.com"
    }
    client = TestClient(app)
    resp = client.get("/api/users/recruiters")
    app.dependency_overrides.clear()
    assert resp.status_code == 403
```

**Step 3: Run test to verify it fails**

```
cmd /c venv\Scripts\python.exe -m pytest tests/test_users_recruiters.py -v
```
Expected: FAIL (404 — endpoint missing).

**Step 4: Implement the endpoint**

In the chosen router file, add:

```python
from fastapi import APIRouter, Depends, HTTPException

# If using a new router, register it in main.py with prefix="/users"

def _fetch_recruiters() -> list[dict]:
    """Return profiles where role in ('recruiter','admin'), sorted by name."""
    from app.database.supabase import get_supabase_client
    sb = get_supabase_client()
    resp = (
        sb.table("profiles")
        .select("id,full_name,role")
        .in_("role", ["recruiter", "admin"])
        .order("full_name")
        .execute()
    )
    return [
        {"id": r["id"], "full_name": r.get("full_name") or "Unknown"}
        for r in (resp.data or [])
    ]


@router.get("/recruiters")
def list_recruiters(current_user: dict = Depends(get_current_user)):
    role = (current_user.get("role") or "").lower()
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return _fetch_recruiters()
```

**Step 5: If this is a new `users` router, mount it in `main.py`**

```python
from app.users.router import router as users_router
app.include_router(users_router, prefix=API_PREFIX + "/users", tags=["users"])
```

**Step 6: Run test to verify it passes**

```
cmd /c venv\Scripts\python.exe -m pytest tests/test_users_recruiters.py -v
```
Expected: PASS (both tests).

**Step 7: Commit**

```bash
git add backend/app/users/router.py backend/tests/test_users_recruiters.py backend/app/main.py
git commit -m "feat(users): GET /users/recruiters for admin analytics dropdown"
```

---

### Task 6: Replace UUID text input with name dropdown

**Files:**
- Modify: `frontend/src/components/analytics/AnalyticsFilterBar.tsx`
- Modify: `frontend/src/api/analytics.ts` (add `listRecruiters` method)
- Test: `frontend/src/components/analytics/__tests__/AnalyticsFilterBar.test.tsx` (create)

**Step 1: Add API method**

In `frontend/src/api/analytics.ts`, inside the `analyticsApi` object, add:

```typescript
listRecruiters: async (): Promise<Array<{ id: string; full_name: string }>> => {
  return api.get('/users/recruiters');
},
```

**Step 2: Write the failing test**

Create `frontend/src/components/analytics/__tests__/AnalyticsFilterBar.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AnalyticsProvider } from '../../../context/AnalyticsContext';
import { AnalyticsFilterBar } from '../AnalyticsFilterBar';

vi.mock('../../../api/analytics', () => ({
  analyticsApi: {
    listRecruiters: vi.fn().mockResolvedValue([
      { id: 'r1', full_name: 'Alice' },
      { id: 'r2', full_name: 'Bob' },
    ]),
  },
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin-id', role: 'admin' } }),
}));

describe('AnalyticsFilterBar', () => {
  it('renders recruiter dropdown with names for admin', async () => {
    render(
      <AnalyticsProvider>
        <AnalyticsFilterBar />
      </AnalyticsProvider>
    );
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /recruiter/i })).toBeInTheDocument();
    });
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText(/all recruiters/i)).toBeInTheDocument();
  });

  it('hides recruiter dropdown for recruiter role', async () => {
    vi.doMock('../../../context/AuthContext', () => ({
      useAuth: () => ({ user: { id: 'r1', role: 'recruiter' } }),
    }));
    render(
      <AnalyticsProvider>
        <AnalyticsFilterBar />
      </AnalyticsProvider>
    );
    expect(screen.queryByRole('combobox', { name: /recruiter/i })).toBeNull();
  });
});
```

**Step 3: Run test to verify it fails**

```
cd D:\RMS_Siprahub\frontend
cmd /c npx vitest run src/components/analytics/__tests__/AnalyticsFilterBar.test.tsx
```
Expected: FAIL (current bar uses `<input>` UUID text).

**Step 4: Refactor FilterBar**

Rewrite the recruiter control (currently the `<input>` at lines 34-43 of `AnalyticsFilterBar.tsx`):

```tsx
import { useEffect, useState } from 'react';
import { analyticsApi } from '../../api/analytics';
import { useAuth } from '../../context/AuthContext';

// inside component:
const { user } = useAuth();
const isAdmin = (user?.role || '').toLowerCase() === 'admin';
const [recruiters, setRecruiters] = useState<Array<{ id: string; full_name: string }>>([]);

useEffect(() => {
  if (!isAdmin) return;
  let cancelled = false;
  analyticsApi.listRecruiters()
    .then(list => { if (!cancelled) setRecruiters(list); })
    .catch(err => console.error('Failed to load recruiters:', err));
  return () => { cancelled = true; };
}, [isAdmin]);

// JSX: replace the UUID input with:
{isAdmin && (
  <label className="flex flex-col gap-1">
    <span className="input-label">Recruiter</span>
    <select
      className="input-field"
      aria-label="Recruiter"
      value={filters.recruiterId ?? ''}
      onChange={e => setFilters({ ...filters, recruiterId: e.target.value || undefined })}
    >
      <option value="">All Recruiters</option>
      {recruiters.map(r => (
        <option key={r.id} value={r.id}>{r.full_name}</option>
      ))}
    </select>
  </label>
)}
```

**Step 5: Run test to verify it passes**

```
cmd /c npx vitest run src/components/analytics/__tests__/AnalyticsFilterBar.test.tsx
```
Expected: PASS.

**Step 6: Type-check**

```
cmd /c npx tsc --noEmit
```
Expected: no new errors.

**Step 7: Commit**

```bash
git add frontend/src/components/analytics/AnalyticsFilterBar.tsx frontend/src/api/analytics.ts frontend/src/components/analytics/__tests__/AnalyticsFilterBar.test.tsx
git commit -m "feat(analytics): role-conditional recruiter dropdown in filter bar"
```

---

## Phase 3 — Four new analytics sections

Each of Tasks 7–10 follows the same pattern:
1. Add Pydantic schema to `backend/app/analytics/schemas.py`
2. Add service function to `backend/app/analytics/service.py` + unit test
3. Add endpoint to `backend/app/analytics/router.py` + integration test
4. Add API method to `frontend/src/api/analytics.ts`
5. Add React component inside `frontend/src/components/dashboard/DashboardAnalytics.tsx`
6. Commit

### Task 7: Requirement Tracker

**Files:**
- Modify: `backend/app/analytics/schemas.py`, `service.py`, `router.py`
- Modify: `frontend/src/api/analytics.ts`, `frontend/src/components/dashboard/DashboardAnalytics.tsx`
- Test: `backend/tests/test_requirement_tracker.py` (create)

**Step 1: Add schema**

In `schemas.py`:
```python
class RequirementTrackerStage(BaseModel):
    stage: str          # 'NEW' | 'SCREENING' | 'L1' | 'L2' | 'WITH_CLIENT' | 'CLOSING'
    label: str          # human-readable
    open_count: int


class RequirementTracker(BaseModel):
    stages: list[RequirementTrackerStage]
```

**Step 2: Write service test**

Create `backend/tests/test_requirement_tracker.py`:

```python
"""Requirement Tracker aggregates open resource_requests by furthest-reached candidate stage."""
from app.analytics.service import build_requirement_tracker


def test_empty_returns_six_zero_buckets():
    result = build_requirement_tracker(resource_requests=[], candidates=[])
    assert len(result.stages) == 6
    assert all(s.open_count == 0 for s in result.stages)


def test_request_with_no_candidates_counts_as_new():
    reqs = [{"id": "r1", "status": "OPEN"}]
    result = build_requirement_tracker(resource_requests=reqs, candidates=[])
    new_bucket = next(s for s in result.stages if s.stage == "NEW")
    assert new_bucket.open_count == 1


def test_request_uses_furthest_candidate_stage():
    reqs = [{"id": "r1", "status": "OPEN"}]
    cands = [
        {"resource_request_id": "r1", "status": "SCREENING"},
        {"resource_request_id": "r1", "status": "L2"},
    ]
    result = build_requirement_tracker(resource_requests=reqs, candidates=cands)
    l2 = next(s for s in result.stages if s.stage == "L2")
    assert l2.open_count == 1
    assert sum(s.open_count for s in result.stages) == 1  # counted once only
```

**Step 3: Run — verify failure**

```
cd D:\RMS_Siprahub\backend
cmd /c venv\Scripts\python.exe -m pytest tests/test_requirement_tracker.py -v
```
Expected: FAIL (function missing).

**Step 4: Implement service**

In `service.py`:
```python
_TRACKER_ORDER = ["NEW", "SCREENING", "L1", "L2", "WITH_CLIENT", "CLOSING"]
_TRACKER_LABELS = {
    "NEW": "New Requests",
    "SCREENING": "Screening",
    "L1": "L1 Interview",
    "L2": "L2 / Interview",
    "WITH_CLIENT": "With Client",
    "CLOSING": "Closing",
}
_STATUS_TO_TRACKER_STAGE = {
    "SCREENING": "SCREENING",
    "L1": "L1", "L1_INTERVIEW": "L1",
    "L2": "L2", "L2_INTERVIEW": "L2", "INTERVIEW": "L2",
    "WITH_CLIENT": "WITH_CLIENT", "CLIENT_INTERVIEW": "WITH_CLIENT",
    "SELECTED": "CLOSING", "OFFERED": "CLOSING",
}


def build_requirement_tracker(resource_requests: list[dict], candidates: list[dict]) -> RequirementTracker:
    open_reqs = [r for r in resource_requests if (r.get("status") or "").upper() in ("OPEN", "IN_PROGRESS")]
    by_req: dict[str, list[str]] = {}
    for c in candidates:
        rid = c.get("resource_request_id")
        if rid is not None:
            by_req.setdefault(str(rid), []).append((c.get("status") or "").upper())

    counts = {stage: 0 for stage in _TRACKER_ORDER}
    for req in open_reqs:
        statuses = by_req.get(str(req["id"]), [])
        if not statuses:
            counts["NEW"] += 1
            continue
        furthest_idx = 0
        for s in statuses:
            mapped = _STATUS_TO_TRACKER_STAGE.get(s)
            if mapped and _TRACKER_ORDER.index(mapped) > furthest_idx:
                furthest_idx = _TRACKER_ORDER.index(mapped)
        counts[_TRACKER_ORDER[furthest_idx]] += 1

    return RequirementTracker(stages=[
        RequirementTrackerStage(stage=s, label=_TRACKER_LABELS[s], open_count=counts[s])
        for s in _TRACKER_ORDER
    ])
```

**Step 5: Add endpoint to `router.py`**

```python
@router.get("/pipeline/requirement-tracker", response_model=RequirementTracker)
def get_requirement_tracker(
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
    recruiter_id: str | None = Query(default=None),
    current_user: dict = Depends(get_current_user),
):
    recruiter_id = _scope_recruiter_id(recruiter_id, current_user)
    reqs = _fetch_resource_requests(start_date, end_date)
    cands = _fetch_candidates(recruiter_id, start_date, end_date)
    return build_requirement_tracker(reqs, cands)
```

(Add `_fetch_resource_requests` helper alongside `_fetch_candidates` — straightforward `sb.table("resource_requests").select(...)` with date filter on `created_at`.)

**Step 6: Run — verify passes**

```
cmd /c venv\Scripts\python.exe -m pytest tests/test_requirement_tracker.py -v
```
Expected: PASS.

**Step 7: Add API method + React component**

In `frontend/src/api/analytics.ts`:
```typescript
getRequirementTracker: async (params: Record<string, string> = {}) => {
  return api.get<{ stages: Array<{ stage: string; label: string; open_count: number }> }>(
    '/analytics/pipeline/requirement-tracker',
    { params }
  );
},
```

In `DashboardAnalytics.tsx` (above the existing `<SkillDistribution>` row), add:

```tsx
function RequirementTracker() {
  const { queryParams } = useAnalyticsFilters();
  const [data, setData] = useState<Array<{ stage: string; label: string; open_count: number }>>([]);
  useEffect(() => {
    analyticsApi.getRequirementTracker(queryParams)
      .then(r => setData(r.stages))
      .catch(err => console.error('Requirement tracker load failed:', err));
  }, [queryParams]);
  if (!data.length) return null;
  return (
    <div className="card p-4">
      <h3 className="text-sm font-bold mb-3 text-text">Requirement Tracker</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {data.map(s => (
          <div key={s.stage} className="p-3 rounded-lg bg-surface-hover border border-border">
            <div className="text-xs text-text-muted">{s.label}</div>
            <div className="text-2xl font-bold text-text">{s.open_count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Render <RequirementTracker /> as the first row after the filter bar.
```

**Step 8: Commit**

```bash
git add backend/app/analytics backend/tests/test_requirement_tracker.py frontend/src/api/analytics.ts frontend/src/components/dashboard/DashboardAnalytics.tsx
git commit -m "feat(analytics): requirement tracker (6 stage cards)"
```

---

### Task 8: Hiring Type (New vs Backfill) + rename Hiring Source → Source Channel

**Files:**
- Modify: `backend/app/analytics/schemas.py`, `service.py`, `router.py`
- Modify: `frontend/src/api/analytics.ts`, `frontend/src/components/dashboard/DashboardAnalytics.tsx`
- Test: `backend/tests/test_hiring_type_split.py` (create)

**Step 1: Write failing test**

```python
# backend/tests/test_hiring_type_split.py
from app.analytics.service import build_hiring_type_split


def test_counts_new_and_backfill():
    reqs = [
        {"is_backfill": False}, {"is_backfill": False},
        {"is_backfill": True},
    ]
    result = build_hiring_type_split(reqs)
    by_label = {r.label: r.value for r in result}
    assert by_label == {"New": 2, "Backfill": 1}


def test_null_is_backfill_treated_as_new():
    reqs = [{"is_backfill": None}]
    result = build_hiring_type_split(reqs)
    assert {r.label: r.value for r in result} == {"New": 1, "Backfill": 0}
```

**Step 2: Run — verify failure**

```
cmd /c venv\Scripts\python.exe -m pytest tests/test_hiring_type_split.py -v
```
Expected: FAIL.

**Step 3: Implement service**

```python
# service.py
def build_hiring_type_split(resource_requests: list[dict]) -> list[LabelValue]:
    new_count = sum(1 for r in resource_requests if not r.get("is_backfill"))
    backfill_count = sum(1 for r in resource_requests if r.get("is_backfill"))
    return [LabelValue(label="New", value=new_count), LabelValue(label="Backfill", value=backfill_count)]
```

**Step 4: Add endpoint**

```python
@router.get("/ta/hiring-type-split", response_model=list[LabelValue])
def get_hiring_type_split(
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
    current_user: dict = Depends(get_current_user),
):
    reqs = _fetch_resource_requests(start_date, end_date)
    return build_hiring_type_split(reqs)
```

**Step 5: Run — verify passes**

```
cmd /c venv\Scripts\python.exe -m pytest tests/test_hiring_type_split.py -v
```
Expected: PASS.

**Step 6: Frontend — new chart + rename existing**

- Add `getHiringTypeSplit` to `api/analytics.ts`
- Add `<HiringTypeSplit>` pie chart component to `DashboardAnalytics.tsx`, placed on Row 3 left
- Rename the existing "Hiring Source" card heading in `DashboardAnalytics.tsx` to "Source Channel"

**Step 7: Commit**

```bash
git add backend/app frontend/src backend/tests/test_hiring_type_split.py
git commit -m "feat(analytics): hiring type (new vs backfill) + rename hiring source to source channel"
```

---

### Task 9: Payroll Segregation

**Files:**
- Modify: `backend/app/analytics/schemas.py`, `service.py`, `router.py`
- Modify: `frontend/src/api/analytics.ts`, `frontend/src/components/dashboard/DashboardAnalytics.tsx`
- Test: `backend/tests/test_payroll_segregation.py` (create)

**Step 1: Write failing test**

```python
from app.analytics.service import build_payroll_segregation


def test_groups_employees_by_source():
    emps = [
        {"source": "internal"}, {"source": "internal"},
        {"source": "vendor"},
        {"source": "contractor"},
        {"source": None},  # should land in 'Unknown' or be skipped — clarify
    ]
    result = build_payroll_segregation(emps)
    by = {r.label: r.value for r in result}
    assert by.get("Internal") == 2
    assert by.get("Vendor") == 1
    assert by.get("Contractor") == 1
```

**Step 2: Implement**

```python
def build_payroll_segregation(employees: list[dict]) -> list[LabelValue]:
    buckets: dict[str, int] = {}
    for e in employees:
        raw = (e.get("source") or "").strip().lower()
        if not raw:
            continue
        label = raw.capitalize()
        buckets[label] = buckets.get(label, 0) + 1
    return [LabelValue(label=k, value=v) for k, v in sorted(buckets.items())]
```

**Step 3: Endpoint**

```python
@router.get("/resources/payroll", response_model=list[LabelValue])
def get_payroll_segregation(current_user: dict = Depends(get_current_user)):
    emps = _fetch_employees()  # add this helper
    return build_payroll_segregation(emps)
```

**Step 4: Verify passes**

```
cmd /c venv\Scripts\python.exe -m pytest tests/test_payroll_segregation.py -v
```

**Step 5: Frontend — doughnut chart in Row 3 right**

**Step 6: Commit**

```bash
git commit -m "feat(analytics): payroll segregation (internal/vendor/contractor)"
```

---

### Task 10: Daily Status Matrix

**Files:**
- Modify: `backend/app/analytics/schemas.py`, `service.py`, `router.py`
- Modify: `frontend/src/api/analytics.ts`, `frontend/src/components/dashboard/DashboardAnalytics.tsx`
- Test: `backend/tests/test_daily_status_matrix.py` (create)

**Step 1: Schema**

```python
class DailyStatusMatrixRow(BaseModel):
    job_profile_id: int
    job_profile_name: str
    client_name: str
    total_requirements: int
    by_stage: dict[str, int]


class DailyStatusMatrix(BaseModel):
    rows: list[DailyStatusMatrixRow]
```

**Step 2: Failing test**

```python
from app.analytics.service import build_daily_status_matrix


def test_aggregates_by_job_profile():
    reqs = [
        {"id": 1, "job_profile_id": 10, "job_profile_name": "Java Dev",
         "client_name": "Acme", "status": "OPEN"},
        {"id": 2, "job_profile_id": 10, "job_profile_name": "Java Dev",
         "client_name": "Acme", "status": "OPEN"},
    ]
    cands = [
        {"resource_request_id": 1, "status": "SCREENING"},
        {"resource_request_id": 2, "status": "L1"},
    ]
    result = build_daily_status_matrix(reqs, cands)
    assert len(result.rows) == 1
    row = result.rows[0]
    assert row.job_profile_name == "Java Dev"
    assert row.total_requirements == 2
    assert row.by_stage["OPEN"] == 2
    assert row.by_stage["SCREENING"] == 1
    assert row.by_stage["L1"] == 1
```

**Step 3: Implement + endpoint** (similar pattern to Requirement Tracker).

**Step 4: Frontend — table with sticky header**

Full-width table in `DashboardAnalytics.tsx` Row 6: columns `[Job Profile | Client | Open | Screening | L1 | L2 | Selected | Total]`. Use `position: sticky; top: 0` on the `<thead>` so it pins under the filter bar.

**Step 5: Verify + commit**

```bash
git commit -m "feat(analytics): daily status matrix (job profiles × stages)"
```

---

## Phase 4 — Polish & verify

### Task 11: Sticky filter bar + visual polish

**Files:**
- Modify: `frontend/src/components/analytics/AnalyticsFilterBar.tsx` or the wrapper in `DashboardAnalytics.tsx`

**Step 1:** Wrap the filter bar in a container with:
```tsx
<div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border py-3">
  <AnalyticsFilterBar />
</div>
```

**Step 2:** Verify scrolling keeps filter visible while all 7 rows scroll underneath.

**Step 3: Commit**

```bash
git commit -m "style(analytics): sticky filter bar on analytics tab"
```

---

### Task 12: Full verification

**Step 1: Backend — full test suite**

```
cd D:\RMS_Siprahub\backend
cmd /c venv\Scripts\python.exe -m pytest -v
```
Expected: all tests PASS, no regressions.

**Step 2: Frontend — type-check**

```
cd D:\RMS_Siprahub\frontend
cmd /c npx tsc --noEmit
```
Expected: no errors.

**Step 3: Frontend — unit tests**

```
cmd /c npx vitest run
```
Expected: all tests PASS.

**Step 4: Manual walkthrough (both dev servers running)**

Backend:
```
cd D:\RMS_Siprahub\backend
cmd /c venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```
Frontend:
```
cd D:\RMS_Siprahub\frontend
cmd /c npm run dev
```

Manual checks:
- [ ] Log in as Admin → go to `/` → see Overview tab by default
- [ ] Click Analytics tab → see filter bar + 7 rows (Requirement Tracker, Skill Dist / Employment Type, Hiring Type / Payroll, Source Channel / Client Demand, Pipeline Funnel, Daily Status Matrix, Smart Export)
- [ ] Change recruiter dropdown → data refreshes for that recruiter only
- [ ] Refresh page → lands back on Analytics tab (localStorage persistence)
- [ ] Log out, log in as Recruiter → go to `/` → Analytics tab → filter bar has NO recruiter dropdown
- [ ] Try to hit `/api/analytics/resources-skills?recruiter_id=<other-uuid>` as recruiter — verify response is scoped to the logged-in recruiter, not the URL value
- [ ] Sidebar is unchanged — no new items
- [ ] No other page was modified — spot-check Candidates, SOWs, Resource Requests

**Step 5: Final commit (if any polish needed)**

```bash
git status
# If clean, no commit needed.
# Otherwise: git commit -m "chore(analytics): final polish"
```

**Step 6: DO NOT PUSH**

Per user instruction, the user will push `dashboard` branch manually.

---

## Remember

- **Dashboard.tsx is the only file in `pages/` we touch.** All new UI work happens in `components/dashboard/DashboardAnalytics.tsx` and `components/analytics/`.
- **Commit often** (after each task). Small, atomic commits.
- **TDD discipline:** write the failing test first, verify it fails, implement, verify it passes, commit.
- **DRY:** reuse `_fetch_candidates`, `_date_filters`, `LabelValue`, existing chart components (`PieChartWidget`, `DoughnutChart`, `FunnelChart`).
- **YAGNI:** no Zustand, no TanStack Table, no jQuery pivottable. The existing Context API + custom pivot are sufficient.
- **No push.** Branch `dashboard` only. User handles remotes.
