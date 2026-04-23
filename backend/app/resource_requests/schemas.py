"""Resource Request schemas — aligned with public.resource_requests table."""
from pydantic import BaseModel
from datetime import datetime
from enum import Enum


class RequestPriority(str, Enum):
    URGENT = "URGENT"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class RequestStatus(str, Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    HOLD = "HOLD"
    CANCELLED = "CANCELLED"


class RequestSource(str, Enum):
    PORTAL = "PORTAL"
    JOB_BOARDS = "JOB_BOARDS"
    NETWORK = "NETWORK"
    VENDORS = "VENDORS"


class ResourceRequestCreate(BaseModel):
    job_profile_id: int | None = None
    sow_id: int | None = None
    priority: RequestPriority = RequestPriority.MEDIUM
    source: RequestSource | None = None
    is_backfill: bool = False
    replacement_for_candidate_id: int | None = None
    notes: str | None = None


class ResourceRequestUpdate(BaseModel):
    job_profile_id: int | None = None
    sow_id: int | None = None
    priority: RequestPriority | None = None
    source: RequestSource | None = None
    is_backfill: bool | None = None
    notes: str | None = None


class StatusTransition(BaseModel):
    status: RequestStatus


class ResourceRequestResponse(BaseModel):
    id: int
    request_display_id: str
    job_profile_id: int | None = None
    sow_id: int | None = None
    priority: str | None = None
    status: str | None = None
    source: str | None = None
    is_backfill: bool | None = None
    replacement_for_candidate_id: int | None = None
    created_by_id: str | None = None
    created_at: datetime | None = None
    notes: str | None = None
