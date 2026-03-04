"""Communication Logs CRUD — aligned with public.communication_logs table."""
from fastapi import APIRouter, HTTPException, status, Depends
from app.auth.dependencies import get_current_user
from app.database import get_supabase_admin_async
from app.communication_logs.schemas import (
    CommunicationLogCreate,
    CommunicationLogResponse,
)
from app.utils.cache import api_cache

router = APIRouter(prefix="/logs", tags=["Communication Logs"])


@router.get("", response_model=list[CommunicationLogResponse])
async def list_logs(
    request_id: int | None = None,
    candidate_id: int | None = None,
    current_user: dict = Depends(get_current_user),
):
    cache_key = f"logs_list_{request_id}_{candidate_id}"
    cached = api_cache.get(cache_key)
    if cached:
        return cached

    client = await get_supabase_admin_async()
    query = client.table("communication_logs").select("*")
    if request_id:
        query = query.eq("request_id", request_id)
    if candidate_id:
        query = query.eq("candidate_id", candidate_id)
    result = await query.order("log_date", desc=True).execute()
    api_cache.set(cache_key, result.data)
    return result.data


@router.post("", response_model=CommunicationLogResponse, status_code=status.HTTP_201_CREATED)
async def create_log(
    payload: CommunicationLogCreate,
    current_user: dict = Depends(get_current_user),
):
    client = await get_supabase_admin_async()
    data = payload.model_dump(exclude_none=True)
    data["logged_by_id"] = current_user["id"]
    # Convert datetime to string if present
    if "log_date" in data and data["log_date"] is not None:
        data["log_date"] = str(data["log_date"])
    result = await client.table("communication_logs").insert(data).execute()
    api_cache.clear_prefix("logs_")
    return result.data[0]
