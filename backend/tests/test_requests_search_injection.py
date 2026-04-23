"""RMS-108 — Search injection guard tests for resource_requests router."""
import pytest
from unittest.mock import AsyncMock, patch
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


@pytest.mark.asyncio
@pytest.mark.parametrize("bad_input", [
    "'; DROP TABLE resource_requests; --",
    "<script>alert(1)</script>",
    "test%00null",
    "foo OR 1=1",
    "req\x00inject",
])
async def test_requests_search_rejects_invalid_chars(authed_client, bad_input):
    with patch("app.database.get_supabase_admin_async", return_value=AsyncMock()):
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
    mock_client = AsyncMock()
    mock_query = AsyncMock()
    mock_query.select.return_value = mock_query
    mock_query.eq.return_value = mock_query
    mock_query.or_.return_value = mock_query
    mock_query.order.return_value = mock_query
    mock_query.range.return_value = mock_query
    mock_query.execute = AsyncMock(return_value=AsyncMock(data=[]))
    mock_client.table.return_value = mock_query

    with patch("app.database.get_supabase_admin_async", return_value=mock_client):
        resp = await authed_client.get("/api/requests/", params={"search": good_input})
    assert resp.status_code == 200
