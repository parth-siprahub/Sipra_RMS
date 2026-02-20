"""Dashboard metrics — aligned with actual DB schema."""
from fastapi import APIRouter, Depends
from app.auth.dependencies import get_current_user
from app.database import get_supabase_admin

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/metrics")
async def get_metrics(current_user: dict = Depends(get_current_user)):
    """Return aggregated dashboard metrics."""
    client = get_supabase_admin()

    # Fetch all requests
    requests = client.table("resource_requests").select("status, priority").execute()
    all_requests = requests.data or []

    total = len(all_requests)
    by_status: dict[str, int] = {}
    by_priority: dict[str, int] = {}

    for r in all_requests:
        s = r.get("status", "UNKNOWN")
        p = r.get("priority", "UNKNOWN")
        by_status[s] = by_status.get(s, 0) + 1
        by_priority[p] = by_priority.get(p, 0) + 1

    # Fetch candidate counts
    candidates = client.table("candidates").select("status").execute()
    all_candidates = candidates.data or []
    candidates_by_status: dict[str, int] = {}
    for c in all_candidates:
        cs = c.get("status", "UNKNOWN")
        candidates_by_status[cs] = candidates_by_status.get(cs, 0) + 1

    return {
        "total_requests": total,
        "requests_by_status": by_status,
        "requests_by_priority": by_priority,
        "total_candidates": len(all_candidates),
        "candidates_by_status": candidates_by_status,
        "backfill_count": sum(1 for r in all_requests if r.get("is_backfill")),
    }
