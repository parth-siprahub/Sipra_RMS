"""
Track C-2: Master Data Migration Script
Imports DCLI_ResourceTracker.xlsx → RMS database (SOWs, Job Profiles, Resource Requests, Candidates, Employees)

Usage:
    cd D:\RMS_Siprahub\backend
    cmd /c venv\Scripts\python.exe scripts\import_master_data.py

ONE-TIME SCRIPT — run once to seed the database with master data.
"""
import asyncio
import logging
import os
import sys
from datetime import datetime

import pandas as pd

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

MASTER_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "DCLI_ResourceTracker.xlsx")

# Status mapping: Master Excel → RMS CandidateStatus enum
STATUS_MAP = {
    "Onboarded": "ONBOARDED",
    "Exit": "EXIT",
    "Exit-Redundant": "EXIT",
    "With Client": "WITH_CLIENT",
    "New": "NEW",
    "Role Redundant": "SCREEN_REJECT",
}

# Technology normalization
TECH_NORMALIZE = {
    "node": "Node.js",
    "node js": "Node.js",
    "node.js": "Node.js",
    "nodejs": "Node.js",
    "node js": "Node.js",
    "react": "React",
    "react js": "React",
    "react.js": "React",
    "java": "Java",
    "python": "Python",
    "sql": "SQL",
    "oracle": "Oracle",
    "mulesoft": "MuleSoft",
    "salesforce": "Salesforce",
    "aws": "AWS",
    "qa": "QA",
    "automation": "Automation",
    "devops": "DevOps",
    "devsecops": "DevSecOps",
    "fullstack": "Full Stack",
    "full stack": "Full Stack",
    "ui/ux": "UI/UX",
}


def normalize_tech(raw: str) -> str:
    """Normalize technology values to consistent casing."""
    if pd.isna(raw) or not raw:
        return ""
    cleaned = str(raw).strip()
    return TECH_NORMALIZE.get(cleaned.lower(), cleaned)


def safe_date(val) -> str | None:
    """Convert Excel date to ISO string or None."""
    if pd.isna(val):
        return None
    try:
        if isinstance(val, datetime):
            return val.strftime("%Y-%m-%d")
        return pd.Timestamp(val).strftime("%Y-%m-%d")
    except (ValueError, TypeError):
        return None


