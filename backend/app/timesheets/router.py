"""Timesheet import + listing — uses jira_timesheet_raw + aws_timesheet_logs_v2 tables (chunked)."""
import logging
import traceback
from datetime import date as date_type
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form, Query
from pydantic import BaseModel
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
from app.timesheets.matching import EmployeeMatcher, Confidence
from app.utils.cache import api_cache
from app.utils.person_names import format_person_name
from app.audit.service import log_audit

logger = logging.getLogger(__name__)


def _display_rms(raw: str | None) -> str | None:
    if raw is None or not str(raw).strip():
        return raw
    return format_person_name(str(raw)) or str(raw)

MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024  # 50MB

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
        # Build multi-tier employee matcher
        matcher = EmployeeMatcher()
        await matcher.load(client)

        # Also build legacy emp_map for backward-compat legacy_entries
        employees = await client.table("employees").select("id, jira_username, rms_name").execute()
        emp_map: dict[str, int] = {}
        for emp in (employees.data or []):
            if emp.get("jira_username"):
                emp_map[emp["jira_username"].lower()] = emp["id"]
            if emp.get("rms_name"):
                emp_map[emp["rms_name"].lower()] = emp["id"]

        # Resolve employee IDs for raw entries using multi-tier matcher
        matched_raw = []
        unmatched_usernames = set()
        unmatched_details: list[dict] = []
        seen_unmatched: set[str] = set()
        for entry in raw_entries:
            result = matcher.match(entry["jira_user"], system="JIRA")
            entry["employee_id"] = result.employee_id
            entry["import_header_id"] = import_header_id
            if result.employee_id:
                matched_raw.append(entry)
            else:
                matched_raw.append(entry)  # Still insert — employee_id will be NULL
                username = entry["jira_user"]
                if username not in seen_unmatched:
                    seen_unmatched.add(username)
                    unmatched_usernames.add(username)
                    suggestions = matcher.suggest(username, system="JIRA", top_n=3)
                    unmatched_details.append({
                        "source_name": username,
                        "source_type": "JIRA",
                        "suggestions": [
                            {
                                "employee_id": s.employee_id,
                                "rms_name": _display_rms(s.rms_name),
                                "score": s.score,
                                "match_type": s.match_type,
                            }
                            for s in suggestions
                        ],
                    })

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
                # 1. Batch check for frozen records in this month
                frozen_check = await (
                    client.table("timesheet_logs")
                    .select("employee_id")
                    .in_("employee_id", list({e["employee_id"] for e in legacy_matched}))
                    .eq("import_month", import_month)
                    .eq("processed", True)
                    .execute()
                )
                frozen_emp_ids = {r["employee_id"] for r in (frozen_check.data or [])}

                # 2. Filter out frozen employees
                legacy_to_insert = [
                    e for e in legacy_matched 
                    if e["employee_id"] not in frozen_emp_ids
                ]

                if legacy_to_insert:
                    # 3. Batch delete existing records for this month (only for non-frozen employees)
                    to_delete_emp_ids = list({e["employee_id"] for e in legacy_to_insert})
                    # Chunk deletions if necessary, but 100-200 is fine for a single IN clause
                    await client.table("timesheet_logs").delete().in_("employee_id", to_delete_emp_ids).eq("import_month", import_month).execute()

                    # 4. Batch insert legacy entries
                    for i in range(0, len(legacy_to_insert), batch_size):
                        batch = legacy_to_insert[i:i + batch_size]
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
        unmatched_details=unmatched_details,
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
            # 1. Batch check for frozen records
            frozen_check = await (
                client.table("timesheet_logs")
                .select("employee_id")
                .in_("employee_id", list({e["employee_id"] for e in matched_entries}))
                .eq("import_month", import_month)
                .eq("processed", True)
                .execute()
            )
            if frozen_check.data:
                frozen_ids = [str(r["employee_id"]) for r in frozen_check.data]
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    f"Cannot re-import: timesheet entries for employees [{', '.join(frozen_ids)}] "
                    f"in {import_month} are frozen (billing processed).",
                )

            # 2. Batch delete existing records
            matched_emp_ids = list({e["employee_id"] for e in matched_entries})
            await client.table("timesheet_logs").delete().in_("employee_id", matched_emp_ids).eq("import_month", import_month).execute()

            # 3. Batch insert
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
        # Build multi-tier employee matcher
        matcher = EmployeeMatcher()
        await matcher.load(client)

        matched = 0
        unmatched_emails: list[str] = []
        aws_unmatched_details: list[dict] = []

        rows_to_insert = []
        for entry in entries:
            email = entry["aws_email"]
            result = matcher.match(email or "", system="AWS")

            if result.employee_id:
                matched += 1
            else:
                unmatched_emails.append(email)
                suggestions = matcher.suggest(email or "", system="AWS", top_n=3)
                aws_unmatched_details.append({
                    "source_name": email,
                    "source_type": "AWS",
                    "suggestions": [
                        {
                            "employee_id": s.employee_id,
                            "rms_name": _display_rms(s.rms_name),
                            "score": s.score,
                            "match_type": s.match_type,
                        }
                        for s in suggestions
                    ],
                })

            row = {
                "employee_id": result.employee_id,
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
        unmatched_details=aws_unmatched_details,
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


# ──────────────────────────────────────────────
# Bulk Link + Unmatched Records
# ──────────────────────────────────────────────


class LinkBulkRequest(BaseModel):
    source_type: str
    source_identifier: str
    employee_id: int
    billing_month: str


@router.post("/link-bulk")
async def link_bulk(
    payload: LinkBulkRequest,
    current_user: dict = Depends(require_admin),
):
    """Bulk-link all unmatched rows for a given identifier to an employee.

    Also persists the mapping in employee_system_mappings so future imports auto-match.
    """
    client = await get_supabase_admin_async()
    source_type = payload.source_type
    source_identifier = payload.source_identifier
    employee_id = payload.employee_id
    billing_month = payload.billing_month

    # Validate employee exists
    emp = await client.table("employees").select("id, rms_name, jira_username, aws_email").eq("id", employee_id).single().execute()
    if not emp.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Employee not found")

    updated_count = 0
    source_upper = source_type.upper()

    if source_upper == "JIRA":
        # Update all jira_timesheet_raw rows for this user + month
        result = await (
            client.table("jira_timesheet_raw")
            .update({"employee_id": employee_id})
            .eq("jira_user", source_identifier)
            .eq("billing_month", billing_month)
            .execute()
        )
        updated_count = len(result.data or [])

        # Note: legacy timesheet_logs has no jira_username column —
        # rows are already matched by employee_id during import, so no
        # retroactive linking is needed here.

        # Optionally fill employee's jira_username if empty
        if not emp.data.get("jira_username"):
            await client.table("employees").update({"jira_username": source_identifier}).eq("id", employee_id).execute()

    elif source_upper == "AWS":
        result = await (
            client.table("aws_timesheet_logs_v2")
            .update({"employee_id": employee_id})
            .eq("aws_email", source_identifier)
            .eq("billing_month", billing_month)
            .execute()
        )
        updated_count = len(result.data or [])

        # Optionally fill employee's aws_email if empty
        if not emp.data.get("aws_email"):
            await client.table("employees").update({"aws_email": source_identifier}).eq("id", employee_id).execute()
    else:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "source_type must be JIRA or AWS")

    # Persist mapping in employee_system_mappings for future auto-match
    system_name = "JIRA" if source_upper == "JIRA" else "AWS"
    try:
        await client.table("employee_system_mappings").insert({
            "employee_id": employee_id,
            "system_name": system_name,
            "external_uid": source_identifier.strip(),
            "is_primary": False,
            "verified": True,
        }).execute()
    except Exception:
        # Ignore duplicate — mapping may already exist
        logger.debug("System mapping already exists for %s=%s", system_name, source_identifier)

    api_cache.clear_prefix("timesheets_")
    api_cache.clear_prefix("aws_timesheets_")
    api_cache.clear_prefix("employees_")

    return {
        "status": "linked",
        "source_type": source_upper,
        "source_identifier": source_identifier,
        "employee_id": employee_id,
        "employee_name": _display_rms(emp.data.get("rms_name")),
        "rows_updated": updated_count,
    }


