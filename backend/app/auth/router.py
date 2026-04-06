"""Auth router — login and profile endpoints."""
import asyncio
import logging

import httpx
from fastapi import APIRouter, HTTPException, status, Depends, Request

from app.auth.schemas import LoginRequest, RefreshRequest, TokenResponse, UserProfile, UserCreate
from app.auth.dependencies import get_current_user, require_super_admin
from app.config import settings
from app.database import get_supabase_admin
from app.limiter import limiter
from app.utils.person_names import format_person_name

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, body: LoginRequest):
    """Authenticate user via Supabase Auth and return JWT."""
    from supabase import create_client, ClientOptions
    
    # Create a fresh, scoped client ONLY for login to avoid mutating the global singleton with session tokens
    opts = ClientOptions(postgrest_client_timeout=15)
    temp_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY, options=opts)
    
    loop = asyncio.get_event_loop()

    try:
        result = await loop.run_in_executor(
            None,
            lambda: temp_client.auth.sign_in_with_password({"email": body.email, "password": body.password})
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
        lambda: get_supabase_admin().table("profiles").select("role, full_name").eq("id", user_id).single().execute()
    )

    if not profile.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User profile not found. Contact admin.",
        )

    raw_name = profile.data.get("full_name")
    display_name = (format_person_name(raw_name) or raw_name) if raw_name else None
    refresh_token = getattr(result.session, "refresh_token", None)
    return TokenResponse(
        access_token=result.session.access_token,
        user_id=str(user_id),
        role=profile.data["role"],
        full_name=display_name,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("30/minute")
async def refresh_session(request: Request, body: RefreshRequest):
    """Exchange a Supabase refresh token for new access (+ refresh) tokens."""
    token_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/token?grant_type=refresh_token"
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            r = await client.post(
                token_url,
                headers={
                    "apikey": settings.SUPABASE_ANON_KEY,
                    "Content-Type": "application/json",
                },
                json={"refresh_token": body.refresh_token},
            )
        except httpx.RequestError as e:
            logger.warning("Refresh token request failed: %s", e)
            raise HTTPException(
                status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Auth service temporarily unavailable. Try again.",
            )

    if r.status_code != 200:
        logger.warning("Refresh rejected: status=%s body=%s", r.status_code, (r.text or "")[:200])
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please login again.",
        )

    payload = r.json()
    access_token = payload.get("access_token")
    new_refresh = payload.get("refresh_token") or body.refresh_token
    user_obj = payload.get("user") or {}
    user_id = user_obj.get("id")
    if not access_token or not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please login again.",
        )

    loop = asyncio.get_event_loop()
    profile = await loop.run_in_executor(
        None,
        lambda: get_supabase_admin()
        .table("profiles")
        .select("role, full_name")
        .eq("id", user_id)
        .single()
        .execute(),
    )

    if not profile.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User profile not found. Contact admin.",
        )

    raw_name = profile.data.get("full_name")
    display_name = (format_person_name(raw_name) or raw_name) if raw_name else None
    return TokenResponse(
        access_token=access_token,
        user_id=str(user_id),
        role=profile.data["role"],
        full_name=display_name,
        refresh_token=new_refresh,
    )


@router.get("/me", response_model=UserProfile)
async def me(current_user: dict = Depends(get_current_user)):
    """Return the current authenticated user's profile."""
    return UserProfile(
        id=current_user["id"],
        email=current_user["email"],
        role=current_user["role"],
        full_name=current_user.get("full_name"),
        avatar_url=current_user.get("avatar_url"),
    )

@router.get("/debug-keys")
async def debug_keys():
    """Temporary endpoint to debug loaded env keys."""
    anon = settings.SUPABASE_ANON_KEY
    service = settings.SUPABASE_SERVICE_ROLE_KEY
    return {
        "anon_start": anon[:15] if anon else None,
        "service_start": service[:15] if service else None,
        "are_equal": anon == service
    }


@router.post("/create-user", status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    _: dict = Depends(require_super_admin)
):
    """
    Super Admin only: Create a new user in Supabase Auth and Profiles table.
    Bypasses email verification for manual account creation.
    Implementation is idempotent: if user already exists in Auth, it ensures profile exists.
    """
    client = get_supabase_admin()
    loop = asyncio.get_event_loop()
    user_id = None

    try:
        # 1. Check if user already exists in Auth to ensure idempotency
        # Note: GoTrue admin doesn't have direct get_user_by_email, so we list and filter
        logger.info(f"Checking if user {body.email} already exists in Auth...")
        users_result = await loop.run_in_executor(
            None,
            lambda: client.auth.admin.list_users()
        )
        
        existing_user = next((u for u in users_result if u.email == body.email), None)
        
        if existing_user:
            logger.info(f"User {body.email} already exists with ID {existing_user.id}. Proceeding to profile check.")
            user_id = existing_user.id
        else:
            # 2. Create user in Supabase Auth
            logger.info(f"Creating new Auth user: {body.email}")
            meta_name = (format_person_name(body.full_name.strip()) or body.full_name.strip()) if body.full_name else body.full_name
            auth_params = {
                "email": body.email,
                "password": body.password,
                "user_metadata": {"full_name": meta_name},
                "email_confirm": True
            }
            
            # Using dict as attributes positional argument (SyncAuthAdminApi.create_user(attributes))
            result = await loop.run_in_executor(
                None,
                lambda: client.auth.admin.create_user(auth_params)
            )
            
            if not result or not result.user:
                raise Exception("Auth creation succeeded but no user returned")
            
            user_id = result.user.id
            logger.info(f"Auth user created successfully: {user_id}")

        # 3. Create or update profile entry (Upsert)
        norm_name = (format_person_name(body.full_name.strip()) or body.full_name.strip()) if body.full_name else body.full_name
        profile_params = {
            "id": user_id,
            "email": body.email,
            "full_name": norm_name,
            "role": body.role
        }
        
        logger.info(f"Syncing profile for {body.email} (ID: {user_id})")
        await loop.run_in_executor(
            None,
            lambda: client.table("profiles").upsert(profile_params).execute()
        )
        
        return {"message": "User synchronized successfully", "user_id": user_id}

    except Exception as e:
        error_msg = str(e)
        # Catch specific "User not allowed" string to provide more context
        if "User not allowed" in error_msg:
            logger.error(f"Supabase Auth rejected creation for {body.email}: User not allowed. "
                         "This usually means 'Invite' only mode is on or signup is restricted, "
                         "but Admin API should bypass this if the SERVICE_ROLE_KEY is valid.")
        
        logger.error("User creation/sync failed: %s", error_msg, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"User management error: {error_msg}"
        )
