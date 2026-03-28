"""Timesheet import + listing — uses jira_timesheet_raw + aws_timesheet_logs_v2 tables (chunked)."""
import logging
import traceback
from datetime import date as date_type
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form, Query
from app.auth.dependencies import get_current_user, require_admin
from app.database import get_supabase_admin_async
from app.timesheets.schemas import (
    TimesheetResponse,
    TimesheetUpdate,
    ImportResult,
    JiraRawResponse,
    JiraRawImportResult,
    AwsTimesheetV2Response,
    AwsImportV2Result,
)
from app.timesheets.parser import parse_tempo_xls
from app.timesheets.jira_raw_parser import parse_jira_raw
from app.timesheets.aws_parser import parse_aws_csv
from app.utils.cache import api_cache
from app.audit.service import log_audit

logger = logging.getLogger(__name__)

MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024  # 10MB

_XLS_MAGIC = b'\xD0\xCF\x11\xE0'
_XLSX_MAGIC = b'PK\x03\x04'


def _validate_file_size(file_bytes: bytes, filename: str) -> None:
    if len(file_bytes) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"File '{filename}' exceeds {MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)}MB limit",
        )


def _validate_excel_magic(file_bytes: bytes) -> None:
    if not (file_bytes[:4] == _XLS_MAGIC or file_bytes[:4] == _XLSX_MAGIC):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "File content does not match Excel format. Ensure it is a valid .xls or .xlsx file.",
        )


def _validate_import_month_strict(month: str) -> None:
    if len(month) != 7 or month[4] != "-":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "import_month must be YYYY-MM format")
    try:
        year, mon = int(month[:4]), int(month[5:7])
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "import_month must be YYYY-MM format")
    if year < 2020 or year > 2035:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "import_month year must be between 2020 and 2035")
    if mon < 1 or mon > 12:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "import_month month must be between 01 and 12")

router = APIRouter(prefix="/timesheets", tags=["Timesheets"])


# ──────────────────────────────────────────────
# Jira Raw Endpoints (jira_timesheet_raw table)
# ──────────────────────────────────────────────

@router.get("/jira-raw", response_model=list[JiraRawResponse])
async def list_jira_raw(
    billing_month: str | None = None,
    employee_id: int | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(5000, ge=1, le=10000),
    current_user: dict = Depends(get_current_user),
):
    """List raw Jira timesheet entries mirroring Excel layout."""
    client = await get_supabase_admin_async()

    # Chunked fetch to bypass PostgREST 1000-row server limit
    all_rows: list = []
    chunk_off = 0
    while True:
        query = client.table("jira_timesheet_raw").select("*")
        if billing_month:
            query = query.eq("billing_month", billing_month)
        if employee_id:
            query = query.eq("employee_id", employee_id)
        batch = await query.order("jira_user").order("is_summary_row", desc=True).range(chunk_off, chunk_off + 999).execute()
        all_rows.extend(batch.data or [])
        if len(batch.data or []) < 1000:
            break
        chunk_off += 1000
    return all_rows


