# RMS Production Readiness — Master Checklist

**Generated:** 2026-03-24
**Branch:** debug
**Goal:** Zero-bug, production-grade system with full traceability, type safety, RBAC, CI/CD, observability.

---

## TIER 0: CRITICAL SECURITY (Must-fix before production)

| # | Item | File(s) | Details |
|---|------|---------|---------|
| **S-01** | **Add `require_admin` to Resource Request write endpoints** | `backend/app/resource_requests/router.py` | POST, PUT, PATCH /status all use `get_current_user` — any authenticated user can create/modify RRs |
| **S-02** | **Enforce route-level RBAC in frontend** | `frontend/src/App.tsx`, `ProtectedRoute.tsx` | `allowedRoles` prop exists on `ProtectedRoute` but is **never passed** — admin pages (Job Profiles, SOWs, Billing) accessible to all roles at URL level |
| **S-03** | **Move tokens from localStorage to httpOnly cookies** | `frontend/src/api/client.ts`, `context/AuthContext.tsx` | `localStorage.getItem('rms_access_token')` is XSS-vulnerable; tokens, user profile, and expiry all stored in localStorage |
| **S-04** | **Stop exposing DB errors to clients** | `backend/app/candidates/router.py:190`, `job_profiles/router.py:53`, `sows/router.py:50` | `f"Database update failed: {error_str}"` leaks internal schema/error details. Return generic message, log internally |
| **S-05** | **Add EmailStr validation** | `backend/app/candidates/schemas.py` | `email: str` allows any string — use `pydantic.EmailStr` for format validation |
| **S-06** | **Add string length constraints to all Pydantic schemas** | All `schemas.py` files | No `min_length`/`max_length` on any field — `role_name`, `sow_number`, `remarks`, `skills` all accept unlimited text |
| **S-07** | **Strip console.error of sensitive data in production** | `frontend/src/pages/Sows.tsx`, `CommunicationLogs.tsx`, etc. | Stack traces and API errors logged to browser console in production |

---

## TIER 1: DATA INTEGRITY & VALIDATION

| # | Item | File(s) | Details |
|---|------|---------|---------|
| **D-01** | **Add pagination to all list endpoints** | All backend `router.py` files | `candidates`, `resource_requests`, `employees`, `sows` all do unbounded `SELECT *` with no `.limit()` or `.offset()` — will degrade as data grows |
| **D-02** | **Add DB-level unique constraints** | Supabase migrations | `sow_number`, `candidate email per request`, `vendor name` are checked in Python but not enforced at DB level — race conditions possible |
| **D-03** | **Wrap SOW cascade in transaction** | `backend/app/sows/router.py:83-109` | SOW deactivation loops through RRs one-by-one — if loop fails mid-execution, partial RRs closed. Should be atomic |
| **D-04** | **Add phone validation to Vendor/Client schemas** | `backend/app/vendors/schemas.py`, `clients/schemas.py` | Phone/email fields on Vendor and Client have zero format validation, unlike Candidates which has 10-digit enforcement |
| **D-05** | **Dashboard N+1 query** | `backend/app/dashboard/router.py:149` | `next((e for e in all_employees if e["id"] == br["employee_id"]), None)` inside loop — O(n×m). Build a dict lookup instead |
| **D-06** | **Validate `import_month` format at schema level** | `backend/app/timesheets/schemas.py` | `import_month: str` has no regex — currently validated only in the endpoint, not at schema level |
| **D-07** | **Add foreign key cascade rules in DB** | Supabase migrations | Deleting a Job Profile with closed RRs leaves candidates with dangling `job_profile_id` — no ON DELETE SET NULL |

---

## TIER 2: TYPE SAFETY & CODE QUALITY

