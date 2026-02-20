"""Resume upload via Supabase Storage."""
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from app.auth.dependencies import get_current_user
from app.database import get_supabase_admin

router = APIRouter(prefix="/candidates", tags=["Candidates"])

ALLOWED_TYPES = {"application/pdf", "application/msword",
                 "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
MAX_SIZE_MB = 5


@router.post("/{candidate_id}/resume")
async def upload_resume(
    candidate_id: int,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload resume PDF/DOCX for a candidate (max 5MB)."""
    # Validate file type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Invalid file type: {file.content_type}. Allowed: PDF, DOC, DOCX",
        )

    # Read and check size
    content = await file.read()
    if len(content) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"File too large. Max size: {MAX_SIZE_MB}MB",
        )

    client = get_supabase_admin()

    # Verify candidate exists
    existing = client.table("candidates").select("id").eq("id", candidate_id).single().execute()
    if not existing.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Candidate not found")

    # Upload to Supabase Storage
    ext = file.filename.rsplit(".", 1)[-1] if file.filename else "pdf"
    storage_path = f"candidate_{candidate_id}/resume.{ext}"

    try:
        # Remove old file if exists (ignore errors)
        try:
            client.storage.from_("resumes").remove([storage_path])
        except Exception:
            pass

        client.storage.from_("resumes").upload(
            storage_path,
            content,
            file_options={"content-type": file.content_type},
        )
    except Exception as e:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            f"Storage upload failed: {str(e)}",
        )

    # Get public URL
    public_url = client.storage.from_("resumes").get_public_url(storage_path)

    # Update candidate record
    client.table("candidates").update({"resume_url": public_url}).eq("id", candidate_id).execute()

    return {
        "message": "Resume uploaded successfully",
        "resume_url": public_url,
        "candidate_id": candidate_id,
    }
