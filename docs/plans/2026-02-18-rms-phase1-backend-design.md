# RMS Phase 1 Backend — Design Document

**Date:** 2026-02-18
**Author:** Antigravity Agent
**Status:** Approved

---

## Goal

Build a production-grade FastAPI backend for the Resource Management System (RMS) that connects to the existing Supabase (PostgreSQL) database. The backend exposes a REST API consumed by the React frontend.

## Architecture

**Pattern:** Domain-based FastAPI with Supabase as the database and auth provider.

```
backend/
├── app/
│   ├── main.py              # FastAPI app, CORS, lifespan
│   ├── config.py            # pydantic-settings from .env
│   ├── database.py          # Supabase client factory
│   ├── dependencies.py      # get_current_user, require_admin
│   │
│   ├── auth/                # Login, me, token
│   ├── job_profiles/        # CRUD for job profiles
│   ├── resource_requests/   # Core request workflow
│   ├── candidates/          # 21-field candidate form
│   ├── sows/                # SOW tracker
│   └── communication_logs/  # Audit trail
│
├── tests/                   # pytest + httpx
├── requirements.txt
└── .env
```

## Key Decisions

| Decision | Choice | Reason |
| :--- | :--- | :--- |
| Package manager | `pip + venv` | User preference |
| Auth | Supabase Auth (JWT) | Consistent with DB, no separate auth service |
| DB interaction | `supabase-py` client | Direct Supabase SDK, no SQLAlchemy needed |
| FastAPI version | `0.128.0` | Per `.agent/skills/fastapi.md` |
| Pydantic | `v2.11.7` | Per `.agent/skills/fastapi.md` |
| Async | Yes (`async def` throughout) | Per `.agent/skills/fastapi.md` |
| Testing | `pytest` + `httpx` | Per `.agent/skills/pythontesting.md` |

## Auth Strategy

- Login via `supabase.auth.sign_in_with_password()` → returns JWT
- JWT passed as `Authorization: Bearer <token>` on all subsequent requests
- `get_current_user` dependency decodes JWT, fetches profile from `public.profiles`
- `require_admin` dependency checks `profile.role == 'ADMIN'`

## RLS Compliance

Per `security-rls-basics.md`: all tables have RLS enabled. The backend uses the **anon key** for user-context operations (JWT is forwarded to Supabase, which enforces RLS automatically). The **service role key** is used only for admin operations (e.g., creating users).

## Indexes Applied to Schema

Per `schema-foreign-key-indexes.md` and `query-missing-indexes.md`: a migration will add indexes on all FK columns and high-frequency filter columns (`status`, `priority`, `request_display_id`).

## Vertical Slice (First Feature)

Per `user_rules` ("Seed → Verify APIs → Connect Frontend"):
1. Auth endpoints first (login, me)
2. Job Profiles CRUD (simple, no dependencies)
3. Resource Requests (core flow)
4. Candidates (21-field form)
5. SOW Tracker
6. Communication Logs

## Future Considerations: Phase 2 Authentication (Keycloak)
To satisfy enterprise requirements for self-hosted identity management, Phase 2 may migrate from Supabase Auth to Keycloak.

**Migration Strategy:**
1. Deploy Keycloak (Docker/K8s).
2. Configure OIDC Realm.
3. Update `backend/app/auth/dependencies.py`: Replace `Supabase Auth` JWT verification with `python-keycloak` or standard OIDC middleware.
4. User Migration: Export users from Supabase, import to Keycloak (password reset likely required).
5. RLS Sync: Create a trigger in Postgres to sync Keycloak user IDs to `public.profiles` or use a custom claim claim mapping service.

**Current Phase 1 Decision:** Use Supabase Auth for development velocity (Foundation/Walking Skeleton).

---

*This design was validated against: `.agent/skills/fastapi.md`, `.agent/skills/supabase-postgres-best-practices/`, `.agent/rules/fastapi.md`, `.agent/rules/planner.md`*
