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

def build_resources_overview(candidates: list[dict]) -> ResourcesOverview:
    skill_counts: dict[str, int] = defaultdict(int)
    for c in candidates:
        for skill in _split_skills(c.get("skills")):
            skill_counts[skill] += 1

    skills = [
        SkillDistribution(label=k, value=v)
        for k, v in sorted(skill_counts.items(), key=lambda x: -x[1])
    ]
    return ResourcesOverview(total_resources=len(candidates), skills=skills)


def build_hiring_type(candidates: list[dict]) -> list[HiringTypeItem]:
    counts: dict[str, int] = defaultdict(int)
    for c in candidates:
        label = (c.get("source") or "Unknown").strip()
        counts[label] += 1
    return [HiringTypeItem(label=k, value=v) for k, v in sorted(counts.items(), key=lambda x: -x[1])]


def build_client_demand(requests: list[dict], job_profiles: dict[int, dict]) -> list[ClientDemandItem]:
    """Count open resource requests per client."""
    counts: dict[str, int] = defaultdict(int)
    for req in requests:
        jp_id = req.get("job_profile_id")
        jp = job_profiles.get(jp_id) if jp_id else None
        client = (jp.get("client_name") if jp else None) or "Unknown"
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
    job_profile_map: dict[int, dict],
) -> list[PivotRow]:
    rows = []
    for c in candidates:
        name = f"{c.get('first_name', '')} {c.get('last_name', '')}".strip()
        req = request_map.get(c.get("request_id")) if c.get("request_id") else None
        jp_id = req.get("job_profile_id") if req else None
        jp = job_profile_map.get(jp_id) if jp_id else None
        created = c.get("created_at")
        rows.append(PivotRow(
            candidate_id=c["id"],
            name=name or f"ID:{c['id']}",
            status=c.get("status") or "",
            source=c.get("source"),
            skills=c.get("skills"),
            vendor=c.get("vendor"),
            client_name=jp.get("client_name") if jp else None,
            request_priority=req.get("priority") if req else None,
            created_at=str(created)[:10] if created else None,
        ))
    return rows


# ── Requirement Tracker ───────────────────────────────────────────────────────

_TRACKER_ORDER = ["NEW", "SCREENING", "L1", "L2", "WITH_CLIENT", "CLOSING"]
_TRACKER_LABELS = {
    "NEW": "New Requests",
    "SCREENING": "Screening",
    "L1": "L1 Interview",
    "L2": "L2 Interview",
    "WITH_CLIENT": "With Client",
    "CLOSING": "Closing",
}
_STATUS_TO_TRACKER_STAGE: dict[str, str] = {
    "SCREENING": "SCREENING",
    "SUBMITTED_TO_ADMIN": "SCREENING",
    "WITH_ADMIN": "SCREENING",
    "L1": "L1",
    "L1_INTERVIEW": "L1",
    "L1_SCHEDULED": "L1",
    "L1_COMPLETED": "L1",
    "L1_SHORTLIST": "L1",
    "L2": "L2",
    "L2_INTERVIEW": "L2",
    "INTERVIEW_SCHEDULED": "L2",
    "WITH_CLIENT": "WITH_CLIENT",
    "CLIENT_INTERVIEW": "WITH_CLIENT",
    "REJECTED_BY_ADMIN": "WITH_CLIENT",
    "REJECTED_BY_CLIENT": "WITH_CLIENT",
    "SELECTED": "CLOSING",
    "OFFERED": "CLOSING",
    "ON_HOLD": "CLOSING",
    "ONBOARDED": "CLOSING",
}


def build_requirement_tracker(
    resource_requests: list[dict],
    candidates: list[dict],
) -> RequirementTracker:
    """Count open resource requests by furthest candidate stage."""
    open_reqs = [
        r for r in resource_requests
        if (r.get("status") or "").upper() in ("OPEN", "IN_PROGRESS", "ACTIVE")
    ]

    # Group candidate statuses by resource_request_id
    by_req: dict[str, list[str]] = {}
    for c in candidates:
        rid = c.get("resource_request_id") or c.get("request_id")
        if rid is not None:
            by_req.setdefault(str(rid), []).append((c.get("status") or "").upper())

    counts: dict[str, int] = {stage: 0 for stage in _TRACKER_ORDER}
    for req in open_reqs:
        statuses = by_req.get(str(req["id"]), [])
        if not statuses:
            counts["NEW"] += 1
            continue
        furthest_idx = 0
        for s in statuses:
            mapped = _STATUS_TO_TRACKER_STAGE.get(s)
            if mapped:
                idx = _TRACKER_ORDER.index(mapped)
                if idx > furthest_idx:
                    furthest_idx = idx
        counts[_TRACKER_ORDER[furthest_idx]] += 1

    return RequirementTracker(stages=[
        RequirementTrackerStage(
            stage=s,
            label=_TRACKER_LABELS[s],
            open_count=counts[s],
        )
        for s in _TRACKER_ORDER
    ])