@router.get("/unmatched-count")
async def get_unmatched_count(
    billing_month: str = Query(..., description="YYYY-MM-DD or YYYY-MM format"),
    current_user: dict = Depends(get_current_user),
):
    """Return count of unique unmatched usernames/emails for a given month."""
    client = await get_supabase_admin_async()
    
    # Normalize month to YYYY-MM if YYYY-MM-DD
    month_query = billing_month[:7]
    
    # Unique Jira users who are unmatched
    jira_res = await client.table("jira_timesheet_raw")\
        .select("jira_user")\
        .eq("billing_month", month_query)\
        .is_("employee_id", "null")\
        .execute()
    jira_users = {r["jira_user"] for r in (jira_res.data or []) if r.get("jira_user")}
    
    # Unique AWS emails who are unmatched
    aws_res = await client.table("aws_timesheet_logs_v2")\
        .select("aws_email")\
        .eq("billing_month", month_query)\
        .is_("employee_id", "null")\
        .execute()
    aws_emails = {r["aws_email"] for r in (aws_res.data or []) if r.get("aws_email")}
    
    return {
        "jira": len(jira_users),
        "aws": len(aws_emails),
        "total": len(jira_users) + len(aws_emails)
    }


@router.get("/unmatched")

async def get_unmatched(
    billing_month: str = Query(..., description="YYYY-MM format"),
    source_type: str = Query(..., description="JIRA or AWS"),
    current_user: dict = Depends(get_current_user),
):
    """Get all unmatched records for a billing month with fuzzy suggestions."""
    client = await get_supabase_admin_async()

    matcher = EmployeeMatcher()
    await matcher.load(client)

    source_upper = source_type.upper()
    unmatched: list[dict] = []

    if source_upper == "JIRA":
        rows = await (
            client.table("jira_timesheet_raw")
            .select("jira_user")
            .eq("billing_month", billing_month)
            .is_("employee_id", "null")
            .execute()
        )
        unique_users = sorted(set(r["jira_user"] for r in (rows.data or [])))
        for user in unique_users:
            suggestions = matcher.suggest(user, system="JIRA", top_n=3)
            unmatched.append({
                "source_name": user,
                "source_type": "JIRA",
                "suggestions": [
                    {
                        "employee_id": s.employee_id,
                        "rms_name": _display_rms(s.rms_name),
                        "score": s.score,
                        "match_type": s.match_type,
                    }
                    for s in suggestions
                ],
            })

    elif source_upper == "AWS":
        rows = await (
            client.table("aws_timesheet_logs_v2")
            .select("aws_email")
            .eq("billing_month", billing_month)
            .is_("employee_id", "null")
            .execute()
        )
        unique_emails = sorted(set(r["aws_email"] for r in (rows.data or [])))
        for email in unique_emails:
            suggestions = matcher.suggest(email, system="AWS", top_n=3)
            unmatched.append({
                "source_name": email,
                "source_type": "AWS",
                "suggestions": [
                    {
                        "employee_id": s.employee_id,
                        "rms_name": _display_rms(s.rms_name),
                        "score": s.score,
                        "match_type": s.match_type,
                    }
                    for s in suggestions
                ],
            })
    else:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "source_type must be JIRA or AWS")

    return {"billing_month": billing_month, "source_type": source_upper, "unmatched": unmatched}


