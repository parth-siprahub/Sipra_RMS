"""
Jira/Tempo XLS Raw Parser — stores data as-is from Excel.
Produces one row per (User, Issue) with per-day columns (day_01..day_31).

Actual XLS format (Jira/Tempo Monthly Time Sheets Report):
  Columns: [Blank, Team, User, Issue, Key, Logged, DD/MMM/YY, DD/MMM/YY, ...]
  - 1565 rows, 37 columns for March 2026
  - Rows with empty Key = user-level summary (total logged)
  - JIRA-1 key = Out of Office
"""
import logging
from datetime import date, datetime
from io import BytesIO

import pandas as pd

logger = logging.getLogger(__name__)

DATE_FORMATS = [
    "%d/%b/%y",   # 01/Mar/26
    "%d/%b/%Y",   # 01/Mar/2026
    "%d-%b-%y",   # 01-Mar-26
    "%d-%b-%Y",   # 01-Mar-2026
    "%Y-%m-%d",   # 2026-03-01
]

OOO_KEY = "JIRA-1"


def _try_parse_date(col_str: str) -> date | None:
    col_str = str(col_str).strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(col_str, fmt).date()
        except ValueError:
            continue
    return None


def _find_column(df: pd.DataFrame, names: set[str]) -> str | None:
    for col in df.columns:
        if str(col).strip().lower() in names:
            return col
    return None


def parse_jira_raw(file_bytes: bytes, import_month: str) -> list[dict]:
    """
    Parse a Jira/Tempo .xls timesheet report into raw per-issue rows.

    Returns list of dicts ready for DB insertion into jira_timesheet_raw:
    {jira_user, team, issue, jira_key, logged, day_01..day_31, is_summary_row, is_ooo, billing_month}
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
            raise ValueError(
                f"Cannot read the uploaded file. "
                f"xlrd error: {xlrd_err} | openpyxl error: {openpyxl_err}"
            )

    if df.empty:
        return []

    target_year, target_month = int(import_month[:4]), int(import_month[5:7])

    # Auto-detect columns
    user_col = _find_column(df, {"user", "username", "name", "employee", "worker"})
    team_col = _find_column(df, {"team"})
    issue_col = _find_column(df, {"issue"})
    key_col = _find_column(df, {"key"})
    logged_col = _find_column(df, {"logged"})

    if not user_col:
        # Fallback: assume column index 2 is User (standard Tempo layout)
        if len(df.columns) > 2:
            user_col = df.columns[2]
        else:
            raise ValueError("Cannot find 'User' column in the uploaded file")

    # Identify date columns and map to day numbers
    date_col_map: dict[str, int] = {}  # column_name -> day_number (1-31)
    for col in df.columns:
        parsed = _try_parse_date(col)
        if parsed and parsed.year == target_year and parsed.month == target_month:
            date_col_map[col] = parsed.day

    if not date_col_map:
        available = set()
        for col in df.columns:
            parsed = _try_parse_date(col)
            if parsed:
                available.add(f"{parsed.year}-{parsed.month:02d}")
        raise ValueError(
            f"No date columns match month {import_month}. "
            f"Available months in file: {', '.join(sorted(available)) or 'none'}"
        )

    logger.info("Found %d date columns for month %s", len(date_col_map), import_month)

    # Track the last seen user name for rows that inherit from parent
    last_user = ""
    last_team = ""
    entries = []

    for _, row in df.iterrows():
        # Get user — inherit from previous if blank (Excel group structure)
        raw_user = str(row.get(user_col, "")).strip()
        if raw_user and raw_user.lower() not in ("nan", "total", "sum", ""):
            last_user = raw_user

        # Get team
        if team_col:
            raw_team = str(row.get(team_col, "")).strip()
            if raw_team and raw_team.lower() != "nan":
                last_team = raw_team

        if not last_user:
            continue

        # Get issue and key
        raw_issue = ""
        raw_key = ""
        if issue_col:
            raw_issue = str(row.get(issue_col, "")).strip()
            if raw_issue.lower() == "nan":
                raw_issue = ""
        if key_col:
            raw_key = str(row.get(key_col, "")).strip()
            if raw_key.lower() == "nan":
                raw_key = ""

        # Get logged total
        raw_logged = 0.0
        if logged_col:
            try:
                val = row.get(logged_col, 0)
                if pd.notna(val):
                    raw_logged = float(val)
            except (ValueError, TypeError):
                pass

        # Determine row type
        is_summary = not raw_key  # Empty key = user summary row
        is_ooo = raw_key.upper() == OOO_KEY

        # Build per-day values
        record: dict = {
            "billing_month": import_month,
            "team": last_team or None,
            "jira_user": last_user,
            "issue": raw_issue or None,
            "jira_key": raw_key or None,
            "logged": raw_logged,
            "is_summary_row": is_summary,
            "is_ooo": is_ooo,
        }

        # Add day columns
        has_any_day_data = False
        for col_name, day_num in date_col_map.items():
            field = f"day_{day_num:02d}"
            val = row.get(col_name)
            if pd.notna(val) and val != "" and val != 0:
                try:
                    record[field] = float(val)
                    has_any_day_data = True
                except (ValueError, TypeError):
                    record[field] = None
            else:
                record[field] = None

        # Skip rows that are completely empty (no user, no data)
        if not has_any_day_data and raw_logged == 0 and is_summary:
            continue

        entries.append(record)

    logger.info("Parsed %d raw Jira entries for month %s", len(entries), import_month)
    return entries
