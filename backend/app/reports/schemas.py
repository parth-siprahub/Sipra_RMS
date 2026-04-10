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
    flag: str  # "green" | "amber" | "red" (legacy rows may still have "no_aws")
    source: str | None = None  # payroll type: internal / vendor / contractor


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


class DefaulterEntry(BaseModel):
    employee_id: int
    rms_name: str
    jira_username: str | None = None
    expected_hours: float
    actual_hours: float
    deficit: float
    days_logged: int
    working_days_elapsed: int
    severity: str  # "critical" (0h), "warning" (<50% expected), "info" (<100% expected)


class DefaulterReport(BaseModel):
    month: str
    check_date: str
    total_active: int
    defaulter_count: int
    critical_count: int
    warning_count: int
    entries: list[DefaulterEntry]


# ──────────────────────────────────────────────
# Computed reports (persisted Jira vs AWS results)
# ──────────────────────────────────────────────

class ComputedReportRow(BaseModel):
    id: int | None = None
    employee_id: int
    billing_month: str
    jira_hours: float = 0
    ooo_days: int = 0
    aws_hours: float | None = None
    billable_hours: float | None = None
    difference: float | None = None
    difference_pct: float | None = None
    flag: str = "no_aws"
    computed_at: str | None = None
    # Joined
    rms_name: str | None = None
    jira_username: str | None = None
    aws_email: str | None = None
    source: str | None = None  # payroll type: internal / vendor / contractor


class CalculateResult(BaseModel):
    month: str
    total_computed: int
    reports: list[ComputedReportRow]


class EmployeeDetail(BaseModel):
    summary: ComputedReportRow | None = None
    aws_data: dict | None = None
    jira_entries: list[dict] = []
