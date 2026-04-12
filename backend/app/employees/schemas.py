"""Employee schemas — aligned with public.employees table."""
from pydantic import BaseModel, EmailStr
from datetime import datetime, date
from enum import Enum


class EmployeeStatus(str, Enum):
    ACTIVE = "ACTIVE"
    EXITED = "EXITED"
    TERMINATED = "TERMINATED"


class EmployeeCreate(BaseModel):
    candidate_id: int
    rms_name: str
    client_name: str | None = None
    aws_email: EmailStr | None = None
    siprahub_email: EmailStr | None = None
    github_id: str | None = None
    jira_username: str | None = None
    start_date: date | None = None


class EmployeeUpdate(BaseModel):
    rms_name: str | None = None
    client_name: str | None = None
    aws_email: EmailStr | None = None
    siprahub_email: EmailStr | None = None
    github_id: str | None = None
    jira_username: str | None = None
    start_date: date | None = None
    exit_date: date | None = None
    # Offboarding dates (set when employee is marked EXITED)
    client_offboarding_date: date | None = None    # Final billing date
    siprahub_offboarding_date: date | None = None  # Final salary date
    status: EmployeeStatus | None = None


class EmployeeResponse(BaseModel):
    id: int
    candidate_id: int | None = None
    rms_name: str
    client_name: str | None = None
    aws_email: str | None = None
    siprahub_email: str | None = None
    github_id: str | None = None
    jira_username: str | None = None
    start_date: date | None = None
    exit_date: date | None = None
    # Offboarding dates
    client_offboarding_date: date | None = None    # Final billing date
    siprahub_offboarding_date: date | None = None  # Final salary date
    status: EmployeeStatus | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    job_profile_name: str | None = None
    # Enriched fields (not stored on employees table directly)
    source: str | None = None        # payroll type: internal / vendor / contractor
    sow_number: str | None = None    # from candidate → resource_request → sow
