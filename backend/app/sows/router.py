"""SOW CRUD — aligned with public.sows table."""
import logging
from fastapi import APIRouter, HTTPException, status, Depends
from app.auth.dependencies import get_current_user, require_admin
from app.database import get_supabase_admin_async
from app.sows.schemas import SowCreate, SowUpdate, SowResponse
from app.utils.cache import api_cache

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sows", tags=["SOWs"])


@router.get("/", response_model=list[SowResponse])
async def list_sows(current_user: dict = Depends(get_current_user)):
    client = await get_supabase_admin_async()
    result = await client.table("sows").select("*").order("created_at", desc=True).execute()
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
            detail=f"Database error: {str(e)}"
        )


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

    # Fetch current SOW state before update
    current_sow = await client.table("sows").select("*").eq("id", sow_id).single().execute()
    if not current_sow.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "SOW not found")

    result = await client.table("sows").update(data).eq("id", sow_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "SOW not found")

    # SOW lifecycle cascade: when SOW is deactivated, close all linked open RRs
    was_active = current_sow.data.get("is_active", True)
    now_active = data.get("is_active", was_active)
    if was_active and not now_active:
        try:
            linked_rrs = await (
                client.table("resource_requests")
                .select("id, status")
                .eq("sow_id", sow_id)
                .neq("status", "CLOSED")
                .execute()
            )
            if linked_rrs.data:
                for rr in linked_rrs.data:
                    await (
                        client.table("resource_requests")
                        .update({"status": "CLOSED"})
                        .eq("id", rr["id"])
                        .execute()
                    )
                api_cache.clear_prefix("requests_")
                logger.info(
                    "SOW %s deactivated: auto-closed %d linked resource requests",
                    sow_id, len(linked_rrs.data),
                )
        except Exception as cascade_err:
            logger.warning("SOW cascade close failed for SOW %s: %s", sow_id, cascade_err)

    api_cache.clear_prefix("sows_")
    api_cache.clear_prefix("dashboard_")
    return result.data[0]
