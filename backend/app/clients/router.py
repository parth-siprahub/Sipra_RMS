"""Clients CRUD — aligned with public.clients table."""
import logging
from fastapi import APIRouter, HTTPException, status, Depends
from app.auth.dependencies import get_current_user, require_admin
from app.database import get_supabase_admin_async
from app.clients.schemas import ClientCreate, ClientUpdate, ClientResponse
from app.utils.cache import api_cache

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.get("/", response_model=list[ClientResponse])
async def list_clients(current_user: dict = Depends(get_current_user)):
    """List all clients. All authenticated users can view client names."""
    cache_key = "clients_list"
    cached = api_cache.get(cache_key)
    if cached:
        return cached

    client = await get_supabase_admin_async()
    result = await client.table("clients").select("*").order("client_name").execute()
    api_cache.set(cache_key, result.data)
    return result.data


@router.post("/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    payload: ClientCreate,
    current_user: dict = Depends(require_admin),
):
    """Create a new client. Admin only."""
    client = await get_supabase_admin_async()

    # Duplicate check
    dup = await client.table("clients").select("id").eq("client_name", payload.client_name).execute()
    if dup.data:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Client '{payload.client_name}' already exists")

    data = payload.model_dump(exclude_none=True)
    try:
        result = await client.table("clients").insert(data).execute()
        if not result.data:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to create client")
        api_cache.clear_prefix("clients_")
        return result.data[0]
    except Exception as e:
        logger.error("Client creation error: %s", str(e))
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Failed to create client. Please check input and try again.")


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(client_id: int, current_user: dict = Depends(get_current_user)):
    client = await get_supabase_admin_async()
    result = await client.table("clients").select("*").eq("id", client_id).single().execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Client not found")
    return result.data


@router.patch("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: int,
    payload: ClientUpdate,
    current_user: dict = Depends(require_admin),
):
    """Update client details. Admin only."""
    client = await get_supabase_admin_async()
    data = payload.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")
    result = await client.table("clients").update(data).eq("id", client_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Client not found")
    api_cache.clear_prefix("clients_")
    return result.data[0]
