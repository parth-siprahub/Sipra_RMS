"""Billing schemas — aligned with public.billing_records table."""
from pydantic import BaseModel
from datetime import datetime


class BillingRecordResponse(BaseModel):
    id: int
    employee_id: int
    billing_month: str
    total_logged_hours: float
    capped_hours: float
    ooo_days: int
    aws_active_hours: float | None = None
    compliance_75_pct: bool | None = None
    is_billable: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None


class BillingCalculationResult(BaseModel):
    employee_id: int
    billing_month: str
    total_logged_hours: float
    capped_hours: float
    ooo_days: int
    is_billable: bool
    compliance_status: str
