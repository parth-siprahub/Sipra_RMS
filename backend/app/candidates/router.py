"""Candidates CRUD + Admin Review + Exit — aligned with public.candidates table."""
import re
from datetime import date
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
    RevertExitRequest,
    RehireWarning,
)
from app.utils.cache import api_cache
from app.utils.person_names import format_person_name
from app.utils.employee_text import normalize_employee_text
from app.audit.service import log_audit
import logging

logger = logging.getLogger(__name__)

_SEARCH_SAFE_RE = re.compile(r'^[\w\s@.\-]+$')

router = APIRouter(prefix="/candidates", tags=["Candidates"])


def _normalize_candidate_names_dict(data: dict) -> dict:
    """Apply title-style formatting to name fields before persist."""
    out = dict(data)
    for key in ("first_name", "last_name"):
        if key in out and out[key]:
            out[key] = format_person_name(str(out[key])) or ""
    return out


def _candidate_api_row(row: dict | None) -> dict | None:
    if not row:
        return row
    return _normalize_candidate_names_dict(row)


def _enforce_vendor_isolation(record: dict, current_user: dict) -> None:
    """Raise 403 if a VENDOR user tries to access another vendor's candidate."""
    user_role = (current_user.get("role") or "").upper()
    if user_role == "VENDOR":
        user_vendor_id = current_user.get("vendor_id")
        record_vendor_id = record.get("vendor_id")
        if user_vendor_id and record_vendor_id and str(user_vendor_id) != str(record_vendor_id):
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "You do not have permission to access this candidate",
            )

# Valid status transitions — sequential pipeline enforcement
# Correct sequence: NEW → SCREENING → L1_SCHEDULED → L1_COMPLETED → L1_SHORTLIST
# → INTERVIEW_SCHEDULED → SELECTED → WITH_ADMIN → WITH_CLIENT → SUBMITTED_TO_ADMIN → ONBOARDED
ADMIN_REVIEW_TRANSITIONS = {
    CandidateStatus.NEW: [
        CandidateStatus.SCREENING,
        CandidateStatus.SCREEN_REJECT,
    ],
    CandidateStatus.SCREENING: [
        CandidateStatus.L1_SCHEDULED,
        CandidateStatus.SCREEN_REJECT,
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
        CandidateStatus.L1_REJECT,
    ],
    CandidateStatus.INTERVIEW_SCHEDULED: [
        CandidateStatus.SELECTED,
        CandidateStatus.REJECTED_BY_CLIENT,
        CandidateStatus.INTERVIEW_BACK_OUT,
    ],
    CandidateStatus.SELECTED: [
        CandidateStatus.WITH_ADMIN,
        CandidateStatus.OFFER_BACK_OUT,
    ],
    CandidateStatus.WITH_ADMIN: [
        CandidateStatus.WITH_CLIENT,
        CandidateStatus.REJECTED_BY_ADMIN,
    ],
    CandidateStatus.WITH_CLIENT: [
        CandidateStatus.SUBMITTED_TO_ADMIN,
        CandidateStatus.ONBOARDED,  # same-day scenario: direct move allowed
        CandidateStatus.REJECTED_BY_CLIENT,
    ],
    CandidateStatus.SUBMITTED_TO_ADMIN: [
        CandidateStatus.ONBOARDED,
        CandidateStatus.REJECTED_BY_ADMIN,
    ],
    CandidateStatus.ONBOARDED: [
        CandidateStatus.EXIT,
    ],
    # Terminal statuses
    CandidateStatus.L1_REJECT: [],
    CandidateStatus.SCREEN_REJECT: [],
    CandidateStatus.INTERVIEW_BACK_OUT: [],
    CandidateStatus.OFFER_BACK_OUT: [],
    CandidateStatus.REJECTED_BY_ADMIN: [CandidateStatus.ON_HOLD],
    CandidateStatus.REJECTED_BY_CLIENT: [CandidateStatus.ON_HOLD],
    CandidateStatus.ON_HOLD: [CandidateStatus.NEW],
    CandidateStatus.EXIT: [],
}


@router.get("/", response_model=list[CandidateResponse])
async def list_candidates(
    request_id: int | None = None,
    candidate_status: str | None = Query(None, alias="status"),
    search: str | None = Query(None, description="Search by name, email, or phone"),
    page: int = Query(1, ge=1),
    page_size: int = Query(2000, ge=1, le=5000),
    current_user: dict = Depends(get_current_user),
):
    cache_key = f"candidates_list_{request_id}_{candidate_status}_{search}_{page}_{page_size}"
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
    
    if search:
        search = search.strip()
        if not _SEARCH_SAFE_RE.match(search):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid characters in search query")
        # OR filter on key fields (first_name, last_name, email, phone)
        query = query.or_(
            f"first_name.ilike.%{search}%,"
            f"last_name.ilike.%{search}%,"
            f"email.ilike.%{search}%,"
            f"phone.ilike.%{search}%"
        )

    offset = (page - 1) * page_size
    result = await query.order("created_at", desc=True).range(offset, offset + page_size - 1).execute()

    rows = [_candidate_api_row(r) for r in (result.data or [])]
    api_cache.set(cache_key, rows)
    return rows


