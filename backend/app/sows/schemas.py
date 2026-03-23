"""SOW schemas — aligned with public.sows table."""
from pydantic import BaseModel, field_validator, model_validator
from datetime import datetime, date


class SowCreate(BaseModel):
    sow_number: str
    client_name: str
    start_date: date | None = None
    target_date: date | None = None
    submitted_date: date | None = None
    max_resources: int | None = None
    job_profile_id: int | None = None

    @field_validator("max_resources")
    @classmethod
    def cap_max_resources(cls, v: int | None) -> int | None:
        if v is not None and v > 100:
            raise ValueError("Max resources cannot exceed 100")
        return v

    @field_validator("start_date")
    @classmethod
    def start_not_in_past(cls, v: date | None) -> date | None:
        if v is not None and v < date.today():
            raise ValueError("Start date cannot be in the past")
        return v

    @model_validator(mode="after")
    def start_before_target(self) -> "SowCreate":
        if self.start_date and self.target_date and self.start_date >= self.target_date:
            raise ValueError("Start date must be before target date")
        return self


class SowUpdate(BaseModel):
    sow_number: str | None = None
    client_name: str | None = None
    start_date: date | None = None
    target_date: date | None = None
    submitted_date: date | None = None
    max_resources: int | None = None
    job_profile_id: int | None = None
    is_active: bool | None = None

    @field_validator("max_resources")
    @classmethod
    def cap_max_resources(cls, v: int | None) -> int | None:
        if v is not None and v > 100:
            raise ValueError("Max resources cannot exceed 100")
        return v


class SowResponse(BaseModel):
    id: int
    sow_number: str
    client_name: str
    start_date: date | None = None
    target_date: date | None = None
    submitted_date: date | None = None
    max_resources: int | None = None
    job_profile_id: int | None = None
    is_active: bool | None = None
    created_at: datetime | None = None
