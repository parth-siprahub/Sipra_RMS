"""
SOW CSV Bulk Import Script
===========================
Imports SOW records from 'SOW_IMPORT_EXCEL - Sheet1.csv' into the RMS
production database (Supabase).

Design Decisions:
  - Direct Supabase SDK (sync admin client) — bypasses API-layer Pydantic validators
    that reject historical dates (start_not_in_past).
  - Idempotent — pre-loads existing sows and job_profiles; skips duplicates on re-run.
  - Smart date parser — handles M/D/YYYY, D/M/YY, D-M-YYYY, and fallback formats.
  - max_resources populated from "Count of Request ID" column — no placeholder RRs created.
  - Client hardcoded to "DCLI" (matches existing data convention).
  - --dry-run flag: prints what would be inserted without touching the DB.

Usage:
    cd D:\\RMS_Siprahub\\backend
    # Preview (no DB writes):
    cmd /c venv\\Scripts\\python.exe scripts\\import_sow_csv.py --dry-run
    # Execute:
    cmd /c venv\\Scripts\\python.exe scripts\\import_sow_csv.py
    # Verify only (print existing SOW counts):
    cmd /c venv\\Scripts\\python.exe scripts\\import_sow_csv.py --verify
"""

import argparse
import csv
import logging
import os
import sys
from datetime import datetime, date

# ── Path setup ─────────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────
CSV_PATH = r"C:\Users\parth\Downloads\SOW_IMPORT_EXCEL - Sheet1.csv"
CLIENT_NAME = "DCLI"

# All date formats found in the CSV — tried in order
DATE_FORMATS = [
    "%m/%d/%Y",   # 1/7/2025  (US standard — most common)
    "%m/%d/%y",   # 1/7/25
    "%d/%m/%Y",   # 17/03/2025
    "%d/%m/%y",   # 17/03/25  (row #044 case)
    "%d-%m-%Y",   # 20-05-2025 (row #074 case)
    "%d-%m-%y",   # 20-05-25
    "%Y-%m-%d",   # ISO fallback
]


def parse_date(raw: str) -> date | None:
    """
    Try multiple date format strings.
    US date (M/D/YYYY) is attempted first because it's the dominant format in this CSV.
    Falls back through European formats for edge cases like '17/03/25' and '20-05-2025'.
    Returns None if all formats fail.
    """
    if not raw or not raw.strip():
        return None
    raw = raw.strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    logger.warning("  ✗ Could not parse date: %r — skipping date field", raw)
    return None


def load_csv(path: str) -> list[dict]:
    """Load and validate the CSV. Returns list of raw row dicts."""
    if not os.path.exists(path):
        logger.error("CSV file not found: %s", path)
        sys.exit(1)

    rows = []
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, start=2):  # start=2 because row 1 = header
            sow_num = row.get("SOW", "").strip()
            role = row.get("Role", "").strip()
            sow_date_raw = row.get("SOW Date", "").strip()
            count_raw = row.get("Count of Request ID", "").strip()

            if not sow_num:
                logger.warning("Row %d: empty SOW number — skipped", i)
                continue

            try:
                count = int(count_raw) if count_raw else None
            except ValueError:
                logger.warning("Row %d: invalid Count %r — defaulting to None", i, count_raw)
                count = None

            rows.append({
                "sow_number": sow_num,
                "role": role,
                "sow_date_raw": sow_date_raw,
                "max_resources": count,
                "_row": i,
            })

    logger.info("Loaded %d data rows from CSV", len(rows))
    return rows


