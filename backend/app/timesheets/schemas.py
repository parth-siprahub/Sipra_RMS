"""Timesheet schemas — aligned with public.timesheet_logs, jira_timesheet_raw, aws_timesheet_logs_v2."""
import re
from pydantic import BaseModel, field_validator
from datetime import datetime, date


def validate_import_month(v: str) -> str:
    if not re.match(r"^\d{4}-(0[1-9]|1[0-2])$", v):
        raise ValueError("import_month must be in YYYY-MM format (e.g., 2026-03)")
    return v


# ──────────────────────────────────────────────
# Legacy Jira schemas (timesheet_logs — kept for backward compat)
# ──────────────────────────────────────────────

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


class TimesheetUpdate(BaseModel):
    hours_logged: float | None = None
    is_ooo: bool | None = None


class TimesheetResponse(BaseModel):
    id: int
    employee_id: int
    log_date: date
    hours_logged: float
    is_ooo: bool
    import_month: str
    processed: bool = False
    processed_at: datetime | None = None
    created_at: datetime | None = None


class ImportResult(BaseModel):
    month: str
    total_rows_processed: int
    employees_matched: int
    employees_unmatched: list[str]
    entries_upserted: int


# ──────────────────────────────────────────────
# Jira Raw schemas (jira_timesheet_raw — mirrors Excel)
# ──────────────────────────────────────────────

class JiraRawResponse(BaseModel):
    id: int
    employee_id: int | None = None
    billing_month: str
    team: str | None = None
    jira_user: str
    issue: str | None = None
    jira_key: str | None = None
    logged: float | None = 0
    day_01: float | None = None
    day_02: float | None = None
    day_03: float | None = None
    day_04: float | None = None
    day_05: float | None = None
    day_06: float | None = None
    day_07: float | None = None
    day_08: float | None = None
    day_09: float | None = None
    day_10: float | None = None
    day_11: float | None = None
    day_12: float | None = None
    day_13: float | None = None
    day_14: float | None = None
    day_15: float | None = None
    day_16: float | None = None
    day_17: float | None = None
    day_18: float | None = None
    day_19: float | None = None
    day_20: float | None = None
    day_21: float | None = None
    day_22: float | None = None
    day_23: float | None = None
    day_24: float | None = None
    day_25: float | None = None
    day_26: float | None = None
    day_27: float | None = None
    day_28: float | None = None
    day_29: float | None = None
    day_30: float | None = None
    day_31: float | None = None
    is_summary_row: bool = False
    is_ooo: bool = False
    created_at: datetime | None = None


class JiraRawImportResult(BaseModel):
    month: str
    total_rows_processed: int
    employees_matched: int
    employees_unmatched: list[str]
    entries_inserted: int


# ──────────────────────────────────────────────
# AWS v2 schemas (aws_timesheet_logs_v2 — mirrors CSV)
# ──────────────────────────────────────────────

class AwsTimesheetV2Response(BaseModel):
    id: int
    employee_id: int | None = None
    aws_email: str
    billing_month: str
    client_name: str | None = "DCLI"
    work_time_hms: str | None = None
    productive_hms: str | None = None
    unproductive_hms: str | None = None
    undefined_hms: str | None = None
    active_hms: str | None = None
    passive_hms: str | None = None
    screen_time_hms: str | None = None
    offline_meetings_hms: str | None = None
    work_time_secs: int = 0
    productive_secs: int = 0
    unproductive_secs: int = 0
    undefined_secs: int = 0
    active_secs: int = 0
    passive_secs: int = 0
    screen_time_secs: int = 0
    offline_meetings_secs: int = 0
    prod_active_hms: str | None = None
    prod_passive_hms: str | None = None
    unprod_active_hms: str | None = None
    unprod_passive_hms: str | None = None
    undefined_active_hms: str | None = None
    undefined_passive_hms: str | None = None
    prod_active_secs: int = 0
    prod_passive_secs: int = 0
    unprod_active_secs: int = 0
    unprod_passive_secs: int = 0
    undefined_active_secs: int = 0
    undefined_passive_secs: int = 0
    created_at: datetime | None = None


class AwsImportV2Result(BaseModel):
    month: str
    total_rows: int
    employees_matched: int
    employees_unmatched: int
    entries_inserted: int
    unmatched_emails: list[str]


# ──────────────────────────────────────────────
# Legacy AWS schemas (kept for backward compat if needed)
# ──────────────────────────────────────────────

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
