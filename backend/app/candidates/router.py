"""Candidates CRUD + Admin Review + Exit — aligned with public.candidates table."""
from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.auth.dependencies import get_current_user, require_admin
from app.database import get_supabase_admin_async
from app.candidates.schemas import (
    CandidateCreate,
    CandidateUpdate,
    CandidateResponse,
    CandidateStatus,
    AdminReview,
    ExitRequest,
)
from app.utils.cache import api_cache
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/candidates", tags=["Candidates"])

# Valid status transitions for pipeline stages
ADMIN_REVIEW_TRANSITIONS = {
    CandidateStatus.NEW: [
        CandidateStatus.SCREENING,
        CandidateStatus.SUBMITTED_TO_ADMIN,
        CandidateStatus.WITH_ADMIN,
        CandidateStatus.REJECTED_BY_ADMIN,
        CandidateStatus.SCREEN_REJECT,
    ],
    CandidateStatus.SCREENING: [
        CandidateStatus.SUBMITTED_TO_ADMIN,
        CandidateStatus.WITH_ADMIN,
        CandidateStatus.SCREEN_REJECT,
    ],
    CandidateStatus.SUBMITTED_TO_ADMIN: [
        CandidateStatus.WITH_ADMIN,
        CandidateStatus.REJECTED_BY_ADMIN,
        CandidateStatus.SCREEN_REJECT,
    ],
    CandidateStatus.WITH_ADMIN: [
        CandidateStatus.WITH_CLIENT,
        CandidateStatus.REJECTED_BY_ADMIN,
    ],
    CandidateStatus.WITH_CLIENT: [
        CandidateStatus.L1_SCHEDULED,
        CandidateStatus.INTERVIEW_SCHEDULED,
        CandidateStatus.SELECTED,
        CandidateStatus.REJECTED_BY_CLIENT,
        CandidateStatus.ON_HOLD,
    ],
    CandidateStatus.L1_SCHEDULED: [
        CandidateStatus.L1_COMPLETED,
        CandidateStatus.L1_REJECT,
        CandidateStatus.INTERVIEW_BACK_OUT,
    ],
    CandidateStatus.L1_COMPLETED: [
        CandidateStatus.L1_SHORTLIST,
        CandidateStatus.L1_REJECT,
    ],
    CandidateStatus.L1_SHORTLIST: [
        CandidateStatus.INTERVIEW_SCHEDULED,
        CandidateStatus.SELECTED,
        CandidateStatus.REJECTED_BY_CLIENT,
        CandidateStatus.ON_HOLD,
    ],
    CandidateStatus.INTERVIEW_SCHEDULED: [
        CandidateStatus.SELECTED,
        CandidateStatus.REJECTED_BY_CLIENT,
        CandidateStatus.ON_HOLD,
        CandidateStatus.INTERVIEW_BACK_OUT,
    ],
    CandidateStatus.SELECTED: [
        CandidateStatus.ONBOARDED,
        CandidateStatus.OFFER_BACK_OUT,
    ],
    # Terminal statuses — no transitions out
    CandidateStatus.L1_REJECT: [],
    CandidateStatus.SCREEN_REJECT: [],
    CandidateStatus.INTERVIEW_BACK_OUT: [],
    CandidateStatus.OFFER_BACK_OUT: [],
}


@router.get("/", response_model=list[CandidateResponse])
async def list_candidates(
    request_id: int | None = None,
    candidate_status: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
):
    cache_key = f"candidates_list_{request_id}_{candidate_status}_{page}_{page_size}"
    cached = api_cache.get(cache_key)
    if cached:
        return cached

    client = await get_supabase_admin_async()
    query = client.table("candidates").select("*")
    # Application-level RLS: vendors can only see their own candidates
    user_role = current_user.get("role", "").upper()
    if user_role == "VENDOR":
        vendor_id = current_user.get("vendor_id")
        if vendor_id:
            query = query.eq("vendor_id", vendor_id)
    if request_id:
        query = query.eq("request_id", request_id)
    if candidate_status:
        query = query.eq("status", candidate_status)
    offset = (page - 1) * page_size
    result = await query.order("created_at", desc=True).range(offset, offset + page_size - 1).execute()
    api_cache.set(cache_key, result.data)
    return result.data


