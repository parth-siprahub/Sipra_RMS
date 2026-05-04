"""Date utilities — working-day calculation with India public holidays.

Usage::

    from app.utils.date_utils import get_working_days, load_holidays_from_db

    # Sync (uses hardcoded fallback)
    days = get_working_days(date(2026, 4, 1), date(2026, 4, 24))  # → 16

    # Async (fetches from holidays table — pass result to get_working_days)
    hols = await load_holidays_from_db(supabase_client, year=2026)
    days = get_working_days(date(2026, 4, 1), date(2026, 4, 24), holidays=hols)
"""

from datetime import date, timedelta

# Hardcoded fallback: India national / bank holidays (weekdays only) for 2026.
# The `holidays` DB table (migration 016) is the authoritative source;
# use load_holidays_from_db() in async contexts to get live data.
INDIA_HOLIDAYS: dict[date, str] = {
    # 2026
    date(2026, 1, 14): "Makar Sankranti",
    date(2026, 1, 26): "Republic Day",
    date(2026, 3, 20): "Gudi Padwa / Ugadi",
    date(2026, 3, 25): "Holi",
    date(2026, 3, 31): "Eid-ul-Fitr (Ramzan)",
    date(2026, 4, 3):  "Good Friday",
    date(2026, 4, 14): "Ambedkar Jayanti / Tamil New Year",
    date(2026, 5, 1):  "Maharashtra Day / Labour Day",
    date(2026, 6, 17): "Eid-ul-Adha (Bakrid)",
    date(2026, 8, 15): "Independence Day",
    date(2026, 8, 25): "Janmashtami",
    date(2026, 9, 4):  "Ganesh Chaturthi",
    date(2026, 10, 2): "Gandhi Jayanti",
    date(2026, 10, 22): "Dussehra",
    date(2026, 11, 11): "Diwali (Laxmi Puja)",
    date(2026, 11, 12): "Diwali (Bali Pratipada)",
    date(2026, 12, 25): "Christmas",
}


async def load_holidays_from_db(client, year: int) -> dict[date, str]:
    """Fetch holiday dates from the `holidays` DB table for a given year.

    Falls back gracefully to an empty dict if the table doesn't exist yet
    or the query fails, so callers can still use INDIA_HOLIDAYS as fallback.

    Args:
        client: Supabase async client.
        year:   The calendar year to load (e.g. 2026).

    Returns:
        dict mapping date → holiday name for the requested year.
    """
    try:
        result = await client.table("holidays").select("holiday_date,name").eq("year", year).execute()
        return {
            date.fromisoformat(row["holiday_date"]): row["name"]
            for row in (result.data or [])
            if row.get("holiday_date")
        }
    except Exception:
        return {}


def get_working_days(
    start: date,
    end: date,
    holidays: dict[date, str] | None = None,
) -> int:
    """Count working days (Mon–Fri, excluding India holidays) between start and end, inclusive.

    Args:
        start: First day of the range (inclusive).
        end:   Last day of the range (inclusive).
        holidays: Override the default ``INDIA_HOLIDAYS`` dict. Pass ``{}`` for weekdays-only.

    Returns:
        Number of working days. Returns 0 if start > end.

    Examples::

        >>> get_working_days(date(2026, 4, 1), date(2026, 4, 30))  # full April
        20  # 22 weekdays minus Good Friday (4/3) and Ambedkar Jayanti (4/14)

        >>> get_working_days(date(2026, 4, 1), date(2026, 4, 24))  # Pathak exit
        16
    """
    if start > end:
        return 0
    if holidays is None:
        holidays = INDIA_HOLIDAYS

    count = 0
    current = start
    while current <= end:
        if current.weekday() < 5 and current not in holidays:  # Mon=0 … Fri=4
            count += 1
        current += timedelta(days=1)
    return count


def prorated_target_hours(
    month_start: date,
    month_end: date,
    emp_start: date,
    emp_exit: date | None,
    hours_per_day: float = 8.0,
) -> float:
    """Compute prorated target hours for an employee for a billing month.

    For full-month employees the result equals get_working_days(month_start, month_end) * 8.
    For mid-month starters / leavers the effective window is clipped.

    Args:
        month_start: First day of the billing month.
        month_end:   Last day of the billing month.
        emp_start:   Employee's hire/start date.
        emp_exit:    Employee's exit date (inclusive). None if still active.
        hours_per_day: Billable hours per working day (default 8).

    Returns:
        Prorated billable hours as a float (rounded to 2 decimal places).
    """
    eff_start = max(month_start, emp_start)
    eff_end = min(month_end, emp_exit) if emp_exit else month_end

    if eff_start > eff_end:
        return 0.0

    days = get_working_days(eff_start, eff_end)
    return round(days * hours_per_day, 2)
