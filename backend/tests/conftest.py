"""
Shared test fixtures for RMS backend tests.

Provides:
- AsyncClient for API testing (with mocked auth)
- Mock Supabase client factory
- Sample data factories for employees, candidates, timesheets
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport
from datetime import date, datetime


# ── App import ──────────────────────────────────────────────
from app.main import app


# ── HTTP Client Fixtures ────────────────────────────────────

@pytest.fixture
async def client():
    """Raw async HTTP client — no auth bypass."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac


@pytest.fixture
def mock_current_user():
    """Default authenticated user (admin role)."""
    return {
        "id": "user-001",
        "email": "admin@siprahub.com",
        "role": "ADMIN",
        "vendor_id": None,
    }


@pytest.fixture
def mock_vendor_user():
    """Vendor-scoped user."""
    return {
        "id": "vendor-001",
        "email": "vendor@example.com",
        "role": "VENDOR",
        "vendor_id": 42,
    }


@pytest.fixture
async def authed_client(mock_current_user):
    """Async HTTP client with auth dependency overridden."""
    from app.auth.dependencies import get_current_user, require_admin

    app.dependency_overrides[get_current_user] = lambda: mock_current_user
    app.dependency_overrides[require_admin] = lambda: mock_current_user

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


# ── Mock Supabase Factory ───────────────────────────────────

class MockSupabaseTable:
    """Chainable mock for Supabase table operations."""

    def __init__(self, data=None, count=None):
        self._data = data if data is not None else []
        self._count = count
        self._result = MagicMock()
        self._result.data = self._data
        self._result.count = self._count

    def select(self, *args, **kwargs):
        return self

    def insert(self, data):
        if isinstance(data, list):
            self._result.data = data
        else:
            self._result.data = [data]
        return self

    def update(self, data):
        if self._data:
            updated = {**self._data[0], **data}
            self._result.data = [updated]
        return self

    def delete(self):
        self._result.data = []
        return self

    def eq(self, *args):
        return self

    def neq(self, *args):
        return self

    def ilike(self, *args):
        return self

    def gte(self, *args):
        return self

    def lt(self, *args):
        return self

    def gt(self, *args):
        return self

    def lte(self, *args):
        return self

    def order(self, *args, **kwargs):
        return self

    def range(self, *args):
        return self

    def limit(self, *args):
        return self

    def single(self):
        if self._data:
            self._result.data = self._data[0]
        else:
            self._result.data = None
        return self

    async def execute(self):
        return self._result


class MockSupabaseClient:
    """Mock Supabase client with configurable per-table responses."""

    def __init__(self):
        self._table_responses: dict[str, MockSupabaseTable] = {}

    def configure_table(self, table_name: str, data=None, count=None):
        self._table_responses[table_name] = MockSupabaseTable(data=data, count=count)

    def table(self, name: str):
        if name in self._table_responses:
            return self._table_responses[name]
        return MockSupabaseTable()


@pytest.fixture
def mock_supabase():
    """Configurable mock Supabase client."""
    return MockSupabaseClient()


@pytest.fixture
def patch_supabase(mock_supabase):
    """Patch get_supabase_admin_async to return mock client."""
    async def _get_mock():
        return mock_supabase

    with patch("app.database.get_supabase_admin_async", new=_get_mock):
        yield mock_supabase


# ── Data Factories ──────────────────────────────────────────

def make_employee(
    id: int = 1,
    candidate_id: int | None = 100,
    rms_name: str = "John Doe",
    jira_username: str | None = "john.doe",
    aws_email: str | None = "john.doe@aws.com",
    github_id: str | None = None,
    client_name: str | None = "Acme Corp",
    start_date: str | None = "2025-01-15",
    exit_date: str | None = None,
    status: str = "ACTIVE",
    created_at: str = "2025-01-15T00:00:00",
    updated_at: str | None = None,
) -> dict:
    return {
        "id": id,
        "candidate_id": candidate_id,
        "rms_name": rms_name,
        "jira_username": jira_username,
        "aws_email": aws_email,
        "github_id": github_id,
        "client_name": client_name,
        "start_date": start_date,
        "exit_date": exit_date,
        "status": status,
        "created_at": created_at,
        "updated_at": updated_at,
    }


def make_candidate(
    id: int = 1,
    first_name: str = "Jane",
    last_name: str = "Smith",
    email: str = "jane@example.com",
    phone: str | None = "9876543210",
    status: str = "NEW",
    request_id: int | None = None,
    vendor_id: int | None = None,
) -> dict:
    return {
        "id": id,
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "phone": phone,
        "status": status,
        "request_id": request_id,
        "vendor_id": vendor_id,
        "source": None,
        "vendor": None,
        "owner_id": "user-001",
        "created_at": "2025-01-01T00:00:00",
    }


def make_timesheet_entry(
    employee_id: int = 1,
    log_date: str = "2025-03-10",
    hours_logged: float = 8.0,
    is_ooo: bool = False,
    import_month: str = "2025-03",
    processed: bool = False,
    processed_at: str | None = None,
) -> dict:
    return {
        "id": None,
        "employee_id": employee_id,
        "log_date": log_date,
        "hours_logged": hours_logged,
        "is_ooo": is_ooo,
        "import_month": import_month,
        "processed": processed,
        "processed_at": processed_at,
    }


def make_aws_entry(
    employee_id: int = 1,
    aws_email: str = "john@aws.com",
    week_start: str = "2025-03-03",
    work_time_hours: float = 35.0,
    is_below_threshold: bool = False,
) -> dict:
    return {
        "id": None,
        "employee_id": employee_id,
        "aws_email": aws_email,
        "week_start": week_start,
        "work_time_hours": work_time_hours,
        "is_below_threshold": is_below_threshold,
    }
