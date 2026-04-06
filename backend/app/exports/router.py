"""CSV export endpoints for candidates, employees, and timesheets."""
import csv
import io
import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from app.utils.person_names import format_person_name
from app.auth.dependencies import require_admin
from app.database import get_supabase_admin_async

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/exports", tags=["Exports"])


def _build_csv(rows: list[dict], columns: list[str]) -> io.StringIO:
    """Write rows to a StringIO buffer as CSV with a header row."""
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=columns, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        writer.writerow({col: row.get(col, "") for col in columns})
    buf.seek(0)
    return buf


@router.get("/candidates")
async def export_candidates(
    candidate_status: str | None = Query(None, alias="status"),
    current_user: dict = Depends(require_admin),
):
    """Export all candidates as CSV. Optionally filter by status."""
    client = await get_supabase_admin_async()
    query = client.table("candidates").select("*")
    if candidate_status:
        query = query.eq("status", candidate_status)
    result = await query.order("created_at", desc=True).execute()

    columns = [
        "id",
        "first_name",
        "last_name",
        "email",
        "phone",
        "status",
        "vendor_name",
        "skill",
        "experience",
        "created_at",
    ]
    buf = _build_csv(result.data or [], columns)

    filename = f"candidates_export.csv"
    if candidate_status:
        filename = f"candidates_{candidate_status}_export.csv"

    return StreamingResponse(
        buf,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/employees")
async def export_employees(
    current_user: dict = Depends(require_admin),
):
    """Export all employees as CSV."""
    client = await get_supabase_admin_async()
    result = await client.table("employees").select("*").order("created_at", desc=True).execute()

    columns = [
        "id",
        "rms_name",
        "client_name",
        "aws_email",
        "github_id",
        "jira_username",
        "start_date",
        "exit_date",
        "status",
        "is_billable",
    ]
    buf = _build_csv(result.data or [], columns)

    return StreamingResponse(
        buf,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="employees_export.csv"'},
    )


@router.get("/timesheets")
async def export_timesheets(
    month: str = Query(..., description="YYYY-MM format"),
    current_user: dict = Depends(require_admin),
):
    """Export timesheet data for a given month as CSV."""
    # Validate month format
    if len(month) != 7 or month[4] != "-":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "month must be in YYYY-MM format (e.g. 2026-03)",
        )

    client = await get_supabase_admin_async()

    # Fetch timesheet logs for the month, joined with employee name
    result = await (
        client.table("timesheet_logs")
        .select("employee_id, log_date, hours_logged, is_ooo")
        .eq("import_month", month)
        .order("log_date", desc=False)
        .execute()
    )

    # Build an employee id → name lookup
    employee_ids = list({row["employee_id"] for row in (result.data or []) if row.get("employee_id")})
    emp_map: dict[int, str] = {}
    if employee_ids:
        emp_result = await (
            client.table("employees")
            .select("id, rms_name")
            .in_("id", employee_ids)
            .execute()
        )
        emp_map = {
            e["id"]: (format_person_name(e.get("rms_name") or "") or e.get("rms_name") or "")
            for e in (emp_result.data or [])
        }

    # Enrich rows with employee_name
    enriched: list[dict] = []
    for row in (result.data or []):
        enriched.append({
            "employee_name": emp_map.get(row.get("employee_id", 0), ""),
            "log_date": row.get("log_date", ""),
            "hours_logged": row.get("hours_logged", ""),
            "is_ooo": row.get("is_ooo", ""),
        })

    columns = ["employee_name", "log_date", "hours_logged", "is_ooo"]
    buf = _build_csv(enriched, columns)

    filename = f"timesheets_{month}_export.csv"
    return StreamingResponse(
        buf,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
