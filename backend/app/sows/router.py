"""SOW CRUD — aligned with public.sows table."""
from fastapi import APIRouter, HTTPException, status, Depends
from app.auth.dependencies import get_current_user, require_admin
from app.database import get_supabase_admin_async
from app.sows.schemas import SowCreate, SowUpdate, SowResponse
from app.utils.cache import api_cache

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
    data = payload.model_dump(exclude_none=True, mode="json")
    result = await client.table("sows").insert(data).execute()
    api_cache.clear_prefix("sows_")
    api_cache.clear_prefix("dashboard_")
    return result.data[0]


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
