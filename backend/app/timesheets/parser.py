"""
Jira/Tempo XLS Timesheet Parser (UTIL-001)
Parses the Monthly Time Sheets Report (.xls) with the following logic:
  - Daily cell values are Hours (standard = 8.0)
  - Value "01" or 1.0 denotes Out of Office (OOO) — flagged as non-billable
  - Supports idempotent upsert: latest upload for a month overrides previous entries
"""
import logging
from datetime import date
from io import BytesIO

import pandas as pd

logger = logging.getLogger(__name__)

OOO_VALUE = 1.0  # "01" or 1.0 means Out of Office
DAILY_CAP = 8.0  # Maximum billable hours per day


def parse_tempo_xls(file_bytes: bytes, import_month: str) -> list[dict]:
    """
    Parse a Jira/Tempo .xls timesheet report.

    Returns a list of dicts: {jira_username, log_date, hours_logged, is_ooo, import_month}

    The expected XLS format:
    - First column: employee name or Jira username
    - Subsequent columns: day-by-day hours (column headers are day numbers or dates)
    """
    try:
        df = pd.read_excel(BytesIO(file_bytes), engine="xlrd")
    except Exception:
        df = pd.read_excel(BytesIO(file_bytes), engine="openpyxl")

    if df.empty:
        return []

    # Derive year and month from import_month ("YYYY-MM")
    year, month = int(import_month[:4]), int(import_month[5:7])

    daily_agg: dict[tuple[str, str], dict] = {}  # (username, date) -> {hours, is_ooo}
    # First column is the identifier (username/name), rest are day columns
    id_col = df.columns[0]
    day_cols = df.columns[1:]

    for _, row in df.iterrows():
        username = str(row[id_col]).strip()
        if not username or username.lower() in ("nan", "total", "sum", ""):
            continue

        for col in day_cols:
            # Try to parse column header as day number
            try:
                day_num = int(str(col).strip().split(".")[0].split("-")[-1])
                if day_num < 1 or day_num > 31:
                    continue
                log_date = date(year, month, day_num)
            except (ValueError, TypeError):
                continue

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
