"""Resume upload via Supabase Storage."""
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from app.auth.dependencies import get_current_user
from app.database import get_supabase_admin_async
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/candidates", tags=["Candidates"])

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
ALLOWED_EXTENSIONS = {"pdf", "doc", "docx"}
MAX_SIZE_MB = 5


@router.post("/{candidate_id}/resume")
async def upload_resume(
    candidate_id: int,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload resume PDF/DOCX for a candidate (max 5MB)."""
    # Validate MIME type (server-reported)
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Invalid file type. Allowed: PDF, DOC, DOCX",
        )

    # Validate file extension (second layer — MIME can be spoofed)
    raw_ext = (file.filename or "").rsplit(".", 1)[-1].lower().strip()
    if raw_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Invalid file extension. Allowed: .pdf, .doc, .docx",
        )

    # Use only the validated extension in the storage path (no path traversal risk)
    safe_ext = raw_ext

    # Read and check size
    content = await file.read()
    if len(content) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"File too large. Max size: {MAX_SIZE_MB}MB",
        )

    client = await get_supabase_admin_async()

    # Verify candidate exists
    existing = await client.table("candidates").select("id").eq("id", candidate_id).single().execute()
    if not existing.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Candidate not found")

    # Upload to Supabase Storage — path uses only validated candidate_id + extension
    storage_path = f"candidate_{candidate_id}/resume.{safe_ext}"

    try:
        # Remove old file if exists (ignore errors)
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
        # I9: Log real error, return generic message to client
        logger.error("Storage upload failed for candidate %d: %s", candidate_id, str(e))
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Resume upload failed. Please try again or contact support.",
        )

    # Get public URL (storage3 AsyncBucket: get_public_url is async)
    public_url = await client.storage.from_("resumes").get_public_url(storage_path)

    # Update candidate record
    await client.table("candidates").update({"resume_url": public_url}).eq("id", candidate_id).execute()

    return {
        "message": "Resume uploaded successfully",
        "resume_url": public_url,
        "candidate_id": candidate_id,
    }