| # | Item | File(s) | Details |
|---|------|---------|---------|
| **T-01** | **Eliminate `catch (error: any)` patterns** | `Login.tsx:70`, `JobProfiles.tsx:66`, `JobProfileModal.tsx:85`, `LogModal.tsx:37` | 4 files use `any` error type — should use `unknown` with `instanceof Error` narrowing (already done in `SowModal.tsx`) |
| **T-02** | **Replace silent catch blocks** | `SowModal.tsx:40`, `ResourceRequests.tsx:307` | `.catch(() => {})` and `// handled` comments swallow errors silently — at minimum log to console or show toast |
| **T-03** | **Add React Error Boundary** | New component needed | No error boundary exists — a single component crash kills the entire app. Wrap `DashboardLayout` children |
| **T-04** | **Standardize async patterns** | `SowModal.tsx` | Same file uses both `.then().catch()` (line 34) and `async/await` (line 72) — pick one pattern |
| **T-05** | **Unsafe DOM type assertions** | `Login.tsx:318-323`, `Sidebar.tsx:142-256` | `(e.currentTarget as HTMLElement).style.borderColor = ...` — 8+ instances without null checks |
| **T-06** | **Backend: narrow exception catches** | `auth/dependencies.py:35` | `except Exception:` is too broad — catch `jwt.PyJWTError` or specific Supabase exceptions |
| **T-07** | **Backend: add `@field_validator` for phone/email on all schemas** | `vendors/schemas.py`, `clients/schemas.py`, `employees/schemas.py` | Candidates have 10-digit phone validation, but same fields on other entities have none |

---

## TIER 3: HARDCODED VALUES & DESIGN TOKENS

| # | Item | File(s) | Details |
|---|------|---------|---------|
| **H-01** | **Login page: 30+ hardcoded hex/rgba colors** | `Login.tsx:84-378` | `#0B1120`, `#16A34A`, `rgba(22,163,74,0.08)`, gradient strings — all should use CSS variables |
| **H-02** | **Sidebar: 10+ hardcoded colors** | `Sidebar.tsx:50-253` | Role color map with `#EF4444`, `#22C55E`, etc.; gradient strings; `#F87171` |
| **H-03** | **Candidates kanban: hardcoded border colors** | `Candidates.tsx:89-100` | `border-[#3B82F6]`, `border-[#60A5FA]`, etc. — Tailwind arbitrary values instead of design tokens |
| **H-04** | **Dashboard: hardcoded chart colors** | `Dashboard.tsx:111-137` | `STATUS_COLORS`, `VENDOR_BAR_COLORS`, `FUNNEL_COLORS` — 30+ hex values. Move to a shared theme config |
| **H-05** | **Header: hardcoded rgba for blur** | `Header.tsx:30` | `rgba(15, 23, 42, 0.8)` and `rgba(255, 255, 255, 0.8)` |

---

## TIER 4: ACCESSIBILITY (A11Y)

| # | Item | File(s) | Details |
|---|------|---------|---------|
| **A-01** | **Modal focus trap missing** | `frontend/src/components/ui/Modal.tsx` | Escape key works but Tab key can focus elements outside modal — need `focus-trap-react` or manual implementation |
| **A-02** | **StatusDropdown keyboard inaccessible** | `ResourceRequests.tsx:42-76` | Opens on click, closes on `mouseLeave` — keyboard-only users cannot interact. Needs `onKeyDown` handler + arrow navigation |
| **A-03** | **Kanban columns missing ARIA** | `Candidates.tsx` | No `role="region"`, no `aria-label` on kanban columns; drag-drop has no keyboard alternative |
| **A-04** | **Icon-only buttons missing accessible names** | `Sidebar.tsx:217-269`, `Header.tsx:50` | Collapse/logout/notification buttons have only icons, no `aria-label` (some use `title`, which is not sufficient) |
| **A-05** | **Missing form field associations** | Multiple pages | Some inputs lack `id` or `htmlFor` on labels |

---

## TIER 5: TESTING & CI/CD

| # | Item | File(s) | Status |
|---|------|---------|--------|
| **CI-01** | **Backend unit tests** | `backend/tests/` | Only 2 test files exist (health check + request ID utility). 0 tests for: auth, pipeline transitions, billing engine, file uploads, duplicate detection, cascade logic |
| **CI-02** | **Frontend unit tests** | None | No Jest/Vitest config. No component tests at all. Playwright E2E exists but covers only happy paths |
| **CI-03** | **GitHub Actions workflow** | `.github/workflows/` | Completely missing — no automated lint/test/build on PR |
| **CI-04** | **Backend linting** | None | No Ruff, Black, or flake8 configuration — no code formatting enforcement |
| **CI-05** | **Pre-commit hooks** | None | No `.pre-commit-config.yaml` — developers can push unlinted code |
| **CI-06** | **Coverage reporting** | None | No `--cov` in pytest config, no Istanbul/c8 for frontend |
| **CI-07** | **Playwright E2E tests need update** | `frontend/tests/e2e/` | 5 spec files exist but likely outdated after pipeline/UI changes |