@router.post("/jira-raw/import", response_model=JiraRawImportResult)
async def import_jira_raw(
    file: UploadFile = File(...),
    import_month: str = Form(..., description="YYYY-MM format"),
    current_user: dict = Depends(require_admin),
):
    """
    Upload a Jira/Tempo .xls timesheet report.
    Stores raw per-issue rows in jira_timesheet_raw (mirrors Excel exactly).
    Also populates legacy timesheet_logs for backward compatibility.
    Idempotent: deletes existing entries for the month, then inserts fresh.
    """
    if not file.filename or not (file.filename.endswith(".xls") or file.filename.endswith(".xlsx")):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "File must be .xls or .xlsx")

    _validate_import_month_strict(import_month)

    file_bytes = await file.read()
    _validate_file_size(file_bytes, file.filename)
    _validate_excel_magic(file_bytes)

    # Parse raw entries (per-issue rows)
    try:
        raw_entries = parse_jira_raw(file_bytes, import_month)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))

    if not raw_entries:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No valid timesheet entries found in file")

    # Also parse legacy format for timesheet_logs backward compat
    try:
        legacy_entries = parse_tempo_xls(file_bytes, import_month)
    except ValueError:
        legacy_entries = []

    client = await get_supabase_admin_async()

    # Create import_headers row
    header_row = {
        "import_type": "JIRA_TIMESHEET",
        "filename": file.filename,
        "import_month": import_month,
        "records_total": len(raw_entries),
        "records_matched": 0,
        "records_unmatched": 0,
        "records_skipped": 0,
        "imported_by": current_user.get("id"),
        "status": "IN_PROGRESS",
    }
    header_result = await client.table("import_headers").insert(header_row).execute()
    import_header_id = header_result.data[0]["id"]

    try:
        # Build employee lookup
        employees = await client.table("employees").select("id, jira_username, rms_name").execute()
        emp_map: dict[str, int] = {}
        for emp in (employees.data or []):
            if emp.get("jira_username"):
                emp_map[emp["jira_username"].lower()] = emp["id"]
            if emp.get("rms_name"):
                emp_map[emp["rms_name"].lower()] = emp["id"]

        # Resolve employee IDs for raw entries
        matched_raw = []
        unmatched_usernames = set()
        for entry in raw_entries:
            username = entry["jira_user"].lower()
            emp_id = emp_map.get(username)
            entry["employee_id"] = emp_id
            entry["import_header_id"] = import_header_id
            if emp_id:
                matched_raw.append(entry)
            else:
                unmatched_usernames.add(entry["jira_user"])
                matched_raw.append(entry)  # Still insert — employee_id will be NULL

        # Idempotent: delete existing raw entries for this month
        await client.table("jira_timesheet_raw").delete().eq("billing_month", import_month).execute()

        # Batch insert raw entries
        batch_size = 100
        for i in range(0, len(matched_raw), batch_size):
            batch = matched_raw[i:i + batch_size]
            await client.table("jira_timesheet_raw").insert(batch).execute()

        # Also update legacy timesheet_logs for backward compat
        if legacy_entries:
            legacy_matched = []
            for entry in legacy_entries:
                username = entry["jira_username"].lower()
                emp_id = emp_map.get(username)
                if emp_id:
                    legacy_matched.append({
                        "employee_id": emp_id,
                        "log_date": entry["log_date"],
                        "hours_logged": entry["hours_logged"],
                        "is_ooo": entry["is_ooo"],
                        "import_month": entry["import_month"],
                        "import_header_id": import_header_id,
                    })

            if legacy_matched:
                # Delete existing legacy entries for matched employees
                matched_emp_ids = list({e["employee_id"] for e in legacy_matched})
                for emp_id in matched_emp_ids:
                    frozen_check = await (
                        client.table("timesheet_logs")
                        .select("id")
                        .eq("employee_id", emp_id)
                        .eq("import_month", import_month)
                        .eq("processed", True)
                        .limit(1)
                        .execute()
                    )
                    if frozen_check.data:
                        logger.warning("Skipping legacy upsert for frozen employee %s in %s", emp_id, import_month)
                        continue

                for emp_id in matched_emp_ids:
                    await client.table("timesheet_logs").delete().eq("employee_id", emp_id).eq("import_month", import_month).execute()

                for i in range(0, len(legacy_matched), batch_size):
                    batch = legacy_matched[i:i + batch_size]
                    await client.table("timesheet_logs").insert(batch).execute()

        # Count matched employees (those with employee_id set)
        matched_count = sum(1 for e in matched_raw if e.get("employee_id"))

        await client.table("import_headers").update({
            "records_matched": matched_count,
            "records_unmatched": len(unmatched_usernames),
            "status": "COMPLETED",
        }).eq("id", import_header_id).execute()

    except Exception as exc:
        error_msg = f"{type(exc).__name__}: {exc}"
        logger.error("Jira raw import failed (header_id=%s): %s\n%s", import_header_id, error_msg, traceback.format_exc())
        await client.table("import_headers").update({
            "status": "FAILED",
            "error_message": error_msg[:1000],
        }).eq("id", import_header_id).execute()
        raise

    api_cache.clear_prefix("timesheets_")
    api_cache.clear_prefix("billing_")

    await log_audit(
        user=current_user,
        action="IMPORT",
        entity_type="jira_timesheet_raw",
        new_values={"month": import_month, "rows": len(raw_entries), "matched": matched_count},
    )

    return JiraRawImportResult(
        month=import_month,
        total_rows_processed=len(raw_entries),
        employees_matched=matched_count,
        employees_unmatched=sorted(unmatched_usernames),
        entries_inserted=len(matched_raw),
    )


# ──────────────────────────────────────────────
# Legacy Jira Endpoints (timesheet_logs — backward compat)
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


