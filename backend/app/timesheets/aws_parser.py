"""
AWS ActiveTrack CSV Parser — supports both monthly-aggregate and daily-row formats.
Parses CSV exports from AWS ActiveTrack, aggregates daily rows per employee per month.
Also parses the "Working Hours" (granular) CSV into per-day rows for aws_daily_logs.
"""
import csv
import logging
from collections import defaultdict
from datetime import date, datetime, timedelta
from io import StringIO

logger = logging.getLogger(__name__)

# Metric name -> (hms_field, secs_field) for DB record
_COLUMN_MAP = {
    "Work Time":         ("work_time_hms",         "work_time_secs"),
    "Productive":        ("productive_hms",         "productive_secs"),
    "Unproductive":      ("unproductive_hms",       "unproductive_secs"),
    "Undefined":         ("undefined_hms",          "undefined_secs"),
    "Active":            ("active_hms",             "active_secs"),
    "Passive":           ("passive_hms",            "passive_secs"),
    "Screen Time":       ("screen_time_hms",        "screen_time_secs"),
    "Offline Meetings":  ("offline_meetings_hms",   "offline_meetings_secs"),
    "Productive Active":   ("prod_active_hms",        "prod_active_secs"),
    "Productive Passive":  ("prod_passive_hms",       "prod_passive_secs"),
    "Unproductive Active": ("unprod_active_hms",      "unprod_active_secs"),
    "Unproductive Passive":("unprod_passive_hms",     "unprod_passive_secs"),
    "Undefined Active":    ("undefined_active_hms",   "undefined_active_secs"),
    "Undefined Passive":   ("undefined_passive_hms",  "undefined_passive_secs"),
}

# Legacy aliases for older CSV exports
_COLUMN_ALIASES = {
    "ProdActive": "Productive Active",
    "ProdPassive": "Productive Passive",
    "UnprodActive": "Unproductive Active",
    "UnprodPassive": "Unproductive Passive",
    "UndefinedActive": "Undefined Active",
    "UndefinedPassive": "Undefined Passive",
}


def _safe_int(val: str) -> int:
    """Parse string to int, handling quoted values and empty strings."""
    val = str(val).strip().strip('"').strip()
    if not val:
        return 0
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return 0


def _secs_to_hms(total_secs: int) -> str:
    """Convert total seconds to h:mm:ss format."""
    h = total_secs // 3600
    m = (total_secs % 3600) // 60
    s = total_secs % 60
    return f"{h:02d}:{m:02d}:{s:02d}"


def parse_aws_csv(file_bytes: bytes, billing_month: str) -> list[dict]:
    """
    Parse an AWS ActiveTrack CSV export.

    Supports two formats:
    1. Monthly aggregate: one row per employee, no Date column
    2. Daily rows: one row per employee per day, has a Date column

    For daily format, rows are aggregated by (email, month).
    If billing_month is provided, only rows matching that month are included.
    If the CSV contains multiple months, all months are returned.

    Returns list of dicts ready for DB insertion into aws_timesheet_logs_v2.
    """
    content = file_bytes.decode("utf-8-sig")
    reader = csv.reader(StringIO(content))

    try:
        headers = next(reader)
    except StopIteration:
        return []

    # Normalize headers
    headers_clean = [h.strip() for h in headers]

    # Detect Date column (daily format)
    date_idx = None
    for i, h in enumerate(headers_clean):
        if h.lower() == "date":
            date_idx = i
            break

    has_daily_rows = date_idx is not None

    # Find User column
    user_idx = None
    for i, h in enumerate(headers_clean):
        if h.lower() == "user":
            user_idx = i
            break

    if user_idx is None:
        logger.error("No 'User' column found in AWS CSV. Headers: %s", headers_clean[:5])
        raise ValueError("AWS CSV must have a 'User' column")

    # Build index maps for h:mm:ss and secs columns
    hms_indices: dict[str, int] = {}
    secs_indices: dict[str, int] = {}

    # Also build a map from canonical metric name -> resolved name (for aliases)
    resolved_map: dict[str, str] = {}
    for alias, canonical in _COLUMN_ALIASES.items():
        resolved_map[alias] = canonical

    for i, h in enumerate(headers_clean):
        for metric_name in _COLUMN_MAP:
            # Match h:mm:ss columns: "Work Time (h:mm:ss)"
            if h == f"{metric_name} (h:mm:ss)":
                hms_indices[metric_name] = i
            # Match secs columns: "Work Time (secs)" or "Work Time (sec)"
            elif h in (f"{metric_name} (secs)", f"{metric_name} (sec)"):
                secs_indices[metric_name] = i
            # Match bare column (daily format): "Productive", "Work Time" — contains raw seconds
            elif h == metric_name and metric_name not in secs_indices:
                # Only use bare column as secs if no explicit (secs) column found
                # Check if value is numeric (seconds) vs h:mm:ss by checking first data row later
                secs_indices[metric_name] = i

        # Check legacy aliases
        for alias, canonical in _COLUMN_ALIASES.items():
            if h == f"{alias} (h:mm:ss)":
                hms_indices[canonical] = i
            elif h in (f"{alias} (secs)", f"{alias} (sec)"):
                secs_indices[canonical] = i
            elif h == alias and canonical not in secs_indices:
                secs_indices[canonical] = i

    if has_daily_rows:
        return _parse_daily_rows(
            reader, headers_clean, user_idx, date_idx,
            hms_indices, secs_indices, billing_month,
        )
    else:
        return _parse_monthly_rows(
            reader, user_idx, hms_indices, secs_indices, billing_month,
        )


