"""Communication Logs CRUD — aligned with public.communication_logs table."""
from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.auth.dependencies import get_current_user
from app.database import get_supabase_admin
from app.communication_logs.schemas import (
    CommunicationLogCreate,
    CommunicationLogResponse,
)

router = APIRouter(prefix="/logs", tags=["Communication Logs"])


@router.get("/", response_model=list[CommunicationLogResponse])
def list_logs(
    request_id: int | None = None,
    candidate_id: int | None = None,
    current_user: dict = Depends(get_current_user),
):
    client = get_supabase_admin()
    query = client.table("communication_logs").select("*")
    if request_id:
        query = query.eq("request_id", request_id)
    if candidate_id:
        query = query.eq("candidate_id", candidate_id)
    result = query.order("log_date", desc=True).execute()
    return result.data


@router.post("/", response_model=CommunicationLogResponse, status_code=status.HTTP_201_CREATED)
def create_log(
    payload: CommunicationLogCreate,
    current_user: dict = Depends(get_current_user),
):
    client = get_supabase_admin()
    data = payload.model_dump(exclude_none=True)
    data["logged_by_id"] = current_user["id"]
    # Convert datetime to string if present
    if "log_date" in data and data["log_date"] is not None:
        data["log_date"] = str(data["log_date"])
    result = client.table("communication_logs").insert(data).execute()
    return result.data[0]
