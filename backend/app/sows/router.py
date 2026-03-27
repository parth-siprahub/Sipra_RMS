"""SOW CRUD — aligned with public.sows table."""
import logging
from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.auth.dependencies import get_current_user, require_admin
from app.database import get_supabase_admin_async
from app.sows.schemas import SowCreate, SowUpdate, SowResponse
from app.utils.cache import api_cache

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sows", tags=["SOWs"])


@router.get("/", response_model=list[SowResponse])
async def list_sows(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
):
    client = await get_supabase_admin_async()
    offset = (page - 1) * page_size
    result = await client.table("sows").select("*").order("created_at", desc=True).range(offset, offset + page_size - 1).execute()
    return result.data


@router.post("/", response_model=SowResponse, status_code=status.HTTP_201_CREATED)
async def create_sow(
    payload: SowCreate,
    current_user: dict = Depends(require_admin),
):
    client = await get_supabase_admin_async()
    
    # Duplicate check on sow_number (unique column)
    dup = await client.table("sows").select("id").eq("sow_number", payload.sow_number).execute()
    if dup.data:
        raise HTTPException(status.HTTP_409_CONFLICT, f"SOW '{payload.sow_number}' already exists")
    
    # Sanitization: convert empty strings to None
    data = payload.model_dump(exclude_none=True, mode="json")
    for key, value in data.items():
        if value == "":
            data[key] = None

    try:
        result = await client.table("sows").insert(data).execute()
        if not result.data:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to create SOW: No data returned")
        api_cache.clear_prefix("sows_")
        api_cache.clear_prefix("dashboard_")
        return result.data[0]
    except Exception as e:
        logger.error("SOW Creation Error: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create SOW. Please check your input and try again."
        )


@router.get("/capacity", response_model=list[dict])
async def sow_capacity(current_user: dict = Depends(get_current_user)):
    """Return onboarded_count per SOW (avoids 3 client-side API calls)."""
    client = await get_supabase_admin_async()
    # Get all resource requests with their sow_id
    rr_result = await client.table("resource_requests").select("id, sow_id").execute()
    rr_map: dict[int, int] = {}  # rr_id -> sow_id
    for rr in (rr_result.data or []):
        if rr.get("sow_id"):
            rr_map[rr["id"]] = rr["sow_id"]

    # Get all onboarded candidates
    cand_result = await (
        client.table("candidates")
        .select("id, request_id")
        .eq("status", "ONBOARDED")
        .execute()
    )

    # Count onboarded per SOW
    sow_counts: dict[int, int] = {}
    for cand in (cand_result.data or []):
        sow_id = rr_map.get(cand.get("request_id", 0))
        if sow_id:
            sow_counts[sow_id] = sow_counts.get(sow_id, 0) + 1

    return [{"sow_id": k, "onboarded_count": v} for k, v in sow_counts.items()]


@router.get("/{sow_id}", response_model=SowResponse)
async def get_sow(sow_id: int, current_user: dict = Depends(get_current_user)):
    client = await get_supabase_admin_async()
    result = await client.table("sows").select("*").eq("id", sow_id).single().execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "SOW not found")
    return result.data


@router.patch("/{sow_id}", response_model=SowResponse)
async def update_sow(
    sow_id: int,
    payload: SowUpdate,
    current_user: dict = Depends(require_admin),
):
    client = await get_supabase_admin_async()
    data = payload.model_dump(exclude_none=True, mode="json")
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")
    result = await client.table("sows").update(data).eq("id", sow_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "SOW not found")
    api_cache.clear_prefix("sows_")
    api_cache.clear_prefix("dashboard_")
    return result.data[0]
