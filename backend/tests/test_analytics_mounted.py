"""Verify the /analytics/* router is mounted on the FastAPI app."""
from fastapi.testclient import TestClient
from app.main import app


def test_analytics_router_is_mounted():
    """Confirm /api/analytics/resources/skills returns 401/403 (not 404) when unauthenticated.

    A 404 means the router was never included. A 401/403 means the route is
    registered and the auth dependency rejected the request — which is correct.
    """
    client = TestClient(app)
    response = client.get("/api/analytics/resources/skills")
    assert response.status_code != 404, f"analytics router not mounted — got 404. Include the router in main.py"
    assert response.status_code in (401, 403), f"expected auth rejection (401/403), got {response.status_code}"
