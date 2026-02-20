from pydantic import BaseModel, EmailStr
from enum import Enum


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    RECRUITER = "RECRUITER"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: UserRole
    full_name: str | None = None


class UserProfile(BaseModel):
    id: str
    email: str
    role: UserRole
    full_name: str | None = None
    avatar_url: str | None = None
