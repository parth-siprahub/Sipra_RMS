"""Timesheet schemas — aligned with public.timesheet_logs table."""
import re
from pydantic import BaseModel, field_validator
from datetime import datetime, date


def validate_import_month(v: str) -> str:
    if not re.match(r"^\d{4}-(0[1-9]|1[0-2])$", v):
        raise ValueError("import_month must be in YYYY-MM format (e.g., 2026-03)")
    return v


class TimesheetEntry(BaseModel):
    employee_id: int
    log_date: date
    hours_logged: float
    is_ooo: bool = False
    import_month: str  # "YYYY-MM"

    @field_validator("import_month")
    @classmethod
    def check_import_month(cls, v: str) -> str:
        return validate_import_month(v)


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


class AwsTimesheetResponse(BaseModel):
    id: int
    employee_id: int | None = None
    aws_email: str
    week_start: date
    week_end: date
    work_time_secs: int
    productive_secs: int
    unproductive_secs: int
    active_secs: int
    passive_secs: int
    screen_time_secs: int
    work_time_hours: float
    is_below_threshold: bool
    created_at: datetime | None = None


class AwsImportResult(BaseModel):
    week_start: str
    week_end: str
    total_rows: int
    employees_matched: int
    employees_unmatched: int
    entries_inserted: int
    skipped_existing: int
    unmatched_emails: list[str]
