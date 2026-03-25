"""Reports — timesheet comparison, compliance, and exports."""
import io
import logging
from collections import defaultdict
from datetime import date

from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.responses import StreamingResponse
from app.auth.dependencies import get_current_user, require_admin
from app.database import get_supabase_admin_async
from app.reports.schemas import (
    TimesheetComparison,
    ComparisonReport,
    ComplianceEntry,
    ComplianceReport,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["Reports"])

DAILY_CAP = 8.0
WEEKLY_CAP = 40.0


@router.get("/timesheet-comparison", response_model=ComparisonReport)
async def get_timesheet_comparison(
    month: str = Query(..., description="YYYY-MM format", pattern=r"^\d{4}-(0[1-9]|1[0-2])$"),
    current_user: dict = Depends(get_current_user),
):
    """
    Compare Jira timesheet hours vs AWS ActiveTrack hours for a given month.
    Returns per-employee comparison with flag (green/red/no_aws).
    """
    client = await get_supabase_admin_async()

    # Fetch active employees
    employees_raw = await client.table("employees").select("*").eq("status", "ACTIVE").execute()
    employees = employees_raw.data or []

    if not employees:
        return ComparisonReport(
            month=month, total_employees=0, employees_with_jira=0,
            employees_with_aws=0, comparisons=[]
        )

    emp_ids = [e["id"] for e in employees]
    emp_map = {e["id"]: e for e in employees}

    # Fetch Jira timesheet logs for the month
    jira_raw = await client.table("timesheet_logs").select("*").eq("import_month", month).execute()
    jira_entries = jira_raw.data or []

    # Group Jira entries by employee
    jira_by_emp: dict[int, list] = defaultdict(list)
    for entry in jira_entries:
        if entry["employee_id"] in emp_map:
            jira_by_emp[entry["employee_id"]].append(entry)

    # Fetch AWS data for weeks overlapping this month
    year, mo = int(month[:4]), int(month[5:7])
    month_start = f"{year}-{mo:02d}-01"
    if mo == 12:
        month_end = f"{year + 1}-01-01"
    else:
        month_end = f"{year}-{mo + 1:02d}-01"

    aws_raw = (
        await client.table("aws_timesheet_logs")
        .select("*")
        .gte("week_start", month_start)
        .lt("week_start", month_end)
        .execute()
    )
    aws_entries = aws_raw.data or []

    # Group AWS by employee
    aws_by_emp: dict[int, list] = defaultdict(list)
    for entry in aws_entries:
        if entry.get("employee_id") and entry["employee_id"] in emp_map:
            aws_by_emp[entry["employee_id"]].append(entry)

    # Build comparison rows
    comparisons: list[TimesheetComparison] = []
    employees_with_jira = 0
    employees_with_aws = 0

    for emp in employees:
        emp_id = emp["id"]
        jira_logs = jira_by_emp.get(emp_id, [])
        aws_logs = aws_by_emp.get(emp_id, [])

        # Jira calculations
        ooo_days = sum(1 for e in jira_logs if e.get("is_ooo"))
        total_hours = sum(e.get("hours_logged", 0) for e in jira_logs)

        # Apply daily cap (already applied in parser, but verify)
        daily_sums: dict[str, float] = defaultdict(float)
        for e in jira_logs:
            if not e.get("is_ooo"):
                daily_sums[e["log_date"]] += e.get("hours_logged", 0)

        capped_hours = sum(min(h, DAILY_CAP) for h in daily_sums.values())

        # Apply weekly cap: daily-cap each day first, then sum per week
        weekly_sums: dict[int, float] = defaultdict(float)
        for log_date_str, hours in daily_sums.items():
            try:
                d = date.fromisoformat(log_date_str)
                week_num = d.isocalendar()[1]
                weekly_sums[week_num] += min(hours, DAILY_CAP)
            except ValueError:
                pass

        billable_hours = sum(min(h, WEEKLY_CAP) for h in weekly_sums.values())

        # AWS calculations
        aws_total = sum(e.get("work_time_hours", 0) for e in aws_logs) if aws_logs else None

        # Difference and flag
        difference = None
        difference_pct = None
        flag = "no_aws"

        if jira_logs:
            employees_with_jira += 1
        if aws_logs:
            employees_with_aws += 1

        if aws_total is not None and billable_hours > 0:
            difference = round(billable_hours - aws_total, 2)
            difference_pct = round((difference / billable_hours) * 100, 1) if billable_hours else 0
            # Red if >25% difference OR any AWS week below 30hrs
            any_week_low = any(e.get("is_below_threshold") for e in aws_logs)
            if abs(difference_pct) > 25 or any_week_low:
                flag = "red"
            else:
                flag = "green"
        elif aws_total is not None:
            flag = "green" if aws_total >= 30 else "red"

        comparisons.append(TimesheetComparison(
            employee_id=emp_id,
            rms_name=emp.get("rms_name", "Unknown"),
            jira_username=emp.get("jira_username"),
            aws_email=emp.get("aws_email"),
            jira_total_hours=round(total_hours, 2),
            jira_capped_hours=round(capped_hours, 2),
            jira_ooo_days=ooo_days,
            jira_billable_hours=round(billable_hours, 2),
            aws_total_hours=round(aws_total, 2) if aws_total is not None else None,
            difference=difference,
            difference_pct=difference_pct,
            flag=flag,
        ))

    # Sort: red flags first, then by name
    comparisons.sort(key=lambda c: (0 if c.flag == "red" else 1, c.rms_name))

    return ComparisonReport(
        month=month,
        total_employees=len(employees),
        employees_with_jira=employees_with_jira,
        employees_with_aws=employees_with_aws,
        comparisons=comparisons,
    )


