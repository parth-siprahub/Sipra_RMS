"""
AWS ActiveTrack CSV Parser — Monthly per-employee format.
Parses CSV exports from AWS ActiveTrack with 29 columns.
Format: User (email), then h:mm:ss + secs pairs for each metric.
"""
import csv
import logging
from io import StringIO

logger = logging.getLogger(__name__)

# Column mapping: CSV header -> (hms_field, secs_field)
_COLUMN_MAP = {
    "Work Time":         ("work_time_hms",         "work_time_secs"),
    "Productive":        ("productive_hms",         "productive_secs"),
    "Unproductive":      ("unproductive_hms",       "unproductive_secs"),
    "Undefined":         ("undefined_hms",          "undefined_secs"),
    "Active":            ("active_hms",             "active_secs"),
    "Passive":           ("passive_hms",            "passive_secs"),
    "Screen Time":       ("screen_time_hms",        "screen_time_secs"),
    "Offline Meetings":  ("offline_meetings_hms",   "offline_meetings_secs"),
    "ProdActive":        ("prod_active_hms",        "prod_active_secs"),
    "ProdPassive":       ("prod_passive_hms",       "prod_passive_secs"),
    "UnprodActive":      ("unprod_active_hms",      "unprod_active_secs"),
    "UnprodPassive":     ("unprod_passive_hms",     "unprod_passive_secs"),
    "UndefinedActive":   ("undefined_active_hms",   "undefined_active_secs"),
    "UndefinedPassive":  ("undefined_passive_hms",  "undefined_passive_secs"),
}


def _find_header_index(headers: list[str], prefix: str, suffix: str) -> int | None:
    """Find column index matching a prefix and suffix pattern."""
    for i, h in enumerate(headers):
        h_clean = h.strip()
        if h_clean.startswith(prefix) and suffix in h_clean:
            return i
    return None


def _safe_int(val: str) -> int:
    """Parse string to int, handling quoted values and empty strings."""
    val = str(val).strip().strip('"').strip()
    if not val:
        return 0
    try:
        return int(val)
    except (ValueError, TypeError):
        return 0


def parse_aws_csv(file_bytes: bytes, billing_month: str) -> list[dict]:
    """
    Parse an AWS ActiveTrack monthly CSV export.

    CSV columns (29 total):
      User, Work Time (h:mm:ss), Productive (h:mm:ss), Unproductive (h:mm:ss),
      Undefined (h:mm:ss), Active (h:mm:ss), Passive (h:mm:ss),
      Screen Time (h:mm:ss), Offline Meetings (h:mm:ss),
      Work Time (secs), Productive (secs), Unproductive (sec), ...
      + sub-category pairs (ProdActive, ProdPassive, etc.)

    Returns list of dicts ready for DB insertion into aws_timesheet_logs_v2.
    """
    content = file_bytes.decode("utf-8-sig")
    reader = csv.reader(StringIO(content))

    try:
        headers = next(reader)
    except StopIteration:
        return []

    # Build index maps for h:mm:ss and secs columns
    hms_indices: dict[str, int] = {}   # metric_name -> column index
    secs_indices: dict[str, int] = {}  # metric_name -> column index

    for i, h in enumerate(headers):
        h_clean = h.strip()
        for metric_name in _COLUMN_MAP:
            # Match h:mm:ss columns: "Work Time (h:mm:ss)", "Productive (h:mm:ss)"
            if h_clean == f"{metric_name} (h:mm:ss)":
                hms_indices[metric_name] = i
            # Match secs columns: "Work Time (secs)", "Productive (secs)", "Unproductive (sec)"
            elif h_clean in (f"{metric_name} (secs)", f"{metric_name} (sec)"):
                secs_indices[metric_name] = i

    # Find User column
    user_idx = None
    for i, h in enumerate(headers):
        if h.strip().lower() == "user":
            user_idx = i
            break

    if user_idx is None:
        logger.error("No 'User' column found in AWS CSV. Headers: %s", headers[:5])
        raise ValueError("AWS CSV must have a 'User' column")

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

        # Extract h:mm:ss and secs values for each metric
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

    logger.info(
        "Parsed %d AWS entries for month %s",
        len(results), billing_month,
    )
    return results
