"""RMS-107 — Search injection guard tests for candidates router."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest.fixture
async def authed_client():
    from app.auth.dependencies import get_current_user, require_admin

    user = {"id": "user-001", "email": "admin@test.com", "role": "ADMIN", "vendor_id": None}
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[require_admin] = lambda: user

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


def _make_mock_db():
    """Supabase query builder is synchronous except for execute()."""
    mock_query = MagicMock()
    mock_query.select.return_value = mock_query
    mock_query.eq.return_value = mock_query
    mock_query.neq.return_value = mock_query
    mock_query.or_.return_value = mock_query
    mock_query.order.return_value = mock_query
    mock_query.range.return_value = mock_query
    mock_query.in_.return_value = mock_query
    mock_query.not_ = mock_query
    result = MagicMock()
    result.data = []
    result.count = 0
    mock_query.execute = AsyncMock(return_value=result)
    mock_client = MagicMock()
    mock_client.table.return_value = mock_query
    return mock_client


@pytest.mark.asyncio
@pytest.mark.parametrize("bad_input", [
    "'; DROP TABLE candidates; --",
    "<script>alert(1)</script>",
    "test%00null",
    "foo OR 1=1",
    "name\x00inject",
])
async def test_candidates_search_rejects_invalid_chars(authed_client, bad_input):
    mock_client = _make_mock_db()

    async def _get_client():
        return mock_client

    with patch("app.candidates.router.get_supabase_admin_async", new=_get_client):
        resp = await authed_client.get("/api/candidates/", params={"search": bad_input})
    assert resp.status_code == 400
    assert "Invalid characters" in resp.text


@pytest.mark.asyncio
@pytest.mark.parametrize("good_input", [
    "John",
    "jane.doe@example.com",
    "John Doe",
    "smith-jones",
    "99876",
])
async def test_candidates_search_accepts_valid_input(authed_client, good_input):
    mock_client = _make_mock_db()

    async def _get_client():
        return mock_client

    with patch("app.candidates.router.get_supabase_admin_async", new=_get_client):
        resp = await authed_client.get("/api/candidates/", params={"search": good_input})
    assert resp.status_code == 200
