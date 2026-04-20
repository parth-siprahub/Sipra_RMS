"""Users API — recruiter/admin profile listings for UI dropdowns."""
import logging
from fastapi import APIRouter, Depends, HTTPException
from app.auth.dependencies import get_current_user
from app.database import get_supabase_admin_async

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["Users"])

# Sentinel used to detect test monkeypatching
_SENTINEL = object()

# Tests can monkeypatch this to a callable returning list[dict]
_fetch_recruiters = _SENTINEL


@router.get("/recruiters")
async def list_recruiters(
    current_user: dict = Depends(get_current_user),
):
    """Return recruiter and admin profiles for UI dropdowns. Admin-only."""
    role = (current_user.get("role") or "").lower()
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    # Allow monkeypatching in tests
    import app.users.router as self_module
    if self_module._fetch_recruiters is not _SENTINEL:
        return self_module._fetch_recruiters()

    # Real path: async Supabase query
    client = await get_supabase_admin_async()
    resp = await (
        client.table("profiles")
        .select("id,full_name,role")
        .in_("role", ["recruiter", "admin"])
        .order("full_name")
        .execute()
    )
    return [
        {"id": r["id"], "full_name": r.get("full_name") or "Unknown"}
        for r in (resp.data or [])
    ]