@router.post("/", response_model=CandidateResponse, status_code=status.HTTP_201_CREATED)
async def create_candidate(
    payload: CandidateCreate,
    current_user: dict = Depends(get_current_user),
):
    client = await get_supabase_admin_async()

    # Duplicate check should only block against currently ONBOARDED records.
    # Rejected/exited pipeline entries are allowed to re-enter for a new role.
    dup_query = (
        client.table("candidates")
        .select("id, first_name, last_name, email, phone")
        .ilike("email", payload.email.strip())
        .eq("status", CandidateStatus.ONBOARDED.value)
        .limit(1)
    )
    dup_result = await dup_query.execute()
    if dup_result.data:
        d = dup_result.data[0]
        full_name = f"{d['first_name']} {d['last_name']}".strip()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": f"A candidate with the email '{payload.email}' already exists in the system.",
                "candidate_name": full_name,
                "candidate_id": d['id'],
                "suggestion": "Please search for the existing candidate profile or use a different email address."
            }
        )


    # Also check by name + phone if phone is provided
    if payload.phone:
        stripped = "".join(c for c in payload.phone if c.isdigit())[-10:]
        if stripped and len(stripped) == 10:
            name_dup = await (
                client.table("candidates")
                .select("id, first_name, last_name, email, phone")
                .ilike("first_name", payload.first_name.strip())
                .ilike("last_name", payload.last_name.strip())
                .eq("status", CandidateStatus.ONBOARDED.value)
                .execute()
            )
            for d in (name_dup.data or []):
                existing_phone = "".join(c for c in (d.get("phone") or "") if c.isdigit())[-10:]
                if existing_phone == stripped:
                    raise HTTPException(
                        status.HTTP_409_CONFLICT,
                        f"Duplicate candidate found: {d['first_name']} {d['last_name']} ({d['email']}). ID: {d['id']}",
                    )

    # Rehire check: look for exited/terminated employees whose linked
    # candidate record has a matching email (case-insensitive).
    # Uses Supabase's embedded resource filtering via the candidates FK.
    rehire_warning = None
    try:
        emp_check = await (
            client.table("employees")
            .select("id, rms_name, exit_date, status, candidates!inner(email)")
            .in_("status", ["EXITED", "TERMINATED"])
            .ilike("candidates.email", payload.email.strip())
            .limit(1)
            .execute()
        )
        if emp_check.data:
            emp = emp_check.data[0]
            pn = emp.get("rms_name")
            rehire_warning = {
                "previous_employee_id": emp["id"],
                "previous_employee_name": (format_person_name(pn) or pn or "Unknown"),
                "exit_date": emp.get("exit_date"),
                "status": emp["status"],
                "message": "This candidate was previously employed. Review before proceeding.",
            }
    except Exception as e:
        logger.warning("Rehire check failed (non-blocking): %s", e)

    data = payload.model_dump(exclude_none=True, mode="json")
    data = _normalize_candidate_names_dict(data)
    # Auto-populate vendor enum from vendor_id — map vendor name to candidate_vendor enum values
    if data.get("vendor_id"):
        try:
            v_row = await client.table("vendors").select("name").eq("id", data["vendor_id"]).single().execute()
            if v_row.data:
                vendor_name_upper = (v_row.data["name"] or "").strip().upper()
                _VENDOR_ENUM = {"WRS", "GFM", "INTERNAL", "ANTEN"}
                if vendor_name_upper in _VENDOR_ENUM:
                    data["vendor"] = vendor_name_upper
                elif vendor_name_upper.startswith("ANTEN"):
                    data["vendor"] = "ANTEN"
                elif vendor_name_upper.startswith("WRS"):
                    data["vendor"] = "WRS"
                elif vendor_name_upper.startswith("GFM"):
                    data["vendor"] = "GFM"
                # else: leave at DB default (INTERNAL)
        except Exception:
            pass  # Non-blocking — vendor_id still saved
    data["owner_id"] = current_user["id"]
    data["status"] = CandidateStatus.NEW.value
    result = await client.table("candidates").insert(data).execute()
    api_cache.clear_prefix("candidates_")
    api_cache.clear_prefix("dashboard_")

    response_data = _candidate_api_row(result.data[0])
    if rehire_warning:
        response_data["rehire_warning"] = rehire_warning
    return response_data


