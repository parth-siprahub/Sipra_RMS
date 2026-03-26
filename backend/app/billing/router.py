"""Billing CRUD + calculation — aligned with public.billing_records table."""
import logging
from datetime import date as date_type, datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.auth.dependencies import get_current_user, require_admin
from app.database import get_supabase_admin_async
from app.billing.schemas import (
    BillingRecordResponse,
    BillingCalculationResult,
    BillingFreezeResponse,
)
from app.billing.engine import calculate_billing
from app.utils.cache import api_cache

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["Billing"])


def _validate_billing_month(billing_month: str) -> None:
    """Raise 400 if billing_month is not YYYY-MM format."""
    if len(billing_month) != 7 or billing_month[4] != "-":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "billing_month must be YYYY-MM format")
    try:
        int(billing_month[:4])
        int(billing_month[5:])
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "billing_month must be YYYY-MM format")


@router.get("/", response_model=list[BillingRecordResponse])
async def list_billing_records(
    employee_id: int | None = None,
    billing_month: str | None = None,
    processed: bool | None = Query(None, description="Filter by processed status"),
    current_user: dict = Depends(get_current_user),
):
    client = await get_supabase_admin_async()
    query = client.table("billing_records").select("*")
    if employee_id:
        query = query.eq("employee_id", employee_id)
    if billing_month:
        query = query.eq("billing_month", billing_month)
    if processed is not None:
        query = query.eq("processed", processed)
    result = await query.order("billing_month", desc=True).execute()
    return result.data


@router.post("/freeze/{billing_month}", response_model=BillingFreezeResponse)
async def freeze_billing_month(
    billing_month: str,
    current_user: dict = Depends(require_admin),
):
    """
    Mark all billing_records for the given month as processed (frozen).
    Idempotent: already-frozen records are included in the count.
    """
    _validate_billing_month(billing_month)

    client = await get_supabase_admin_async()
    now = datetime.now(timezone.utc).isoformat()

    # Bulk update: single query sets all unprocessed records for the month
    # This is atomic at the DB level — no race condition between check and update
    freeze_result = await (
        client.table("billing_records")
        .update({"processed": True, "processed_at": now})
        .eq("billing_month", billing_month)
        .eq("processed", False)
        .execute()
    )
    newly_frozen = len(freeze_result.data) if freeze_result.data else 0

    # Count total records for reporting
    total_result = await (
        client.table("billing_records")
        .select("id", count="exact")
        .eq("billing_month", billing_month)
        .execute()
    )
    total_count = total_result.count or newly_frozen

    api_cache.clear_prefix("billing_")
    return BillingFreezeResponse(
        billing_month=billing_month,
        frozen_count=newly_frozen,
        total_records=total_count,
        processed_at=datetime.now(timezone.utc),
    )


@router.post("/calculate/{billing_month}", response_model=list[BillingCalculationResult])
async def calculate_monthly_billing(
    billing_month: str,
    current_user: dict = Depends(require_admin),
):
    """
    Calculate and store billing records for all active employees for a given month.
    Idempotent: overwrites existing billing records for the month.
    Raises 409 if the month is already frozen (has processed records).
    """
    _validate_billing_month(billing_month)

    client = await get_supabase_admin_async()

    # ── Check if month is frozen ──────────────────────────
    existing = await (
        client.table("billing_records")
        .select("id, processed")
        .eq("billing_month", billing_month)
        .execute()
    )
    frozen_records = [r for r in (existing.data or []) if r.get("processed")]
    if frozen_records:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Billing month {billing_month} is already frozen. "
            f"{len(frozen_records)} processed record(s) exist. "
            "Unfreeze before recalculating.",
        )

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

    now = datetime.now(timezone.utc).isoformat()
    results = []
    for emp in all_employees:
        emp_id = emp["id"]
        entries = ts_by_emp.get(emp_id, [])
        if not entries:
            continue

        exit_date = date_type.fromisoformat(emp["exit_date"]) if emp.get("exit_date") else None

        billing = calculate_billing(
            entries=entries,
            employee_exit_date=exit_date,
        )

        # Upsert billing record — mark as processed immediately
        record = {
            "employee_id": emp_id,
            "billing_month": billing_month,
            **billing,
            "processed": True,
            "processed_at": now,
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
