"""Job Profiles CRUD — aligned with public.job_profiles table."""
import logging
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File

logger = logging.getLogger(__name__)
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
async def list_job_profiles(current_user: dict = Depends(get_current_user)):
    client = await get_supabase_admin_async()
    result = await client.table("job_profiles").select("*").order("role_name").execute()
    return result.data


@router.post("/", response_model=JobProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_job_profile(
    payload: JobProfileCreate,
    current_user: dict = Depends(require_admin),
):
    client = await get_supabase_admin_async()
    
    # Duplicate check on role_name (unique column)
    dup = await client.table("job_profiles").select("id").eq("role_name", payload.role_name).execute()
    if dup.data:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Job profile '{payload.role_name}' already exists")
    
    # Sanitize: Convert empty strings to None before inserting to avoid DB constraint issues
    data = payload.model_dump(exclude_none=True)
    for key, value in data.items():
        if value == "":
            data[key] = None

    try:
        result = await client.table("job_profiles").insert(data).execute()
        if not result.data:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to create job profile: No data returned")
        api_cache.clear_prefix("jobprofiles_")
        return result.data[0]
    except Exception as e:
        logger.error("Job Profile Creation Error: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Database error: {str(e)}"
        )


@router.get("/{profile_id}", response_model=JobProfileResponse)
async def get_job_profile(profile_id: int, current_user: dict = Depends(get_current_user)):
    client = await get_supabase_admin_async()
    result = await client.table("job_profiles").select("*").eq("id", profile_id).single().execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job profile not found")
    return result.data


@router.put("/{profile_id}", response_model=JobProfileResponse)
async def update_job_profile(
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


@router.delete("/{profile_id}")
async def delete_job_profile(
    profile_id: int,
    current_user: dict = Depends(require_admin),
):
    client = await get_supabase_admin_async()
    # Guard: prevent deletion if linked to non-CLOSED resource requests
    linked = await (
        client.table("resource_requests")
        .select("id, status")
        .eq("job_profile_id", profile_id)
        .execute()
    )
    if linked.data:
        open_requests = [r for r in linked.data if r.get("status") != "CLOSED"]
        if open_requests:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Cannot delete: linked to open resource requests. Close all linked requests first.",
            )
    await client.table("job_profiles").delete().eq("id", profile_id).execute()
    api_cache.clear_prefix("jobprofiles_")
    return {"message": "Job profile deleted"}


JD_ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
JD_ALLOWED_EXTENSIONS = {"pdf", "doc", "docx"}
JD_MAX_SIZE_MB = 5


@router.post("/{profile_id}/jd")
async def upload_jd_file(
    profile_id: int,
    file: UploadFile = File(...),
    current_user: dict = Depends(require_admin),
):
    """Upload JD file (PDF/DOCX, max 5MB) for a job profile."""
    if file.content_type not in JD_ALLOWED_MIME_TYPES:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Invalid file type. Allowed: PDF, DOC, DOCX",
        )

    raw_ext = (file.filename or "").rsplit(".", 1)[-1].lower().strip()
    if raw_ext not in JD_ALLOWED_EXTENSIONS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Invalid file extension. Allowed: .pdf, .doc, .docx",
        )

    content = await file.read()
    if len(content) > JD_MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"File too large. Max size: {JD_MAX_SIZE_MB}MB",
        )

    client = await get_supabase_admin_async()

    # Verify profile exists
    existing = await client.table("job_profiles").select("id").eq("id", profile_id).single().execute()
    if not existing.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job profile not found")

    storage_path = f"job_profile_{profile_id}/jd.{raw_ext}"

    try:
        try:
            await client.storage.from_("resumes").remove([storage_path])
        except Exception:
            pass

        await client.storage.from_("resumes").upload(
            storage_path,
            content,
            file_options={"content-type": file.content_type},
        )
    except Exception as e:
        logger.error("JD upload failed for profile %d: %s", profile_id, str(e))
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "JD file upload failed. Please try again.",
        )

    public_url = client.storage.from_("resumes").get_public_url(storage_path)

    await client.table("job_profiles").update({"jd_file_url": public_url}).eq("id", profile_id).execute()
    api_cache.clear_prefix("jobprofiles_")

    return {
        "message": "JD file uploaded successfully",
        "jd_file_url": public_url,
        "profile_id": profile_id,
    }