@router.get("/{candidate_id}", response_model=CandidateResponse)
async def get_candidate(candidate_id: int, current_user: dict = Depends(get_current_user)):
    client = await get_supabase_admin_async()
    result = await client.table("candidates").select("*").eq("id", candidate_id).single().execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Candidate not found")
    _enforce_vendor_isolation(result.data, current_user)
    return _candidate_api_row(result.data)


@router.patch("/{candidate_id}", response_model=CandidateResponse)
async def update_candidate(
    candidate_id: int,
    payload: CandidateUpdate,
    current_user: dict = Depends(get_current_user),
):
    client = await get_supabase_admin_async()
    # Vendor isolation: check before allowing update
    existing = await client.table("candidates").select("id, vendor_id, status, onboarding_date").eq("id", candidate_id).single().execute()
    if not existing.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Candidate not found")
    _enforce_vendor_isolation(existing.data, current_user)

    data = payload.model_dump(exclude_none=True, mode="json")
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")
    data = _normalize_candidate_names_dict(data)
    ns = data.get("status")
    if ns is not None:
        ns_val = ns if isinstance(ns, str) else getattr(ns, "value", str(ns))
        if ns_val == CandidateStatus.ONBOARDED.value and existing.data.get("status") != CandidateStatus.ONBOARDED.value:
            if not existing.data.get("onboarding_date") and not data.get("onboarding_date"):
                data["onboarding_date"] = date.today().isoformat()
    try:
        await client.table("candidates").update(data).eq("id", candidate_id).execute()
    except Exception as e:
        error_str = str(e)
        logger.exception("Supabase update failed for candidate %s: %s", candidate_id, e)
        if "22P02" in error_str or "invalid input value for enum" in error_str:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Invalid status value. Please contact an administrator.",
            )
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to update candidate. Please try again.")

    # Re-fetch the full row to guarantee complete response
    refreshed = await client.table("candidates").select("*").eq("id", candidate_id).single().execute()
    if not refreshed.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Candidate not found")
    api_cache.clear_prefix("candidates_")
    api_cache.clear_prefix("dashboard_")
    return _candidate_api_row(refreshed.data)


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
        return _candidate_api_row(existing.data[0])

    # All users must follow the pipeline — sequential transitions only
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
                "Invalid status value. Please contact an administrator.",
            )
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to update candidate status. Please try again.")

    # Re-fetch the full row to guarantee we return complete data
    refreshed = await client.table("candidates").select("*").eq("id", candidate_id).single().execute()
    if not refreshed.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Candidate not found after update")

    await log_audit(
        user=current_user,
        action="STATUS_CHANGE",
        entity_type="candidate",
        entity_id=str(candidate_id),
        old_values={"status": current_status_str},
        new_values={"status": payload.status.value, "remarks": payload.remarks},
    )


    # Transition trigger: auto-create Employee record when status reaches ONBOARDED
    if payload.status == CandidateStatus.ONBOARDED:
        c = refreshed.data
        # Only create if no employee record exists yet
        existing_emp = await client.table("employees").select("id").eq("candidate_id", candidate_id).execute()
        if not existing_emp.data:
            start = c.get("onboarding_date") or date.today().isoformat()
            employee_data = {
                "candidate_id": candidate_id,
                "rms_name": f"{c.get('first_name', '')} {c.get('last_name', '')}".strip(),
                "client_name": c.get("client_email", "").split("@")[0] if c.get("client_email") else None,
                "jira_username": c.get("client_jira_id"),
                "start_date": start,
                "status": "ACTIVE",
                "source": c.get("source"),
            }
            employee_data = {k: v for k, v in employee_data.items() if v is not None}
            employee_data = normalize_employee_text(employee_data)
            try:
                await client.table("employees").insert(employee_data).execute()
                api_cache.clear_prefix("employees_")
                logger.info("Auto-created employee record for candidate %s", candidate_id)
            except Exception as emp_err:
                logger.warning("Employee auto-creation failed for candidate %s: %s", candidate_id, emp_err)

        # Auto-close the linked Resource Request when candidate is onboarded
        request_id = c.get("request_id")
        if request_id:
            try:
                await (
                    client.table("resource_requests")
                    .update({"status": "CLOSED"})
                    .eq("id", request_id)
                    .execute()
                )
                api_cache.clear_prefix("requests_")
                logger.info("Auto-closed resource request %s after candidate %s onboarded", request_id, candidate_id)
            except Exception as rr_err:
                logger.warning("RR auto-close failed for request %s: %s", request_id, rr_err)

    # Safeguard: if status is moved to EXIT via review/manual path, keep employee in sync.
    # (The dedicated /exit endpoint already performs this sync, but review flow can also
    # transition ONBOARDED -> EXIT.)
    if payload.status == CandidateStatus.EXIT:
        try:
            emp_result = await client.table("employees").select("id").eq("candidate_id", candidate_id).execute()
            if emp_result.data:
                emp_id = emp_result.data[0]["id"]
                await client.table("employees").update({
                    "status": "EXITED",
                    "exit_date": refreshed.data.get("last_working_day"),
                }).eq("id", emp_id).execute()
                api_cache.clear_prefix("employees_")
                logger.info("Synced employee %s to EXITED for candidate %s (review flow)", emp_id, candidate_id)
        except Exception as emp_err:
            logger.warning("Employee EXIT sync failed for candidate %s (review flow): %s", candidate_id, emp_err)


    api_cache.clear_prefix("candidates_")
    api_cache.clear_prefix("dashboard_")
    return _candidate_api_row(refreshed.data)


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
    update_data: dict = {
        "status": CandidateStatus.EXIT.value,
        "last_working_day": str(payload.last_working_day),
    }
    if payload.exit_reason:
        update_data["exit_reason"] = payload.exit_reason

    result = await client.table("candidates").update(update_data).eq("id", candidate_id).execute()

    # Sync employee record: mark EXITED and set exit_date
    try:
        emp_result = await client.table("employees").select("id").eq("candidate_id", candidate_id).execute()
        if emp_result.data:
            emp_id = emp_result.data[0]["id"]
            await client.table("employees").update({
                "status": "EXITED",
                "exit_date": str(payload.last_working_day),
            }).eq("id", emp_id).execute()
            api_cache.clear_prefix("employees_")
            logger.info("Auto-updated employee %s to EXITED for candidate %s", emp_id, candidate_id)
    except Exception as emp_err:
        logger.warning("Employee exit sync failed for candidate %s: %s", candidate_id, emp_err)

    await log_audit(
        user=current_user,
        action="STATUS_CHANGE",
        entity_type="candidate",
        entity_id=str(candidate_id),
        old_values={"status": CandidateStatus.ONBOARDED.value},
        new_values={"status": CandidateStatus.EXIT.value, "last_working_day": str(payload.last_working_day)},
    )

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
    refreshed_exit = await client.table("candidates").select("*").eq("id", candidate_id).single().execute()
    return _candidate_api_row(refreshed_exit.data)