def _extract_month_from_date(date_str: str) -> str:
    """Extract YYYY-MM from a date string like '2026-03-26T00:00:00'."""
    clean = date_str.strip().strip('"')
    if len(clean) >= 7:
        return clean[:7]
    return ""


def _parse_daily_rows(
    reader: csv.reader,
    headers: list[str],
    user_idx: int,
    date_idx: int | None,
    hms_indices: dict[str, int],
    secs_indices: dict[str, int],
    billing_month: str,
) -> list[dict]:
    """Parse daily-row format and aggregate by (email, month)."""

    # Accumulator: (email, month) -> {metric: total_secs}
    accumulator: dict[tuple[str, str], dict[str, int]] = defaultdict(lambda: defaultdict(int))

    for row in reader:
        if not row or len(row) <= user_idx:
            continue

        email = row[user_idx].strip().strip('"').strip().lower()
        if not email or email == "nan":
            continue

        # Determine row month from Date column
        row_month = billing_month
        if date_idx is not None and date_idx < len(row):
            extracted = _extract_month_from_date(row[date_idx])
            if extracted:
                row_month = extracted

        # Filter: if billing_month provided, only keep matching rows
        if billing_month and row_month != billing_month:
            continue

        key = (email, row_month)

        # Accumulate seconds for each metric
        for metric_name in _COLUMN_MAP:
            secs_val = 0
            if metric_name in secs_indices:
                idx = secs_indices[metric_name]
                if idx < len(row):
                    secs_val = _safe_int(row[idx])
            accumulator[key][metric_name] += secs_val

    # Convert accumulated data to records
    results = []
    for (email, month), metrics in accumulator.items():
        record: dict = {
            "aws_email": email,
            "billing_month": month,
        }
        for metric_name, (hms_field, secs_field) in _COLUMN_MAP.items():
            total_secs = metrics.get(metric_name, 0)
            record[secs_field] = total_secs
            record[hms_field] = _secs_to_hms(total_secs)
        results.append(record)

    logger.info(
        "Parsed %d daily rows into %d aggregated entries for month %s",
        sum(len(v) for v in accumulator.values()), len(results), billing_month,
    )
    return results


def _parse_monthly_rows(
    reader: csv.reader,
    user_idx: int,
    hms_indices: dict[str, int],
    secs_indices: dict[str, int],
    billing_month: str,
) -> list[dict]:
    """Parse original monthly-aggregate format (one row per employee)."""
    results = []
    for row in reader:
        if not row or len(row) <= user_idx:
            continue

        email = row[user_idx].strip().strip('"').strip().lower()
        if not email or email == "nan":
            continue

        record: dict = {
            "aws_email": email,
            "billing_month": billing_month,
        }

        for metric_name, (hms_field, secs_field) in _COLUMN_MAP.items():
            hms_val = ""
            secs_val = 0

            if metric_name in hms_indices:
                idx = hms_indices[metric_name]
                if idx < len(row):
                    hms_val = row[idx].strip().strip('"')

            if metric_name in secs_indices:
                idx = secs_indices[metric_name]
                if idx < len(row):
                    secs_val = _safe_int(row[idx])

            record[hms_field] = hms_val
            record[secs_field] = secs_val

        results.append(record)

    logger.info("Parsed %d AWS entries for month %s", len(results), billing_month)
    return results


