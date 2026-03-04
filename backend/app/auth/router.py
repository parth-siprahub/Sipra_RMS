"""Auth router — login and profile endpoints."""
from fastapi import APIRouter, HTTPException, status, Depends, Request
from app.auth.schemas import LoginRequest, TokenResponse, UserProfile
from app.auth.dependencies import get_current_user
from app.database import get_supabase_admin
from app.limiter import limiter
import logging
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest):
    """Authenticate user via Supabase Auth and return JWT."""
    client = get_supabase_admin()
    loop = asyncio.get_event_loop()

    try:
        result = await loop.run_in_executor(
            None,
            lambda: client.auth.sign_in_with_password({"email": body.email, "password": body.password})
        )
    except Exception as e:
        # Log email (not password) for audit trail
        logger.warning("Login failed for %s: %s", body.email, type(e).__name__)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not result.user or not result.session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    user_id = result.user.id

    # Fetch role and profile info from profiles table
    profile = await loop.run_in_executor(
        None,
        lambda: client.table("profiles").select("role, full_name").eq("id", user_id).single().execute()
    )

    if not profile.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User profile not found. Contact admin.",
        )

    return TokenResponse(
        access_token=result.session.access_token,
        user_id=user_id,
        role=profile.data["role"],
        full_name=profile.data.get("full_name"),
    )


@router.get("/me", response_model=UserProfile)
def me(current_user: dict = Depends(get_current_user)):
    """Return the current authenticated user's profile."""
    return UserProfile(
        id=current_user["id"],
        email=current_user["email"],
        role=current_user["role"],
        full_name=current_user.get("full_name"),
        avatar_url=current_user.get("avatar_url"),
    )