@router.post("/", response_model=CandidateResponse, status_code=status.HTTP_201_CREATED)
async def create_candidate(
    payload: CandidateCreate,
    current_user: dict = Depends(get_current_user),
):
    client = await get_supabase_admin_async()
    data = payload.model_dump(exclude_none=True, mode="json")
    data["owner_id"] = current_user["id"]
    data["status"] = CandidateStatus.NEW.value
    result = await client.table("candidates").insert(data).execute()
    api_cache.clear_prefix("candidates_")
    api_cache.clear_prefix("dashboard_")
    return result.data[0]


@router.get("/{candidate_id}", response_model=CandidateResponse)
async def get_candidate(candidate_id: int, current_user: dict = Depends(get_current_user)):
    client = await get_supabase_admin_async()
    result = await client.table("candidates").select("*").eq("id", candidate_id).single().execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Candidate not found")
    return result.data


@router.patch("/{candidate_id}", response_model=CandidateResponse)
async def update_candidate(
    candidate_id: int,
    payload: CandidateUpdate,
    current_user: dict = Depends(get_current_user),
):
    client = await get_supabase_admin_async()
    data = payload.model_dump(exclude_none=True, mode="json")
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")
    try:
        await client.table("candidates").update(data).eq("id", candidate_id).execute()
    except Exception as e:
        error_str = str(e)
        logger.exception("Supabase update failed for candidate %s: %s", candidate_id, e)
        if "22P02" in error_str or "invalid input value for enum" in error_str:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "A status value is not registered in the database enum. "
                "Run migration 002_add_missing_candidate_statuses.sql in Supabase SQL Editor.",
            )
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Operation failed. Please try again.")

    # Re-fetch the full row to guarantee complete response
    refreshed = await client.table("candidates").select("*").eq("id", candidate_id).single().execute()
    if not refreshed.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Candidate not found")
    api_cache.clear_prefix("candidates_")
    api_cache.clear_prefix("dashboard_")
    return refreshed.data


