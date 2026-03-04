from supabase import create_client, Client, acreate_client, ClientOptions
from app.config import settings
import asyncio

_supabase_client = None
_supabase_admin_client = None
_supabase_async_admin_client = None
_client_lock = asyncio.Lock()

def get_supabase() -> Client:
    """Anon key client — RLS enforced via user JWT."""
    global _supabase_client
    if _supabase_client is None:
        opts = ClientOptions(postgrest_client_timeout=15)
        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY, options=opts)
    return _supabase_client

def get_supabase_admin() -> Client:
    """Service role client — bypasses RLS. Use only for admin ops."""
    global _supabase_admin_client
    if _supabase_admin_client is None:
        opts = ClientOptions(postgrest_client_timeout=15)
        _supabase_admin_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY, options=opts)
    return _supabase_admin_client

async def get_supabase_admin_async():
    """
    Service role async client — Singleton pattern to prevent connection exhaustion.
    Uses a thread-safe lock for initialization.
    """
    global _supabase_async_admin_client
    if _supabase_async_admin_client is None:
        async with _client_lock:
            # Double-check pattern
            if _supabase_async_admin_client is None:
                opts = ClientOptions(postgrest_client_timeout=10)
                _supabase_async_admin_client = await acreate_client(
                    settings.SUPABASE_URL, 
                    settings.SUPABASE_SERVICE_ROLE_KEY, 
                    options=opts
                )
    return _supabase_async_admin_client
