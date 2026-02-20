from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.database import get_supabase, get_supabase_admin

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """Verify Supabase JWT using Supabase Auth and fetch user profile."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Use service-role client to verify the JWT via Supabase Auth API
    admin_client = get_supabase_admin()
    try:
        auth_response = admin_client.auth.get_user(token)
        if not auth_response or not auth_response.user:
            raise credentials_exception
        user_id = auth_response.user.id
    except Exception:
        raise credentials_exception

    # Fetch full profile from profiles table (using admin client to bypass RLS)
    result = (
        admin_client.table("profiles")
        .select("*")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise credentials_exception
    return result.data


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Dependency that ensures the current user has ADMIN role."""
    if current_user.get("role") != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user
