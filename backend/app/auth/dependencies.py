"""Authentication dependencies — async-first, with user profile caching."""
import asyncio
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.database import get_supabase_admin, get_supabase_admin_async
from app.utils.cache import SimpleCache
from app.utils.person_names import format_person_name
import logging

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Cache user profiles for 2 minutes by user_id (not token) to avoid stale role data
user_cache = SimpleCache(ttl_seconds=120)


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """Verify Supabase JWT and fetch user profile with caching (async)."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Verify token with Supabase Auth using sync client (reliable in long-running app)
    sync_client = get_supabase_admin()
    loop = asyncio.get_event_loop()
    try:
        auth_response = await loop.run_in_executor(
            None, lambda: sync_client.auth.get_user(token)
        )
        if not auth_response or not auth_response.user:
            logger.error("Auth: get_user returned no user")
            raise credentials_exception
        user_id = str(auth_response.user.id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Auth: get_user failed: %s: %s", type(e).__name__, str(e)[:200])
        raise credentials_exception

    # Check memory cache by user_id (not token) to avoid stale role data
    cached_user = user_cache.get(user_id)
    if cached_user:
        return cached_user

    # Fetch full profile from DB (async client is fine for DB queries)
    async_client = await get_supabase_admin_async()
    try:
        result = (
            await async_client.table("profiles")
            .select("id, email, role, full_name")
            .eq("id", user_id)
            .single()
            .execute()
        )
        if not result.data:
            raise credentials_exception

        user_data = dict(result.data)
        fn = user_data.get("full_name")
        if fn:
            user_data["full_name"] = format_person_name(fn) or fn
        # Cache by user_id so role changes take effect after TTL
        user_cache.set(user_id, user_data)
        return user_data
    except Exception as e:
        logger.error("Auth Profile Fetch Error: %s", str(e))
        raise credentials_exception


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Ensure the user has ADMIN, SUPER_ADMIN, or MANAGER role."""
    if current_user.get("role") not in ("ADMIN", "SUPER_ADMIN", "MANAGER"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


async def require_super_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Ensure the user has SUPER_ADMIN role."""
    if current_user.get("role") != "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin access required",
        )
    return current_user
