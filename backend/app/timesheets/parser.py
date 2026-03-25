"""
Jira/Tempo XLS Timesheet Parser (UTIL-001)
Parses the Monthly Time Sheets Report (.xls) with the following logic:
  - Daily cell values are Hours (standard = 8.0)
  - Value "01" or 1.0 denotes Out of Office (OOO) — flagged as non-billable
  - Supports idempotent upsert: latest upload for a month overrides previous entries

Actual XLS format (Jira/Tempo Monthly Time Sheets Report):
  Columns: [Blank, Team, User, Issue, Key, Logged, DD/MMM/YY, DD/MMM/YY, ...]
  - 'User' column contains the employee name (Jira username)
  - Date columns are in DD/MMM/YY format (e.g. '01/Mar/26', '15/Feb/26')
  - Each row is a (user, issue) combination with hours logged per day
"""
import logging
from datetime import date, datetime
from io import BytesIO

import pandas as pd

logger = logging.getLogger(__name__)

OOO_VALUE = 1.0  # "01" or 1.0 means Out of Office
DAILY_CAP = 8.0  # Maximum billable hours per day

# Common date formats found in Tempo exports
DATE_FORMATS = [
    "%d/%b/%y",   # 01/Jan/25
    "%d/%b/%Y",   # 01/Jan/2025
    "%d-%b-%y",   # 01-Jan-25
    "%d-%b-%Y",   # 01-Jan-2025
    "%Y-%m-%d",   # 2025-01-01
]


def _try_parse_date(col_str: str) -> date | None:
    """Attempt to parse a column header string as a date."""
    col_str = str(col_str).strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(col_str, fmt).date()
        except ValueError:
            continue
    return None


def _find_user_column(df: pd.DataFrame) -> str | None:
    """Auto-detect the column containing usernames."""
    # Look for a column named 'User', 'Username', 'Name', 'Employee' (case-insensitive)
    user_col_names = {"user", "username", "name", "employee", "full name", "worker"}
    for col in df.columns:
        if str(col).strip().lower() in user_col_names:
            return col
    return None


def parse_tempo_xls(file_bytes: bytes, import_month: str) -> list[dict]:
    """
    Parse a Jira/Tempo .xls timesheet report.

    Returns a list of dicts: {jira_username, log_date, hours_logged, is_ooo, import_month}
    """
    try:
        df = pd.read_excel(BytesIO(file_bytes), engine="xlrd")
        logger.info("Parsed file using xlrd engine (.xls format)")
    except Exception as xlrd_err:
        logger.warning("xlrd engine failed: %s. Trying openpyxl...", xlrd_err)
        try:
            df = pd.read_excel(BytesIO(file_bytes), engine="openpyxl")
            logger.info("Parsed file using openpyxl engine (.xlsx format)")
        except Exception as openpyxl_err:
            logger.error("Both xlrd and openpyxl engines failed. xlrd: %s | openpyxl: %s", xlrd_err, openpyxl_err)
            raise ValueError(
                f"Cannot read the uploaded file. Ensure it is a valid .xls or .xlsx file. "
                f"xlrd error: {xlrd_err} | openpyxl error: {openpyxl_err}"
            )

    if df.empty:
        return []

    # Derive target year and month from import_month ("YYYY-MM")
    target_year, target_month = int(import_month[:4]), int(import_month[5:7])

    # --- Auto-detect column layout ---
    user_col = _find_user_column(df)

    if user_col:
        # New format: [blank, User, Issue, Key, Logged, dates...]
        logger.info("Detected 'User' column: '%s'", user_col)
    else:
        # Fallback: assume first column is the username
        user_col = df.columns[0]
        logger.info("No named user column found, using first column: '%s'", user_col)

    # --- Identify date columns and build a mapping: column_name -> date ---
    date_col_map: dict[str, date] = {}
    for col in df.columns:
        parsed_date = _try_parse_date(col)
        if parsed_date is not None:
            date_col_map[col] = parsed_date

    if not date_col_map:
        # Fallback: try old-style day-number columns (1, 2, 3... or "1", "2", "3"...)
        logger.warning("No date-format columns found. Trying day-number fallback...")
        for col in df.columns:
            try:
                day_num = int(str(col).strip().split(".")[0].split("-")[-1])
                if 1 <= day_num <= 31:
                    try:
                        date_col_map[col] = date(target_year, target_month, day_num)
                    except ValueError:
                        continue  # Invalid day for this month
            except (ValueError, TypeError):
                continue

    if not date_col_map:
        logger.error("No valid date columns found in the uploaded file. Columns: %s", list(df.columns[:20]))
        raise ValueError(
            "No valid date columns found. Expected date headers in DD/MMM/YY format "
            f"(e.g., '01/Jan/25') or day numbers (1, 2, 3...). "
            f"Found columns: {list(df.columns[:10])}..."
        )

    # Filter to only columns matching the target import_month
    target_date_cols = {
        col: d for col, d in date_col_map.items()
        if d.year == target_year and d.month == target_month
    }

    if not target_date_cols:
        available_months = sorted({f"{d.year}-{d.month:02d}" for d in date_col_map.values()})
        logger.warning(
            "No date columns match month %s. Available months in file: %s",
            import_month, available_months,
        )
        raise ValueError(
            f"No data found for month {import_month}. "
            f"The uploaded file contains data for: {', '.join(available_months)}"
        )

    logger.info(
        "Found %d date columns for month %s (out of %d total date columns)",
        len(target_date_cols), import_month, len(date_col_map),
    )

    # --- Aggregate hours per (username, date) ---
    daily_agg: dict[tuple[str, str], dict] = {}

    for _, row in df.iterrows():
        username = str(row[user_col]).strip()
        if not username or username.lower() in ("nan", "total", "sum", ""):
            continue

        for col, log_date in target_date_cols.items():
            raw_value = row[col]
            if pd.isna(raw_value) or raw_value == "" or raw_value == 0:
                continue

            try:
                hours = float(raw_value)
            except (ValueError, TypeError):
                continue

            is_ooo = abs(hours - OOO_VALUE) < 0.01
            key = (username, str(log_date))
            if key not in daily_agg:
                daily_agg[key] = {"hours": 0.0, "is_ooo": False}
            if is_ooo:
                daily_agg[key]["is_ooo"] = True
            else:
                daily_agg[key]["hours"] += hours

    # Build entries with 8-hour daily cap
    entries = []
    for (username, log_date_str), agg in daily_agg.items():
        capped_hours = min(agg["hours"], DAILY_CAP) if not agg["is_ooo"] else 0.0
        entries.append({
            "jira_username": username,
            "log_date": log_date_str,
            "hours_logged": capped_hours,
            "is_ooo": agg["is_ooo"],
            "import_month": import_month,
        })

    logger.info("Parsed %d timesheet entries for month %s", len(entries), import_month)
    return entries

