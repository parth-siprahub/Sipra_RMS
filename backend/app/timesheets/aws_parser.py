"""Parse AWS ActiveTrack CSV exports into structured records."""
import csv
import io
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class AWSActiveTrackRecord:
    user_email: str
    active_hours: float
    work_time_hours: float
    productive_hours: float


def _secs_to_hours(value: str) -> float:
    """Convert seconds string to hours, rounded to 2 decimal places."""
    try:
        return round(int(value.strip().strip('"')) / 3600, 2)
    except (ValueError, TypeError):
        return 0.0


def parse_aws_csv(file_bytes: bytes) -> list[AWSActiveTrackRecord]:
    """
    Parse AWS ActiveTrack CSV content.

    Expected columns:
      - User: email address
      - Active (secs): active time in seconds
      - Work Time (secs): total work time in seconds
      - Productive (secs): productive time in seconds

    Returns a list of AWSActiveTrackRecord with hours values.
    """
    try:
        text = file_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = file_bytes.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))

    records: list[AWSActiveTrackRecord] = []
    for row_num, row in enumerate(reader, start=2):
        user_email = row.get("User", "").strip().strip('"')
        if not user_email:
            logger.warning("Row %d: missing User email, skipping", row_num)
            continue

        active_secs = row.get("Active (secs)", "0")
        work_time_secs = row.get("Work Time (secs)", "0")
        productive_secs = row.get("Productive (secs)", "0")

        records.append(AWSActiveTrackRecord(
            user_email=user_email,
            active_hours=_secs_to_hours(active_secs),
            work_time_hours=_secs_to_hours(work_time_secs),
            productive_hours=_secs_to_hours(productive_secs),
        ))

    logger.info("Parsed %d AWS ActiveTrack records from CSV", len(records))
    return records