def run_import(rows: list[dict], dry_run: bool) -> dict:
    """
    Core import logic.
    Returns stats dict: {sows_created, sows_updated, sows_skipped, jps_created, jps_skipped, errors}.
    """
    from app.database import get_supabase_admin

    client = get_supabase_admin()

    # ── Pre-load caches (idempotency) ──────────────────────────────────────────
    logger.info("Pre-loading existing data from DB...")
    existing_sows_res = client.table("sows").select("id, sow_number, job_profile_id, start_date").execute()
    sow_cache: dict[str, dict] = {}  # sow_number → {id, job_profile_id, start_date}
    for s in (existing_sows_res.data or []):
        if s.get("sow_number"):
            sow_cache[s["sow_number"]] = s
    logger.info("  Found %d existing SOWs in DB", len(sow_cache))

    existing_jps = client.table("job_profiles").select("id, role_name").execute()
    jp_cache: dict[str, int] = {}  # role_name → id
    for jp in (existing_jps.data or []):
        if jp.get("role_name"):
            jp_cache[jp["role_name"]] = jp["id"]
    logger.info("  Found %d existing Job Profiles in DB", len(jp_cache))

    # ── Stats ──────────────────────────────────────────────────────────────────
    stats = {
        "sows_created": 0,
        "sows_updated": 0,
        "sows_skipped": 0,
        "jps_created": 0,
        "jps_skipped": 0,
        "errors": 0,
        "date_parse_failures": 0,
    }

    # ── Process rows ───────────────────────────────────────────────────────────
    for row in rows:
        sow_number = row["sow_number"]
        role = row["role"]
        sow_date_raw = row["sow_date_raw"]
        max_resources = row["max_resources"]
        row_num = row["_row"]

        submitted_date = parse_date(sow_date_raw)
        if sow_date_raw and not submitted_date:
            stats["date_parse_failures"] += 1

        # ── Step 1: Ensure Job Profile exists ─────────────────────────────────
        jp_id = None
        if role:
            if role in jp_cache:
                jp_id = jp_cache[role]
                stats["jps_skipped"] += 1
            else:
                if dry_run:
                    logger.info("  [DRY-RUN] Would create JP: role_name=%r | technology=%r", role, role)
                    stats["jps_created"] += 1
                    jp_cache[role] = -1
                    jp_id = -1
                else:
                    try:
                        # Fixed: added technology (fallback to role name)
                        result = client.table("job_profiles").insert(
                            {"role_name": role, "technology": role}
                        ).execute()
                        if result.data:
                            jp_id = result.data[0]["id"]
                            jp_cache[role] = jp_id
                            stats["jps_created"] += 1
                            logger.info("  [OK] JP created: %r → id=%d", role, jp_id)
                        else:
                            logger.warning("Row %d: JP insert returned no data for %r", row_num, role)
                    except Exception as e:
                        try:
                            existing = client.table("job_profiles").select("id").eq("role_name", role).execute()
                            if existing.data:
                                jp_id = existing.data[0]["id"]
                                jp_cache[role] = jp_id
                                stats["jps_skipped"] += 1
                            else:
                                logger.error("Row %d: JP creation failed for %r: %s", row_num, role, e)
                                stats["errors"] += 1
                        except Exception as e2:
                            logger.error("Row %d: JP lookup failed for %r: %s", row_num, role, e2)
                            stats["errors"] += 1

        # ── Step 2: Create or Update SOW ───────────────────────────────────────
        sow_exists = sow_number in sow_cache
        existing_sow = sow_cache.get(sow_number)

        sow_data: dict = {
            "sow_number": sow_number,
            "client_name": CLIENT_NAME,
            "is_active": True,
        }
        if submitted_date:
            sow_data["submitted_date"] = submitted_date.isoformat()
            sow_data["start_date"] = submitted_date.isoformat()  # Fixed: map SOW Date to start_date
        if max_resources is not None:
            sow_data["max_resources"] = max_resources
        if jp_id and jp_id != -1:
            sow_data["job_profile_id"] = jp_id

        if not sow_exists:
            if dry_run:
                logger.info("  [DRY-RUN] Would INSERT sow: number=%s | role=%r | start=%s", sow_number, role, submitted_date)
                stats["sows_created"] += 1
                continue
            
            try:
                result = client.table("sows").insert(sow_data).execute()
                if result.data:
                    stats["sows_created"] += 1
                    logger.info("  [OK] SOW created: %s | %r | start=%s", sow_number, role, submitted_date)
                else:
                    logger.error("Row %d: SOW %s insert failed", row_num, sow_number)
                    stats["errors"] += 1
            except Exception as e:
                logger.error("Row %d: SOW %s creation failed: %s", row_num, sow_number, e)
                stats["errors"] += 1
        else:
            # Check if we need to update missing fields
            needs_update = False
            update_data = {}
            
            if existing_sow.get("job_profile_id") is None and jp_id and jp_id != -1:
                update_data["job_profile_id"] = jp_id
                needs_update = True
            
            if existing_sow.get("start_date") is None and submitted_date:
                update_data["start_date"] = submitted_date.isoformat()
                needs_update = True

            if needs_update:
                if dry_run:
                    logger.info("  [DRY-RUN] Would UPDATE sow %s: %s", sow_number, update_data)
                    stats["sows_updated"] += 1
                    continue
                
                try:
                    client.table("sows").update(update_data).eq("id", existing_sow["id"]).execute()
                    stats["sows_updated"] += 1
                    logger.info("  [OK] SOW updated: %s | keys: %s", sow_number, list(update_data.keys()))
                except Exception as e:
                    logger.error("Row %d: SOW %s update failed: %s", row_num, sow_number, e)
                    stats["errors"] += 1
            else:
                stats["sows_skipped"] += 1

    return stats


