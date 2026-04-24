"""Resource Requests CRUD — aligned with public.resource_requests table."""
import re
from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.auth.dependencies import get_current_user, require_admin
from app.database import get_supabase_admin_async
from app.resource_requests.schemas import (
    ResourceRequestCreate,
    ResourceRequestUpdate,
    ResourceRequestResponse,
    StatusTransition,
    RequestStatus,
)
from app.resource_requests.service import generate_request_id
from app.utils.cache import api_cache
import logging

logger = logging.getLogger(__name__)

_SEARCH_SAFE_RE = re.compile(r'^[\w\s@.\-]+$')

router = APIRouter(prefix="/requests", tags=["Resource Requests"])

# Valid status transitions (I5)
REQUEST_STATUS_TRANSITIONS = {
    RequestStatus.OPEN: [RequestStatus.CLOSED, RequestStatus.HOLD, RequestStatus.CANCELLED],
    RequestStatus.HOLD: [RequestStatus.OPEN, RequestStatus.CLOSED, RequestStatus.CANCELLED],
    RequestStatus.CLOSED: [RequestStatus.OPEN],  # Allow reopening
    RequestStatus.CANCELLED: [RequestStatus.OPEN],  # Allow reopening cancelled requests
}


@router.get("/", response_model=list[ResourceRequestResponse])
async def list_requests(
    request_status: str | None = Query(None, alias="status"),
    priority: str | None = None,
    search: str | None = Query(None, description="Search by ID, client, or job profile"),
    page: int = Query(1, ge=1),
    page_size: int = Query(1000, ge=1, le=1000),
    current_user: dict = Depends(get_current_user),
):
    cache_key = f"requests_list_{request_status}_{priority}_{search}_{page}_{page_size}"
    cached = api_cache.get(cache_key)
    if cached:
        return cached

    client = await get_supabase_admin_async()
    query = client.table("resource_requests").select("*")
    if request_status:
        query = query.eq("status", request_status)
    if priority:
        query = query.eq("priority", priority)
    if search:
        search = search.strip()
        if not _SEARCH_SAFE_RE.match(search):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid characters in search query")
        # OR filter on key fields (client_name, job_profile, request_display_id, location)
        query = query.or_(
            f"client_name.ilike.%{search}%,"
            f"job_profile.ilike.%{search}%,"
            f"request_display_id.ilike.%{search}%,"
            f"location.ilike.%{search}%"
        )

    offset = (page - 1) * page_size
    result = await query.order("created_at", desc=True).range(offset, offset + page_size - 1).execute()
    api_cache.set(cache_key, result.data)
    return result.data



@router.post("/", response_model=ResourceRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_request(
    payload: ResourceRequestCreate,
    current_user: dict = Depends(require_admin),
):
    client = await get_supabase_admin_async()
    # Generate next display ID (REQ-YYYYMMDD-XXX)
    count_result = await client.table("resource_requests").select("id", count="exact").execute()
    seq = (count_result.count or 0) + 1
    display_id = generate_request_id(seq)

    data = payload.model_dump(exclude_none=True)
    data["request_display_id"] = display_id
    data["created_by_id"] = current_user["id"]
    data["status"] = RequestStatus.OPEN.value

    result = await client.table("resource_requests").insert(data).execute()
    api_cache.clear_prefix("requests_")
    api_cache.clear_prefix("dashboard_")
    return result.data[0]


@router.get("/{request_id}", response_model=ResourceRequestResponse)
async def get_request(request_id: int, current_user: dict = Depends(get_current_user)):
    client = await get_supabase_admin_async()
    result = await client.table("resource_requests").select("*").eq("id", request_id).single().execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")
    return result.data


@router.put("/{request_id}", response_model=ResourceRequestResponse)
async def update_request(
    request_id: int,
    payload: ResourceRequestUpdate,
    current_user: dict = Depends(require_admin),
):
    client = await get_supabase_admin_async()
    data = payload.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")
    result = await client.table("resource_requests").update(data).eq("id", request_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")
    api_cache.clear_prefix("requests_")
    api_cache.clear_prefix("dashboard_")
    return result.data[0]


@router.patch("/{request_id}", response_model=ResourceRequestResponse)
async def patch_request(
    request_id: int,
    payload: ResourceRequestUpdate,
    current_user: dict = Depends(require_admin),
):
    """Partial update of a resource request (PATCH)."""
    client = await get_supabase_admin_async()
    data = payload.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")
    result = await client.table("resource_requests").update(data).eq("id", request_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")
    api_cache.clear_prefix("requests_")
    api_cache.clear_prefix("dashboard_")
    return result.data[0]


@router.patch("/{request_id}/status", response_model=ResourceRequestResponse)
async def transition_status(
    request_id: int,
    payload: StatusTransition,
    current_user: dict = Depends(require_admin),
):
    client = await get_supabase_admin_async()

    # Fetch current status for transition validation (I5)
    existing = await client.table("resource_requests").select("status").eq("id", request_id).single().execute()
    if not existing.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")

    current_status = RequestStatus(existing.data["status"])
    allowed = REQUEST_STATUS_TRANSITIONS.get(current_status, [])
    if payload.status not in allowed:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Cannot transition from {current_status.value} to {payload.status.value}. "
            f"Allowed: {[s.value for s in allowed]}",
        )

    result = (
        await client.table("resource_requests")
        .update({"status": payload.status.value})
        .eq("id", request_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")
    api_cache.clear_prefix("requests_")
    api_cache.clear_prefix("dashboard_")
    return result.data[0]
