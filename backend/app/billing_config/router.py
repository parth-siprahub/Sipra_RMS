"""Billing configuration CRUD — configurable billable hours per client/month."""
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query, Depends, status
from app.database import get_supabase_admin_async
from app.billing_config.schemas import BillingConfigCreate, BillingConfigResponse
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
        .select("id")
        .eq("client_name", payload.client_name)
        .eq("billing_month", payload.billing_month)
        .execute()
    )

    data = payload.model_dump()

    if existing.data:
        # Update
        config_id = existing.data[0]["id"]
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = await (
            client.table("billing_config")
            .update(data)
            .eq("id", config_id)
            .execute()
        )
        logger.info("Updated billing config %d for %s/%s", config_id, payload.client_name, payload.billing_month)
    else:
        # Insert
        result = await client.table("billing_config").insert(data).execute()
        logger.info("Created billing config for %s/%s", payload.client_name, payload.billing_month)

    return result.data[0]


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
    existing = await client.table("billing_config").select("id").eq("id", config_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Billing config not found")
    await client.table("billing_config").delete().eq("id", config_id).execute()
    logger.info("Deleted billing config %d", config_id)