@router.patch("/{candidate_id}/revert-exit", response_model=CandidateResponse)
async def revert_exit(
    candidate_id: int,
    payload: RevertExitRequest = RevertExitRequest(),
    current_user: dict = Depends(get_current_user),
):
    """Revert an accidental exit — restore candidate to chosen pipeline status and employee to ACTIVE."""
    client = await get_supabase_admin_async()
    existing = await client.table("candidates").select("*").eq("id", candidate_id).single().execute()
    if not existing.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Candidate not found")

    if existing.data["status"] != CandidateStatus.EXIT.value:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Only exited candidates can be reverted",
        )

    target = payload.target_status.value if payload.target_status else CandidateStatus.ONBOARDED.value

    # Restore candidate to target status, clear exit fields
    await client.table("candidates").update({
        "status": target,
        "exit_reason": None,
        "last_working_day": None,
    }).eq("id", candidate_id).execute()

    # Restore linked employee to ACTIVE, clear exit_date
    try:
        emp_result = await client.table("employees").select("id").eq("candidate_id", candidate_id).execute()
        if emp_result.data:
            emp_id = emp_result.data[0]["id"]
            await client.table("employees").update({
                "status": "ACTIVE",
                "exit_date": None,
            }).eq("id", emp_id).execute()
            api_cache.clear_prefix("employees_")
            logger.info("Reverted employee %s to ACTIVE for candidate %s", emp_id, candidate_id)
    except Exception as emp_err:
        logger.warning("Employee revert failed for candidate %s: %s", candidate_id, emp_err)

    refreshed = await client.table("candidates").select("*").eq("id", candidate_id).single().execute()

    await log_audit(
        user=current_user,
        action="EXIT_REVERTED",
        entity_type="candidate",
        entity_id=str(candidate_id),
        old_values={"status": CandidateStatus.EXIT.value},
        new_values={"status": target},
    )

    api_cache.clear_prefix("candidates_")
    api_cache.clear_prefix("dashboard_")
    return _candidate_api_row(refreshed.data)