@router.put("/{log_id}", response_model=TimesheetResponse)
async def update_timesheet(
    log_id: int,
    body: TimesheetUpdate,
    current_user: dict = Depends(require_admin),
):
    """Update a single timesheet entry. Returns 409 if processed (frozen)."""
    client = await get_supabase_admin_async()
    existing = await client.table("timesheet_logs").select("*").eq("id", log_id).single().execute()
    if not existing.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Timesheet entry not found")

    record = existing.data
    if record.get("processed"):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Cannot modify a processed timesheet entry. The billing month has been frozen.",
        )

    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")

    result = await client.table("timesheet_logs").update(update_data).eq("id", log_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Timesheet entry not found")

    api_cache.clear_prefix("timesheets_")
    return result.data[0]


@router.post("/import", response_model=ImportResult)
async def import_timesheet(
    file: UploadFile = File(...),
    import_month: str = Form(..., description="YYYY-MM format"),
    current_user: dict = Depends(require_admin),
):
    """
    Legacy Jira import — populates timesheet_logs (aggregated per user/date).
    Prefer /jira-raw/import for the new raw Excel format.
    """
    if not file.filename or not (file.filename.endswith(".xls") or file.filename.endswith(".xlsx")):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "File must be .xls or .xlsx")

    _validate_import_month_strict(import_month)

    file_bytes = await file.read()
    try:
        entries = parse_tempo_xls(file_bytes, import_month)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))

    if not entries:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No valid timesheet entries found in file")

    client = await get_supabase_admin_async()

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
            matched_emp_ids = list({e["employee_id"] for e in matched_entries})
            for emp_id in matched_emp_ids:
                frozen_check = await (
                    client.table("timesheet_logs")
                    .select("id")
                    .eq("employee_id", emp_id)
                    .eq("import_month", import_month)
                    .eq("processed", True)
                    .limit(1)
                    .execute()
                )
                if frozen_check.data:
                    raise HTTPException(
                        status.HTTP_409_CONFLICT,
                        f"Cannot re-import: timesheet entries for employee {emp_id} "
                        f"in {import_month} are frozen (billing processed).",
                    )

            for emp_id in matched_emp_ids:
                await client.table("timesheet_logs").delete().eq("employee_id", emp_id).eq("import_month", import_month).execute()

            batch_size = 100
            for i in range(0, len(matched_entries), batch_size):
                batch = matched_entries[i:i + batch_size]
                await client.table("timesheet_logs").insert(batch).execute()

        await client.table("import_headers").update({
            "records_matched": len(matched_entries),
            "records_unmatched": len(unmatched_usernames),
            "status": "COMPLETED",
        }).eq("id", import_header_id).execute()

    except Exception as exc:
        error_msg = f"{type(exc).__name__}: {exc}"
        logger.error("Jira timesheet import failed (header_id=%s): %s", import_header_id, error_msg)
        await client.table("import_headers").update({
            "status": "FAILED",
            "error_message": error_msg[:1000],
        }).eq("id", import_header_id).execute()
        raise

    api_cache.clear_prefix("timesheets_")
    api_cache.clear_prefix("billing_")

    await log_audit(
        user=current_user,
        action="IMPORT",
        entity_type="timesheet",
        new_values={"month": import_month, "rows": len(entries), "matched": len(matched_entries)},
    )

    return ImportResult(
        month=import_month,
        total_rows_processed=len(entries),
        employees_matched=len(matched_entries),
        employees_unmatched=sorted(unmatched_usernames),
        entries_upserted=len(matched_entries),
    )


# ──────────────────────────────────────────────
# AWS v2 Endpoints (aws_timesheet_logs_v2 — monthly CSV)
# ──────────────────────────────────────────────

@router.get("/aws", response_model=list[AwsTimesheetV2Response])
async def list_aws_timesheets(
    billing_month: str | None = None,
    employee_id: int | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(200, ge=1, le=2000),
    current_user: dict = Depends(get_current_user),
):
    """List AWS ActiveTrack timesheet entries (monthly per-employee)."""
    client = await get_supabase_admin_async()
    query = client.table("aws_timesheet_logs_v2").select("*")
    if billing_month:
        query = query.eq("billing_month", billing_month)
    if employee_id:
        query = query.eq("employee_id", employee_id)
    offset = (page - 1) * page_size
    result = await query.order("aws_email").range(offset, offset + page_size - 1).execute()
    return result.data