# ──────────────────────────────────────────────
# Jira Import Verification
# ──────────────────────────────────────────────

@router.get("/jira-raw/verify")
async def verify_jira_import(
    billing_month: str = Query(..., description="YYYY-MM format"),
    current_user: dict = Depends(get_current_user),
):
    """Verify Jira import completeness: compare DB row count with import header."""
    client = await get_supabase_admin_async()

    # Get actual row count in DB
    rows = await client.table("jira_timesheet_raw").select("id", count="exact").eq("billing_month", billing_month).execute()
    db_count = rows.count if rows.count is not None else len(rows.data or [])

    # Get import header for this month
    header = await (
        client.table("import_headers")
        .select("*")
        .eq("import_type", "JIRA_TIMESHEET")
        .eq("import_month", billing_month)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    header_data = header.data[0] if header.data else None
    expected_count = header_data["records_total"] if header_data else 0

    # Count unique users
    users_result = await client.table("jira_timesheet_raw").select("jira_user").eq("billing_month", billing_month).execute()
    unique_users = len(set(r["jira_user"] for r in (users_result.data or [])))

    return {
        "month": billing_month,
        "db_row_count": db_count,
        "import_expected_count": expected_count,
        "match": db_count == expected_count,
        "unique_users": unique_users,
        "import_status": header_data["status"] if header_data else "NOT_FOUND",
        "import_filename": header_data["filename"] if header_data else None,
        "matched_employees": header_data["records_matched"] if header_data else 0,
        "unmatched_employees": header_data["records_unmatched"] if header_data else 0,
    }
