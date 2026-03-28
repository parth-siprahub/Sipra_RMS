"""Audit logging service — fire-and-forget insert into audit_logs table."""
import logging
import asyncio
import json
from app.database import get_supabase_admin_async

logger = logging.getLogger(__name__)


async def _insert_audit_log(
    user_id: str | None,
    user_email: str | None,
    action: str,
    entity_type: str,
    entity_id: str | None,
    old_values: dict | None,
    new_values: dict | None,
    ip_address: str | None,
) -> None:
    """Internal: actually insert the audit log row."""
    try:
        client = await get_supabase_admin_async()
        row = {
            "user_id": user_id,
            "user_email": user_email,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "old_values": old_values,
            "new_values": new_values,
            "ip_address": ip_address,
        }
        await client.table("audit_logs").insert(row).execute()
    except Exception as exc:
        logger.error("Failed to write audit log: %s | payload: action=%s entity_type=%s entity_id=%s",
                      exc, action, entity_type, entity_id)


async def log_audit(
    user: dict,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    old_values: dict | None = None,
    new_values: dict | None = None,
    ip_address: str | None = None,
) -> None:
    """
    Fire-and-forget audit log writer.

    Parameters
    ----------
    user : dict
        Must contain 'id' and 'email' keys (from auth dependency).
    action : str
        One of CREATE, UPDATE, DELETE, STATUS_CHANGE, IMPORT.
    entity_type : str
        e.g. candidate, employee, sow, resource_request, timesheet.
    entity_id : str, optional
        ID of the affected record.
    old_values : dict, optional
        Previous state (for UPDATE / STATUS_CHANGE).
    new_values : dict, optional
        New state after the change.
    ip_address : str, optional
        Client IP address from the request.
    """
    asyncio.create_task(
        _insert_audit_log(
            user_id=user.get("id"),
            user_email=user.get("email"),
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
        )
    )
