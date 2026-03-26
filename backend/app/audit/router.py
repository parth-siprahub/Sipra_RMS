"""Audit logs API — read-only, SUPER_ADMIN only."""
import logging
from fastapi import APIRouter, Depends, Query
from app.auth.dependencies import require_super_admin
from app.database import get_supabase_admin_async

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get("/logs")
async def list_audit_logs(
    entity_type: str | None = Query(None, description="Filter by entity type"),
    entity_id: str | None = Query(None, description="Filter by entity ID"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    current_user: dict = Depends(require_super_admin),
):
    """List audit logs with pagination. Requires SUPER_ADMIN role."""
    client = await get_supabase_admin_async()

    query = client.table("audit_logs").select("*", count="exact")

    if entity_type:
        query = query.eq("entity_type", entity_type)
    if entity_id:
        query = query.eq("entity_id", entity_id)

    offset = (page - 1) * page_size
    query = query.order("created_at", desc=True).range(offset, offset + page_size - 1)

    result = await query.execute()

    total = result.count if result.count is not None else 0

    return {
        "data": result.data,
        "total": total,
        "page": page,
        "page_size": page_size,
    }
