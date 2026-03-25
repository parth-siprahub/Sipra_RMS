"""Timesheet import + listing — aligned with public.timesheet_logs + aws_timesheet_logs tables."""
import logging
import traceback
from datetime import date as date_type
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form, Query
from app.auth.dependencies import get_current_user, require_admin
from app.database import get_supabase_admin_async
from app.timesheets.schemas import (
    TimesheetResponse,
    ImportResult,
    AwsTimesheetResponse,
    AwsImportResult,
)
from app.timesheets.parser import parse_tempo_xls
from app.timesheets.aws_parser import parse_aws_csv
from app.utils.cache import api_cache

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/timesheets", tags=["Timesheets"])


# ──────────────────────────────────────────────
# Jira Timesheet Endpoints
# ──────────────────────────────────────────────

@router.get("/", response_model=list[TimesheetResponse])
async def list_timesheets(
    employee_id: int | None = None,
    import_month: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(200, ge=1, le=2000),
    current_user: dict = Depends(get_current_user),
):
    client = await get_supabase_admin_async()
    query = client.table("timesheet_logs").select("*")
    if employee_id:
        query = query.eq("employee_id", employee_id)
    if import_month:
        query = query.eq("import_month", import_month)
    offset = (page - 1) * page_size
    result = await query.order("log_date", desc=True).range(offset, offset + page_size - 1).execute()
    return result.data


@router.post("/import", response_model=ImportResult)
async def import_timesheet(
    file: UploadFile = File(...),
    import_month: str = Form(..., description="YYYY-MM format"),
    current_user: dict = Depends(require_admin),
):
    """
    Upload a Jira/Tempo .xls timesheet report.
    Performs idempotent upsert: deletes existing entries for the month, then inserts fresh.
    Tracks progress via import_headers table.
    """
    if not file.filename or not (file.filename.endswith(".xls") or file.filename.endswith(".xlsx")):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "File must be .xls or .xlsx")

    # Validate month format
    if len(import_month) != 7 or import_month[4] != "-":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "import_month must be YYYY-MM format")

    file_bytes = await file.read()
    try:
        entries = parse_tempo_xls(file_bytes, import_month)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))

    if not entries:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No valid timesheet entries found in file")

    client = await get_supabase_admin_async()

    # Create import_headers row with IN_PROGRESS status
    header_row = {
        "import_type": "JIRA_TIMESHEET",
        "filename": file.filename,
        "import_month": import_month,
        "records_total": len(entries),
        "records_matched": 0,
        "records_unmatched": 0,
        "records_skipped": 0,
        "imported_by": current_user.get("id"),
        "status": "IN_PROGRESS",
    }
    header_result = await client.table("import_headers").insert(header_row).execute()
    import_header_id = header_result.data[0]["id"]

    try:
        # Resolve Jira usernames to employee IDs (case-insensitive)
        employees = await client.table("employees").select("id, jira_username, rms_name").execute()
        emp_map: dict[str, int] = {}
        for emp in (employees.data or []):
            if emp.get("jira_username"):
                emp_map[emp["jira_username"].lower()] = emp["id"]
            if emp.get("rms_name"):
                emp_map[emp["rms_name"].lower()] = emp["id"]

        matched_entries = []
        unmatched_usernames = set()
        for entry in entries:
            username = entry["jira_username"].lower()
            emp_id = emp_map.get(username)
            if emp_id:
                matched_entries.append({
                    "employee_id": emp_id,
                    "log_date": entry["log_date"],
                    "hours_logged": entry["hours_logged"],
                    "is_ooo": entry["is_ooo"],
                    "import_month": entry["import_month"],
                    "import_header_id": import_header_id,
                })
            else:
                unmatched_usernames.add(entry["jira_username"])

        if matched_entries:
            # Idempotent upsert: delete existing entries for this month's matched employees
            matched_emp_ids = list({e["employee_id"] for e in matched_entries})
            for emp_id in matched_emp_ids:
                await client.table("timesheet_logs").delete().eq("employee_id", emp_id).eq("import_month", import_month).execute()

            # Batch insert
            batch_size = 100
            for i in range(0, len(matched_entries), batch_size):
                batch = matched_entries[i:i + batch_size]
                await client.table("timesheet_logs").insert(batch).execute()

        # Update import_headers with final counts and COMPLETED status
        await client.table("import_headers").update({
            "records_matched": len(matched_entries),
            "records_unmatched": len(unmatched_usernames),
            "status": "COMPLETED",
        }).eq("id", import_header_id).execute()

    except Exception as exc:
        # Update import_headers with FAILED status
        error_msg = f"{type(exc).__name__}: {exc}"
        logger.error("Jira timesheet import failed (header_id=%s): %s", import_header_id, error_msg)
        await client.table("import_headers").update({
            "status": "FAILED",
            "error_message": error_msg[:1000],
        }).eq("id", import_header_id).execute()
        raise

    api_cache.clear_prefix("timesheets_")
    api_cache.clear_prefix("billing_")

    return ImportResult(
        month=import_month,
        total_rows_processed=len(entries),
        employees_matched=len(matched_entries),
        employees_unmatched=sorted(unmatched_usernames),
        entries_upserted=len(matched_entries),
    )


# ──────────────────────────────────────────────
# AWS ActiveTrack Endpoints
# ──────────────────────────────────────────────

@router.get("/aws", response_model=list[AwsTimesheetResponse])
async def list_aws_timesheets(
    employee_id: int | None = None,
    week_start: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(200, ge=1, le=2000),
    current_user: dict = Depends(get_current_user),
):
    """List AWS ActiveTrack timesheet entries."""
    client = await get_supabase_admin_async()
    query = client.table("aws_timesheet_logs").select("*")
    if employee_id:
        query = query.eq("employee_id", employee_id)
    if week_start:
        query = query.eq("week_start", week_start)
    offset = (page - 1) * page_size
    result = await query.order("week_start", desc=True).range(offset, offset + page_size - 1).execute()
    return result.data


