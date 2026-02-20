from supabase import create_client, Client
from app.config import settings

def get_supabase() -> Client:
    """Anon key client — RLS enforced via user JWT."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

def get_supabase_admin() -> Client:
    """Service role client — bypasses RLS. Use only for admin ops."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
