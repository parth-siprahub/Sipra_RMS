"""Timesheet schemas — aligned with public.timesheet_logs table."""
from pydantic import BaseModel
from datetime import datetime, date


class TimesheetEntry(BaseModel):
    employee_id: int
    log_date: date
    hours_logged: float
    is_ooo: bool = False
    import_month: str  # "YYYY-MM"


class TimesheetResponse(BaseModel):
    id: int
    employee_id: int
    log_date: date
    hours_logged: float
    is_ooo: bool
    import_month: str
    created_at: datetime | None = None


class ImportResult(BaseModel):
    month: str
    total_rows_processed: int
    employees_matched: int
    employees_unmatched: list[str]
    entries_upserted: int