@router.post("/aws/import", response_model=AwsImportResult)
async def import_aws_timesheet(
    file: UploadFile = File(...),
    week_start: str = Form(..., description="Week start date (YYYY-MM-DD)"),
    week_end: str = Form(..., description="Week end date (YYYY-MM-DD)"),
    current_user: dict = Depends(require_admin),
):
    """
    Upload an AWS ActiveTrack CSV export for a specific week.
    AWS data is additive — each weekly import creates new records, never overwrites old weeks.
    Tracks progress via import_headers table.
    """
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "File must be .csv")

    # Parse dates
    try:
        ws = date_type.fromisoformat(week_start)
        we = date_type.fromisoformat(week_end)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Dates must be YYYY-MM-DD format")

    if we <= ws:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "week_end must be after week_start")

    file_bytes = await file.read()
    entries = parse_aws_csv(file_bytes, ws, we)

    if not entries:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No valid entries found in CSV")

    client = await get_supabase_admin_async()

    # Create import_headers row with IN_PROGRESS status
    header_row = {
        "import_type": "AWS_TIMESHEET",
        "filename": file.filename,
        "week_start": week_start,
        "week_end": week_end,
        "records_total": len(entries),
        "records_matched": 0,
        "records_unmatched": 0,
        "records_skipped": 0,
        "imported_by": current_user.get("id"),
        "status": "IN_PROGRESS",
    }
    header_result = await client.table("import_headers").insert(header_row).execute()
    import_header_id = header_result.data[0]["id"]

    try:
        # Build employee lookup by aws_email
        employees = await client.table("employees").select("id, aws_email").execute()
        email_to_emp: dict[str, int] = {}
        for emp in (employees.data or []):
            if emp.get("aws_email"):
                email_to_emp[emp["aws_email"].lower()] = emp["id"]

        # Check for existing records for this week to avoid duplicates
        existing = await client.table("aws_timesheet_logs").select("aws_email").eq("week_start", week_start).execute()
        existing_emails = {r["aws_email"].lower() for r in (existing.data or [])}

        matched = 0
        unmatched_emails: list[str] = []
        inserted = 0
        skipped = 0

        rows_to_insert = []
        for entry in entries:
            email = entry["aws_email"]

            # Skip if already imported for this week
            if email in existing_emails:
                skipped += 1
                continue

            emp_id = email_to_emp.get(email)
            if emp_id:
                matched += 1
            else:
                unmatched_emails.append(email)

            rows_to_insert.append({
                "employee_id": emp_id,
                "aws_email": email,
                "week_start": entry["week_start"],
                "week_end": entry["week_end"],
                "work_time_secs": entry["work_time_secs"],
                "productive_secs": entry["productive_secs"],
                "unproductive_secs": entry["unproductive_secs"],
                "active_secs": entry["active_secs"],
                "passive_secs": entry["passive_secs"],
                "screen_time_secs": entry["screen_time_secs"],
                "work_time_hours": entry["work_time_hours"],
                "is_below_threshold": entry["is_below_threshold"],
                "import_header_id": import_header_id,
            })

        if rows_to_insert:
            batch_size = 100
            for i in range(0, len(rows_to_insert), batch_size):
                batch = rows_to_insert[i:i + batch_size]
                await client.table("aws_timesheet_logs").insert(batch).execute()
            inserted = len(rows_to_insert)

        # Update import_headers with final counts and COMPLETED status
        await client.table("import_headers").update({
            "records_matched": matched,
            "records_unmatched": len(unmatched_emails),
            "records_skipped": skipped,
            "status": "COMPLETED",
        }).eq("id", import_header_id).execute()

    except Exception as exc:
        # Update import_headers with FAILED status
        error_msg = f"{type(exc).__name__}: {exc}"
        logger.error("AWS timesheet import failed (header_id=%s): %s", import_header_id, error_msg)
        await client.table("import_headers").update({
            "status": "FAILED",
            "error_message": error_msg[:1000],
        }).eq("id", import_header_id).execute()
        raise

    api_cache.clear_prefix("aws_timesheets_")

    return AwsImportResult(
        week_start=week_start,
        week_end=week_end,
        total_rows=len(entries),
        employees_matched=matched,
        employees_unmatched=len(unmatched_emails),
        entries_inserted=inserted,
        skipped_existing=skipped,
        unmatched_emails=sorted(unmatched_emails),
    )


@router.patch("/aws/{log_id}/link", response_model=AwsTimesheetResponse)
async def link_aws_to_employee(
    log_id: int,
    employee_id: int = Query(..., description="Employee ID to link"),
    current_user: dict = Depends(require_admin),
):
    """Manually link an unmatched AWS timesheet entry to an employee."""
    client = await get_supabase_admin_async()

    # Verify employee exists
    emp = await client.table("employees").select("id, aws_email").eq("id", employee_id).single().execute()
    if not emp.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Employee not found")

    # Update the AWS log entry
    result = await client.table("aws_timesheet_logs").update({"employee_id": employee_id}).eq("id", log_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "AWS timesheet entry not found")

    # Also update employee's aws_email if not set
    log_entry = result.data[0]
    if not emp.data.get("aws_email") and log_entry.get("aws_email"):
        await client.table("employees").update({"aws_email": log_entry["aws_email"]}).eq("id", employee_id).execute()
        api_cache.clear_prefix("employees_")

    api_cache.clear_prefix("aws_timesheets_")
    return result.data[0]