@router.patch("/{candidate_id}/review", response_model=CandidateResponse)
async def admin_review_candidate(
    candidate_id: int,
    payload: AdminReview,
    current_user: dict = Depends(get_current_user),
):
    """Move candidate to a new pipeline status (drag-drop or manual)."""
    client = await get_supabase_admin_async()
    existing = await client.table("candidates").select("*").eq("id", candidate_id).execute()
    if not existing.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Candidate not found")

    current_status_str = existing.data[0].get("status", "")
    if current_status_str == payload.status.value:
        # No change needed — return current record
        return existing.data[0]

    # Admin/HR can make any transition; vendor users must follow the pipeline
    user_role = current_user.get("role", "").upper()
    if user_role == "VENDOR":
        try:
            current_status = CandidateStatus(current_status_str)
        except ValueError:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"Current status '{current_status_str}' is not a recognized pipeline stage.",
            )
        allowed = ADMIN_REVIEW_TRANSITIONS.get(current_status, [])
        if payload.status not in allowed:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"Cannot transition from {current_status.value} to {payload.status.value}. "
                f"Allowed: {[s.value for s in allowed]}",
            )

    update_data: dict = {"status": payload.status.value}
    if payload.remarks:
        update_data["remarks"] = payload.remarks

    try:
        await client.table("candidates").update(update_data).eq("id", candidate_id).execute()
    except Exception as e:
        error_str = str(e)
        logger.exception("Supabase update failed for candidate %s: %s", candidate_id, e)
        # Detect PostgreSQL enum mismatch (22P02) and give actionable message
        if "22P02" in error_str or "invalid input value for enum" in error_str:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"Status '{payload.status.value}' is not yet registered in the database enum. "
                "Please run the migration SQL (backend/migrations/002_add_missing_candidate_statuses.sql) "
                "in Supabase SQL Editor.",
            )
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Operation failed. Please try again.")

    # Re-fetch the full row to guarantee we return complete data
    refreshed = await client.table("candidates").select("*").eq("id", candidate_id).single().execute()
    if not refreshed.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Candidate not found after update")

    # Transition trigger: auto-create Employee record when status reaches ONBOARDED
    if payload.status == CandidateStatus.ONBOARDED:
        c = refreshed.data
        # Only create if no employee record exists yet
        existing_emp = await client.table("employees").select("id").eq("candidate_id", candidate_id).execute()
        if not existing_emp.data:
            employee_data = {
                "candidate_id": candidate_id,
                "rms_name": f"{c.get('first_name', '')} {c.get('last_name', '')}".strip(),
                "client_name": c.get("client_email", "").split("@")[0] if c.get("client_email") else None,
                "jira_username": c.get("client_jira_id"),
                "start_date": c.get("onboarding_date"),
                "status": "ACTIVE",
            }
            employee_data = {k: v for k, v in employee_data.items() if v is not None}
            try:
                await client.table("employees").insert(employee_data).execute()
                api_cache.clear_prefix("employees_")
                logger.info("Auto-created employee record for candidate %s", candidate_id)
            except Exception as emp_err:
                logger.warning("Employee auto-creation failed for candidate %s: %s", candidate_id, emp_err)

    api_cache.clear_prefix("candidates_")
    api_cache.clear_prefix("dashboard_")
    return refreshed.data


@router.patch("/{candidate_id}/exit", response_model=CandidateResponse)
async def process_exit(
    candidate_id: int,
    payload: ExitRequest,
    current_user: dict = Depends(get_current_user),
):
    """Process candidate exit and optionally create a backfill request."""
    client = await get_supabase_admin_async()
    existing = await client.table("candidates").select("*").eq("id", candidate_id).execute()
    if not existing.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Candidate not found")

    if existing.data[0]["status"] != CandidateStatus.ONBOARDED.value:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Only ONBOARDED candidates can be exited",
        )

    # Update candidate to EXIT status
    update_data = {
        "status": CandidateStatus.EXIT.value,
        "exit_reason": payload.exit_reason,
        "last_working_day": str(payload.last_working_day),
    }
    result = await client.table("candidates").update(update_data).eq("id", candidate_id).execute()

    # Auto-create backfill request if requested
    if payload.create_backfill and existing.data[0].get("request_id"):
        from app.resource_requests.service import generate_request_id

        count_result = await client.table("resource_requests").select("id", count="exact").execute()
        seq = (count_result.count or 0) + 1
        display_id = generate_request_id(seq)

        # Get the original request's job_profile_id and sow_id
        original_req = (
            await client.table("resource_requests")
            .select("job_profile_id,sow_id")
            .eq("id", existing.data[0]["request_id"])
            .single()
            .execute()
        )

        backfill_data = {
            "request_display_id": display_id,
            "job_profile_id": original_req.data.get("job_profile_id") if original_req.data else None,
            "sow_id": original_req.data.get("sow_id") if original_req.data else None,
            "priority": "HIGH",
            "status": "OPEN",
            "is_backfill": True,
            "replacement_for_candidate_id": candidate_id,
            "created_by_id": current_user["id"],
        }
        # Remove None values
        backfill_data = {k: v for k, v in backfill_data.items() if v is not None}
        await client.table("resource_requests").insert(backfill_data).execute()
        api_cache.clear_prefix("requests_")

    api_cache.clear_prefix("candidates_")
    api_cache.clear_prefix("dashboard_")
    return result.data[0]
