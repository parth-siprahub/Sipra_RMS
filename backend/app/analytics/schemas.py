"""Analytics response schemas — chart-ready JSON contracts."""
from pydantic import BaseModel


# ── Shared ────────────────────────────────────────────────────────────────────

class LabelValue(BaseModel):
    """Generic single-dimension chart datum."""
    label: str
    value: int


class PaginatedTable(BaseModel):
    """Wrapper for server-side-paginated table responses."""
    data: list[dict]
    total: int
    page: int
    page_size: int


# ── Resources ─────────────────────────────────────────────────────────────────

class SkillDistribution(BaseModel):
    """Doughnut chart: skill → candidate count."""
    label: str
    value: int


class ResourcesOverview(BaseModel):
    total_resources: int
    skills: list[SkillDistribution]


# ── Talent Acquisition ────────────────────────────────────────────────────────

class HiringTypeItem(BaseModel):
    """Pie chart: hiring source → count."""
    label: str
    value: int


class ClientDemandItem(BaseModel):
    """Bar chart: client name → open request count."""
    label: str
    value: int


class EmploymentTypeItem(BaseModel):
    """Doughnut chart: employment type (Contract/Direct) → count."""
    label: str
    value: int


class DailyStatusRow(BaseModel):
    """One row in the paginated daily status grid."""
    candidate_id: int
    name: str
    status: str
    source: str | None
    skills: str | None
    vendor: str | None
    created_at: str | None


# ── Pipeline ──────────────────────────────────────────────────────────────────

class FunnelStage(BaseModel):
    """One stage in the pipeline funnel."""
    stage: str
    count: int
    drop_off_pct: float | None  # None for the first stage


class PipelineFunnel(BaseModel):
    stages: list[FunnelStage]


# ── Reports ───────────────────────────────────────────────────────────────────

class PivotRow(BaseModel):
    """One flat row for the pivot table dataset."""
    candidate_id: int
    name: str
    status: str
    source: str | None
    skills: str | None
    vendor: str | None
    client_name: str | None
    request_priority: str | None
    created_at: str | None


# ── Requirement Tracker ───────────────────────────────────────────────────────

class RequirementTrackerStage(BaseModel):
    stage: str    # 'NEW' | 'SCREENING' | 'L1' | 'L2' | 'WITH_CLIENT' | 'CLOSING'
    label: str    # human-readable display name
    open_count: int


class RequirementTracker(BaseModel):
    stages: list[RequirementTrackerStage]


# ── Daily Status Matrix ────────────────────────────────────────────────────────

class DailyStatusMatrixRow(BaseModel):
    job_profile_id: int
    job_profile_name: str
    total_requirements: int
    by_stage: dict[str, int]
    # Columns: Screening, L1, L2, Selected, Open (unassigned)


class DailyStatusMatrix(BaseModel):
    rows: list[DailyStatusMatrixRow]
    stage_names: list[str]  # ordered column headers
