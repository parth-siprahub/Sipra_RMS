"""Vendors CRUD — dynamic vendor management (F3)."""
from fastapi import APIRouter, HTTPException, status, Depends
from app.auth.dependencies import get_current_user, require_admin
from app.database import get_supabase_admin_async
from app.vendors.schemas import VendorCreate, VendorUpdate, VendorResponse
from app.utils.cache import api_cache

router = APIRouter(prefix="/vendors", tags=["Vendors"])


@router.get("", response_model=list[VendorResponse])
async def list_vendors(
    active_only: bool = False,
    current_user: dict = Depends(get_current_user),
):
    cache_key = f"vendors_list_{active_only}"
    cached = api_cache.get(cache_key)
    if cached:
        return cached

    client = await get_supabase_admin_async()
    query = client.table("vendors").select("*")
    if active_only:
        query = query.eq("is_active", True)
    result = await query.order("name").execute()
    api_cache.set(cache_key, result.data)
    return result.data


@router.post("", response_model=VendorResponse, status_code=status.HTTP_201_CREATED)
async def create_vendor(
    payload: VendorCreate,
    current_user: dict = Depends(require_admin),
):
    client = await get_supabase_admin_async()
    # Check for duplicate name
    existing = await client.table("vendors").select("id").eq("name", payload.name).execute()
    if existing.data:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Vendor '{payload.name}' already exists",
        )

    data = payload.model_dump(exclude_none=True)
    result = await client.table("vendors").insert(data).execute()
    api_cache.clear_prefix("vendors_")
    return result.data[0]


@router.get("/{vendor_id}", response_model=VendorResponse)
async def get_vendor(vendor_id: int, current_user: dict = Depends(get_current_user)):
    client = await get_supabase_admin_async()
    result = await client.table("vendors").select("*").eq("id", vendor_id).single().execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vendor not found")
    return result.data


@router.patch("/{vendor_id}", response_model=VendorResponse)
async def update_vendor(
    vendor_id: int,
    payload: VendorUpdate,
    current_user: dict = Depends(require_admin),
):
    client = await get_supabase_admin_async()
    data = payload.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")
    result = await client.table("vendors").update(data).eq("id", vendor_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vendor not found")
    api_cache.clear_prefix("vendors_")
    return result.data[0]
