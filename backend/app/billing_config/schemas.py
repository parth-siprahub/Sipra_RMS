"""Billing configuration schemas — configurable billable hours per client/month."""
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
import re


class BillingConfigCreate(BaseModel):
    client_name: str = Field(default="DCLI", max_length=100)
    billing_month: str  # "YYYY-MM"
    billable_hours: float = 176.0
    working_days: int = 22

    @field_validator("billing_month")
    @classmethod
    def check_month(cls, v: str) -> str:
        if not re.match(r"^\d{4}-(0[1-9]|1[0-2])$", v):
            raise ValueError("billing_month must be YYYY-MM")
        return v

    @field_validator("billable_hours")
    @classmethod
    def check_hours(cls, v: float) -> float:
        if v <= 0 or v > 500:
            raise ValueError("billable_hours must be between 0 and 500")
        return v

    @field_validator("working_days")
    @classmethod
    def check_days(cls, v: int) -> int:
        if v <= 0 or v > 31:
            raise ValueError("working_days must be between 1 and 31")
        return v


class BillingConfigResponse(BaseModel):
    id: int
    client_name: str
    billing_month: str
    billable_hours: float
    working_days: int
    created_at: datetime | None = None
    updated_at: datetime | None = None
