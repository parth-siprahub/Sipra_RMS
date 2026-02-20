"""Job Profile schemas — aligned with public.job_profiles table."""
from pydantic import BaseModel
from datetime import datetime


class JobProfileCreate(BaseModel):
    role_name: str
    technology: str
    experience_level: str | None = None


class JobProfileUpdate(BaseModel):
    role_name: str | None = None
    technology: str | None = None
    experience_level: str | None = None


class JobProfileResponse(BaseModel):
    id: int
    role_name: str
    technology: str
    experience_level: str | None = None
    created_at: datetime | None = None
