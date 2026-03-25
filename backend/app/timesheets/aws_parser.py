"""
AWS ActiveTrack CSV Parser (Track E-2)
Parses weekly CSV exports from AWS ActiveTrack.
Format: CSV with 29 columns, @dcli.com emails, seconds-based metrics.
"""
import logging
from datetime import date
from io import StringIO

import pandas as pd

logger = logging.getLogger(__name__)

THRESHOLD_SECS = 108000  # 30 hours in seconds


def parse_aws_csv(file_bytes: bytes, week_start: date, week_end: date) -> list[dict]:
    """
    Parse an AWS ActiveTrack CSV export.

    Returns a list of dicts with employee metrics for the given week.
    """
    content = file_bytes.decode("utf-8-sig")
    df = pd.read_csv(StringIO(content))

    if df.empty:
        return []

    results = []
    for _, row in df.iterrows():
        user_raw = str(row.get("User", "")).strip().strip('"').strip()
        if not user_raw or user_raw.lower() == "nan":
            continue

        email = user_raw.lower()

        try:
            work_time_secs = int(row.get("Work Time (secs)", 0) or 0)
            productive_secs = int(row.get("Productive (secs)", 0) or 0)
            unproductive_secs = int(row.get("Unproductive (sec)", 0) or 0)
            active_secs = int(row.get("Active (secs)", 0) or 0)
            passive_secs = int(row.get("Passive (secs)", 0) or 0)
            screen_time_secs = int(row.get("Screen Time (secs)", 0) or 0)
        except (ValueError, TypeError) as e:
            logger.warning("Skipping row for %s due to parse error: %s", email, e)
            continue

        results.append({
            "aws_email": email,
            "week_start": str(week_start),
            "week_end": str(week_end),
            "work_time_secs": work_time_secs,
            "productive_secs": productive_secs,
            "unproductive_secs": unproductive_secs,
            "active_secs": active_secs,
            "passive_secs": passive_secs,
            "screen_time_secs": screen_time_secs,
            "work_time_hours": round(work_time_secs / 3600, 2),
            "is_below_threshold": work_time_secs < THRESHOLD_SECS,
        })

    logger.info(
        "Parsed %d AWS entries for week %s to %s (%d below threshold)",
        len(results),
        week_start,
        week_end,
        sum(1 for r in results if r["is_below_threshold"]),
    )
    return results
