"""Reports — timesheet comparison, compliance, and exports."""
import io
import logging
from collections import defaultdict
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.responses import StreamingResponse
from app.auth.dependencies import get_current_user, require_admin
from app.database import get_supabase_admin_async
from app.reports.flag_classifier import compute_comparison_fields
from app.utils.date_utils import prorated_target_hours, get_working_days
from app.reports.defaulters import detect_defaulters
from app.utils.person_names import format_person_name
from app.reports.schemas import (
    TimesheetComparison,
    ComparisonReport,
    ComplianceEntry,
    ComplianceReport,
    DefaulterReport,
    ComputedReportRow,
    CalculateResult,
    EmployeeDetail,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["Reports"])


def _display_rms(raw: str | None) -> str:
    """Normalize employee display name for report rows (required string)."""
    if raw is None or not str(raw).strip():
        return ""
    return format_person_name(str(raw)) or str(raw)


def _display_rms_optional(raw: str | None) -> str | None:
    """Normalize employee display name for optional / joined fields."""
    if raw is None or not str(raw).strip():
        return None
    out = format_person_name(str(raw)) or str(raw)
    return out if out else None


DAILY_CAP = 8.0
WEEKLY_CAP = 40.0


async def _fetch_job_roles_for_employees(client, employees: list[dict]) -> dict[int, str | None]:
    """Map employee_id -> job_profile.role_name via candidate -> resource_request -> job_profile.

    Mirrors the join pattern in app.employees.router (see _enrich_employees).
    Returns an empty mapping if no employees have linked candidates.
    """
    job_role_map: dict[int, str | None] = {}
    candidate_ids = [e["candidate_id"] for e in employees if e.get("candidate_id")]
    if not candidate_ids:
        return job_role_map

    cands = await (
        client.table("candidates")
        .select("id,request_id")
        .in_("id", candidate_ids)
        .execute()
    )
    cand_to_req = {c["id"]: c["request_id"] for c in (cands.data or []) if c.get("request_id")}
    if not cand_to_req:
        return job_role_map

    rrs = await (
        client.table("resource_requests")
        .select("id,job_profile_id")
        .in_("id", list(cand_to_req.values()))
        .execute()
    )
    req_to_jp = {r["id"]: r["job_profile_id"] for r in (rrs.data or []) if r.get("job_profile_id")}
    if not req_to_jp:
        return job_role_map

    jps = await (
        client.table("job_profiles")
        .select("id,role_name")
        .in_("id", list(req_to_jp.values()))
        .execute()
    )
    jp_to_name = {j["id"]: j["role_name"] for j in (jps.data or [])}

    for emp in employees:
        cid = emp.get("candidate_id")
        if not cid:
            continue
        rid = cand_to_req.get(cid)
        if not rid:
            continue
        jpid = req_to_jp.get(rid)
        if jpid and jpid in jp_to_name:
            job_role_map[emp["id"]] = jp_to_name[jpid]
    return job_role_map


@router.get("/month-target")
async def get_month_target(
    month: str = Query(..., description="YYYY-MM format", pattern=r"^\d{4}-(0[1-9]|1[0-2])$"),
    current_user: dict = Depends(get_current_user),
):
    """
    Return the system-calculated working-day count and 8h target for a given month.
    Uses India holiday calendar from date_utils.py — same source as billing engine.
    Used by BillingConfig UI to display the read-only system target.
    """
    year, month_num = int(month[:4]), int(month[5:])
    import calendar as _cal
    last_day = _cal.monthrange(year, month_num)[1]
    month_start = date(year, month_num, 1)
    month_end = date(year, month_num, last_day)
    working_days = get_working_days(month_start, month_end)
    target_hours = working_days * 8.0
    return {"month": month, "working_days": working_days, "target_hours": target_hours}


