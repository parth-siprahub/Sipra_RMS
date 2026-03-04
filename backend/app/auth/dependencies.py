"""Authentication dependencies — async-first, with user profile caching."""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.database import get_supabase_admin_async
from app.utils.cache import SimpleCache
import logging

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Cache user profiles for 5 minutes to avoid redundant DB calls on every request
user_cache = SimpleCache(ttl_seconds=300)


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """Verify Supabase JWT and fetch user profile with caching (async)."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Check memory cache first
    cached_user = user_cache.get(token)
    if cached_user:
        return cached_user

    client = await get_supabase_admin_async()
    try:
        auth_response = await client.auth.get_user(token)
        if not auth_response or not auth_response.user:
            raise credentials_exception
        user_id = auth_response.user.id
    except Exception:
        raise credentials_exception

    # Fetch full profile from DB
    try:
        result = (
            await client.table("profiles")
            .select("*")
            .eq("id", user_id)
            .single()
            .execute()
        )
        if not result.data:
            raise credentials_exception

        user_data = result.data
        # Update cache for subsequent requests in this session
        user_cache.set(token, user_data)
        return user_data
    except Exception as e:
        logger.error("Auth Profile Fetch Error: %s", str(e))
        raise credentials_exception


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Ensure the user has ADMIN role."""
    if current_user.get("role") != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user