@router.post("/aws/import", response_model=AwsImportV2Result)
async def import_aws_timesheet(
    file: UploadFile = File(...),
    import_month: str = Form(..., description="YYYY-MM format"),
    current_user: dict = Depends(require_admin),
):
    """
    Upload an AWS ActiveTrack CSV export for a specific month.
    Idempotent: deletes existing entries for the month, then inserts fresh.
    File is parsed in memory and never stored.
    """
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "File must be .csv")

    _validate_import_month_strict(import_month)

    file_bytes = await file.read()
    _validate_file_size(file_bytes, file.filename)

    try:
        entries = parse_aws_csv(file_bytes, import_month)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))

    if not entries:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No valid entries found in CSV")

    client = await get_supabase_admin_async()

    # Create import_headers row
    header_row = {
        "import_type": "AWS_TIMESHEET",
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
        # Build employee lookup by aws_email, rms_name, and client_name
        employees = await client.table("employees").select("id, aws_email, rms_name, client_name").execute()
        email_to_emp: dict[str, int] = {}
        name_to_emp: dict[str, int] = {}
        for emp in (employees.data or []):
            if emp.get("aws_email"):
                email_to_emp[emp["aws_email"].lower()] = emp["id"]
            if emp.get("rms_name"):
                name_to_emp[emp["rms_name"].strip().lower()] = emp["id"]
            if emp.get("client_name"):
                name_to_emp[emp["client_name"].strip().lower()] = emp["id"]

        matched = 0
        unmatched_emails: list[str] = []

        rows_to_insert = []
        for entry in entries:
            email = entry["aws_email"]
            emp_id = email_to_emp.get(email.lower() if email else "")

            # Fallback: match by name derived from email (part before @, Title Cased)
            if not emp_id and email and "@" in email:
                name_part = email.split("@")[0]
                # Convert e.g. "john.doe" or "john_doe" to "John Doe"
                name_from_email = name_part.replace(".", " ").replace("_", " ").replace("-", " ").title()
                emp_id = name_to_emp.get(name_from_email.lower())

            if emp_id:
                matched += 1
            else:
                unmatched_emails.append(email)

            row = {
                "employee_id": emp_id,
                "import_header_id": import_header_id,
                **entry,
            }
            rows_to_insert.append(row)

        # Idempotent: delete existing entries for this month
        await client.table("aws_timesheet_logs_v2").delete().eq("billing_month", import_month).execute()

        # Batch insert
        if rows_to_insert:
            batch_size = 50
            for i in range(0, len(rows_to_insert), batch_size):
                batch = rows_to_insert[i:i + batch_size]
                await client.table("aws_timesheet_logs_v2").insert(batch).execute()

        await client.table("import_headers").update({
            "records_matched": matched,
            "records_unmatched": len(unmatched_emails),
            "status": "COMPLETED",
        }).eq("id", import_header_id).execute()

    except Exception as exc:
        error_msg = f"{type(exc).__name__}: {exc}"
        logger.error("AWS import failed (header_id=%s): %s\n%s", import_header_id, error_msg, traceback.format_exc())
        await client.table("import_headers").update({
            "status": "FAILED",
            "error_message": error_msg[:1000],
        }).eq("id", import_header_id).execute()
        raise

    api_cache.clear_prefix("aws_timesheets_")

    await log_audit(
        user=current_user,
        action="IMPORT",
        entity_type="aws_timesheet_v2",
        new_values={"month": import_month, "total_rows": len(entries), "matched": matched},
    )

    return AwsImportV2Result(
        month=import_month,
        total_rows=len(entries),
        employees_matched=matched,
        employees_unmatched=len(unmatched_emails),
        entries_inserted=len(rows_to_insert),
        unmatched_emails=sorted(unmatched_emails),
    )


@router.patch("/aws/{log_id}/link", response_model=AwsTimesheetV2Response)
async def link_aws_to_employee(
    log_id: int,
    employee_id: int = Query(..., description="Employee ID to link"),
    current_user: dict = Depends(require_admin),
):
    """Manually link an unmatched AWS timesheet entry to an employee."""
    client = await get_supabase_admin_async()

    emp = await client.table("employees").select("id, aws_email").eq("id", employee_id).single().execute()
    if not emp.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Employee not found")

    result = await client.table("aws_timesheet_logs_v2").update({"employee_id": employee_id}).eq("id", log_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "AWS timesheet entry not found")

    log_entry = result.data[0]
    if not emp.data.get("aws_email") and log_entry.get("aws_email"):
        await client.table("employees").update({"aws_email": log_entry["aws_email"]}).eq("id", employee_id).execute()
        api_cache.clear_prefix("employees_")

    api_cache.clear_prefix("aws_timesheets_")
    return result.data[0]
