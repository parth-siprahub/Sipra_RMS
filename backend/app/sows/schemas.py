"""SOW schemas — aligned with public.sows table."""
from pydantic import BaseModel
from datetime import datetime, date


class SowCreate(BaseModel):
    sow_number: str
    client_name: str
    start_date: date | None = None
    target_date: date | None = None
    submitted_date: date | None = None
    max_resources: int | None = None


class SowUpdate(BaseModel):
    sow_number: str | None = None
    client_name: str | None = None
    start_date: date | None = None
    target_date: date | None = None
    submitted_date: date | None = None
    max_resources: int | None = None
    is_active: bool | None = None


class SowResponse(BaseModel):
    id: int
    sow_number: str
    client_name: str
    start_date: date | None = None
    target_date: date | None = None
    submitted_date: date | None = None
    max_resources: int | None = None
    is_active: bool | None = None
    created_at: datetime | None = None
