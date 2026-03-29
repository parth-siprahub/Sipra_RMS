"""Employees CRUD + Onboarding Transition — aligned with public.employees table."""
import logging
from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.auth.dependencies import get_current_user, require_admin
from app.database import get_supabase_admin_async
from app.employees.schemas import EmployeeCreate, EmployeeUpdate, EmployeeResponse, EmployeeStatus
from app.utils.cache import api_cache

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/employees", tags=["Employees"])


def normalize_employee_text(data: dict) -> dict:
    """Apply text normalization rules for employee data."""
    normalized = dict(data)

    # Title Case for names
    for field in ("rms_name", "client_name"):
        if field in normalized and normalized[field]:
            # Title Case, collapse whitespace
            val = " ".join(normalized[field].split())  # collapse whitespace
            normalized[field] = val.title()

    # Lowercase for emails
    if "aws_email" in normalized and normalized["aws_email"]:
        normalized["aws_email"] = normalized["aws_email"].strip().lower()

    # Strip whitespace for other fields
    for field in ("github_id", "jira_username"):
        if field in normalized and normalized[field]:
            normalized[field] = normalized[field].strip()

    return normalized


@router.get("/", response_model=list[EmployeeResponse])
async def list_employees(
    employee_status: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    current_user: dict = Depends(get_current_user),
):
    cache_key = f"employees_list_{employee_status}_{page}_{page_size}"
    cached = api_cache.get(cache_key)
    if cached:
        return cached

    client = await get_supabase_admin_async()
    query = client.table("employees").select("*")
    if employee_status:
        query = query.eq("status", employee_status)
    offset = (page - 1) * page_size
    result = await query.order("created_at", desc=True).range(offset, offset + page_size - 1).execute()
    api_cache.set(cache_key, result.data)
    return result.data


@router.post("/", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    payload: EmployeeCreate,
    current_user: dict = Depends(require_admin),
):
    """Manually create an employee record (or used by the onboarding trigger)."""
    client = await get_supabase_admin_async()

    # Prevent duplicate employee for the same candidate
    dup = await client.table("employees").select("id").eq("candidate_id", payload.candidate_id).execute()
    if dup.data:
        raise HTTPException(status.HTTP_409_CONFLICT, "Employee record already exists for this candidate")

    data = payload.model_dump(exclude_none=True, mode="json")
    data["status"] = EmployeeStatus.ACTIVE.value
    data = normalize_employee_text(data)

    try:
        result = await client.table("employees").insert(data).execute()
        if not result.data:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to create employee")
        api_cache.clear_prefix("employees_")
        api_cache.clear_prefix("dashboard_")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Employee creation error: %s", str(e))
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Operation failed. Please check input and try again.")


@router.post("/from-candidate/{candidate_id}", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee_from_candidate(
    candidate_id: int,
    current_user: dict = Depends(require_admin),
):
    """Transition trigger: auto-create employee from an ONBOARDED candidate."""
    client = await get_supabase_admin_async()

    # Verify candidate exists and is ONBOARDED
    candidate = await client.table("candidates").select("*").eq("id", candidate_id).single().execute()
    if not candidate.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Candidate not found")
    if candidate.data.get("status") != "ONBOARDED":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only ONBOARDED candidates can be converted to employees")

    # Prevent duplicate
    dup = await client.table("employees").select("id").eq("candidate_id", candidate_id).execute()
    if dup.data:
        raise HTTPException(status.HTTP_409_CONFLICT, "Employee record already exists for this candidate")

    c = candidate.data
    employee_data = {
        "candidate_id": candidate_id,
        "rms_name": f"{c.get('first_name', '')} {c.get('last_name', '')}".strip(),
        "client_name": c.get("client_email", "").split("@")[0] if c.get("client_email") else None,
        "jira_username": c.get("client_jira_id"),
        "start_date": c.get("onboarding_date"),
        "status": EmployeeStatus.ACTIVE.value,
    }
    employee_data = {k: v for k, v in employee_data.items() if v is not None}
    employee_data = normalize_employee_text(employee_data)

    try:
        result = await client.table("employees").insert(employee_data).execute()
        if not result.data:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to create employee")
        api_cache.clear_prefix("employees_")
        api_cache.clear_prefix("dashboard_")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Employee transition error: %s", str(e))
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Operation failed. Please check input and try again.")


@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee(employee_id: int, current_user: dict = Depends(get_current_user)):
    client = await get_supabase_admin_async()
    result = await client.table("employees").select("*").eq("id", employee_id).single().execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Employee not found")
    return result.data


@router.patch("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: int,
    payload: EmployeeUpdate,
    current_user: dict = Depends(require_admin),
):
    client = await get_supabase_admin_async()
    data = payload.model_dump(exclude_none=True, mode="json")
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")
    data = normalize_employee_text(data)

    result = await client.table("employees").update(data).eq("id", employee_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Employee not found")
    api_cache.clear_prefix("employees_")
    api_cache.clear_prefix("dashboard_")
    api_cache.clear_prefix("billing_")
    return result.data[0]


@router.patch("/{employee_id}/exit", response_model=EmployeeResponse)
async def exit_employee(
    employee_id: int,
    exit_date: str,
    current_user: dict = Depends(require_admin),
):
    """Mark employee as exited — immediately stops billing calculations."""
    client = await get_supabase_admin_async()
    update_data = {
        "status": EmployeeStatus.EXITED.value,
        "exit_date": exit_date,
    }
    result = await client.table("employees").update(update_data).eq("id", employee_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Employee not found")
    api_cache.clear_prefix("employees_")
    api_cache.clear_prefix("dashboard_")
    api_cache.clear_prefix("billing_")
    return result.data[0]
