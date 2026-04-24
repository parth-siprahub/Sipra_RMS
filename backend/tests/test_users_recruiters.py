"""GET /api/users/recruiters returns recruiter/admin profiles. Admin-only."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.auth.dependencies import get_current_user


def test_admin_sees_recruiter_list(monkeypatch):
    """Admin can fetch the list of recruiters."""
    app.dependency_overrides[get_current_user] = lambda: {
        "id": "admin-id", "role": "admin", "email": "admin@example.com"
    }

    import app.users.router as users_router_module

    def fake_fetch_recruiters():
        return [
            {"id": "r1", "full_name": "Alice Recruiter"},
            {"id": "r2", "full_name": "Bob Admin"},
        ]

    monkeypatch.setattr(users_router_module, "_fetch_recruiters", fake_fetch_recruiters)

    client = TestClient(app)
    resp = client.get("/api/users/recruiters")
    app.dependency_overrides.clear()

    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert isinstance(data, list)
    names = {r["full_name"] for r in data}
    assert names == {"Alice Recruiter", "Bob Admin"}


def test_recruiter_cannot_list_recruiters():
    """Non-admin gets 403."""
    app.dependency_overrides[get_current_user] = lambda: {
        "id": "recr-id", "role": "recruiter", "email": "r@example.com"
    }
    client = TestClient(app)
    resp = client.get("/api/users/recruiters")
    app.dependency_overrides.clear()
    assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