async def run_migration():
    """Main migration function."""
    from app.database import get_supabase_admin_async

    if not os.path.exists(MASTER_FILE):
        logger.error("Master file not found: %s", MASTER_FILE)
        return

    logger.info("Reading master Excel: %s", MASTER_FILE)
    df = pd.read_excel(MASTER_FILE, sheet_name="Resource Data", header=0)
    logger.info("Found %d rows", len(df))

    client = await get_supabase_admin_async()

    # Track created entities to avoid duplicates
    sow_cache: dict[str, int] = {}  # sow_number → id
    jp_cache: dict[str, int] = {}   # role_name → id
    rr_cache: dict[str, int] = {}   # request_id → id

    stats = {
        "sows_created": 0,
        "job_profiles_created": 0,
        "resource_requests_created": 0,
        "candidates_created": 0,
        "employees_created": 0,
        "skipped_no_name": 0,
        "skipped_role_redundant": 0,
        "errors": 0,
    }

    # Pre-load existing data to support re-runs
    existing_sows = await client.table("sows").select("id, sow_number").execute()
    for s in (existing_sows.data or []):
        if s.get("sow_number"):
            sow_cache[s["sow_number"]] = s["id"]

    existing_jps = await client.table("job_profiles").select("id, role_name").execute()
    for jp in (existing_jps.data or []):
        if jp.get("role_name"):
            jp_cache[jp["role_name"]] = jp["id"]

    existing_rrs = await client.table("resource_requests").select("id, request_display_id").execute()
    for rr in (existing_rrs.data or []):
        if rr.get("request_display_id"):
            rr_cache[rr["request_display_id"]] = rr["id"]

    for idx, row in df.iterrows():
        try:
            status_raw = str(row.get("Status", "")).strip()
            name = row.get("Name")

            # Skip Role Redundant rows without names (33 cancelled positions)
            if pd.isna(name) or not str(name).strip():
                if status_raw == "Role Redundant":
                    stats["skipped_no_name"] += 1
                    continue
                stats["skipped_no_name"] += 1
                continue

            # Skip Role Redundant rows (position was cancelled)
            if status_raw == "Role Redundant":
                stats["skipped_role_redundant"] += 1
                continue

            name = str(name).strip()
            request_id = str(row.get("Request ID", "")).strip()
            role = str(row.get("Role", "")).strip()
            req_type = str(row.get("Type", "New")).strip().capitalize()
            sipra_email = str(row.get("Siprahub email", "")).strip() if not pd.isna(row.get("Siprahub email")) else ""
            technology = normalize_tech(row.get("Technology"))
            sow_number = str(row.get("SOW", "")).strip() if not pd.isna(row.get("SOW")) else ""
            sow_date = safe_date(row.get("SOW Date"))
            start_date = safe_date(row.get("Start Date"))
            end_date = safe_date(row.get("End Date"))
            exit_type = str(row.get("Exit Type", "")).strip() if not pd.isna(row.get("Exit Type")) else ""
            source = str(row.get("Source", "")).strip() if not pd.isna(row.get("Source")) else ""
            yoe = row.get("YOE")
            project = str(row.get("Project", "")).strip() if not pd.isna(row.get("Project")) else ""

            # ── STEP 1: Create/find SOW ──
            sow_id = None
            if sow_number and sow_number.lower() != "nan":
                if sow_number not in sow_cache:
                    sow_data = {
                        "sow_number": sow_number,
                        "client_name": "DCLI",
                        "is_active": True,
                    }
                    if sow_date:
                        sow_data["start_date"] = sow_date
                    if project:
                        sow_data["description"] = f"Project: {project}"
                    try:
                        result = await client.table("sows").insert(sow_data).execute()
                        if result.data:
                            sow_cache[sow_number] = result.data[0]["id"]
                            stats["sows_created"] += 1
                    except Exception as e:
                        # Likely duplicate — look it up
                        existing = await client.table("sows").select("id").eq("sow_number", sow_number).execute()
                        if existing.data:
                            sow_cache[sow_number] = existing.data[0]["id"]
                        else:
                            logger.warning("Row %d: SOW creation failed for %s: %s", idx, sow_number, e)
                sow_id = sow_cache.get(sow_number)

            # ── STEP 2: Create/find Job Profile ──
            jp_id = None
            if role and role.lower() != "nan":
                if role not in jp_cache:
                    try:
                        result = await client.table("job_profiles").insert({"role_name": role}).execute()
                        if result.data:
                            jp_cache[role] = result.data[0]["id"]
                            stats["job_profiles_created"] += 1
                    except Exception:
                        existing = await client.table("job_profiles").select("id").eq("role_name", role).execute()
                        if existing.data:
                            jp_cache[role] = existing.data[0]["id"]
                jp_id = jp_cache.get(role)

            # ── STEP 3: Create/find Resource Request ──
            rr_id = None
            if request_id and request_id.lower() != "nan":
                if request_id not in rr_cache:
                    rr_data = {
                        "request_display_id": request_id,
                        "status": "CLOSED" if status_raw in ("Onboarded", "Exit", "Exit-Redundant") else "OPEN",
                        "is_backfill": req_type.lower() == "backfill",
                    }
                    if jp_id:
                        rr_data["job_profile_id"] = jp_id
                    if sow_id:
                        rr_data["sow_id"] = sow_id
                    try:
                        result = await client.table("resource_requests").insert(rr_data).execute()
                        if result.data:
                            rr_cache[request_id] = result.data[0]["id"]
                            stats["resource_requests_created"] += 1
                    except Exception:
                        existing = await client.table("resource_requests").select("id").eq("request_display_id", request_id).execute()
                        if existing.data:
                            rr_cache[request_id] = existing.data[0]["id"]
                rr_id = rr_cache.get(request_id)

            # ── STEP 4: Create Candidate ──
            name_parts = name.split(None, 1)
            first_name = name_parts[0] if name_parts else name
            last_name = name_parts[1] if len(name_parts) > 1 else name

            candidate_status = STATUS_MAP.get(status_raw, "NEW")

            candidate_data: dict = {
                "first_name": first_name,
                "last_name": last_name,
                "email": sipra_email if sipra_email and "@" in sipra_email else f"{first_name.lower()}@placeholder.com",
                "status": candidate_status,
                "source": source if source else None,
                "skills": technology if technology else None,
            }
            if rr_id:
                candidate_data["request_id"] = rr_id
            if start_date:
                candidate_data["onboarding_date"] = start_date
            if exit_type:
                candidate_data["exit_reason"] = exit_type
            if end_date:
                candidate_data["last_working_day"] = end_date
            if yoe and not pd.isna(yoe):
                try:
                    candidate_data["total_experience"] = float(yoe)
                except (ValueError, TypeError):
                    # Handle edge cases like "14+19", "6/10"
                    logger.info("Row %d: Non-numeric YOE '%s' — skipping", idx, yoe)

            # Remove None values
            candidate_data = {k: v for k, v in candidate_data.items() if v is not None}

            try:
                result = await client.table("candidates").insert(candidate_data).execute()
                candidate_id = result.data[0]["id"] if result.data else None
                stats["candidates_created"] += 1
            except Exception as e:
                logger.warning("Row %d: Candidate creation failed for %s: %s", idx, name, e)
                stats["errors"] += 1
                continue

            # ── STEP 5: Create Employee (if Onboarded/Exit/Exit-Redundant) ──
            if status_raw in ("Onboarded", "Exit", "Exit-Redundant") and candidate_id:
                emp_status = "ACTIVE" if status_raw == "Onboarded" else "EXITED"
                employee_data: dict = {
                    "candidate_id": candidate_id,
                    "rms_name": name,
                    "jira_username": name,  # Case-insensitive matching in parser
                    "status": emp_status,
                }
                if start_date:
                    employee_data["start_date"] = start_date
                if end_date and emp_status == "EXITED":
                    employee_data["exit_date"] = end_date
                if sipra_email and "@" in sipra_email:
                    client_name = sipra_email.split("@")[0]
                    employee_data["client_name"] = client_name

                try:
                    await client.table("employees").insert(employee_data).execute()
                    stats["employees_created"] += 1
                except Exception as e:
                    logger.warning("Row %d: Employee creation failed for %s: %s", idx, name, e)
                    stats["errors"] += 1

        except Exception as e:
            logger.error("Row %d: Unexpected error: %s", idx, e)
            stats["errors"] += 1

    # ── Summary ──
    logger.info("=" * 60)
    logger.info("MIGRATION COMPLETE")
    logger.info("=" * 60)
    for key, val in stats.items():
        logger.info("  %-30s %d", key, val)
    logger.info("=" * 60)


if __name__ == "__main__":
    asyncio.run(run_migration())