@router.get("/compliance", response_model=ComplianceReport)
async def get_compliance_report(
    month: str = Query(..., description="YYYY-MM format", pattern=r"^\d{4}-(0[1-9]|1[0-2])$"),
    current_user: dict = Depends(get_current_user),
):
    """
    Timesheet compliance report — who has/hasn't filled timesheets.
    """
    client = await get_supabase_admin_async()

    employees_raw = await client.table("employees").select("*").eq("status", "ACTIVE").execute()
    employees = employees_raw.data or []

    jira_raw = await client.table("timesheet_logs").select("*").eq("import_month", month).execute()
    jira_entries = jira_raw.data or []

    # Group by employee
    jira_by_emp: dict[int, list] = defaultdict(list)
    for entry in jira_entries:
        jira_by_emp[entry["employee_id"]].append(entry)

    entries: list[ComplianceEntry] = []
    complete = 0
    partial = 0
    missing = 0

    # Estimate working days in the month (~22 for most months)
    year, mo = int(month[:4]), int(month[5:7])
    working_days_estimate = 22

    for emp in employees:
        emp_id = emp["id"]
        logs = jira_by_emp.get(emp_id, [])
        days_logged = len([l for l in logs if not l.get("is_ooo") and l.get("hours_logged", 0) > 0])
        total_hours = sum(l.get("hours_logged", 0) for l in logs)
        ooo_days = sum(1 for l in logs if l.get("is_ooo"))

        if days_logged == 0 and ooo_days == 0:
            status_val = "missing"
            missing += 1
        elif days_logged < working_days_estimate * 0.7:
            status_val = "partial"
            partial += 1
        else:
            status_val = "complete"
            complete += 1

        entries.append(ComplianceEntry(
            employee_id=emp_id,
            rms_name=emp.get("rms_name", "Unknown"),
            jira_username=emp.get("jira_username"),
            status=status_val,
            days_logged=days_logged,
            total_hours=round(total_hours, 2),
        ))

    # Sort: missing first, then partial, then complete
    sort_order = {"missing": 0, "partial": 1, "complete": 2}
    entries.sort(key=lambda e: (sort_order.get(e.status, 3), e.rms_name))

    return ComplianceReport(
        month=month,
        total_active=len(employees),
        complete=complete,
        partial=partial,
        missing=missing,
        entries=entries,
    )


@router.get("/timesheet-comparison/export")
async def export_comparison(
    month: str = Query(..., description="YYYY-MM format", pattern=r"^\d{4}-(0[1-9]|1[0-2])$"),
    current_user: dict = Depends(require_admin),
):
    """Export timesheet comparison as CSV."""
    # Reuse the comparison logic
    report = await get_timesheet_comparison(month=month, current_user=current_user)

    output = io.StringIO()
    output.write("Employee,Jira Username,AWS Email,Jira Total Hours,Jira Capped Hours,"
                 "OOO Days,Jira Billable Hours,AWS Total Hours,Difference,Difference %,Flag\n")

    for c in report.comparisons:
        aws_hrs = str(c.aws_total_hours) if c.aws_total_hours is not None else ""
        diff = str(c.difference) if c.difference is not None else ""
        diff_pct = str(c.difference_pct) if c.difference_pct is not None else ""
        output.write(
            f'"{c.rms_name}","{c.jira_username or ""}","{c.aws_email or ""}",'
            f'{c.jira_total_hours},{c.jira_capped_hours},{c.jira_ooo_days},'
            f'{c.jira_billable_hours},{aws_hrs},{diff},{diff_pct},{c.flag}\n'
        )

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="timesheet_comparison_{month}.csv"'},
    )
