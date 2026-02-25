"""Resource Requests CRUD — aligned with public.resource_requests table."""
from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.auth.dependencies import get_current_user
from app.database import get_supabase_admin
from app.resource_requests.schemas import (
    ResourceRequestCreate,
    ResourceRequestUpdate,
    ResourceRequestResponse,
    StatusTransition,
    RequestStatus,
)
from app.resource_requests.service import generate_request_id

router = APIRouter(prefix="/requests", tags=["Resource Requests"])


@router.get("/", response_model=list[ResourceRequestResponse])
def list_requests(
    request_status: str | None = Query(None, alias="status"),
    priority: str | None = None,
    current_user: dict = Depends(get_current_user),
):
    client = get_supabase_admin()
    query = client.table("resource_requests").select("*")
    if request_status:
        query = query.eq("status", request_status)
    if priority:
        query = query.eq("priority", priority)
    result = query.order("created_at", desc=True).execute()
    return result.data


@router.post("/", response_model=ResourceRequestResponse, status_code=status.HTTP_201_CREATED)
def create_request(
    payload: ResourceRequestCreate,
    current_user: dict = Depends(get_current_user),
):
    client = get_supabase_admin()
    # Generate next display ID (REQ-YYYYMMDD-XXX)
    count_result = client.table("resource_requests").select("id", count="exact").execute()
    seq = (count_result.count or 0) + 1
    display_id = generate_request_id(seq)

    data = payload.model_dump(exclude_none=True)
    data["request_display_id"] = display_id
    data["created_by_id"] = current_user["id"]
    data["status"] = RequestStatus.OPEN.value

    result = client.table("resource_requests").insert(data).execute()
    return result.data[0]


@router.get("/{request_id}", response_model=ResourceRequestResponse)
def get_request(request_id: int, current_user: dict = Depends(get_current_user)):
    client = get_supabase_admin()
    result = client.table("resource_requests").select("*").eq("id", request_id).single().execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")
    return result.data


@router.put("/{request_id}", response_model=ResourceRequestResponse)
def update_request(
    request_id: int,
    payload: ResourceRequestUpdate,
    current_user: dict = Depends(get_current_user),
):
    client = get_supabase_admin()
    data = payload.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")
    result = client.table("resource_requests").update(data).eq("id", request_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")
    return result.data[0]


@router.patch("/{request_id}/status", response_model=ResourceRequestResponse)
def transition_status(
    request_id: int,
    payload: StatusTransition,
    current_user: dict = Depends(get_current_user),
):
    client = get_supabase_admin()
    result = (
        client.table("resource_requests")
        .update({"status": payload.status.value})
        .eq("id", request_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")
    return result.data[0]
