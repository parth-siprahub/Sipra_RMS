"""Analytics API — chart-ready aggregated endpoints."""
import logging
from datetime import date as date_type
from fastapi import APIRouter, Depends, Query
from app.auth.dependencies import get_current_user
from app.database import get_supabase_admin_async
from app.analytics import service
from app.analytics.schemas import (
    ResourcesOverview,
    PaginatedTable,
    PipelineFunnel,
    RequirementTracker,
    LabelValue,
    DailyStatusMatrix,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


# ── Shared query param helpers ─────────────────────────────────────────────────

def _date_filters(q, start_date: str | None, end_date: str | None):
    """Apply optional date range filter on created_at."""
    if start_date:
        q = q.gte("created_at", f"{start_date}T00:00:00")
    if end_date:
        q = q.lte("created_at", f"{end_date}T23:59:59")
    return q


def _scope_recruiter_id(
    requested_recruiter_id: str | None,
    current_user: dict,
) -> str | None:
    """Enforce role-based scoping.

    Recruiters can only see their own data regardless of the ?recruiter_id query param.
    Admins and other elevated roles pass the requested_recruiter_id through unchanged.
    """
    role = (current_user.get("role") or "").lower()
    if role == "recruiter":
        return str(current_user["id"])
    return requested_recruiter_id


_INACTIVE_STATUSES = ("ONBOARDED", "EXIT")


async def _fetch_candidates(
    client,
    start_date: str | None,
    end_date: str | None,
    recruiter_id: str | None,
    columns: str = "id,first_name,last_name,status,source,skills,vendor,request_id,created_at",
) -> list[dict]:
    """Fetch active-pipeline candidates only (excludes ONBOARDED / EXIT).

    Used for pipeline-specific views (funnel, requirement tracker).
    For employee-based analytics, use _fetch_active_employee_candidates instead.
    """
    q = client.table("candidates").select(columns)
    q = _date_filters(q, start_date, end_date)
    if recruiter_id:
        q = q.eq("owner_id", recruiter_id)
    # Exclude terminal statuses — those candidates are placed employees, not pipeline
    q = q.not_.in_("status", list(_INACTIVE_STATUSES))
    res = await q.range(0, 9999).execute()
    return res.data or []


async def _fetch_active_employee_candidates(
    client,
    recruiter_id: str | None,
    columns: str = "id,first_name,last_name,status,source,skills,vendor,request_id,created_at",
) -> list[dict]:
    """Fetch candidates linked to ACTIVE employees — mirrors the Employees page count.

    Starts from employees WHERE status='ACTIVE', resolves candidate_id, then
    fetches those candidate records.  This is the correct base for analytics
    charts that should reflect placed headcount (Role Distribution, Source Channel).
    Date filters are intentionally not applied — we want the current active headcount.
    """
    emp_res = await (
        client.table("employees")
        .select("id,candidate_id")
        .eq("status", "ACTIVE")
        .range(0, 9999)
        .execute()
    )
    employees = emp_res.data or []
    candidate_ids = [e["candidate_id"] for e in employees if e.get("candidate_id")]
    if not candidate_ids:
        return []
    q = client.table("candidates").select(columns).in_("id", candidate_ids)
    if recruiter_id:
        q = q.eq("owner_id", recruiter_id)
    res = await q.range(0, 9999).execute()
    return res.data or []


async def _fetch_resource_requests(
    client,
    start_date: str | None,
    end_date: str | None,
) -> list[dict]:
    """Fetch OPEN resource_requests only (active demand), with optional date filter."""
    q = client.table("resource_requests").select(
        "id,status,job_profile_id,created_at"
    ).eq("status", "OPEN")
    q = _date_filters(q, start_date, end_date)
    res = await q.range(0, 9999).execute()
    return res.data or []


async def _fetch_all_resource_requests(
    client,
    start_date: str | None,
    end_date: str | None,
) -> list[dict]:
    """Fetch ALL resource_requests regardless of status, with optional date filter.

    Used for the Daily Status Matrix which should reflect the full picture
    of where active employees were placed.
    """
    q = client.table("resource_requests").select(
        "id,status,job_profile_id,created_at"
    )
    q = _date_filters(q, start_date, end_date)
    res = await q.range(0, 9999).execute()
    return res.data or []


# ── Resources ─────────────────────────────────────────────────────────────────

@router.get("/resources/skills", response_model=ResourcesOverview)
async def get_resources_skills(
    start_date: str | None = Query(None, description="YYYY-MM-DD"),
    end_date: str | None = Query(None, description="YYYY-MM-DD"),
    recruiter_id: str | None = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Candidates total + role distribution (grouped by job_profiles.role_name)."""
    recruiter_id = _scope_recruiter_id(recruiter_id, current_user)
    client = await get_supabase_admin_async()

    # Base on ACTIVE employees — mirrors what the Employees page shows
    candidates = await _fetch_active_employee_candidates(
        client, recruiter_id,
        columns="id,request_id,created_at",
    )

    # Build role distribution: candidate → request → job_profile → role_name
    req_to_jp: dict[int, int] = {}
    jp_name_map: dict[int, str] = {}

    request_ids = list({c["request_id"] for c in candidates if c.get("request_id")})
    if request_ids:
        rr_res = await (
            client.table("resource_requests")
            .select("id,job_profile_id")
            .in_("id", request_ids)
            .execute()
        )
        req_to_jp = {
            r["id"]: r["job_profile_id"]
            for r in (rr_res.data or []) if r.get("job_profile_id")
        }
        jp_ids = list(set(req_to_jp.values()))
        if jp_ids:
            jp_res = await (
                client.table("job_profiles")
                .select("id,role_name")
                .in_("id", jp_ids)
                .execute()
            )
            jp_name_map = {
                jp["id"]: (jp.get("role_name") or f"Profile #{jp['id']}")
                for jp in (jp_res.data or [])
            }

    # Count ALL candidates (including those without a linked request → "Unassigned")
    role_counts: dict[str, int] = {}
    for c in candidates:
        rid = c.get("request_id")
        jp_id = req_to_jp.get(int(rid)) if rid else None
        role = jp_name_map.get(jp_id, "Unassigned") if jp_id else "Unassigned"
        role_counts[role] = role_counts.get(role, 0) + 1

    return service.build_resources_overview(candidates, role_counts if role_counts else None)


# ── Talent Acquisition ────────────────────────────────────────────────────────

@router.get("/ta/hiring-type", response_model=list[dict])
async def get_hiring_type(
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    recruiter_id: str | None = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Bar chart: active employees grouped by hiring source/channel."""
    recruiter_id = _scope_recruiter_id(recruiter_id, current_user)
    client = await get_supabase_admin_async()
    # Base on ACTIVE employees so it matches the 147 headcount
    candidates = await _fetch_active_employee_candidates(
        client, recruiter_id,
        columns="id,source,vendor",
    )
    # Build case-insensitive vendor name lookup for source normalisation
    # e.g. "Anten" → "ANTEN", "WRS" → "WRS"
    vendors_res = await client.table("vendors").select("name").execute()
    vendor_name_map: dict[str, str] = {
        v["name"].upper(): v["name"] for v in (vendors_res.data or [])
    }
    result = service.build_hiring_type(candidates, vendor_name_map)
    return [r.model_dump() for r in result]


@router.get("/ta/client-demand", response_model=list[dict])
async def get_client_demand(
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    recruiter_id: str | None = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Bar chart: open resource requests grouped by client name."""
    recruiter_id = _scope_recruiter_id(recruiter_id, current_user)
    client = await get_supabase_admin_async()

    # Fetch open resource requests
    q = client.table("resource_requests").select("id,sow_id,status,created_at")
    q = _date_filters(q, start_date, end_date)
    requests_res = await q.range(0, 9999).execute()
    requests = requests_res.data or []

    # Fetch sows for client names
    sow_ids = list({r["sow_id"] for r in requests if r.get("sow_id")})
    sow_map: dict[str, dict] = {}
    if sow_ids:
        sow_res = await (
            client.table("sows")
            .select("id,client_name")
            .in_("id", sow_ids)
            .execute()
        )
        sow_map = {str(s["id"]): s for s in (sow_res.data or [])}

    result = service.build_client_demand(requests, sow_map)
    return [r.model_dump() for r in result]


@router.get("/ta/employment-type", response_model=list[dict])
async def get_employment_type(
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    recruiter_id: str | None = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Doughnut chart: Contract (has vendor) vs Direct candidates."""
    recruiter_id = _scope_recruiter_id(recruiter_id, current_user)
    client = await get_supabase_admin_async()
    candidates = await _fetch_candidates(
        client, start_date, end_date, recruiter_id,
        columns="id,vendor,created_at,owner_id",
    )
    result = service.build_employment_type(candidates)
    return [r.model_dump() for r in result]


@router.get("/resources/payroll", response_model=list[dict])
async def get_payroll_segregation(
    start_date: str | None = Query(None, description="YYYY-MM-DD"),
    end_date: str | None = Query(None, description="YYYY-MM-DD"),
    recruiter_id: str | None = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Doughnut chart: employee distribution by payroll source (mirrors Employees page)."""
    client = await get_supabase_admin_async()
    emp_res = await client.table("employees").select("id,source").eq("status", "ACTIVE").range(0, 9999).execute()
    employees = emp_res.data or []
    result = service.build_payroll_segregation(employees)
    return [r.model_dump() for r in result]


@router.get("/ta/hiring-type-split", response_model=list[LabelValue])
async def get_hiring_type_split(
    start_date: str | None = Query(None, description="YYYY-MM-DD"),
    end_date: str | None = Query(None, description="YYYY-MM-DD"),
    current_user: dict = Depends(get_current_user),
):
    """Pie chart: New vs Backfill — per active employee (147 total).

    Each active employee is classified based on whether their placement
    resource request had is_backfill=True.  Total always equals the active
    employee headcount, not the number of resource requests.
    """
    client = await get_supabase_admin_async()

    # Get active employees' candidates (need request_id to look up is_backfill)
    emp_candidates = await _fetch_active_employee_candidates(
        client, recruiter_id=None,
        columns="id,request_id",
    )

    # Resolve is_backfill for each unique request_id
    req_backfill_map: dict[int, bool] = {}
    request_ids = list({c["request_id"] for c in emp_candidates if c.get("request_id")})
    if request_ids:
        rr_res = await (
            client.table("resource_requests")
            .select("id,is_backfill")
            .in_("id", request_ids)
            .execute()
        )
        req_backfill_map = {
            r["id"]: bool(r.get("is_backfill"))
            for r in (rr_res.data or [])
        }

    # Classify each employee as New or Backfill
    new_count = 0
    backfill_count = 0
    for c in emp_candidates:
        rid = c.get("request_id")
        if rid and req_backfill_map.get(int(rid)):
            backfill_count += 1
        else:
            new_count += 1

    return [
        LabelValue(label="New", value=new_count).model_dump(),
        LabelValue(label="Backfill", value=backfill_count).model_dump(),
    ]


@router.get("/ta/daily-status", response_model=PaginatedTable)
async def get_daily_status(
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    recruiter_id: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    current_user: dict = Depends(get_current_user),
):
    """Paginated daily status grid for TanStack Table."""
    recruiter_id = _scope_recruiter_id(recruiter_id, current_user)
    client = await get_supabase_admin_async()

    # Count total first
    count_q = client.table("candidates").select("id", count="exact")
    count_q = _date_filters(count_q, start_date, end_date)
    if recruiter_id:
        count_q = count_q.eq("owner_id", recruiter_id)
    count_res = await count_q.execute()
    total = count_res.count or 0

    # Fetch page
    offset = (page - 1) * page_size
    q = client.table("candidates").select(
        "id,first_name,last_name,status,source,skills,vendor,created_at"
    )
    q = _date_filters(q, start_date, end_date)
    if recruiter_id:
        q = q.eq("owner_id", recruiter_id)
    q = q.order(sort_by, desc=(sort_order == "desc"))
    data_res = await q.range(offset, offset + page_size - 1).execute()
    rows = service.build_daily_status_rows(data_res.data or [])

    return PaginatedTable(
        data=[r.model_dump() for r in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


# ── Pipeline ──────────────────────────────────────────────────────────────────

@router.get("/pipeline/requirement-tracker", response_model=RequirementTracker)
async def get_requirement_tracker(
    start_date: str | None = Query(None, description="YYYY-MM-DD"),
    end_date: str | None = Query(None, description="YYYY-MM-DD"),
    recruiter_id: str | None = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """6-stage requirement tracker: counts open requests by furthest candidate stage."""
    recruiter_id = _scope_recruiter_id(recruiter_id, current_user)
    client = await get_supabase_admin_async()
    reqs = await _fetch_resource_requests(client, start_date, end_date)
    cands = await _fetch_candidates(
        client, start_date, end_date, recruiter_id,
        columns="id,status,request_id,created_at,owner_id",
    )
    return service.build_requirement_tracker(reqs, cands)


@router.get("/pipeline/daily-status-matrix", response_model=DailyStatusMatrix)
async def get_daily_status_matrix(
    start_date: str | None = Query(None, description="YYYY-MM-DD"),
    end_date: str | None = Query(None, description="YYYY-MM-DD"),
    recruiter_id: str | None = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Matrix: job profiles × placed-employee stage counts."""
    recruiter_id = _scope_recruiter_id(recruiter_id, current_user)
    client = await get_supabase_admin_async()

    # Use ALL resource requests (not just OPEN) so placed employees show up
    reqs = await _fetch_all_resource_requests(client, start_date, end_date)

    # Fetch job profiles for the requests
    jp_ids = list({r["job_profile_id"] for r in reqs if r.get("job_profile_id")})
    jp_map: dict[int, dict] = {}
    if jp_ids:
        jp_res = await (
            client.table("job_profiles")
            .select("id,role_name")
            .in_("id", jp_ids)
            .execute()
        )
        jp_map = {jp["id"]: jp for jp in (jp_res.data or [])}

    # Use active employee candidates so rows reflect the current headcount
    cands = await _fetch_active_employee_candidates(
        client, recruiter_id,
        columns="id,status,request_id",
    )
    return service.build_daily_status_matrix(reqs, cands, jp_map)


@router.get("/pipeline/funnel", response_model=PipelineFunnel)
async def get_pipeline_funnel(
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    recruiter_id: str | None = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Pipeline funnel: Requests → Screening → Interview → Selection → Onboarded."""
    recruiter_id = _scope_recruiter_id(recruiter_id, current_user)
    client = await get_supabase_admin_async()

    # Total open requests (for first funnel stage)
    rq = client.table("resource_requests").select("id", count="exact")
    rq = _date_filters(rq, start_date, end_date)
    rq_res = await rq.execute()
    total_requests = rq_res.count or 0

    candidates = await _fetch_candidates(
        client, start_date, end_date, recruiter_id,
        columns="id,status,created_at,owner_id",
    )
    return service.build_pipeline_funnel(candidates, total_requests)


# ── Reports ───────────────────────────────────────────────────────────────────

@router.get("/reports/pivot-data", response_model=list[dict])
async def get_pivot_data(
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    recruiter_id: str | None = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Flat dataset for pivot table — all dimensions and measures joined."""
    recruiter_id = _scope_recruiter_id(recruiter_id, current_user)
    client = await get_supabase_admin_async()

    candidates = await _fetch_candidates(
        client, start_date, end_date, recruiter_id,
    )

    # Collect unique request IDs
    request_ids = list({c["request_id"] for c in candidates if c.get("request_id")})
    request_map: dict[int, dict] = {}
    sow_map: dict[str, dict] = {}

    if request_ids:
        rr_res = await (
            client.table("resource_requests")
            .select("id,sow_id,priority,status")
            .in_("id", request_ids)
            .execute()
        )
        request_map = {r["id"]: r for r in (rr_res.data or [])}

        sow_ids = list({r["sow_id"] for r in request_map.values() if r.get("sow_id")})
        if sow_ids:
            sow_res = await (
                client.table("sows")
                .select("id,client_name")
                .in_("id", sow_ids)
                .execute()
            )
            sow_map = {str(s["id"]): s for s in (sow_res.data or [])}

    rows = service.build_pivot_rows(candidates, request_map, sow_map)
    return [r.model_dump() for r in rows]
