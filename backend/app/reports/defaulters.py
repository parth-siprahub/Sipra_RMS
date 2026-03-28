"""Defaulter detection — pure logic, no database dependencies."""
import logging
from datetime import date, datetime, timedelta
from calendar import monthrange

from app.reports.schemas import DefaulterEntry

logger = logging.getLogger(__name__)


def _count_working_days(start: date, end: date) -> int:
    """Count weekdays (Mon-Fri) between start and end inclusive."""
    if end < start:
        return 0
    count = 0
    current = start
    while current <= end:
        if current.weekday() < 5:  # Mon=0 .. Fri=4
            count += 1
        current += timedelta(days=1)
    return count


def detect_defaulters(
    employees: list[dict],
    timesheet_logs: list[dict],
    month: str,  # YYYY-MM
    check_date: date | None = None,
    min_hours_per_day: float = 4.0,
) -> list[DefaulterEntry]:
    """
    Detect employees who are falling behind on timesheet logging.

    Pure function — operates only on the data passed in.
    Returns a list of DefaulterEntry for employees whose actual hours
    are below the expected minimum (working_days * min_hours_per_day).

    Rules:
    - Only ACTIVE employees are checked (status == "ACTIVE").
    - Exited employees (exit_date set and before check_date) are excluded.
    - OOO-only entries do not count as logged work hours.
    - OOO days reduce expected working days.
    - Employees who started mid-month get adjusted working days from start_date.
    - check_date defaults to today; clamped to month boundaries.
    """
    year, mo = int(month[:4]), int(month[5:7])
    month_start = date(year, mo, 1)
    _, last_day = monthrange(year, mo)
    month_end = date(year, mo, last_day)

    if check_date is None:
        check_date = date.today()

    # Clamp check_date to the month range
    if check_date > month_end:
        check_date = month_end
    if check_date < month_start:
        return []

    # Index timesheet logs by employee_id
    logs_by_emp: dict[int, list[dict]] = {}
    for log in timesheet_logs:
        eid = log["employee_id"]
        if eid not in logs_by_emp:
            logs_by_emp[eid] = []
        logs_by_emp[eid].append(log)

    results: list[DefaulterEntry] = []

    for emp in employees:
        # Skip non-active employees
        if emp.get("status", "").upper() != "ACTIVE":
            continue

        # Skip employees who exited before or during the check period
        exit_date_str = emp.get("exit_date")
        if exit_date_str:
            try:
                exit_dt = date.fromisoformat(str(exit_date_str)[:10])
                if exit_dt < month_start:
                    continue
            except (ValueError, TypeError):
                logger.warning(
                    "Invalid exit_date '%s' for employee %s — treating as no exit date",
                    exit_date_str, emp.get("id"),
                )

        emp_id = emp["id"]

        # Determine effective start for this employee within the month
        emp_start = month_start
        start_date_str = emp.get("start_date")
        if start_date_str:
            try:
                emp_start_dt = date.fromisoformat(start_date_str)
                if emp_start_dt > month_start:
                    emp_start = emp_start_dt
            except (ValueError, TypeError):
                pass

        # If employee hasn't started yet, skip
        if emp_start > check_date:
            continue

        working_days = _count_working_days(emp_start, check_date)

        # Get this employee's logs
        emp_logs = logs_by_emp.get(emp_id, [])

        # Count OOO days (reduce expected working days)
        ooo_days = 0
        for log in emp_logs:
            if log.get("is_ooo"):
                try:
                    log_dt = date.fromisoformat(log["log_date"])
                    if emp_start <= log_dt <= check_date and log_dt.weekday() < 5:
                        ooo_days += 1
                except (ValueError, TypeError):
                    pass

        effective_working_days = max(working_days - ooo_days, 0)
        expected_hours = effective_working_days * min_hours_per_day

        # Sum actual non-OOO hours
        actual_hours = 0.0
        days_with_hours: set[str] = set()
        for log in emp_logs:
            if log.get("is_ooo"):
                continue
            try:
                log_dt = date.fromisoformat(log["log_date"])
                if log_dt > check_date:
                    continue
            except (ValueError, TypeError):
                continue
            hours = log.get("hours_logged", 0) or 0
            actual_hours += hours
            if hours > 0:
                days_with_hours.add(log["log_date"])

        deficit = expected_hours - actual_hours
        if deficit <= 0:
            continue  # Not a defaulter

        # Determine severity
        if actual_hours == 0:
            severity = "critical"
        elif actual_hours < expected_hours * 0.5:
            severity = "warning"
        else:
            severity = "info"

        results.append(DefaulterEntry(
            employee_id=emp_id,
            rms_name=emp.get("rms_name", "Unknown"),
            jira_username=emp.get("jira_username"),
            expected_hours=round(expected_hours, 2),
            actual_hours=round(actual_hours, 2),
            deficit=round(deficit, 2),
            days_logged=len(days_with_hours),
            working_days_elapsed=effective_working_days,
            severity=severity,
        ))

    # Sort: critical first, then warning, then info; within same severity by deficit desc
    severity_order = {"critical": 0, "warning": 1, "info": 2}
    results.sort(key=lambda e: (severity_order.get(e.severity, 3), -e.deficit))

    return results