@router.get("/timesheet-comparison", response_model=ComparisonReport)
async def get_timesheet_comparison(
    month: str = Query(..., description="YYYY-MM format", pattern=r"^\d{4}-(0[1-9]|1[0-2])$"),
    current_user: dict = Depends(get_current_user),
):
    """
    Compare Jira timesheet hours vs AWS ActiveTrack hours for a given month.
    Returns per-employee comparison with flag (green/amber/red).
    Includes all employees active for any portion of the month (started before month_end, no exit OR exited on/after month_start).
    """
    from datetime import timedelta
    client = await get_supabase_admin_async()

    # Fetch employees active during the billing month (inclusive date range)
    # Include anyone who: started before month_end AND (no exit date OR exited on/after month_start)
    year, mo = int(month[:4]), int(month[5:7])
    month_start = date(year, mo, 1)
    # Calculate month_end (last day of month)
    if mo == 12:
        month_end = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        month_end = date(year, mo + 1, 1) - timedelta(days=1)

    employees_raw = await client.table("employees").select("*").execute()
    employees = [
        e for e in (employees_raw.data or [])
        if e.get("start_date") and date.fromisoformat(e["start_date"]) <= month_end
        and (not e.get("exit_date") or date.fromisoformat(e["exit_date"]) >= month_start)
    ]

    if not employees:
        return ComparisonReport(
            month=month, total_employees=0, employees_with_jira=0,
            employees_with_aws=0, comparisons=[]
        )

    emp_ids = [e["id"] for e in employees]
    emp_map = {e["id"]: e for e in employees}

    # Fetch vendor names via candidate linkage
    vendor_name_map: dict[int, str | None] = {}
    candidate_ids = [e["candidate_id"] for e in employees if e.get("candidate_id")]
    if candidate_ids:
        cands_raw = await client.table("candidates").select("id,vendor").in_("id", candidate_ids).execute()
        cand_vendor = {c["id"]: c.get("vendor") for c in (cands_raw.data or []) if c.get("id")}
        for e in employees:
            cid = e.get("candidate_id")
            if cid and cid in cand_vendor:
                vendor_name_map[e["id"]] = cand_vendor[cid]

    job_role_map = await _fetch_job_roles_for_employees(client, employees)

    # Fetch Jira data from jira_timesheet_raw (new table mirroring Excel)
    jira_all: list = []
    chunk_off = 0
    while True:
        batch = await (
            client.table("jira_timesheet_raw")
            .select("*")
            .eq("billing_month", month)
            .range(chunk_off, chunk_off + 999)
            .execute()
        )
        jira_all.extend(batch.data or [])
        if len(batch.data or []) < 1000:
            break
        chunk_off += 1000
    jira_entries = jira_all

    # Group Jira entries by employee — sum logged hours from non-summary rows
    jira_by_emp: dict[int, list] = defaultdict(list)
    for entry in jira_entries:
        eid = entry.get("employee_id")
        if eid and eid in emp_map:
            jira_by_emp[eid].append(entry)

    # Fetch AWS data from aws_timesheet_logs_v2 (monthly per-employee)
    aws_raw = (
        await client.table("aws_timesheet_logs_v2")
        .select("*")
        .eq("billing_month", month)
        .range(0, 999)
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

        # Jira calculations (jira_timesheet_raw schema: logged, day_01..day_31, is_ooo, is_summary_row)
        # Get total from summary row's logged field
        summary_rows = [e for e in jira_logs if e.get("is_summary_row")]
        issue_rows = [e for e in jira_logs if not e.get("is_summary_row") and not e.get("is_ooo")]
        ooo_rows = [e for e in jira_logs if e.get("is_ooo")]

        # Total hours from summary row, or sum of issue rows' logged
        total_hours = 0.0
        if summary_rows:
            total_hours = float(summary_rows[0].get("logged") or 0)
        else:
            total_hours = sum(float(e.get("logged") or 0) for e in issue_rows)

        # OOO days: count non-zero day columns in OOO rows
        ooo_days = 0
        for ooo in ooo_rows:
            for d in range(1, 32):
                val = ooo.get(f"day_{d:02d}")
                if val is not None and float(val) > 0:
                    ooo_days += 1

        # Billable = total hours (already capped per Excel source)
        billable_hours = total_hours

        # AWS calculations (aws_timesheet_logs_v2: work_time_secs or work_time_hours)
        aws_total = None
        if aws_logs:
            entry = aws_logs[0]  # One row per employee per month
            secs = entry.get("work_time_secs")
            if secs is not None:
                aws_total = round(float(secs) / 3600.0, 2)
            elif entry.get("work_time_hours") is not None:
                aws_total = round(float(entry["work_time_hours"]), 2)

        if jira_logs:
            employees_with_jira += 1
        if aws_logs:
            employees_with_aws += 1

        jira_billable = float(billable_hours or 0)
        difference, difference_pct, flag = compute_comparison_fields(
            jira_billable, aws_total, jira_billable
        )

        # Prefer employees.aws_email; fall back to the matched aws_timesheet_logs_v2 row
        aws_email = emp.get("aws_email")
        if not aws_email and aws_logs:
            aws_email = aws_logs[0].get("aws_email")

        comparisons.append(TimesheetComparison(
            employee_id=emp_id,
            rms_name=_display_rms(emp.get("rms_name")),
            jira_username=emp.get("jira_username"),
            aws_email=aws_email,
            jira_total_hours=round(total_hours, 2),
            jira_capped_hours=round(billable_hours, 2),
            jira_ooo_days=ooo_days,
            jira_billable_hours=round(billable_hours, 2),
            aws_total_hours=round(aws_total, 2) if aws_total is not None else None,
            difference=difference,
            difference_pct=difference_pct,
            flag=flag,
            source=emp.get("source"),
            vendor_name=vendor_name_map.get(emp_id),
            job_role=job_role_map.get(emp_id),
        ))

    flag_rank = {"red": 0, "amber": 1, "green": 2, "no_aws": 0}
    comparisons.sort(key=lambda c: (flag_rank.get(c.flag, 9), c.rms_name))

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
    Includes all employees active for any portion of the month (started before month_end, no exit OR exited on/after month_start).
    """
    from datetime import timedelta
    client = await get_supabase_admin_async()

    # Fetch employees active during the billing month (inclusive date range)
    year, mo = int(month[:4]), int(month[5:7])
    month_start = date(year, mo, 1)
    if mo == 12:
        month_end = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        month_end = date(year, mo + 1, 1) - timedelta(days=1)

    employees_raw = await client.table("employees").select("*").execute()
    employees = [
        e for e in (employees_raw.data or [])
        if e.get("start_date") and date.fromisoformat(e["start_date"]) <= month_end
        and (not e.get("exit_date") or date.fromisoformat(e["exit_date"]) >= month_start)
    ]

    # Fetch from jira_timesheet_raw (new table) with pagination
    jira_all: list = []
    chunk_off = 0
    while True:
        batch = await (
            client.table("jira_timesheet_raw")
            .select("*")
            .eq("billing_month", month)
            .range(chunk_off, chunk_off + 999)
            .execute()
        )
        jira_all.extend(batch.data or [])
        if len(batch.data or []) < 1000:
            break
        chunk_off += 1000
    jira_entries = jira_all

    # Group by employee
    jira_by_emp: dict[int, list] = defaultdict(list)
    for entry in jira_entries:
        eid = entry.get("employee_id")
        if eid:
            jira_by_emp[eid].append(entry)

    # Try to get working_days from billing_config
    config_res = await client.table("billing_config").select("working_days").eq("billing_month", month).limit(1).execute()
    working_days_estimate = config_res.data[0]["working_days"] if config_res.data else 22

    entries: list[ComplianceEntry] = []
    complete = 0
    partial = 0
    missing = 0

    year, mo = int(month[:4]), int(month[5:7])

    for emp in employees:
        emp_id = emp["id"]
        logs = jira_by_emp.get(emp_id, [])

        # Count days with logged hours from non-summary, non-OOO rows
        issue_rows = [l for l in logs if not l.get("is_summary_row") and not l.get("is_ooo")]
        days_with_hours: set[int] = set()
        for row in issue_rows:
            for d in range(1, 32):
                val = row.get(f"day_{d:02d}")
                if val is not None and float(val) > 0:
                    days_with_hours.add(d)
        days_logged = len(days_with_hours)

        # Total hours from summary row
        summary = [l for l in logs if l.get("is_summary_row")]
        total_hours = float(summary[0].get("logged") or 0) if summary else sum(float(r.get("logged") or 0) for r in issue_rows)

        # OOO days
        ooo_days = 0
        for ooo in [l for l in logs if l.get("is_ooo")]:
            for d in range(1, 32):
                val = ooo.get(f"day_{d:02d}")
                if val is not None and float(val) > 0:
                    ooo_days += 1

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
            rms_name=_display_rms(emp.get("rms_name")),
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
    output.write("Employee,Jira Username,AWS Email,Payroll,Job Role,Jira Total Hours,Jira Capped Hours,"
                 "OOO Days,Jira Billable Hours,AWS Total Hours,Difference,Difference %,Flag\n")

    for c in report.comparisons:
        aws_hrs = str(c.aws_total_hours) if c.aws_total_hours is not None else ""
        diff = str(c.difference) if c.difference is not None else ""
        diff_pct = str(c.difference_pct) if c.difference_pct is not None else ""
        output.write(
            f'"{c.rms_name}","{c.jira_username or ""}","{c.aws_email or ""}","{c.source or ""}","{c.job_role or ""}",'
            f'{c.jira_total_hours},{c.jira_capped_hours},{c.jira_ooo_days},'
            f'{c.jira_billable_hours},{aws_hrs},{diff},{diff_pct},{c.flag}\n'
        )

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="timesheet_comparison_{month}.csv"'},
    )


@router.get("/defaulters", response_model=DefaulterReport)
async def get_defaulters(
    month: str = Query(..., description="YYYY-MM format", pattern=r"^\d{4}-(0[1-9]|1[0-2])$"),
    current_user: dict = Depends(require_admin),
):
    """
    Defaulter detection — employees with insufficient Jira hours mid-month.
    Returns employees below the minimum hours threshold with severity levels.
    """
    client = await get_supabase_admin_async()

    # Fetch employees active during the billing month (date-range, not live status).
    # Exited mid-month employees are still defaulters for the period they worked.
    _d_year, _d_mo = int(month[:4]), int(month[5:7])
    _d_start = date(_d_year, _d_mo, 1)
    _d_end = date(_d_year + 1, 1, 1) - timedelta(days=1) if _d_mo == 12 else date(_d_year, _d_mo + 1, 1) - timedelta(days=1)

    employees_raw = await client.table("employees").select("*").execute()
    employees = [
        e for e in (employees_raw.data or [])
        if e.get("start_date")
        and date.fromisoformat(e["start_date"]) <= _d_end
        and (not e.get("exit_date") or date.fromisoformat(e["exit_date"]) >= _d_start)
    ]

    # Fetch timesheet logs for the month
    logs_raw = await client.table("timesheet_logs").select("*").eq("import_month", month).execute()
    logs = logs_raw.data or []

    today = date.today()
    entries = detect_defaulters(
        employees=employees,
        timesheet_logs=logs,
        month=month,
        check_date=today,
    )

    critical_count = sum(1 for e in entries if e.severity == "critical")
    warning_count = sum(1 for e in entries if e.severity == "warning")

    return DefaulterReport(
        month=month,
        check_date=today.isoformat(),
        total_active=len(employees),
        defaulter_count=len(entries),
        critical_count=critical_count,
        warning_count=warning_count,
        entries=entries,
    )


# ──────────────────────────────────────────────
# Computed reports — Phase 5
# ──────────────────────────────────────────────

@router.post("/calculate/{billing_month}", response_model=CalculateResult)
async def calculate_billing(
    billing_month: str,
    current_user: dict = Depends(require_admin),
):
    """
    Calculate and persist Jira vs AWS comparison for all active employees.
    Reads from jira_timesheet_raw + aws_timesheet_logs_v2 + billing_config.
    Stores results in computed_reports (upsert per month).
    """
    import re
    if not re.match(r"^\d{4}-(0[1-9]|1[0-2])$", billing_month):
        raise HTTPException(status_code=400, detail="billing_month must be YYYY-MM")

    client = await get_supabase_admin_async()

    # 1. Validate billing config exists + check freeze
    config_res = await (
        client.table("billing_config")
        .select("*")
        .eq("billing_month", billing_month)
        .eq("client_name", "DCLI")
        .limit(1)
        .execute()
    )
    if not config_res.data:
        raise HTTPException(status_code=400, detail=f"No billing config for {billing_month}. Configure billable hours first.")
    config = config_res.data[0]
    if config.get("is_frozen"):
        frozen_who = config.get("frozen_by") or "admin"
        frozen_when = (config.get("frozen_at") or "")[:10]
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Billing month {billing_month} is locked (frozen by {frozen_who} on {frozen_when}). "
                "Go to Billing Config to unlock before recalculating."
            ),
        )
    target_billable = float(config["billable_hours"])

    # 2. Fetch employees active during the billing month (date-range, not live status).
    # Rationale: exited mid-month employees must appear in billing history (Entry 004, AI_PITFALLS_LEDGER).
    _year, _mo = int(billing_month[:4]), int(billing_month[5:7])
    _month_start = date(_year, _mo, 1)
    _month_end = date(_year + 1, 1, 1) - timedelta(days=1) if _mo == 12 else date(_year, _mo + 1, 1) - timedelta(days=1)

    emp_res = await client.table("employees").select("*").execute()
    employees = [
        e for e in (emp_res.data or [])
        if e.get("start_date")
        and date.fromisoformat(e["start_date"]) <= _month_end
        and (not e.get("exit_date") or date.fromisoformat(e["exit_date"]) >= _month_start)
    ]
    if not employees:
        raise HTTPException(status_code=400, detail="No employees found for the billing period")
    emp_map = {e["id"]: e for e in employees}

    # 3. Fetch Jira raw data for this month (paginated to avoid 1000-row limit)
    jira_entries: list = []
    chunk_off = 0
    while True:
        batch = await (
            client.table("jira_timesheet_raw")
            .select("*")
            .eq("billing_month", billing_month)
            .range(chunk_off, chunk_off + 999)
            .execute()
        )
        jira_entries.extend(batch.data or [])
        if len(batch.data or []) < 1000:
            break
        chunk_off += 1000

    # Group Jira by employee — sum logged hours from non-summary, non-OOO rows
    jira_by_emp: dict[int, dict] = {}  # emp_id -> {hours, ooo_days}
    for entry in jira_entries:
        eid = entry.get("employee_id")
        if not eid or eid not in emp_map:
            continue
        if eid not in jira_by_emp:
            jira_by_emp[eid] = {"hours": 0.0, "ooo_days": 0}
        if entry.get("is_ooo"):
            # Count OOO days: sum non-null day columns
            for d in range(1, 32):
                val = entry.get(f"day_{d:02d}")
                if val is not None and float(val) > 0:
                    jira_by_emp[eid]["ooo_days"] += 1
        elif not entry.get("is_summary_row"):
            logged = float(entry.get("logged") or 0)
            jira_by_emp[eid]["hours"] += logged

    # 4. Fetch AWS v2 data for this month
    aws_res = await (
        client.table("aws_timesheet_logs_v2")
        .select("*")
        .eq("billing_month", billing_month)
        .range(0, 999)
        .execute()
    )
    aws_entries = aws_res.data or []
    aws_by_emp: dict[int, dict] = {}
    for entry in aws_entries:
        eid = entry.get("employee_id")
        if eid and eid in emp_map:
            aws_by_emp[eid] = entry

    # 5. Compute per employee — prorated target per person, not a global constant.
    # B1.4: Pathak (exit 4/24), Bindushree (exit 4/27) receive targets < 176h.
    reports: list[dict] = []
    for emp in employees:
        eid = emp["id"]
        jira_data = jira_by_emp.get(eid, {"hours": 0.0, "ooo_days": 0})
        jira_hours = round(jira_data["hours"], 2)
        ooo_days = jira_data["ooo_days"]

        aws_entry = aws_by_emp.get(eid)
        aws_hours = None
        if aws_entry:
            aws_hours = round(float(aws_entry.get("work_time_secs", 0)) / 3600.0, 2)

        # Prorate target: working days in employee's active window for this month × 8h
        emp_exit = date.fromisoformat(emp["exit_date"]) if emp.get("exit_date") else None
        emp_target = prorated_target_hours(
            month_start=_month_start,
            month_end=_month_end,
            emp_start=date.fromisoformat(emp["start_date"]),
            emp_exit=emp_exit,
        )
        # Fallback to billing_config hours if proration yields 0 (data error guard)
        billable = emp_target if emp_target > 0 else target_billable

        difference, difference_pct, flag = compute_comparison_fields(
            jira_hours, aws_hours, billable
        )

        reports.append({
            "employee_id": eid,
            "billing_month": billing_month,
            "jira_hours": jira_hours,
            "ooo_days": ooo_days,
            "aws_hours": aws_hours,
            "billable_hours": billable,
            "difference": difference,
            "difference_pct": difference_pct,
            "flag": flag,
        })

    # 6. Upsert into computed_reports: delete existing, then insert
    await (
        client.table("computed_reports")
        .delete()
        .eq("billing_month", billing_month)
        .execute()
    )

    if reports:
        await client.table("computed_reports").insert(reports).execute()

    # 7. Return with joined employee names
    calc_job_role_map = await _fetch_job_roles_for_employees(client, employees)
    result_rows: list[ComputedReportRow] = []
    for r in reports:
        emp = emp_map.get(r["employee_id"], {})
        result_rows.append(ComputedReportRow(
            employee_id=r["employee_id"],
            billing_month=billing_month,
            jira_hours=r["jira_hours"],
            ooo_days=r["ooo_days"],
            aws_hours=r["aws_hours"],
            billable_hours=r["billable_hours"],
            difference=r["difference"],
            difference_pct=r["difference_pct"],
            flag=r["flag"],
            rms_name=_display_rms_optional(emp.get("rms_name")),
            jira_username=emp.get("jira_username"),
            aws_email=emp.get("aws_email"),
            source=emp.get("source"),
            job_role=calc_job_role_map.get(r["employee_id"]),
        ))

    # Sort: red first (includes legacy no_aws), then amber, then green
    flag_order = {"red": 0, "no_aws": 0, "amber": 1, "green": 2}
    result_rows.sort(key=lambda r: (flag_order.get(r.flag, 4), r.rms_name or ""))

    logger.info("Computed %d reports for %s", len(result_rows), billing_month)
    return CalculateResult(month=billing_month, total_computed=len(result_rows), reports=result_rows)


@router.get("/computed", response_model=list[ComputedReportRow])
async def get_computed_reports(
    month: str = Query(..., description="YYYY-MM format", pattern=r"^\d{4}-(0[1-9]|1[0-2])$"),
    current_user: dict = Depends(get_current_user),
):
    """Get persisted computed reports for a month, joined with employee names."""
    client = await get_supabase_admin_async()

    res = await (
        client.table("computed_reports")
        .select("*")
        .eq("billing_month", month)
        .execute()
    )
    rows = res.data or []
    if not rows:
        return []

    # Join employee names
    emp_ids = list({r["employee_id"] for r in rows})
    emp_res = await client.table("employees").select("id, rms_name, jira_username, aws_email, source, candidate_id").in_("id", emp_ids).execute()
    emp_map = {e["id"]: e for e in (emp_res.data or [])}

    # Fetch vendor names via candidate linkage
    computed_vendor_map: dict[int, str | None] = {}
    cand_ids = [e["candidate_id"] for e in (emp_res.data or []) if e.get("candidate_id")]
    if cand_ids:
        cands_raw = await client.table("candidates").select("id,vendor").in_("id", cand_ids).execute()
        cand_vendor = {c["id"]: c.get("vendor") for c in (cands_raw.data or []) if c.get("id")}
        for e in (emp_res.data or []):
            cid = e.get("candidate_id")
            if cid and cid in cand_vendor:
                computed_vendor_map[e["id"]] = cand_vendor[cid]

    computed_job_role_map = await _fetch_job_roles_for_employees(client, emp_res.data or [])

    result = []
    for r in rows:
        emp = emp_map.get(r["employee_id"], {})
        jh = float(r.get("jira_hours") or 0)
        bh_raw = r.get("billable_hours")
        bh = float(bh_raw) if bh_raw is not None else None
        aws_raw = r.get("aws_hours")
        aws_h = float(aws_raw) if aws_raw is not None else None
        difference, difference_pct, flag = compute_comparison_fields(jh, aws_h, bh)
        result.append(ComputedReportRow(
            id=r.get("id"),
            employee_id=r["employee_id"],
            billing_month=r["billing_month"],
            jira_hours=jh,
            ooo_days=r.get("ooo_days", 0),
            aws_hours=aws_h,
            billable_hours=bh,
            difference=difference,
            difference_pct=difference_pct,
            flag=flag,
            computed_at=r.get("computed_at"),
            rms_name=_display_rms_optional(emp.get("rms_name")),
            jira_username=emp.get("jira_username"),
            aws_email=emp.get("aws_email"),
            source=emp.get("source"),
            vendor_name=computed_vendor_map.get(r["employee_id"]),
            job_role=computed_job_role_map.get(r["employee_id"]),
        ))

    flag_order = {"red": 0, "no_aws": 0, "amber": 1, "green": 2}
    result.sort(key=lambda r: (flag_order.get(r.flag, 4), r.rms_name or ""))
    return result


@router.get("/employee-detail/{employee_id}", response_model=EmployeeDetail)
async def get_employee_detail(
    employee_id: int,
    month: str = Query(..., description="YYYY-MM format", pattern=r"^\d{4}-(0[1-9]|1[0-2])$"),
    current_user: dict = Depends(get_current_user),
):
    """Get detailed drill-down data for one employee: summary + AWS + Jira raw entries."""
    client = await get_supabase_admin_async()

    # Summary from computed_reports
    summary_res = await (
        client.table("computed_reports")
        .select("*")
        .eq("employee_id", employee_id)
        .eq("billing_month", month)
        .limit(1)
        .execute()
    )

    emp_res = await client.table("employees").select("rms_name, jira_username, aws_email").eq("id", employee_id).limit(1).execute()
    emp = emp_res.data[0] if emp_res.data else {}

    summary = None
    if summary_res.data:
        r = summary_res.data[0]
        jh = float(r.get("jira_hours") or 0)
        bh_raw = r.get("billable_hours")
        bh = float(bh_raw) if bh_raw is not None else None
        aws_raw = r.get("aws_hours")
        aws_h = float(aws_raw) if aws_raw is not None else None
        difference, difference_pct, flag = compute_comparison_fields(jh, aws_h, bh)
        summary = ComputedReportRow(
            id=r.get("id"),
            employee_id=r["employee_id"],
            billing_month=r["billing_month"],
            jira_hours=jh,
            ooo_days=r.get("ooo_days", 0),
            aws_hours=aws_h,
            billable_hours=bh,
            difference=difference,
            difference_pct=difference_pct,
            flag=flag,
            computed_at=r.get("computed_at"),
            rms_name=_display_rms_optional(emp.get("rms_name")),
            jira_username=emp.get("jira_username"),
            aws_email=emp.get("aws_email"),
        )

    # AWS data
    aws_res = await (
        client.table("aws_timesheet_logs_v2")
        .select("*")
        .eq("employee_id", employee_id)
        .eq("billing_month", month)
        .limit(1)
        .execute()
    )
    aws_data = aws_res.data[0] if aws_res.data else None

    # Jira raw entries
    jira_res = await (
        client.table("jira_timesheet_raw")
        .select("*")
        .eq("employee_id", employee_id)
        .eq("billing_month", month)
        .execute()
    )
    jira_entries = jira_res.data or []

    return EmployeeDetail(
        summary=summary,
        aws_data=aws_data,
        jira_entries=jira_entries,
    )