# ──────────────────────────────────────────────────────────────────────────────
# Working Hours (Granular) CSV Parser → aws_daily_logs rows
# ──────────────────────────────────────────────────────────────────────────────

def parse_aws_working_hours_csv(file_bytes: bytes, billing_month: str) -> list[dict]:
    """
    Parse the "Working Hours" (granular / date-wise) AWS ActiveTrack CSV export.

    Expected CSV columns (bare seconds, not h:mm:ss):
        Date, User, Last Activity Log, Location, Productive, Screen Time,
        Offline Meetings, Time Off, Work Time, ...

    Returns list of dicts suitable for bulk-insert into aws_daily_logs:
        aws_email, log_date (ISO str), billing_month, work_seconds,
        productive_seconds, screen_time_seconds, is_weekend

    Only rows whose date falls within billing_month are included.
    Duplicate (email, date) rows are summed.
    """
    content = file_bytes.decode("utf-8-sig")
    reader = csv.reader(StringIO(content))

    try:
        raw_headers = next(reader)
    except StopIteration:
        return []

    headers = [h.strip() for h in raw_headers]

    # Locate required columns by name (case-insensitive search)
    def _find_col(name: str) -> int | None:
        n = name.lower()
        for i, h in enumerate(headers):
            if h.lower() == n:
                return i
        return None

    date_idx  = _find_col("date")
    user_idx  = _find_col("user")
    work_idx  = _find_col("work time")
    prod_idx  = _find_col("productive")
    scr_idx   = _find_col("screen time")

    if user_idx is None:
        raise ValueError("Working Hours CSV must have a 'User' column")
    if date_idx is None:
        raise ValueError("Working Hours CSV must have a 'Date' column")

    # Accumulator: (email, date_str) -> {work_s, prod_s, scr_s}
    acc: dict[tuple[str, str], dict[str, int]] = defaultdict(
        lambda: {"work_seconds": 0, "productive_seconds": 0, "screen_time_seconds": 0}
    )

    for row in reader:
        if not row or len(row) <= max(filter(lambda x: x is not None, [date_idx, user_idx])):
            continue

        email = row[user_idx].strip().strip('"').lower()
        if not email or email in ("nan", "user"):
            continue

        raw_date = row[date_idx].strip().strip('"') if date_idx < len(row) else ""
        if not raw_date:
            continue

        # Parse date from "2026-04-28T00:00:00" or "2026-04-28"
        try:
            log_date: date = (datetime.fromisoformat(raw_date) + timedelta(hours=5, minutes=30)).date()
        except ValueError:
            logger.warning("Skipping unrecognised date format: %r", raw_date)
            continue

        # Filter to billing_month
        if log_date.strftime("%Y-%m") != billing_month:
            continue

        log_date_str = log_date.isoformat()  # "YYYY-MM-DD"
        key = (email, log_date_str)

        acc[key]["work_seconds"]       += _safe_int(row[work_idx]) if (work_idx is not None and work_idx < len(row)) else 0
        acc[key]["productive_seconds"] += _safe_int(row[prod_idx]) if (prod_idx is not None and prod_idx < len(row)) else 0
        acc[key]["screen_time_seconds"]+= _safe_int(row[scr_idx])  if (scr_idx  is not None and scr_idx  < len(row)) else 0

    results: list[dict] = []
    for (email, log_date_str), secs in acc.items():
        log_date_obj = date.fromisoformat(log_date_str)
        results.append({
            "aws_email":          email,
            "billing_month":      billing_month,
            "log_date":           log_date_str,
            "work_seconds":       secs["work_seconds"],
            "productive_seconds": secs["productive_seconds"],
            "screen_time_seconds":secs["screen_time_seconds"],
            "is_weekend":         log_date_obj.weekday() >= 5,  # Sat=5, Sun=6
        })

    logger.info(
        "Parsed %d daily rows from Working Hours CSV for month %s",
        len(results), billing_month,
    )
    return results
