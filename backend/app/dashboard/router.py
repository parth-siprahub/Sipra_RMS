"""Dashboard metrics — aligned with actual DB schema."""
from fastapi import APIRouter, Depends
from app.auth.dependencies import get_current_user
from app.database import get_supabase_admin_async
from app.utils.cache import api_cache

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/metrics")
async def get_metrics(current_user: dict = Depends(get_current_user)):
    """Return aggregated dashboard dashboard/metrics."""
    cache_key = "dashboard_metrics"
    cached_data = api_cache.get(cache_key)
    if cached_data:
        return cached_data

    # Use the singleton async client
    client = await get_supabase_admin_async()

    # 1. Resource Requests Metrics
    requests = await client.table("resource_requests").select("status, priority, is_backfill").execute()
    all_requests = requests.data or []
    by_status: dict[str, int] = {}
    by_priority: dict[str, int] = {}
    for r in all_requests:
        s = r.get("status", "UNKNOWN")
        p = r.get("priority", "UNKNOWN")
        by_status[s] = by_status.get(s, 0) + 1
        by_priority[p] = by_priority.get(p, 0) + 1

    # 2. Candidate Metrics (Detailed Pipeline)
    candidates_raw = await client.table("candidates").select("status, vendor_id, vendor, request_id").execute()
    all_candidates = candidates_raw.data or []
    candidates_by_status: dict[str, int] = {}
    for c in all_candidates:
        cs = c.get("status", "UNKNOWN")
        candidates_by_status[cs] = candidates_by_status.get(cs, 0) + 1

    # 3. Vendor Performance
    vendors_raw = await client.table("vendors").select("id, name").execute()
    vendor_map = {v["id"]: v["name"] for v in (vendors_raw.data or [])}

    vendor_stats: dict[str, dict[str, int]] = {}
    for c in all_candidates:
        v_id = c.get("vendor_id")
        v_name = vendor_map.get(v_id) if v_id else (c.get("vendor") or "INTERNAL")
        if v_name not in vendor_stats:
            vendor_stats[v_name] = {"total": 0, "selected": 0, "onboarded": 0, "rejected": 0}

        vendor_stats[v_name]["total"] += 1
        cs = c.get("status")
        if cs == "SELECTED":
            vendor_stats[v_name]["selected"] += 1
        elif cs == "ONBOARDED":
            vendor_stats[v_name]["onboarded"] += 1
        elif cs in ["REJECTED_BY_ADMIN", "REJECTED_BY_CLIENT", "SCREEN_REJECT", "L1_REJECT"]:
            vendor_stats[v_name]["rejected"] += 1

    # 4. SOW Utilization
    sows_raw = await client.table("sows").select("id, sow_number, max_resources").eq("is_active", True).execute()
    sows = sows_raw.data or []

    # Count onboarded/selected per request per SOW
    req_sow_map = await client.table("resource_requests").select("id, sow_id").execute()
    req_to_sow = {r["id"]: r["sow_id"] for r in (req_sow_map.data or []) if r.get("sow_id")}

    sow_utilization = []
    for s in sows:
        s_id = s["id"]
        count = sum(
            1 for c in all_candidates
            if c.get("status") in ["SELECTED", "ONBOARDED"]
            and req_to_sow.get(c.get("request_id")) == s_id
        )

        sow_utilization.append({
            "sow_number": s["sow_number"],
            "max": s["max_resources"] or 0,
            "current": count,
        })

    result = {
        "total_requests": len(all_requests),
        "requests_by_status": by_status,
        "requests_by_priority": by_priority,
        "total_candidates": len(all_candidates),
        "candidates_by_status": candidates_by_status,
        "backfill_count": sum(1 for r in all_requests if r.get("is_backfill")),
        "vendor_performance": vendor_stats,
        "sow_utilization": sow_utilization,
    }
    
    api_cache.set(cache_key, result)
    return result
