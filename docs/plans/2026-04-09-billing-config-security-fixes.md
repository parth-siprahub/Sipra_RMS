# Billing Config Security Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 2 HIGH security gaps (unauthenticated read/delete on billing config API) + 3 MEDIUM quality issues found in code review.

**Architecture:** Backend auth is enforced via FastAPI `Depends(get_current_user)` — add it to the two unprotected endpoints and apply email-allowlist check. On the frontend, deduplicate the email allowlist into a single shared constant file imported by App.tsx, Sidebar.tsx, and BillingConfig.tsx.

**Tech Stack:** FastAPI + Pydantic (backend), React + TypeScript (frontend), Supabase JWT auth.

---

## Issues Being Fixed

| # | Severity | Location | Issue |
|---|---|---|---|
| 1 | 🟠 HIGH | `backend/app/billing_config/router.py:15-28` | `GET /` has no auth — unauthenticated callers can read all billing configs |
| 2 | 🟠 HIGH | `backend/app/billing_config/router.py:87-95` | `DELETE /{id}` has no auth — any caller can delete records |
| 3 | 🟡 MED | `App.tsx`, `Sidebar.tsx`, `BillingConfig.tsx` | Email allowlist duplicated 3x — single source of truth needed |
| 4 | 🟡 MED | `backend/app/billing_config/schemas.py` | `client_name` has no `max_length` — unbounded string accepted |
| 5 | 🟡 MED | `backend/app/billing_config/router.py:71` | `"now()"` literal string used as timestamp — fragile |

---

### Task 1: Create shared frontend access-control constant

**Files:**
- Create: `frontend/src/lib/accessControl.ts`
- Modify: `frontend/src/App.tsx` (remove local `BILLING_CONFIG_EMAILS`, import from lib)
- Modify: `frontend/src/components/Sidebar.tsx` (same)
- Modify: `frontend/src/pages/BillingConfig.tsx` (same)

**Step 1: Create the shared constant file**

```typescript
// frontend/src/lib/accessControl.ts

/**
 * Emails authorised to view and edit the Billing Config page.
 * Keep in sync with backend BILLING_AUTH_EMAILS in
 * backend/app/billing_config/router.py
 */
export const BILLING_CONFIG_EMAILS = new Set([
    'jaicind@siprahub.com',
    'sreenath.reddy@siprahub.com',
    'rajapv@siprahub.com',
]);
```

**Step 2: Update App.tsx — remove local set, import from lib**

Remove lines:
```typescript
const BILLING_CONFIG_EMAILS = new Set([
  'jaicind@siprahub.com',
  'sreenath.reddy@siprahub.com',
  'rajapv@siprahub.com',
]);
```

Add import:
```typescript
import { BILLING_CONFIG_EMAILS } from './lib/accessControl';
```

`BillingConfigGuard` body stays identical — it already uses `BILLING_CONFIG_EMAILS`.

**Step 3: Update Sidebar.tsx — remove local set, import from lib**

Remove lines:
```typescript
const BILLING_CONFIG_EMAILS = new Set([
    'jaicind@siprahub.com',
    'sreenath.reddy@siprahub.com',
    'rajapv@siprahub.com',
]);
```

Add import at top:
```typescript
import { BILLING_CONFIG_EMAILS } from '../lib/accessControl';
```

Filter logic stays identical.

**Step 4: Update BillingConfig.tsx — remove local set, import from lib**

Remove lines:
```typescript
const BILLING_EMAILS = new Set([
    'jaicind@siprahub.com',
    'sreenath.reddy@siprahub.com',
    'rajapv@siprahub.com',
]);
```

Add import:
```typescript
import { BILLING_CONFIG_EMAILS } from '../lib/accessControl';
```

Update reference on line 215:
```typescript
// Before
const canAccess = user?.email ? BILLING_EMAILS.has(user.email.toLowerCase()) : false;
// After
const canAccess = user?.email ? BILLING_CONFIG_EMAILS.has(user.email.toLowerCase()) : false;
```

**Step 5: Build to verify no TypeScript errors**

```bash
cd frontend && npm run build
```
Expected: `✓ built in XX.XXs` — zero errors.

**Step 6: Commit**

```bash
git add frontend/src/lib/accessControl.ts frontend/src/App.tsx frontend/src/components/Sidebar.tsx frontend/src/pages/BillingConfig.tsx
git commit -m "refactor: extract billing config email allowlist to shared accessControl.ts"
```

---

### Task 2: Fix HIGH — add auth to GET /billing-config/ endpoint

**Files:**
- Modify: `backend/app/billing_config/router.py:15-28`

**Step 1: Add `current_user` dependency + email guard to the list endpoint**

Current code (lines 15–28):
```python
@router.get("/", response_model=list[BillingConfigResponse])
async def list_billing_configs(
    month: str | None = Query(None, description="Filter by YYYY-MM"),
    client_name: str | None = Query(None),
):
```

Replace with:
```python
@router.get("/", response_model=list[BillingConfigResponse])
async def list_billing_configs(
    month: str | None = Query(None, description="Filter by YYYY-MM"),
    client_name: str | None = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """List billing configurations — restricted to authorised emails."""
    user_email = current_user.get("email", "").lower()
    if user_email not in BILLING_AUTH_EMAILS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view billing configurations.",
        )
```

