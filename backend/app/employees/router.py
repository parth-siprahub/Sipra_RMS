"""Employees CRUD + Onboarding Transition — aligned with public.employees table."""
import re
import logging
from datetime import date
from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.auth.dependencies import get_current_user, require_admin
from app.database import get_supabase_admin_async
from app.employees.schemas import EmployeeCreate, EmployeeUpdate, EmployeeResponse, EmployeeStatus
from app.utils.cache import api_cache
from app.utils.person_names import format_person_name
from app.utils.employee_text import normalize_employee_text

_SEARCH_SAFE_RE = re.compile(r'^[\w\s@.\-]+$')

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/employees", tags=["Employees"])


def _employee_api_row(row: dict) -> dict:
    """Ensure rms_name is display-normalized in API responses (legacy rows)."""
    if not row or not row.get("rms_name"):
        return row
    return {**row, "rms_name": format_person_name(row["rms_name"]) or row["rms_name"]}


@router.get("/", response_model=list[EmployeeResponse])
async def list_employees(
    employee_status: str | None = None,
    search: str | None = Query(None, description="Search by name, email, or username"),
    exclude_system: str | None = Query(None, description="Exclude employees already linked to a system (e.g., 'JIRA', 'AWS')"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000),
    current_user: dict = Depends(get_current_user),
):
    if search:
        search = search.strip()
        if not _SEARCH_SAFE_RE.match(search):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid characters in search query")

    cache_key = f"employees_list_{employee_status}_{(search or '').lower()}_{exclude_system}_{page}_{page_size}"
    cached = api_cache.get(cache_key)
    if cached:
        return cached

    client = await get_supabase_admin_async()
    query = client.table("employees").select("*")
    if employee_status:
        query = query.eq("status", employee_status)
    if search:
        # Case-insensitive substring search across multiple fields
        query = query.or_(
            f"rms_name.ilike.%{search}%,"
            f"aws_email.ilike.%{search}%,"
            f"jira_username.ilike.%{search}%,"
            f"siprahub_email.ilike.%{search}%"
        )

    if exclude_system:
        # Fetch IDs already mapped to this system
        exclude_result = await client.table("employee_system_mappings")\
            .select("employee_id")\
            .eq("system_name", exclude_system.upper())\
            .execute()
        
        mapped_ids = [r["employee_id"] for r in (exclude_result.data or []) if r.get("employee_id")]
        if mapped_ids:
            query = query.not_.in_("id", mapped_ids)

    offset = (page - 1) * page_size
    result = await query.order("created_at", desc=True).range(offset, offset + page_size - 1).execute()
    employees = result.data or []

    # Batch-fetch job profile names + sow_number via candidate -> resource_request -> job_profile/sow
    candidate_ids = [e["candidate_id"] for e in employees if e.get("candidate_id")]
    job_profile_map: dict[int, str] = {}
    sow_number_map: dict[int, str] = {}
    cand_onboarding: dict[int, object | None] = {}
    if candidate_ids:
        cands = await client.table("candidates").select("id,request_id,onboarding_date").in_("id", candidate_ids).execute()
        request_ids = [c["request_id"] for c in (cands.data or []) if c.get("request_id")]
        cand_onboarding = {c["id"]: c.get("onboarding_date") for c in (cands.data or []) if c.get("id")}
        cand_to_req = {c["id"]: c["request_id"] for c in (cands.data or []) if c.get("request_id")}
        if request_ids:
            rrs = await client.table("resource_requests").select("id,job_profile_id,sow_id").in_("id", request_ids).execute()
            jp_ids = [r["job_profile_id"] for r in (rrs.data or []) if r.get("job_profile_id")]
            sow_ids = [r["sow_id"] for r in (rrs.data or []) if r.get("sow_id")]
            req_to_jp = {r["id"]: r["job_profile_id"] for r in (rrs.data or []) if r.get("job_profile_id")}
            req_to_sow = {r["id"]: r["sow_id"] for r in (rrs.data or []) if r.get("sow_id")}
            if jp_ids:
                jps = await client.table("job_profiles").select("id,role_name").in_("id", jp_ids).execute()
                jp_to_name = {j["id"]: j["role_name"] for j in (jps.data or [])}
                for cid, rid in cand_to_req.items():
                    jpid = req_to_jp.get(rid)
                    if jpid and jpid in jp_to_name:
                        job_profile_map[cid] = jp_to_name[jpid]
            if sow_ids:
                sows = await client.table("sows").select("id,sow_number").in_("id", sow_ids).execute()
                sow_to_number = {s["id"]: s["sow_number"] for s in (sows.data or [])}
                for cid, rid in cand_to_req.items():
                    sowid = req_to_sow.get(rid)
                    if sowid and sowid in sow_to_number:
                        sow_number_map[cid] = sow_to_number[sowid]

    enriched = []
    for e in employees:
        cid = e.get("candidate_id")
        merged = {
            **e,
            "job_profile_name": job_profile_map.get(cid) if cid else None,
            "sow_number": sow_number_map.get(cid) if cid else None,
            "source": e.get("source"),
            "start_date": e.get("start_date") or (cand_onboarding.get(cid) if cid else None),
        }
        enriched.append(_employee_api_row(merged))
    api_cache.set(cache_key, enriched)
    return enriched


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
        return _employee_api_row(result.data[0])
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
    effective_start = c.get("onboarding_date") or date.today().isoformat()
    if not c.get("onboarding_date"):
        await client.table("candidates").update({"onboarding_date": effective_start}).eq("id", candidate_id).execute()
    employee_data = {
        "candidate_id": candidate_id,
        "rms_name": f"{c.get('first_name', '')} {c.get('last_name', '')}".strip(),
        "client_name": c.get("client_email", "").split("@")[0] if c.get("client_email") else None,
        "jira_username": c.get("client_jira_id"),
        "start_date": effective_start,
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
        return _employee_api_row(result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Employee transition error: %s", str(e))
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Operation failed. Please check input and try again.")


@router.get("/profiles/list", tags=["Employees"])
async def list_profiles(
    search: str | None = Query(None, description="Search by name or email"),
    exclude_linked: bool = Query(False, description="Exclude profiles already linked to an employee"),
    current_user: dict = Depends(require_admin)
):
    """Return all user profiles with their current employee link."""
    client = await get_supabase_admin_async()
    query = client.table("profiles").select("id, full_name, email, role, employee_id")
    
    if search:
        query = query.or_(f"full_name.ilike.%{search}%,email.ilike.%{search}%")
    
    if exclude_linked:
        query = query.is_("employee_id", "null")
        
    result = await query.order("full_name").execute()
    rows = result.data or []
    return [
        {
            **p,
            "full_name": (format_person_name(p.get("full_name")) if p.get("full_name") else p.get("full_name")),
        }
        for p in rows
    ]


@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee(employee_id: int, current_user: dict = Depends(get_current_user)):
    client = await get_supabase_admin_async()
    result = await client.table("employees").select("*").eq("id", employee_id).single().execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Employee not found")
    return _employee_api_row(result.data)


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
    return _employee_api_row(result.data[0])


@router.patch("/{employee_id}/exit", response_model=EmployeeResponse)
async def exit_employee(
    employee_id: int,
    exit_date: date,
    current_user: dict = Depends(require_admin),
):
    """Mark employee as exited — immediately stops billing calculations."""
    client = await get_supabase_admin_async()
    update_data = {
        "status": EmployeeStatus.EXITED.value,
        "exit_date": exit_date.isoformat(),
    }
    result = await client.table("employees").update(update_data).eq("id", employee_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Employee not found")
    api_cache.clear_prefix("employees_")
    api_cache.clear_prefix("dashboard_")
    api_cache.clear_prefix("billing_")
    return _employee_api_row(result.data[0])


# ──────────────────────────────────────────────
# Profile ↔ Employee linking
# ──────────────────────────────────────────────

@router.post("/{employee_id}/link-profile", tags=["Employees"])
async def link_profile(
    employee_id: int,
    profile_id: str,
    current_user: dict = Depends(require_admin),
):
    """Link a user profile to this employee record."""
    client = await get_supabase_admin_async()

    # Verify employee exists
    emp = await client.table("employees").select("id").eq("id", employee_id).execute()
    if not emp.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Employee not found")

    # Verify profile exists
    prof = await client.table("profiles").select("id").eq("id", profile_id).execute()
    if not prof.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Profile not found")

    # Detach any existing profile linked to this employee first
    await client.table("profiles").update({"employee_id": None}).eq("employee_id", employee_id).execute()

    # Link the chosen profile
    await client.table("profiles").update({"employee_id": employee_id}).eq("id", profile_id).execute()

    api_cache.clear_prefix("employees_")
    return {"employee_id": employee_id, "profile_id": profile_id}


@router.delete("/{employee_id}/link-profile", tags=["Employees"])
async def unlink_profile(
    employee_id: int,
    current_user: dict = Depends(require_admin),
):
    """Remove the profile link from this employee."""
    client = await get_supabase_admin_async()
    await client.table("profiles").update({"employee_id": None}).eq("employee_id", employee_id).execute()
    api_cache.clear_prefix("employees_")
    return {"employee_id": employee_id, "profile_id": None}
