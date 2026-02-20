# RMS Phase 1 Backend Implementation Plan

> **For Agent:** REQUIRED SUB-SKILL: Use `subagent-driven-development` to implement this plan task-by-task.

**Goal:** Build a production-grade FastAPI backend for the RMS, connecting to Supabase (PostgreSQL), with auth, job profiles, resource requests, candidates, SOWs, and communication logs.

**Architecture:** Domain-based FastAPI. Supabase SDK for DB. JWT auth via Supabase Auth. `pip + venv` for package management.

**Tech Stack:** FastAPI 0.128.0, Pydantic v2.11.7, supabase-py 2.7.4, pytest + httpx, python-dotenv

---

## Task 1: Project Scaffold & Environment

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/.env.example`
- Create: `backend/.gitignore`
- Create: `backend/app/__init__.py` (empty)
- Create: `backend/app/config.py`
- Create: `backend/app/database.py`
- Create: `backend/app/main.py`
- Create: `backend/tests/__init__.py` (empty)
- Create: `backend/tests/conftest.py`

**Step 1: Create venv and install dependencies**

```bash
cd d:\RMS_Siprahub\backend
python -m venv venv
venv\Scripts\activate
pip install fastapi==0.128.0 uvicorn[standard]==0.35.0 pydantic==2.11.7 pydantic-settings==2.4.0 supabase==2.7.4 python-dotenv==1.0.1 python-multipart==0.0.9 python-jose[cryptography]==3.3.0
pip install pytest pytest-asyncio httpx
pip freeze > requirements.txt
```

Expected: `requirements.txt` created with pinned versions.

**Step 2: Write `backend/app/config.py`**

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    JWT_SECRET: str  # From Supabase dashboard > Settings > API > JWT Secret
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    class Config:
        env_file = ".env"

settings = Settings()
```

**Step 3: Write `backend/app/database.py`**

```python
from supabase import create_client, Client
from app.config import settings

def get_supabase() -> Client:
    """Anon key client — RLS enforced via user JWT."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

def get_supabase_admin() -> Client:
    """Service role client — bypasses RLS. Use only for admin ops."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
```

**Step 4: Write `backend/app/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

app = FastAPI(title="RMS API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok"}
```

**Step 5: Write failing test**

```python
# tests/test_health.py
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

**Step 6: Run test**

```bash
cd d:\RMS_Siprahub\backend
pytest tests/test_health.py -v
```

Expected: PASS

**Step 7: Run server manually to verify**

```bash
uvicorn app.main:app --reload --port 8000
```

Open: `http://localhost:8000/docs` — should show FastAPI Swagger UI.

**Step 8: Commit**

```bash
git add backend/
git commit -m "feat(backend): scaffold FastAPI project with health endpoint"
```

---

## Task 2: Database Indexes Migration

**Files:**
- No Python files. SQL migration via Supabase MCP.

**Step 1: Apply index migration**

Apply via `supabase-mcp-server` `apply_migration` tool with name `add_performance_indexes`:

```sql
-- Per schema-foreign-key-indexes.md: index all FK columns
CREATE INDEX IF NOT EXISTS idx_candidates_request_id ON public.candidates(request_id);
CREATE INDEX IF NOT EXISTS idx_candidates_owner_id ON public.candidates(owner_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON public.candidates(status);
CREATE INDEX IF NOT EXISTS idx_resource_requests_job_profile_id ON public.resource_requests(job_profile_id);
CREATE INDEX IF NOT EXISTS idx_resource_requests_sow_id ON public.resource_requests(sow_id);
CREATE INDEX IF NOT EXISTS idx_resource_requests_created_by_id ON public.resource_requests(created_by_id);
CREATE INDEX IF NOT EXISTS idx_resource_requests_status ON public.resource_requests(status);
CREATE INDEX IF NOT EXISTS idx_resource_requests_priority ON public.resource_requests(priority);
CREATE INDEX IF NOT EXISTS idx_communication_logs_request_id ON public.communication_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_candidate_id ON public.communication_logs(candidate_id);
```

**Step 2: Verify via MCP**

Run `list_tables` and confirm indexes exist.

---

## Task 3: Auth Endpoints (Login, Me)

**Files:**
- Create: `backend/app/auth/router.py`
- Create: `backend/app/auth/schemas.py`
- Create: `backend/app/auth/dependencies.py`
- Modify: `backend/app/main.py` (include auth router)
- Create: `backend/tests/test_auth.py`

**Step 1: Write failing test**

```python
# tests/test_auth.py
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_login_wrong_password_returns_401():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
    assert response.status_code == 401
```