**Step 2: Add auth to GET /{config_id} endpoint (lines 31–38)**

Current:
```python
@router.get("/{config_id}", response_model=BillingConfigResponse)
async def get_billing_config(config_id: int):
```

Replace with:
```python
@router.get("/{config_id}", response_model=BillingConfigResponse)
async def get_billing_config(
    config_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Get a single billing config — restricted to authorised emails."""
    user_email = current_user.get("email", "").lower()
    if user_email not in BILLING_AUTH_EMAILS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view billing configurations.",
        )
```

**Step 3: Commit**

```bash
git add backend/app/billing_config/router.py
git commit -m "fix(security): add auth guard to GET /billing-config/ and GET /billing-config/{id}"
```

---

### Task 3: Fix HIGH — add auth to DELETE /billing-config/{id} endpoint

**Files:**
- Modify: `backend/app/billing_config/router.py:87-95`

**Step 1: Add `current_user` dependency + email guard to delete endpoint**

Current (lines 87–95):
```python
@router.delete("/{config_id}", status_code=204)
async def delete_billing_config(config_id: int):
    """Delete a billing config."""
```

Replace with:
```python
@router.delete("/{config_id}", status_code=204)
async def delete_billing_config(
    config_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Delete a billing config — restricted to authorised emails."""
    user_email = current_user.get("email", "").lower()
    if user_email not in BILLING_AUTH_EMAILS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to delete billing configurations.",
        )
```

**Step 2: Verify imports at top of router.py include `status` and `Depends`**

Line 3 should already read:
```python
from fastapi import APIRouter, HTTPException, Query, Depends, status
```
No change needed — these were already imported for the POST endpoint.

**Step 3: Commit**

```bash
git add backend/app/billing_config/router.py
git commit -m "fix(security): add auth guard to DELETE /billing-config/{id}"
```

---

### Task 4: Fix MEDIUM — add max_length to client_name in Pydantic schema + frontend input

**Files:**
- Modify: `backend/app/billing_config/schemas.py`
- Modify: `frontend/src/pages/BillingConfig.tsx` (two inputs: Add modal + inline edit)

**Step 1: Add max_length to Pydantic schema**

In `backend/app/billing_config/schemas.py`, change:
```python
client_name: str = "DCLI"
```
To:
```python
from pydantic import BaseModel, Field, field_validator
...
client_name: str = Field(default="DCLI", max_length=100)
```

**Step 2: Add maxLength to Add Config modal input (BillingConfig.tsx line ~112)**

```tsx
<input
    id="bc-client"
    className="input-field"
    placeholder="e.g. DCLI"
    required
    maxLength={100}                    // ← add
    value={form.client_name}
    onChange={(e) => setForm(f => ({ ...f, client_name: e.target.value }))}
/>
```

**Step 3: Add maxLength to inline edit input (BillingConfig.tsx line ~390)**

```tsx
<input
    className="input-field py-1 text-sm w-32"
    value={editRow.client_name}
    maxLength={100}                    // ← add
    onChange={(e) => setEditRow(r => ({ ...r, client_name: e.target.value }))}
/>
```

**Step 4: Build**

```bash
cd frontend && npm run build
```
Expected: `✓ built in XX.XXs`

**Step 5: Commit**

```bash
git add backend/app/billing_config/schemas.py frontend/src/pages/BillingConfig.tsx
git commit -m "fix: add max_length=100 constraint to client_name in schema and inputs"
```

---

### Task 5: Fix MEDIUM — replace "now()" string with proper UTC timestamp

**Files:**
- Modify: `backend/app/billing_config/router.py:71`

**Step 1: Add datetime import at top of router.py**

Add after the existing imports:
```python
from datetime import datetime, timezone
```

**Step 2: Replace the "now()" literal (line 71)**

Current:
```python
data["updated_at"] = "now()"
```

Replace with:
```python
data["updated_at"] = datetime.now(timezone.utc).isoformat()
```

**Step 3: Commit**

```bash
git add backend/app/billing_config/router.py
git commit -m "fix: replace \"now()\" string with proper UTC datetime in billing config update"
```

---

### Task 6: Push everything and deploy

**Step 1: Push to official repo**

```bash
git push official master
```

**Step 2: Deploy on VM**

```bash
# SSH into VM, then:
cd ~/RMS
git pull origin master
cd frontend && npm run build && cd ..
pm2 restart rms-backend
pm2 status
```

**Step 3: Smoke test the endpoints manually**

Without a token — should get 401/403, not data:
```bash
curl -s https://rms.siprahub.com/api/billing-config/ | head -c 200
```
Expected: `{"detail":"Not authenticated"}` or `403 Forbidden`

With a non-authorised token — should get 403:
```bash
curl -s -H "Authorization: Bearer <non-billing-user-token>" https://rms.siprahub.com/api/billing-config/
```
Expected: `{"detail":"You are not authorized to view billing configurations."}`

---

## Checklist

- [ ] Task 1 — Shared `accessControl.ts` constant, 3 imports updated
- [ ] Task 2 — GET endpoints auth-gated
- [ ] Task 3 — DELETE endpoint auth-gated
- [ ] Task 4 — `max_length=100` on schema + both inputs
- [ ] Task 5 — `"now()"` → `datetime.now(timezone.utc).isoformat()`
- [ ] Task 6 — Pushed + deployed + smoke tested
