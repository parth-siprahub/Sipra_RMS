# TodoWrite: CRM Phase 1 Backend

## Task 1: Project Scaffold & Environment
**Context:** Scaffold FastAPI project with `pip + venv`, `uvicorn`, `pydantic-settings`, and Supabase client.
**Steps:**
1. Create venv and install dependencies (fastapi, uvicorn, pydantic, supabase, etc).
2. Create `.env.example`, `config.py`, `database.py`, `main.py`.
3. Implement `get_supabase` (anon) and `get_supabase_admin` (service role) clients.
4. Add basic health check endpoint and test.
5. Verify with `pytest`.

## Task 2: Database Indexes Migration
**Context:** Apply performance indexes for RLS and FKs.
**Steps:**
1. Create migration SQL for all FK indexes (candidates, requests, logs).
2. Apply via `supabase-mcp`.
3. Verify via `list_tables`.

## Task 3: Auth Endpoints (Login, Me)
**Context:** JWT auth via Supabase.
**Steps:**
1. Create `auth/schemas.py`, `auth/router.py`, `auth/dependencies.py`.
2. Implement `login` (returns JWT) and `me` (validates JWT).
3. Register router in `main.py`.
4. Test with `pytest` (mocking Supabase or identifying integration strategy).

## Task 4: Job Profiles CRUD
**Context:** Simple CRUD for job profiles.
**Steps:**
1. Create `job_profiles/` module.
2. Implement CRUD endpoints.
3. Test.

## Task 5: Resource Requests Workflow
**Context:** Core request logic with ID generation.
**Steps:**
1. Create `resource_requests/` module.
2. Implement ID generator service (`REQ-YYYYMMDD-XXX`).
3. Implement endpoints.
4. Test.

## Task 6: Candidates
**Context:** Candidate management.
**Steps:**
1. Create `candidates/` module.
2. Implement endpoints.
3. Test.

## Task 7: SOW Tracker
**Context:** SOW management.
**Steps:**
1. Create `sows/` module.
2. Implement endpoints.
3. Test.

## Task 8: Communication Logs
**Context:** Audit logs.
**Steps:**
1. Create `communication_logs/` module.
2. Implement endpoints.
3. Test.

## Task 9: Dashboard Metrics
**Context:** Aggregated stats.
**Steps:**
1. Create `dashboard/` module.
2. Implement metrics endpoint.
3. Test.
