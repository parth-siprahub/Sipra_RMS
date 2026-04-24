"""Analytics business logic — all aggregation happens here, not in the router."""
from collections import defaultdict
from app.analytics.schemas import (
    SkillDistribution,
    ResourcesOverview,
    HiringTypeItem,
    ClientDemandItem,
    EmploymentTypeItem,
    DailyStatusRow,
    FunnelStage,
    PipelineFunnel,
    PivotRow,
    RequirementTrackerStage,
    RequirementTracker,
    LabelValue,
    DailyStatusMatrixRow,
    DailyStatusMatrix,
)

# ── Pipeline stage mapping ────────────────────────────────────────────────────

# Maps CandidateStatus values to display funnel stages (in order)
FUNNEL_STAGES: list[tuple[str, list[str]]] = [
    ("Request", []),  # Populated from resource_requests count
    ("Screening", ["NEW", "SCREENING", "SUBMITTED_TO_ADMIN", "WITH_ADMIN", "SCREEN_REJECT"]),
    ("Interview", ["L1_SCHEDULED", "L1_COMPLETED", "L1_SHORTLIST", "L1_REJECT",
                   "INTERVIEW_SCHEDULED", "WITH_CLIENT", "REJECTED_BY_ADMIN",
                   "REJECTED_BY_CLIENT", "INTERVIEW_BACK_OUT"]),
    ("Selection", ["SELECTED", "ON_HOLD", "OFFER_BACK_OUT"]),
    ("Onboarded", ["ONBOARDED", "EXIT"]),
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _split_skills(raw: str | None) -> list[str]:
    """Parse comma/semicolon-separated skills string into individual tokens."""
    if not raw or not raw.strip():
        return []
    return [s.strip() for s in raw.replace(";", ",").split(",") if s.strip()]


def _drop_off(prev: int, curr: int) -> float | None:
    if prev == 0:
        return None
    return round((prev - curr) / prev * 100, 1)


# ── Aggregation functions ─────────────────────────────────────────────────────

def build_resources_overview(
    candidates: list[dict],
    role_counts: dict[str, int] | None = None,
) -> ResourcesOverview:
    """Build resources overview.

    When role_counts is provided (keyed by job_profile role_name), the chart
    shows candidates grouped by the role they were requested for.
    Falls back to skill-tag distribution when role data is unavailable.
    """
    if role_counts is not None:
        skills = [
            SkillDistribution(label=k, value=v)
            for k, v in sorted(role_counts.items(), key=lambda x: -x[1])
        ]
        return ResourcesOverview(total_resources=len(candidates), skills=skills)

    # Fallback: skill-tag distribution
    skill_counts: dict[str, int] = defaultdict(int)
    for c in candidates:
        for skill in _split_skills(c.get("skills")):
            skill_counts[skill] += 1
    skills = [
        SkillDistribution(label=k, value=v)
        for k, v in sorted(skill_counts.items(), key=lambda x: -x[1])
    ]
    return ResourcesOverview(total_resources=len(candidates), skills=skills)


def build_hiring_type(
    candidates: list[dict],
    vendor_name_map: dict[str, str] | None = None,
) -> list[HiringTypeItem]:
    """Group candidates by hiring source/channel.

    Resolution order:
    1. vendor enum field (WRS / GFM / ANTEN) — authoritative when set
    2. source field — normalised against vendor_name_map (case-insensitive)
       so "Anten" → "ANTEN", "SipraHub" → "SipraHub", etc.
    3. "Internal" fallback
    """
    counts: dict[str, int] = defaultdict(int)
    for c in candidates:
        vendor = (c.get("vendor") or "").strip()
        source = (c.get("source") or "").strip()
        if vendor and vendor.upper() != "INTERNAL":
            label = vendor
        elif source and source.upper() not in ("", "INTERNAL"):
            # Normalise against vendors table canonical names when available
            label = (vendor_name_map or {}).get(source.upper(), source)
        else:
            label = "Internal"
        counts[label] += 1
    return [HiringTypeItem(label=k, value=v) for k, v in sorted(counts.items(), key=lambda x: -x[1])]


def build_client_demand(requests: list[dict], sow_map: dict[str, dict]) -> list[ClientDemandItem]:
    """Count open resource requests per client."""
    counts: dict[str, int] = defaultdict(int)
    for req in requests:
        sow_id = req.get("sow_id")
        sow = sow_map.get(str(sow_id)) if sow_id else None
        client = (sow.get("client_name") if sow else None) or "Unknown"
        counts[client] += 1
    return [ClientDemandItem(label=k, value=v) for k, v in sorted(counts.items(), key=lambda x: -x[1])]


def build_employment_type(candidates: list[dict]) -> list[EmploymentTypeItem]:
    """Classify as Contract (has vendor) or Direct (no vendor)."""
    counts: dict[str, int] = defaultdict(int)
    for c in candidates:
        label = "Contract" if c.get("vendor") else "Direct"
        counts[label] += 1
    return [EmploymentTypeItem(label=k, value=v) for k, v in counts.items()]


def build_daily_status_rows(candidates: list[dict]) -> list[DailyStatusRow]:
    rows = []
    for c in candidates:
        name = f"{c.get('first_name', '')} {c.get('last_name', '')}".strip()
        created = c.get("created_at")
        rows.append(DailyStatusRow(
            candidate_id=c["id"],
            name=name or f"ID:{c['id']}",
            status=c.get("status") or "",
            source=c.get("source"),
            skills=c.get("skills"),
            vendor=c.get("vendor"),
            created_at=str(created)[:10] if created else None,
        ))
    return rows


def build_pipeline_funnel(candidates: list[dict], total_requests: int) -> PipelineFunnel:
    status_counts: dict[str, int] = defaultdict(int)
    for c in candidates:
        st = (c.get("status") or "").upper()
        status_counts[st] += 1

    stage_counts: list[int] = []
    stage_names: list[str] = []

    for stage_name, statuses in FUNNEL_STAGES:
        if stage_name == "Request":
            count = total_requests
        else:
            count = sum(status_counts.get(s, 0) for s in statuses)
        stage_counts.append(count)
        stage_names.append(stage_name)

    stages: list[FunnelStage] = []
    for i, (name, count) in enumerate(zip(stage_names, stage_counts)):
        drop = _drop_off(stage_counts[i - 1], count) if i > 0 else None
        stages.append(FunnelStage(stage=name, count=count, drop_off_pct=drop))

    return PipelineFunnel(stages=stages)


def build_pivot_rows(
    candidates: list[dict],
    request_map: dict[int, dict],
    sow_map: dict[str, dict],
) -> list[PivotRow]:
    rows = []
    for c in candidates:
        name = f"{c.get('first_name', '')} {c.get('last_name', '')}".strip()
        req = request_map.get(c.get("request_id")) if c.get("request_id") else None
        sow_id = req.get("sow_id") if req else None
        sow = sow_map.get(str(sow_id)) if sow_id else None
        created = c.get("created_at")
        rows.append(PivotRow(
            candidate_id=c["id"],
            name=name or f"ID:{c['id']}",
            status=c.get("status") or "",
            source=c.get("source"),
            skills=c.get("skills"),
            vendor=c.get("vendor"),
            client_name=sow.get("client_name") if sow else None,
            request_priority=req.get("priority") if req else None,
            created_at=str(created)[:10] if created else None,
        ))
    return rows


# ── Requirement Tracker ───────────────────────────────────────────────────────

_TRACKER_ORDER = ["NEW", "SCREENING", "L1", "L2", "WITH_CLIENT", "CLOSING"]
_TRACKER_LABELS = {
    "NEW": "New",
    "SCREENING": "Screening",
    "L1": "L1 Interview",
    "L2": "L2 Interview",
    "WITH_CLIENT": "With Client",
    "CLOSING": "Closing",
}
_STATUS_TO_TRACKER_STAGE: dict[str, str] = {
    # Screening stage
    "SCREENING": "SCREENING",
    "SUBMITTED_TO_ADMIN": "SCREENING",
    "WITH_ADMIN": "SCREENING",
    "SCREEN_REJECT": "SCREENING",
    # L1 stage
    "L1": "L1",
    "L1_INTERVIEW": "L1",
    "L1_SCHEDULED": "L1",
    "L1_COMPLETED": "L1",
    "L1_SHORTLIST": "L1",
    "L1_REJECT": "L1",
    # L2 stage
    "L2": "L2",
    "L2_INTERVIEW": "L2",
    "INTERVIEW_SCHEDULED": "L2",
    "INTERVIEW_BACK_OUT": "L2",
    # With client stage
    "WITH_CLIENT": "WITH_CLIENT",
    "CLIENT_INTERVIEW": "WITH_CLIENT",
    "REJECTED_BY_ADMIN": "WITH_CLIENT",
    "REJECTED_BY_CLIENT": "WITH_CLIENT",
    # Closing stage
    "SELECTED": "CLOSING",
    "OFFERED": "CLOSING",
    "ON_HOLD": "CLOSING",
    "OFFER_BACK_OUT": "CLOSING",
    "ONBOARDED": "CLOSING",
    "EXIT": "CLOSING",
}


def build_requirement_tracker(
    resource_requests: list[dict],
    candidates: list[dict],
) -> RequirementTracker:
    """Count OPEN resource_requests bucketed by their furthest candidate stage.

    Each OPEN request is counted exactly once:
    - No linked candidates → NEW
    - Has candidates → bucket of the furthest-stage candidate
    CLOSED/non-OPEN requests are excluded.
    """
    counts: dict[str, int] = {stage: 0 for stage in _TRACKER_ORDER}

    # Build a lookup: request_id → list of candidate statuses
    req_candidates: dict = {}
    for c in candidates:
        rid = c.get("resource_request_id") or c.get("request_id")
        if rid:
            req_candidates.setdefault(rid, []).append(
                (c.get("status") or "").upper()
            )

    for req in resource_requests:
        if (req.get("status") or "").upper() != "OPEN":
            continue
        rid = req.get("id")
        statuses = req_candidates.get(rid, [])
        if not statuses:
            counts["NEW"] += 1
            continue
        # Find the furthest stage for this request
        stage_priority = {s: i for i, s in enumerate(_TRACKER_ORDER)}
        best_stage = "NEW"
        best_priority = -1
        for status in statuses:
            stage = _STATUS_TO_TRACKER_STAGE.get(status, "NEW")
            if stage not in stage_priority:
                stage = "NEW"
            p = stage_priority[stage]
            if p > best_priority:
                best_priority = p
                best_stage = stage
        counts[best_stage] += 1

    return RequirementTracker(stages=[
        RequirementTrackerStage(
            stage=s,
            label=_TRACKER_LABELS[s],
            open_count=counts[s],
        )
        for s in _TRACKER_ORDER
    ])


# ── Hiring Type Split (New vs Backfill) ───────────────────────────────────────

def build_hiring_type_split(resource_requests: list[dict]) -> list[LabelValue]:
    """Split resource requests into New vs Backfill based on is_backfill flag."""
    new_count = sum(1 for r in resource_requests if not r.get("is_backfill"))
    backfill_count = sum(1 for r in resource_requests if r.get("is_backfill"))
    return [
        LabelValue(label="New", value=new_count),
        LabelValue(label="Backfill", value=backfill_count),
    ]


# ── Payroll Segregation ───────────────────────────────────────────────────────

def build_payroll_segregation(employees: list[dict]) -> list[LabelValue]:
    """Group employees by payroll source — mirrors the Payroll column on the
    Employees page.

    Reads employees.source.  Null / empty / 'INTERNAL' → 'Internal'.
    """
    buckets: dict[str, int] = {}
    for e in employees:
        raw = (e.get("source") or "").strip()
        if not raw or raw.upper() == "INTERNAL":
            label = "Internal"
        else:
            label = raw
        buckets[label] = buckets.get(label, 0) + 1
    return [
        LabelValue(label=k, value=v)
        for k, v in sorted(buckets.items(), key=lambda x: -x[1])
    ]


# ── Daily Status Matrix ───────────────────────────────────────────────────────

_MATRIX_STAGE_MAP: dict[str, str] = {
    "SCREENING": "Screening",
    "SUBMITTED_TO_ADMIN": "Screening",
    "WITH_ADMIN": "Screening",
    "SCREEN_REJECT": "Screening",
    "L1_SCHEDULED": "L1",
    "L1_COMPLETED": "L1",
    "L1_SHORTLIST": "L1",
    "L1_REJECT": "L1",
    "L2_INTERVIEW": "L2",
    "INTERVIEW_SCHEDULED": "L2",
    "WITH_CLIENT": "L2",
    "REJECTED_BY_CLIENT": "L2",
    "REJECTED_BY_ADMIN": "L2",
    "INTERVIEW_BACK_OUT": "L2",
    "SELECTED": "Selected",
    "ON_HOLD": "Selected",
    "OFFER_BACK_OUT": "Selected",
    "OFFERED": "Selected",
    "ONBOARDED": "Selected",
    "EXIT": "Selected",
}

_MATRIX_STAGE_ORDER = ["Open", "Screening", "L1", "L2", "Selected"]


def build_daily_status_matrix(
    resource_requests: list[dict],
    candidates: list[dict],
    job_profile_map: dict[int, dict],
) -> DailyStatusMatrix:
    """Group open resource requests by job profile and count candidates per pipeline stage."""
    # Group candidates by request_id
    cands_by_req: dict[int, list[str]] = {}
    for c in candidates:
        req_id = c.get("request_id")
        if req_id is not None:
            cands_by_req.setdefault(int(req_id), []).append(
                (c.get("status") or "").upper()
            )

    # Aggregate by job_profile_id
    profile_data: dict[int, dict] = {}
    for req in resource_requests:
        jp_id = req.get("job_profile_id")
        if jp_id is None:
            continue
        jp_id = int(jp_id)
        if jp_id not in profile_data:
            jp = job_profile_map.get(jp_id, {})
            profile_data[jp_id] = {
                "job_profile_id": jp_id,
                "job_profile_name": jp.get("role_name") or f"Profile #{jp_id}",
                "total_requirements": 0,
                "by_stage": {s: 0 for s in _MATRIX_STAGE_ORDER},
            }
        profile_data[jp_id]["total_requirements"] += 1

        req_id = int(req["id"])
        statuses = cands_by_req.get(req_id, [])
        if not statuses:
            profile_data[jp_id]["by_stage"]["Open"] += 1
        else:
            # Find furthest stage for this request
            furthest = "Open"
            furthest_idx = 0
            for s in statuses:
                stage = _MATRIX_STAGE_MAP.get(s)
                if stage and _MATRIX_STAGE_ORDER.index(stage) > furthest_idx:
                    furthest_idx = _MATRIX_STAGE_ORDER.index(stage)
                    furthest = stage
            profile_data[jp_id]["by_stage"][furthest] += 1

    rows = [
        DailyStatusMatrixRow(
            job_profile_id=d["job_profile_id"],
            job_profile_name=d["job_profile_name"],
            total_requirements=d["total_requirements"],
            by_stage=d["by_stage"],
        )
        for d in sorted(profile_data.values(), key=lambda x: -x["total_requirements"])
    ]
    return DailyStatusMatrix(rows=rows, stage_names=_MATRIX_STAGE_ORDER)
