"""Report schemas for timesheet comparison and compliance."""
from pydantic import BaseModel


class TimesheetComparison(BaseModel):
    employee_id: int
    rms_name: str
    jira_username: str | None = None
    aws_email: str | None = None
    jira_total_hours: float
    jira_capped_hours: float
    jira_ooo_days: int
    jira_billable_hours: float
    aws_total_hours: float | None = None
    difference: float | None = None
    difference_pct: float | None = None
    flag: str  # "green" | "red" | "no_aws"


class ComplianceEntry(BaseModel):
    employee_id: int
    rms_name: str
    jira_username: str | None = None
    status: str  # "complete" | "partial" | "missing"
    days_logged: int
    total_hours: float


class ComparisonReport(BaseModel):
    month: str
    total_employees: int
    employees_with_jira: int
    employees_with_aws: int
    comparisons: list[TimesheetComparison]


class ComplianceReport(BaseModel):
    month: str
    total_active: int
    complete: int
    partial: int
    missing: int
    entries: list[ComplianceEntry]
