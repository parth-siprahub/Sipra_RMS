"""Pydantic schemas for Vendor Management (F3)."""
from pydantic import BaseModel
from datetime import datetime


class VendorCreate(BaseModel):
    name: str
    contact_person: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    is_active: bool = True


class VendorUpdate(BaseModel):
    name: str | None = None
    contact_person: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    is_active: bool | None = None


class VendorResponse(BaseModel):
    id: int
    name: str
    contact_person: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    is_active: bool
    created_at: datetime | None = None

    model_config = {"from_attributes": True}