def run_verify():
    """Print current SOW counts from DB for quick verification."""
    from app.database import get_supabase_admin

    client = get_supabase_admin()
    sows = client.table("sows").select("id, sow_number, is_active, start_date, job_profile_id").execute()
    data = sows.data or []
    total = len(data)
    active = sum(1 for s in data if s.get("is_active"))
    missing_start = sum(1 for s in data if s.get("start_date") is None)
    missing_jp = sum(1 for s in data if s.get("job_profile_id") is None)

    jps = client.table("job_profiles").select("id").execute()
    jp_count = len(jps.data or [])

    print("\n" + "=" * 55)
    print("  DB VERIFICATION REPORT")
    print("=" * 55)
    print(f"  Total SOWs in DB:           {total}")
    print(f"  Active SOWs:                {active}")
    print(f"  SOWs missing start_date:    {missing_start}")
    print(f"  SOWs missing Job Profile:   {missing_jp}")
    print(f"  Total Job Profiles in DB:   {jp_count}")
    print("=" * 55 + "\n")


def print_summary(stats: dict, dry_run: bool):
    label = "[DRY-RUN SUMMARY]" if dry_run else "[IMPORT SUMMARY]"
    print("\n" + "=" * 55)
    print(f"  {label}")
    print("=" * 55)
    print(f"  SOWs created:             {stats.get('sows_created', 0)}")
    print(f"  SOWs updated:             {stats.get('sows_updated', 0)}")
    print(f"  SOWs skipped (no changes): {stats.get('sows_skipped', 0)}")
    print(f"  Job Profiles created:     {stats.get('jps_created', 0)}")
    print(f"  Job Profiles skipped:     {stats.get('jps_skipped', 0)}")
    print(f"  Date parse failures:      {stats.get('date_parse_failures', 0)}")
    print(f"  Errors:                   {stats.get('errors', 0)}")
    print("=" * 55 + "\n")
    if dry_run:
        print("  ⚠  DRY-RUN MODE — no data was written to the database.")

        print("  Re-run without --dry-run to execute the actual import.\n")


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import SOW CSV into RMS database")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview insertions without writing to the database",
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Print current SOW counts from the database and exit",
    )
    args = parser.parse_args()

    if args.verify:
        run_verify()
        sys.exit(0)

    mode = "DRY-RUN" if args.dry_run else "LIVE"
    logger.info("=" * 55)
    logger.info("SOW CSV Import — mode: %s", mode)
    logger.info("CSV: %s", CSV_PATH)
    logger.info("Client: %s", CLIENT_NAME)
    logger.info("=" * 55)

    rows = load_csv(CSV_PATH)
    stats = run_import(rows, dry_run=args.dry_run)
    print_summary(stats, dry_run=args.dry_run)
