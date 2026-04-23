"""RMS-108 — Search injection guard tests for resource_requests router."""
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
    mock_query.or_.return_value = mock_query
    mock_query.order.return_value = mock_query
    mock_query.range.return_value = mock_query
    result = MagicMock()
    result.data = []
    result.count = 0
    mock_query.execute = AsyncMock(return_value=result)
    mock_client = MagicMock()
    mock_client.table.return_value = mock_query
    return mock_client


@pytest.mark.asyncio
@pytest.mark.parametrize("bad_input", [
    "'; DROP TABLE resource_requests; --",
    "<script>alert(1)</script>",
    "test%00null",
    "foo OR 1=1",
    "req\x00inject",
])
async def test_requests_search_rejects_invalid_chars(authed_client, bad_input):
    mock_client = _make_mock_db()

    async def _get_client():
        return mock_client

    with patch("app.resource_requests.router.get_supabase_admin_async", new=_get_client):
        resp = await authed_client.get("/api/requests/", params={"search": bad_input})
    assert resp.status_code == 400
    assert "Invalid characters" in resp.text


@pytest.mark.asyncio
@pytest.mark.parametrize("good_input", [
    "Acme Corp",
    "REQ-20250101-001",
    "python developer",
    "Mumbai",
    "john.doe@client.com",
])
async def test_requests_search_accepts_valid_input(authed_client, good_input):
    mock_client = _make_mock_db()

    async def _get_client():
        return mock_client

    with patch("app.resource_requests.router.get_supabase_admin_async", new=_get_client):
        resp = await authed_client.get("/api/requests/", params={"search": good_input})
    assert resp.status_code == 200
