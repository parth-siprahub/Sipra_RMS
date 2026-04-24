"""Billing configuration CRUD — configurable billable hours per client/month."""
import logging
import re
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query, Depends, status
from app.database import get_supabase_admin_async
from app.billing_config.schemas import BillingConfigCreate, BillingConfigResponse, BillingConfigFreezeResponse
from app.auth.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/billing-config", tags=["Billing Config"])

# Authorized emails for modifying billing configuration
BILLING_AUTH_EMAILS = {"jaicind@siprahub.com", "sreenath.reddy@siprahub.com", "rajapv@siprahub.com"}


@router.get("/", response_model=list[BillingConfigResponse])
async def list_billing_configs(
    month: str | None = Query(None, description="Filter by YYYY-MM"),
    client_name: str | None = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """List billing configurations — restricted to authorised emails."""
    user_email = current_user.get("email", "").lower()
    if user_email not in BILLING_AUTH_EMAILS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view billing configurations.",
        )
    client = await get_supabase_admin_async()
    query = client.table("billing_config").select("*").order("billing_month", desc=True)
    if month:
        query = query.eq("billing_month", month)
    if client_name:
        query = query.eq("client_name", client_name)
    result = await query.execute()
    return result.data


@router.get("/{config_id}", response_model=BillingConfigResponse)
async def get_billing_config(
    config_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Get a single billing config — restricted to authorised emails."""
    user_email = current_user.get("email", "").lower()
    if user_email not in BILLING_AUTH_EMAILS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view billing configurations.",
        )
    client = await get_supabase_admin_async()
    result = await client.table("billing_config").select("*").eq("id", config_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Billing config not found")
    return result.data[0]


@router.post("/", response_model=BillingConfigResponse, status_code=201)
async def upsert_billing_config(
    payload: BillingConfigCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create or update billing config (upsert on client_name + billing_month)."""
    user_email = current_user.get("email", "").lower()
    if user_email not in BILLING_AUTH_EMAILS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to modify billing configurations."
        )

    client = await get_supabase_admin_async()


    # Check if exists
    existing = await (
        client.table("billing_config")
        .select("id, is_frozen")
        .eq("client_name", payload.client_name)
        .eq("billing_month", payload.billing_month)
        .execute()
    )

    data = payload.model_dump()

    if existing.data:
        row = existing.data[0]
        # Block edits on frozen months
        if row.get("is_frozen"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Billing month {payload.billing_month} is locked. Unlock it in Billing Config before making changes.",
            )
        # Update
        config_id = row["id"]
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = await (
            client.table("billing_config")
            .update(data)
            .eq("id", config_id)
            .execute()
        )
        logger.info("Updated billing config %d for %s/%s", config_id, payload.client_name, payload.billing_month)
    else:
        # Insert (new rows can never be frozen)
        result = await client.table("billing_config").insert(data).execute()
        logger.info("Created billing config for %s/%s", payload.client_name, payload.billing_month)

    return result.data[0]


@router.post("/{billing_month}/freeze", response_model=BillingConfigFreezeResponse)
async def freeze_billing_month(
    billing_month: str,
    client_name: str = Query(default="DCLI"),
    current_user: dict = Depends(get_current_user),
):
    """Lock a billing month — blocks recalculation until unfrozen. Admin-only."""
    if not re.match(r"^\d{4}-(0[1-9]|1[0-2])$", billing_month):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="billing_month must be YYYY-MM format")

    user_email = current_user.get("email", "").lower()
    if user_email not in BILLING_AUTH_EMAILS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to freeze billing months.",
        )

    client = await get_supabase_admin_async()
    existing = await (
        client.table("billing_config")
        .select("*")
        .eq("billing_month", billing_month)
        .eq("client_name", client_name)
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail=f"No billing config found for {billing_month}.")

    row = existing.data[0]
    if row.get("is_frozen"):
        frozen_who = row.get("frozen_by") or "unknown"
        frozen_when = row.get("frozen_at") or ""
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Billing month {billing_month} is already frozen by {frozen_who} on {frozen_when[:10] if frozen_when else '?'}.",
        )

    now = datetime.now(timezone.utc).isoformat()
    result = await (
        client.table("billing_config")
        .update({"is_frozen": True, "frozen_by": user_email, "frozen_at": now})
        .eq("id", row["id"])
        .execute()
    )
    updated = result.data[0]
    logger.info("Billing month %s frozen by %s", billing_month, user_email)
    return BillingConfigFreezeResponse(
        id=updated["id"],
        billing_month=billing_month,
        is_frozen=True,
        frozen_by=updated.get("frozen_by"),
        frozen_at=updated.get("frozen_at"),
        last_unfrozen_by=updated.get("last_unfrozen_by"),
        last_unfrozen_at=updated.get("last_unfrozen_at"),
        message=f"Billing month {billing_month} is now locked.",
    )


@router.post("/{billing_month}/unfreeze", response_model=BillingConfigFreezeResponse)
async def unfreeze_billing_month(
    billing_month: str,
    client_name: str = Query(default="DCLI"),
    current_user: dict = Depends(get_current_user),
):
    """Unlock a frozen billing month — allows recalculation. Admin-only."""
    if not re.match(r"^\d{4}-(0[1-9]|1[0-2])$", billing_month):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="billing_month must be YYYY-MM format")

    user_email = current_user.get("email", "").lower()
    if user_email not in BILLING_AUTH_EMAILS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to unfreeze billing months.",
        )

    client = await get_supabase_admin_async()
    existing = await (
        client.table("billing_config")
        .select("*")
        .eq("billing_month", billing_month)
        .eq("client_name", client_name)
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail=f"No billing config found for {billing_month}.")

    row = existing.data[0]
    if not row.get("is_frozen"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Billing month {billing_month} is not frozen.",
        )

    now = datetime.now(timezone.utc).isoformat()
    result = await (
        client.table("billing_config")
        .update({"is_frozen": False, "last_unfrozen_by": user_email, "last_unfrozen_at": now})
        .eq("id", row["id"])
        .execute()
    )
    updated = result.data[0]
    logger.info("Billing month %s unfrozen by %s", billing_month, user_email)
    return BillingConfigFreezeResponse(
        id=updated["id"],
        billing_month=billing_month,
        is_frozen=False,
        frozen_by=updated.get("frozen_by"),
        frozen_at=updated.get("frozen_at"),
        last_unfrozen_by=updated.get("last_unfrozen_by"),
        last_unfrozen_at=updated.get("last_unfrozen_at"),
        message=f"Billing month {billing_month} is now unlocked.",
    )


@router.delete("/{config_id}", status_code=204)
async def delete_billing_config(
    config_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Delete a billing config — restricted to authorised emails."""
    user_email = current_user.get("email", "").lower()
    if user_email not in BILLING_AUTH_EMAILS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to delete billing configurations.",
        )
    client = await get_supabase_admin_async()
    existing = await client.table("billing_config").select("id, is_frozen, billing_month").eq("id", config_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Billing config not found")
    row = existing.data[0]
    if row.get("is_frozen"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Billing month {row.get('billing_month')} is locked. Unlock it before deleting.",
        )
    await client.table("billing_config").delete().eq("id", config_id).execute()
    logger.info("Deleted billing config %d", config_id)
