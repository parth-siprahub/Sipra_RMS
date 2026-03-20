"""Billing CRUD + calculation — aligned with public.billing_records table."""
import logging
from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.auth.dependencies import get_current_user, require_admin
from app.database import get_supabase_admin_async
from app.billing.schemas import BillingRecordResponse, BillingCalculationResult
from app.billing.engine import calculate_billing
from app.utils.cache import api_cache

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["Billing"])


@router.get("/", response_model=list[BillingRecordResponse])
async def list_billing_records(
    employee_id: int | None = None,
    billing_month: str | None = None,
    current_user: dict = Depends(get_current_user),
):
    client = await get_supabase_admin_async()
    query = client.table("billing_records").select("*")
    if employee_id:
        query = query.eq("employee_id", employee_id)
    if billing_month:
        query = query.eq("billing_month", billing_month)
    result = await query.order("billing_month", desc=True).execute()
    return result.data


@router.post("/calculate/{billing_month}", response_model=list[BillingCalculationResult])
async def calculate_monthly_billing(
    billing_month: str,
    current_user: dict = Depends(require_admin),
):
    """
    Calculate and store billing records for all active employees for a given month.
    Idempotent: overwrites existing billing records for the month.
    """
    if len(billing_month) != 7 or billing_month[4] != "-":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "billing_month must be YYYY-MM format")

    client = await get_supabase_admin_async()

    # Get all employees (include EXITED to handle partial months)
    employees = await client.table("employees").select("*").execute()
    all_employees = employees.data or []

    # Get all timesheets for this month
    timesheets = await client.table("timesheet_logs").select("*").eq("import_month", billing_month).execute()
    all_timesheets = timesheets.data or []

    # Group timesheets by employee_id
    ts_by_emp: dict[int, list[dict]] = {}
    for ts in all_timesheets:
        emp_id = ts["employee_id"]
        ts_by_emp.setdefault(emp_id, []).append(ts)

    results = []
    for emp in all_employees:
        emp_id = emp["id"]
        entries = ts_by_emp.get(emp_id, [])
        if not entries:
            continue

        from datetime import date as date_type
        exit_date = date_type.fromisoformat(emp["exit_date"]) if emp.get("exit_date") else None

        billing = calculate_billing(
            entries=entries,
            employee_exit_date=exit_date,
        )

        # Upsert billing record
        record = {
            "employee_id": emp_id,
            "billing_month": billing_month,
            **billing,
        }

        # Delete existing + insert (idempotent upsert)
        await client.table("billing_records").delete().eq("employee_id", emp_id).eq("billing_month", billing_month).execute()
        await client.table("billing_records").insert(record).execute()

        compliance_status = "PASS" if billing["compliance_75_pct"] is True else (
            "FAIL" if billing["compliance_75_pct"] is False else "NO_AWS_DATA"
        )
        results.append(BillingCalculationResult(
            employee_id=emp_id,
            billing_month=billing_month,
            total_logged_hours=billing["total_logged_hours"],
            capped_hours=billing["capped_hours"],
            ooo_days=billing["ooo_days"],
            is_billable=billing["is_billable"],
            compliance_status=compliance_status,
        ))

    api_cache.clear_prefix("billing_")
    api_cache.clear_prefix("dashboard_")
    return results
