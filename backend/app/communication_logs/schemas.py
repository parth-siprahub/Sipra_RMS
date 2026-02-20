"""Communication Log schemas — aligned with public.communication_logs table."""
from pydantic import BaseModel
from datetime import datetime
from enum import Enum


class LogType(str, Enum):
    EMAIL = "EMAIL"
    CALL = "CALL"
    MEETING = "MEETING"
    NOTE = "NOTE"


class CommunicationLogCreate(BaseModel):
    request_id: int | None = None
    candidate_id: int | None = None
    log_type: LogType
    message: str
    external_contact_name: str | None = None
    log_date: datetime | None = None


class CommunicationLogResponse(BaseModel):
    id: int
    request_id: int | None = None
    candidate_id: int | None = None
    logged_by_id: str | None = None
    log_type: str | None = None
    message: str
    external_contact_name: str | None = None
    log_date: datetime | None = None
    created_at: datetime | None = None
