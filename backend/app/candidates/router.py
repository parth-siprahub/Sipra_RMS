"""Candidates CRUD + Admin Review + Exit — aligned with public.candidates table."""
from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.auth.dependencies import get_current_user, require_admin
from app.database import get_supabase_admin
from app.candidates.schemas import (
    CandidateCreate,
    CandidateUpdate,
    CandidateResponse,
    CandidateStatus,
    AdminReview,
    ExitRequest,
)

router = APIRouter(prefix="/candidates", tags=["Candidates"])

# Valid status transitions for admin review
ADMIN_REVIEW_TRANSITIONS = {
    CandidateStatus.SUBMITTED_TO_ADMIN: [
        CandidateStatus.WITH_ADMIN,
        CandidateStatus.REJECTED_BY_ADMIN,
    ],
    CandidateStatus.WITH_ADMIN: [
        CandidateStatus.WITH_CLIENT,
        CandidateStatus.REJECTED_BY_ADMIN,
    ],
    CandidateStatus.WITH_CLIENT: [
        CandidateStatus.INTERVIEW_SCHEDULED,
        CandidateStatus.SELECTED,
        CandidateStatus.REJECTED_BY_CLIENT,
        CandidateStatus.ON_HOLD,
    ],
    CandidateStatus.INTERVIEW_SCHEDULED: [
        CandidateStatus.SELECTED,
        CandidateStatus.REJECTED_BY_CLIENT,
        CandidateStatus.ON_HOLD,
    ],
    CandidateStatus.SELECTED: [
        CandidateStatus.ONBOARDED,
    ],
}


@router.get("/", response_model=list[CandidateResponse])
def list_candidates(
    request_id: int | None = None,
    candidate_status: str | None = Query(None, alias="status"),
    current_user: dict = Depends(get_current_user),
):
    client = get_supabase_admin()
    query = client.table("candidates").select("*")
    if request_id:
        query = query.eq("request_id", request_id)
    if candidate_status:
        query = query.eq("status", candidate_status)
    result = query.order("created_at", desc=True).execute()
    return result.data


@router.post("/", response_model=CandidateResponse, status_code=status.HTTP_201_CREATED)
def create_candidate(
    payload: CandidateCreate,
    current_user: dict = Depends(get_current_user),
):
    client = get_supabase_admin()
    data = payload.model_dump(exclude_none=True, mode="json")
    data["owner_id"] = current_user["id"]
    data["status"] = CandidateStatus.NEW.value
    result = client.table("candidates").insert(data).execute()
    return result.data[0]


@router.get("/{candidate_id}", response_model=CandidateResponse)
def get_candidate(candidate_id: int, current_user: dict = Depends(get_current_user)):
    client = get_supabase_admin()
    result = client.table("candidates").select("*").eq("id", candidate_id).single().execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Candidate not found")
    return result.data


@router.patch("/{candidate_id}", response_model=CandidateResponse)
def update_candidate(
    candidate_id: int,
    payload: CandidateUpdate,
    current_user: dict = Depends(get_current_user),
):
    client = get_supabase_admin()
    data = payload.model_dump(exclude_none=True, mode="json")
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")
    result = client.table("candidates").update(data).eq("id", candidate_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Candidate not found")
    return result.data[0]


@router.patch("/{candidate_id}/review", response_model=CandidateResponse)
def admin_review_candidate(
    candidate_id: int,
    payload: AdminReview,
    current_user: dict = Depends(require_admin),
):
    """Admin approves/rejects candidate or sends to client."""
    client = get_supabase_admin()
    # Fetch current status
    existing = client.table("candidates").select("status").eq("id", candidate_id).single().execute()
    if not existing.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Candidate not found")

    current_status = CandidateStatus(existing.data["status"])
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

    result = client.table("candidates").update(update_data).eq("id", candidate_id).execute()
    return result.data[0]


@router.patch("/{candidate_id}/exit", response_model=CandidateResponse)
def process_exit(
    candidate_id: int,
    payload: ExitRequest,
    current_user: dict = Depends(get_current_user),
):
    """Process candidate exit and optionally create a backfill request."""
    client = get_supabase_admin()
    # Fetch current candidate
    existing = client.table("candidates").select("*").eq("id", candidate_id).single().execute()
    if not existing.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Candidate not found")

    if existing.data["status"] != CandidateStatus.ONBOARDED.value:
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
    result = client.table("candidates").update(update_data).eq("id", candidate_id).execute()

    # Auto-create backfill request if requested
    if payload.create_backfill and existing.data.get("request_id"):
        from app.resource_requests.service import generate_request_id

        count_result = client.table("resource_requests").select("id", count="exact").execute()
        seq = (count_result.count or 0) + 1
        display_id = generate_request_id(seq)

        # Get the original request's job_profile_id and sow_id
        original_req = (
            client.table("resource_requests")
            .select("job_profile_id,sow_id")
            .eq("id", existing.data["request_id"])
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
        client.table("resource_requests").insert(backfill_data).execute()

    return result.data[0]
