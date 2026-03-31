"""Job profile JD upload via Supabase Storage."""
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from app.auth.dependencies import get_current_user, require_admin
from app.database import get_supabase_admin_async
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/job-profiles", tags=["Job Profiles"])

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
ALLOWED_EXTENSIONS = {"pdf", "doc", "docx"}
MAX_SIZE_MB = 5


@router.post("/{profile_id}/jd")
async def upload_jd(
    profile_id: int,
    file: UploadFile = File(...),
    current_user: dict = Depends(require_admin),
):
    """Upload job description PDF/DOCX (max 5MB)."""
    # Validate MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Invalid file type. Allowed: PDF, DOC, DOCX",
        )

    # Validate extension
    raw_ext = (file.filename or "").rsplit(".", 1)[-1].lower().strip()
    if raw_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Invalid file extension. Allowed: .pdf, .doc, .docx",
        )

    # Read and check size
    content = await file.read()
    if len(content) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"File too large. Max size: {MAX_SIZE_MB}MB",
        )

    client = await get_supabase_admin_async()

    # Verify job profile exists
    existing = await client.table("job_profiles").select("id").eq("id", profile_id).single().execute()
    if not existing.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job profile not found")

    # Upload to Supabase Storage - bucket "jds"
    storage_path = f"profile_{profile_id}/jd.{raw_ext}"

    try:
        # Remove old file if exists (ignore errors)
        try:
            await client.storage.from_("jds").remove([storage_path])
        except Exception:
            pass

        await client.storage.from_("jds").upload(
            storage_path,
            content,
            file_options={"contentType": file.content_type, "upsert": "true"},
        )
    except Exception as e:
        logger.error("JD Storage upload failed for profile %d: %s | type=%s", profile_id, str(e), type(e).__name__)
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            f"JD upload failed: {str(e)[:200]}",
        )

    # Get public URL
    public_url = client.storage.from_("jds").get_public_url(storage_path)

    # Update job profile record
    await client.table("job_profiles").update({"jd_file_url": public_url}).eq("id", profile_id).execute()

    return {
        "message": "JD uploaded successfully",
        "jd_file_url": public_url,
        "profile_id": profile_id,
    }
