"""Timesheet import + listing — aligned with public.timesheet_logs table."""
import logging
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form
from app.auth.dependencies import get_current_user, require_admin
from app.database import get_supabase_admin_async
from app.timesheets.schemas import TimesheetResponse, ImportResult, AWSImportResult
from app.timesheets.parser import parse_tempo_xls
from app.timesheets.aws_parser import parse_aws_csv
from app.utils.cache import api_cache
from app.audit.service import log_audit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/timesheets", tags=["Timesheets"])


@router.get("/", response_model=list[TimesheetResponse])
async def list_timesheets(
    employee_id: int | None = None,
    import_month: str | None = None,
    current_user: dict = Depends(get_current_user),
):
    client = await get_supabase_admin_async()
    query = client.table("timesheet_logs").select("*")
    if employee_id:
        query = query.eq("employee_id", employee_id)
    if import_month:
        query = query.eq("import_month", import_month)
    result = await query.order("log_date", desc=True).execute()
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
    """
    if not file.filename or not (file.filename.endswith(".xls") or file.filename.endswith(".xlsx")):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "File must be .xls or .xlsx")

    # Validate month format
    if len(import_month) != 7 or import_month[4] != "-":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "import_month must be YYYY-MM format")

    file_bytes = await file.read()
    entries = parse_tempo_xls(file_bytes, import_month)

    if not entries:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No valid timesheet entries found in file")

    client = await get_supabase_admin_async()

    # Resolve Jira usernames to employee IDs
    employees = await client.table("employees").select("id, jira_username, rms_name").eq("status", "ACTIVE").execute()
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
            })
        else:
            unmatched_usernames.add(entry["jira_username"])

    if matched_entries:
        # Idempotent upsert: delete existing entries for this month's matched employees
        matched_emp_ids = list({e["employee_id"] for e in matched_entries})
        for emp_id in matched_emp_ids:
            await client.table("timesheet_logs").delete().eq("employee_id", emp_id).eq("import_month", import_month).execute()

        # Batch insert (Supabase handles bulk inserts)
        batch_size = 100
        for i in range(0, len(matched_entries), batch_size):
            batch = matched_entries[i:i + batch_size]
            await client.table("timesheet_logs").insert(batch).execute()

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


@router.post("/import-aws", response_model=AWSImportResult)
async def import_aws_activetrack(
    file: UploadFile = File(...),
    import_month: str = Form(..., description="YYYY-MM format"),
    current_user: dict = Depends(require_admin),
):
    """
    Upload an AWS ActiveTrack CSV export.
    Matches users by email to employees.aws_email and upserts aws_active_hours
    into billing_records for the given month.
    """
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "File must be .csv")

    # Validate month format
    if len(import_month) != 7 or import_month[4] != "-":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "import_month must be YYYY-MM format")

    file_bytes = await file.read()
    records = parse_aws_csv(file_bytes)

    if not records:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No valid records found in CSV")

    client = await get_supabase_admin_async()

    # Fetch all employees to build email -> id mapping
    employees_result = await client.table("employees").select("id, aws_email").execute()
    email_to_id: dict[str, int] = {}
    for emp in (employees_result.data or []):
        if emp.get("aws_email"):
            email_to_id[emp["aws_email"].strip().lower()] = emp["id"]

    matched_count = 0
    unmatched_emails: list[str] = []
    upserted = 0

    for record in records:
        emp_id = email_to_id.get(record.user_email.lower())
        if not emp_id:
            unmatched_emails.append(record.user_email)
            continue

        matched_count += 1

        # Check if billing_record already exists for this employee + month
        existing = (
            await client.table("billing_records")
            .select("id")
            .eq("employee_id", emp_id)
            .eq("billing_month", import_month)
            .execute()
        )

        if existing.data:
            # Update existing record with aws_active_hours
            await (
                client.table("billing_records")
                .update({"aws_active_hours": record.active_hours})
                .eq("id", existing.data[0]["id"])
                .execute()
            )
        else:
            # Insert minimal billing record
            await (
                client.table("billing_records")
                .insert({
                    "employee_id": emp_id,
                    "billing_month": import_month,
                    "aws_active_hours": record.active_hours,
                })
                .execute()
            )

        upserted += 1

    api_cache.clear_prefix("billing_")
    api_cache.clear_prefix("timesheets_")

    logger.info(
        "AWS import complete: month=%s total=%d matched=%d unmatched=%d",
        import_month, len(records), matched_count, len(unmatched_emails),
    )

    await log_audit(
        user=current_user,
        action="IMPORT",
        entity_type="aws_timesheet",
        new_values={"month": import_month, "total_rows": len(records), "matched": matched_count},
    )

    return AWSImportResult(
        month=import_month,
        total_rows=len(records),
        matched=matched_count,
        unmatched_emails=sorted(unmatched_emails),
        records_upserted=upserted,
    )
