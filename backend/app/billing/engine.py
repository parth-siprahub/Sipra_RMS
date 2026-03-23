"""
Billing & Compliance Engine (BILL-001)
Implements:
  - The 8/40 Cap: billable units capped at 8h/day and 40h/week
  - The 75% Rule: AWS active occupancy >= 75% of Jira logged time
  - Exit Logic: immediate termination of billing upon exit_date
"""
import logging
from datetime import date, timedelta
from collections import defaultdict

logger = logging.getLogger(__name__)

MAX_DAILY_HOURS = 8.0
MAX_WEEKLY_HOURS = 40.0
AWS_COMPLIANCE_THRESHOLD = 0.75  # 75% rule


def cap_daily_and_weekly(entries: list[dict]) -> tuple[float, float]:
    """
    Apply the 8h/day and 40h/week billing caps.

    Args:
        entries: list of {log_date: str, hours_logged: float, is_ooo: bool}

    Returns:
        (total_logged_hours, capped_hours)
    """
    total_logged = 0.0

    # Group entries by ISO week
    weekly_buckets: dict[str, list[dict]] = defaultdict(list)
    for entry in entries:
        if entry.get("is_ooo"):
            continue
        log_date = date.fromisoformat(str(entry["log_date"]))
        # ISO week key: YYYY-WNN
        week_key = f"{log_date.isocalendar()[0]}-W{log_date.isocalendar()[1]:02d}"
        weekly_buckets[week_key].append(entry)
        total_logged += entry["hours_logged"]

    capped_total = 0.0
    for week_key, week_entries in weekly_buckets.items():
        week_capped = 0.0
        for entry in sorted(week_entries, key=lambda e: e["log_date"]):
            daily_capped = min(entry["hours_logged"], MAX_DAILY_HOURS)
            if week_capped + daily_capped > MAX_WEEKLY_HOURS:
                daily_capped = max(0.0, MAX_WEEKLY_HOURS - week_capped)
            week_capped += daily_capped
        capped_total += week_capped

    return total_logged, round(capped_total, 2)


def check_75_percent_rule(jira_hours: float, aws_hours: float | None) -> bool | None:
    """
    The 75% Rule: AWS active hours must be >= 75% of Jira logged hours.
    Returns None if AWS data is unavailable.
    """
    if aws_hours is None:
        return None
    if jira_hours <= 0:
        return True
    return aws_hours >= (jira_hours * AWS_COMPLIANCE_THRESHOLD)


def calculate_billing(
    entries: list[dict],
    employee_start_date: date | None = None,
    employee_exit_date: date | None = None,
    aws_active_hours: float | None = None,
) -> dict:
    """
    Calculate billing for a set of timesheet entries.

    Args:
        entries: list of timesheet entries for a single month
        employee_start_date: if set, entries before this date are excluded
        employee_exit_date: if set, entries after this date are excluded
        aws_active_hours: optional AWS active hours for compliance check

    Returns:
        dict with billing calculation results
    """
    # Start date logic: filter out entries before employee joined
    if employee_start_date:
        entries = [
            e for e in entries
            if date.fromisoformat(str(e["log_date"])) >= employee_start_date
        ]

    # Exit logic: filter out entries after exit date
    if employee_exit_date:
        entries = [
            e for e in entries
            if date.fromisoformat(str(e["log_date"])) <= employee_exit_date
        ]

    ooo_days = sum(1 for e in entries if e.get("is_ooo"))
    total_logged, capped_hours = cap_daily_and_weekly(entries)
    compliance = check_75_percent_rule(capped_hours, aws_active_hours)

    # Not billable if employee has exited or compliance fails
    is_billable = True
    if employee_exit_date is not None:
        is_billable = False
    if compliance is False:
        is_billable = False

    return {
        "total_logged_hours": round(total_logged, 2),
        "capped_hours": capped_hours,
        "ooo_days": ooo_days,
        "aws_active_hours": aws_active_hours,
        "compliance_75_pct": compliance,
        "is_billable": is_billable,
    }
