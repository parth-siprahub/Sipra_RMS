"""Verify a recruiter cannot read another recruiter's data via URL manipulation."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.auth.dependencies import get_current_user

RECRUITER_A_ID = "00000000-0000-0000-0000-00000000000a"
RECRUITER_B_ID = "00000000-0000-0000-0000-00000000000b"


@pytest.fixture(autouse=False)
def as_recruiter_a():
    """Override auth dependency to simulate recruiter A making requests."""
    def _override():
        return {"id": RECRUITER_A_ID, "role": "recruiter", "email": "a@example.com"}
    app.dependency_overrides[get_current_user] = _override
    yield
    app.dependency_overrides.clear()


def test_recruiter_cannot_spoof_recruiter_id(as_recruiter_a, monkeypatch):
    """When recruiter A passes ?recruiter_id=B, the handler must coerce it back to A."""
    captured = {}

    import app.analytics.router as analytics_router_module

    async def fake_fetch(client, recruiter_id=None, columns=None):
        captured["recruiter_id"] = recruiter_id
        return []

    monkeypatch.setattr(analytics_router_module, "_fetch_active_employee_candidates", fake_fetch)

    client = TestClient(app)
    resp = client.get(
        f"/api/analytics/resources/skills?recruiter_id={RECRUITER_B_ID}"
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    assert captured.get("recruiter_id") == RECRUITER_A_ID, (
        f"Scoping failed: got recruiter_id={captured.get('recruiter_id')!r}, "
        f"expected {RECRUITER_A_ID!r}. Recruiter A was able to query recruiter B's data."
    )


def test_admin_recruiter_id_passes_through(monkeypatch):
    """Admin passing ?recruiter_id=B should get recruiter B's data unchanged."""
    captured = {}

    def _admin_override():
        return {"id": "admin-uuid", "role": "admin", "email": "admin@example.com"}
    app.dependency_overrides[get_current_user] = _admin_override

    import app.analytics.router as analytics_router_module

    async def fake_fetch(client, recruiter_id=None, columns=None):
        captured["recruiter_id"] = recruiter_id
        return []

    monkeypatch.setattr(analytics_router_module, "_fetch_active_employee_candidates", fake_fetch)

    client = TestClient(app)
    resp = client.get(f"/api/analytics/resources/skills?recruiter_id={RECRUITER_B_ID}")
    app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert captured.get("recruiter_id") == RECRUITER_B_ID, (
        f"Admin should see B's data. Got: {captured.get('recruiter_id')!r}"
    )