**Step 2: Run test — expect FAIL (route doesn't exist yet)**

```bash
pytest tests/test_auth.py -v
```

Expected: FAIL with 404 or ImportError.

**Step 3: Write `app/auth/schemas.py`**

```python
from pydantic import BaseModel, EmailStr
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    RECRUITER = "RECRUITER"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: UserRole
    full_name: str | None = None
```

**Step 4: Write `app/auth/router.py`**

```python
from fastapi import APIRouter, HTTPException, status, Depends
from app.auth.schemas import LoginRequest, TokenResponse
from app.auth.dependencies import get_current_user
from app.database import get_supabase

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    client = get_supabase()
    try:
        result = client.auth.sign_in_with_password({
            "email": body.email,
            "password": body.password
        })
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    user_id = result.user.id
    # Fetch role from profiles table
    profile = client.table("profiles").select("role, full_name").eq("id", user_id).single().execute()

    return TokenResponse(
        access_token=result.session.access_token,
        user_id=user_id,
        role=profile.data["role"],
        full_name=profile.data.get("full_name"),
    )

@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    return current_user
```

**Step 5: Write `app/auth/dependencies.py`**

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from app.config import settings
from app.database import get_supabase

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM],
                             options={"verify_aud": False})
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    client = get_supabase()
    profile = client.table("profiles").select("*").eq("id", user_id).single().execute()
    if not profile.data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return profile.data

async def require_admin(current_user=Depends(get_current_user)):
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
```

**Step 6: Register router in `main.py`**

```python
from app.auth.router import router as auth_router
app.include_router(auth_router)
```

**Step 7: Run tests**

```bash
pytest tests/test_auth.py -v
```

Expected: PASS

**Step 8: Commit**

```bash
git commit -m "feat(auth): add login and me endpoints with JWT validation"
```

---

## Task 4: Job Profiles CRUD

**Files:**
- Create: `backend/app/job_profiles/router.py`
- Create: `backend/app/job_profiles/schemas.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_job_profiles.py`

**Step 1: Write failing test**

```python
# tests/test_job_profiles.py
@pytest.mark.asyncio
async def test_list_job_profiles_returns_200():
    async with AsyncClient(...) as client:
        response = await client.get("/job-profiles/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
```

**Step 2: Implement schemas + router**

Schemas: `JobProfileCreate`, `JobProfileUpdate`, `JobProfileResponse`
Router: `GET /`, `POST /`, `PUT /{id}`, `DELETE /{id}` (with duplicate check and delete guard)

**Step 3: Run tests, commit**

```bash
pytest tests/test_job_profiles.py -v
git commit -m "feat(job-profiles): add CRUD endpoints"
```

---

## Task 5: Resource Requests Workflow

**Files:**
- Create: `backend/app/resource_requests/router.py`
- Create: `backend/app/resource_requests/schemas.py`
- Create: `backend/app/resource_requests/service.py` (request ID generation)
- Create: `backend/tests/test_resource_requests.py`

**Key logic:** Auto-generate `request_display_id` in format `REQ-YYYYMMDD-XXX` (3-digit sequence per day).

**Step 1: Write failing test for ID generation**

```python
def test_generate_request_id_format():
    from app.resource_requests.service import generate_request_id
    result = generate_request_id(sequence=1)
    assert result.startswith("REQ-")
    assert len(result) == 16  # REQ-YYYYMMDD-001
```

**Step 2: Implement service, schemas, router**

Endpoints: `POST /requests/`, `GET /requests/`, `GET /requests/{id}`, `PATCH /requests/{id}/status`

**Step 3: Run tests, commit**

---

## Task 6: Candidates (21-Field Form)

**Files:**
- Create: `backend/app/candidates/router.py`
- Create: `backend/app/candidates/schemas.py`
- Create: `backend/tests/test_candidates.py`

**Key logic:** All 21 fields per PRD Section 5. Resume upload handled as URL (Supabase Storage URL stored in `resume_url`).

Endpoints: `POST /candidates/`, `GET /candidates/?request_id=X`, `GET /candidates/{id}`, `PATCH /candidates/{id}`

---

## Task 7: SOW Tracker

**Files:**
- Create: `backend/app/sows/router.py`
- Create: `backend/app/sows/schemas.py`
- Create: `backend/tests/test_sows.py`

Endpoints: `POST /sows/`, `GET /sows/`, `GET /sows/{id}`, `PATCH /sows/{id}`

---

## Task 8: Communication Logs

**Files:**
- Create: `backend/app/communication_logs/router.py`
- Create: `backend/app/communication_logs/schemas.py`
- Create: `backend/tests/test_communication_logs.py`

Endpoints: `POST /logs/`, `GET /logs/?request_id=X`

---

## Task 9: Dashboard Metrics Endpoint

**Files:**
- Create: `backend/app/dashboard/router.py`
- Create: `backend/tests/test_dashboard.py`

Returns: total requests, onboarded count, with-admin count, with-client count, role-wise breakdown.

---

## Verification

After all tasks:

```bash
cd d:\RMS_Siprahub\backend
pytest --tb=short -v
uvicorn app.main:app --reload
```

Open `http://localhost:8000/docs` and manually test each endpoint group.
