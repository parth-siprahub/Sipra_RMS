"""Client schemas — aligned with public.clients table."""
from pydantic import BaseModel
from datetime import datetime


class ClientCreate(BaseModel):
    client_name: str
    client_website: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None


class ClientUpdate(BaseModel):
    client_name: str | None = None
    client_website: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    is_active: bool | None = None


class ClientResponse(BaseModel):
    id: int
    client_name: str
    client_website: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    is_active: bool | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
