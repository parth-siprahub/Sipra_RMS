"""Candidate schemas — aligned with public.candidates table (28 columns)."""
from pydantic import BaseModel, EmailStr
from datetime import datetime, date, time
from enum import Enum





class CandidateStatus(str, Enum):
    NEW = "NEW"
    SUBMITTED_TO_ADMIN = "SUBMITTED_TO_ADMIN"
    WITH_ADMIN = "WITH_ADMIN"
    REJECTED_BY_ADMIN = "REJECTED_BY_ADMIN"
    WITH_CLIENT = "WITH_CLIENT"
    L1_SCHEDULED = "L1_SCHEDULED"
    L1_COMPLETED = "L1_COMPLETED"
    L1_SHORTLIST = "L1_SHORTLIST"
    L1_REJECT = "L1_REJECT"
    INTERVIEW_SCHEDULED = "INTERVIEW_SCHEDULED"
    SELECTED = "SELECTED"
    ONBOARDED = "ONBOARDED"
    REJECTED_BY_CLIENT = "REJECTED_BY_CLIENT"
    ON_HOLD = "ON_HOLD"
    SCREEN_REJECT = "SCREEN_REJECT"
    EXIT = "EXIT"


class CandidateCreate(BaseModel):
    request_id: int | None = None
    first_name: str
    last_name: str
    email: str
    phone: str | None = None
    vendor: str | None = None
    vendor_id: int | None = None
    current_company: str | None = None
    current_ctc: float | None = None
    expected_ctc: float | None = None
    current_location: str | None = None
    work_location: str | None = None
    notice_period: int | None = None
    total_experience: float | None = None
    relevant_experience: float | None = None
    skills: str | None = None
    remarks: str | None = None
    screening_comment: str | None = None
    vendor_feedback: str | None = None


class CandidateUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    phone: str | None = None
    request_id: int | None = None
    vendor: str | None = None
    vendor_id: int | None = None
    current_company: str | None = None
    current_ctc: float | None = None
    expected_ctc: float | None = None
    current_location: str | None = None
    work_location: str | None = None
    notice_period: int | None = None
    total_experience: float | None = None
    relevant_experience: float | None = None
    skills: str | None = None
    interview_date: date | None = None
    interview_time: time | None = None
    status: CandidateStatus | None = None
    remarks: str | None = None
    onboarding_date: date | None = None
    client_email: str | None = None
    client_jira_id: str | None = None
    l1_feedback: str | None = None
    l1_score: int | None = None
    l2_feedback: str | None = None
    l2_score: int | None = None
    overlap_until: date | None = None
    screening_comment: str | None = None
    vendor_feedback: str | None = None
    offer_date: date | None = None
    expected_joining_date: date | None = None
    offer_status: str | None = None


class AdminReview(BaseModel):
    """Admin approves, rejects, or sends candidate to client."""
    status: CandidateStatus
    remarks: str | None = None


class ExitRequest(BaseModel):
    """Process candidate exit."""
    exit_reason: str
    last_working_day: date
    create_backfill: bool = True


class CandidateResponse(BaseModel):
    id: int
    request_id: int | None = None
    owner_id: str | None = None
    first_name: str
    last_name: str
    email: str
    phone: str | None = None
    vendor: str | None = None
    vendor_id: int | None = None
    current_company: str | None = None
    current_ctc: float | None = None
    expected_ctc: float | None = None
    current_location: str | None = None
    work_location: str | None = None
    notice_period: int | None = None
    total_experience: float | None = None
    relevant_experience: float | None = None
    skills: str | None = None
    status: str | None = None
    interview_date: date | None = None
    interview_time: time | None = None
    resume_url: str | None = None
    remarks: str | None = None
    onboarding_date: date | None = None
    client_email: str | None = None
    client_jira_id: str | None = None
    exit_reason: str | None = None
    last_working_day: date | None = None
    l1_feedback: str | None = None
    l1_score: int | None = None
    l2_feedback: str | None = None
    l2_score: int | None = None
    overlap_until: date | None = None
    screening_comment: str | None = None
    vendor_feedback: str | None = None
    offer_date: date | None = None
    expected_joining_date: date | None = None
    offer_status: str | None = None
    created_at: datetime | None = None