---

## TIER 6: INFRASTRUCTURE & DEPLOYMENT

| # | Item | File(s) | Status |
|---|------|---------|--------|
| **I-01** | **Backend Dockerfile missing** | None | Frontend has multi-stage Dockerfile; backend relies entirely on Railway auto-detection via `requirements.txt` |
| **I-02** | **docker-compose.yml for local dev** | None | No way to spin up full stack locally with one command. Frontend, backend, and Supabase all run separately |
| **I-03** | **No migration versioning system** | `backend/migrations/` | 4 manual SQL files, no Alembic or tracking table. No way to know which migrations have been applied |
| **I-04** | **No `.env.example` for frontend** | `frontend/` | Backend has `.env.example`; frontend has none — new devs won't know `VITE_API_URL` is required |
| **I-05** | **No `.editorconfig`** | Root | Tabs vs spaces, line endings not standardized across contributors |
| **I-06** | **No Prettier config** | `frontend/` | ESLint exists but no formatting config — code style inconsistency |

---

## TIER 7: OBSERVABILITY & TELEMETRY

| # | Item | File(s) | Details |
|---|------|---------|---------|
| **O-01** | **No request correlation IDs** | `backend/app/main.py` | Request timing middleware exists but no UUID tracing — cannot trace a request across logs |
| **O-02** | **No structured JSON logging** | `backend/app/main.py:33-40` | Uses `basicConfig` with format string — should emit structured JSON for log aggregation (ELK/CloudWatch) |
| **O-03** | **No audit trail for sensitive operations** | All routers | Candidate status changes, employee exits, billing calculations, and admin actions are not logged with who-did-what |
| **O-04** | **No `/ready` endpoint** | `backend/app/main.py` | `/health` exists but doesn't verify Supabase connectivity. Need a readiness probe that checks DB connection |
| **O-05** | **No graceful shutdown hooks** | `backend/app/main.py` | No `@app.on_event("shutdown")` to drain connections or flush logs |
| **O-06** | **Error file grows unbounded** | `backend/critical_error.txt` | Global exception handler appends to this file forever — no rotation |

---

## TIER 8: REMAINING FUNCTIONAL GAPS

| # | Item | Source | Details |
|---|------|--------|---------|
| **F-01** | **Dashboard date range filter** | PRD §3.2 | Dashboard shows all-time data; no date picker to filter metrics to a specific period |
| **F-02** | **Timesheet compliance dashboard** | Meeting transcript (URGENT) | Dedicated view: resources with missing/below-expected hours, filter for unfilled records |
| **F-03** | **AWS report import** | Meeting transcript (Phase 2/3) | Excel ingestion for AWS workspace hours → cross-reference with employees by email |
| **F-04** | **L1/L2 feedback file upload** | Meeting transcript | Upload widgets in evaluation modals for interview feedback documents |
| **F-05** | **Job Profile `job_description` DB column** | QA | May not exist in Supabase schema — create if frontend sends errors on profile creation |
| **F-06** | **SOW date field crash** | QA | Validation added but original crash scenario not manually reproduced/confirmed fixed |

---

## Priority Execution Order

| Phase | Items | Effort | Impact |
|-------|-------|--------|--------|
| **P0 — Ship Blocker** | S-01, S-02, S-04, D-01, T-01, T-03 | 1-2 days | Prevents security holes and production crashes |
| **P1 — Production Hardening** | S-03, S-05, S-06, D-02, D-03, D-05, T-02, O-01, O-02, O-04 | 2-3 days | Data integrity + observability |
| **P2 — Quality Bar** | T-04 through T-07, H-01 through H-05, A-01 through A-05, I-04 through I-06 | 3-4 days | Code quality + accessibility |
| **P3 — Testing Foundation** | CI-01 through CI-07 | 3-5 days | 90% coverage target |
| **P4 — Infrastructure** | I-01, I-02, I-03, O-03, O-05, O-06 | 2-3 days | Docker, migrations, audit logs |
| **P5 — Feature Completion** | F-01 through F-06 | 4-6 days | Remaining product features |

**Total estimated effort: ~15-23 dev days for full production readiness.**
