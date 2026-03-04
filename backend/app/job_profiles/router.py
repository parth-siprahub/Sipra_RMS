"""Job Profiles CRUD — aligned with public.job_profiles table."""
from fastapi import APIRouter, HTTPException, status, Depends
from app.auth.dependencies import get_current_user, require_admin
from app.database import get_supabase_admin_async
from app.job_profiles.schemas import (
    JobProfileCreate,
    JobProfileUpdate,
    JobProfileResponse,
)
from app.utils.cache import api_cache

router = APIRouter(prefix="/job-profiles", tags=["Job Profiles"])


@router.get("/", response_model=list[JobProfileResponse])
def list_job_profiles(current_user: dict = Depends(get_current_user)):
    client = get_supabase_admin()
    result = client.table("job_profiles").select("*").order("role_name").execute()
    return result.data


@router.post("/", response_model=JobProfileResponse, status_code=status.HTTP_201_CREATED)
def create_job_profile(
    payload: JobProfileCreate,
    current_user: dict = Depends(require_admin),
):
    client = await get_supabase_admin_async()
    # Duplicate check on role_name (unique column)
    dup = await client.table("job_profiles").select("id").eq("role_name", payload.role_name).execute()
    if dup.data:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Job profile '{payload.role_name}' already exists")
    result = await client.table("job_profiles").insert(payload.model_dump(exclude_none=True)).execute()
    api_cache.clear_prefix("jobprofiles_")
    return result.data[0]


@router.get("/{profile_id}", response_model=JobProfileResponse)
def get_job_profile(profile_id: int, current_user: dict = Depends(get_current_user)):
    client = get_supabase_admin()
    result = client.table("job_profiles").select("*").eq("id", profile_id).single().execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job profile not found")
    return result.data


@router.put("/{profile_id}", response_model=JobProfileResponse)
def update_job_profile(
    profile_id: int,
    payload: JobProfileUpdate,
    current_user: dict = Depends(require_admin),
):
    client = await get_supabase_admin_async()
    data = payload.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")
    result = await client.table("job_profiles").update(data).eq("id", profile_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job profile not found")
    api_cache.clear_prefix("jobprofiles_")
    return result.data[0]


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job_profile(
    profile_id: int,
    current_user: dict = Depends(require_admin),
):
    client = await get_supabase_admin_async()
    # Guard: prevent deletion if linked to resource requests
    linked = await client.table("resource_requests").select("id").eq("job_profile_id", profile_id).limit(1).execute()
    if linked.data:
        raise HTTPException(status.HTTP_409_CONFLICT, "Cannot delete: linked to resource requests")
    await client.table("job_profiles").delete().eq("id", profile_id).execute()
    api_cache.clear_prefix("jobprofiles_")
