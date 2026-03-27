"""
Tests for P1.2: Duplicate Hire Prevention.

Verifies that creating a candidate with an email matching a previously
EXITED or TERMINATED employee returns a rehire_warning in the response,
while still allowing the candidate to be created.
"""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.auth.dependencies import get_current_user
from tests.conftest import make_employee, make_candidate


# ── Helpers ────────────────────────────────────────────────

def _mock_user():
    return {
        "id": "user-001",
        "email": "admin@siprahub.com",
        "role": "ADMIN",
        "vendor_id": None,
    }


def _candidate_payload(email: str = "jane@example.com", first_name: str = "Jane", last_name: str = "Smith"):
    return {
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
    }


class _ChainableMock:
    """A chainable mock that records calls and returns configurable results on execute()."""

    def __init__(self, result_data=None):
        self._result = MagicMock()
        self._result.data = result_data if result_data is not None else []
        self._result.count = None
        self._insert_data = None

    def select(self, *a, **kw):
        return self

    def insert(self, data):
        self._insert_data = [data] if not isinstance(data, list) else data
        # After insert, execute returns inserted data
        self._result.data = self._insert_data
        return self

    def update(self, data):
        return self

    def eq(self, *a):
        return self

    def ilike(self, *a):
        return self

    def in_(self, *a):
        return self

    def limit(self, *a):
        return self

    def order(self, *a, **kw):
        return self

    def range(self, *a):
        return self

    def single(self):
        return self

    async def execute(self):
        return self._result


class _SequentialTable:
    """Returns different chainable mocks for each method chain started via select/insert."""

    def __init__(self, responses: list[list]):
        """responses: list of data lists, one per chained call."""
        self._queue = [_ChainableMock(r) for r in responses]
        self._idx = 0

    def select(self, *a, **kw):
        return self._next()

    def insert(self, data):
        # Return the pre-configured response (which includes id, etc.)
        # rather than overriding with the raw insert payload.
        return self._next()

    def _next(self):
        if self._idx < len(self._queue):
            m = self._queue[self._idx]
            self._idx += 1
            return m
        return _ChainableMock([])


def _build_mock_client(candidates_responses: list[list], employees_responses: list[list] | None = None):
    """Build a mock supabase client with sequential responses per table."""
    candidates_table = _SequentialTable(candidates_responses)
    employees_table = _SequentialTable(employees_responses or [[]])
    tables = {"candidates": candidates_table, "employees": employees_table}

    client = MagicMock()
    client.table = lambda name: tables.get(name, _SequentialTable([[]]))
    return client


# ── Fixtures ───────────────────────────────────────────────

@pytest.fixture
def override_auth():
    app.dependency_overrides[get_current_user] = _mock_user
    yield
    app.dependency_overrides.pop(get_current_user, None)


# ── Tests ──────────────────────────────────────────────────

async def test_rehire_warning_for_terminated_employee(override_auth):
    """Creating a candidate whose email matches a TERMINATED employee returns rehire_warning."""
    created = make_candidate(id=10, email="jane@example.com")
    terminated_emp = make_employee(
        id=5, candidate_id=99, rms_name="Jane Smith",
        status="TERMINATED", exit_date="2025-12-01",
    )

    mock_client = _build_mock_client(
        candidates_responses=[
            [],             # email dedup — no existing candidate
            [created],      # insert result
        ],
        employees_responses=[
            [terminated_emp],  # rehire check — found terminated employee
        ],
    )

    async def _get():
        return mock_client

    with patch("app.candidates.router.get_supabase_admin_async", new=_get):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            resp = await ac.post("/candidates/", json=_candidate_payload())

    assert resp.status_code == 201
    body = resp.json()
    assert "rehire_warning" in body
    assert body["rehire_warning"] is not None
    assert body["rehire_warning"]["previous_employee_id"] == 5
    assert body["rehire_warning"]["status"] == "TERMINATED"
    assert "previously employed" in body["rehire_warning"]["message"].lower()


async def test_no_warning_for_active_employee(override_auth):
    """Creating a candidate whose email matches an ACTIVE employee should NOT produce a warning."""
    created = make_candidate(id=11, email="active@example.com")

    mock_client = _build_mock_client(
        candidates_responses=[
            [],           # email dedup — no dup
            [created],    # insert
        ],
        employees_responses=[
            [],           # rehire check — no EXITED/TERMINATED match
        ],
    )

    async def _get():
        return mock_client

    with patch("app.candidates.router.get_supabase_admin_async", new=_get):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            resp = await ac.post("/candidates/", json=_candidate_payload(email="active@example.com"))

    assert resp.status_code == 201
    body = resp.json()
    assert body.get("rehire_warning") is None


async def test_no_warning_when_no_matching_employee(override_auth):
    """Creating a candidate with no matching employee proceeds normally without warning."""
    created = make_candidate(id=12, email="brand.new@example.com")

    mock_client = _build_mock_client(
        candidates_responses=[
            [],           # email dedup — no dup
            [created],    # insert
        ],
        employees_responses=[
            [],           # rehire check — no match at all
        ],
    )

    async def _get():
        return mock_client

    with patch("app.candidates.router.get_supabase_admin_async", new=_get):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            resp = await ac.post("/candidates/", json=_candidate_payload(email="brand.new@example.com"))

    assert resp.status_code == 201
    body = resp.json()
    assert body.get("rehire_warning") is None


async def test_rehire_warning_for_exited_employee(override_auth):
    """Creating a candidate whose email matches an EXITED employee returns rehire_warning with details."""
    created = make_candidate(id=13, email="exited@example.com")
    exited_emp = make_employee(
        id=7, candidate_id=88, rms_name="Exited Person",
        status="EXITED", exit_date="2025-11-15",
    )

    mock_client = _build_mock_client(
        candidates_responses=[
            [],           # email dedup — no dup
            [created],    # insert
        ],
        employees_responses=[
            [exited_emp],  # rehire check — found exited employee
        ],
    )

    async def _get():
        return mock_client

    with patch("app.candidates.router.get_supabase_admin_async", new=_get):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            resp = await ac.post("/candidates/", json=_candidate_payload(email="exited@example.com"))

    assert resp.status_code == 201
    body = resp.json()
    assert body["rehire_warning"] is not None
    assert body["rehire_warning"]["previous_employee_id"] == 7
    assert body["rehire_warning"]["previous_employee_name"] == "Exited Person"
    assert body["rehire_warning"]["exit_date"] == "2025-11-15"
    assert body["rehire_warning"]["status"] == "EXITED"


async def test_existing_candidate_dedup_still_returns_409(override_auth):
    """The existing email dedup against candidates table should still return 409."""
    existing = make_candidate(
        id=50, email="duplicate@example.com",
        first_name="Existing", last_name="Person",
    )

    mock_client = _build_mock_client(
        candidates_responses=[
            [existing],   # email dedup — found existing candidate → 409
        ],
    )

    async def _get():
        return mock_client

    with patch("app.candidates.router.get_supabase_admin_async", new=_get):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            resp = await ac.post("/candidates/", json=_candidate_payload(email="duplicate@example.com"))

    assert resp.status_code == 409
    assert "Duplicate candidate" in resp.json()["detail"]


async def test_rehire_check_is_case_insensitive(override_auth):
    """Email comparison for rehire check should be case-insensitive (uses ilike)."""
    created = make_candidate(id=14, email="JANE@EXAMPLE.COM")
    terminated_emp = make_employee(
        id=9, candidate_id=77, rms_name="Jane Upper",
        status="TERMINATED", exit_date="2025-10-01",
    )

    mock_client = _build_mock_client(
        candidates_responses=[
            [],           # email dedup — no dup
            [created],    # insert
        ],
        employees_responses=[
            [terminated_emp],  # rehire check — found via case-insensitive match
        ],
    )

    async def _get():
        return mock_client

    with patch("app.candidates.router.get_supabase_admin_async", new=_get):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            resp = await ac.post("/candidates/", json=_candidate_payload(email="JANE@EXAMPLE.COM"))

    assert resp.status_code == 201
    body = resp.json()
    assert body["rehire_warning"] is not None
    assert body["rehire_warning"]["previous_employee_id"] == 9
    assert body["rehire_warning"]["status"] == "TERMINATED"
