import { api } from './client';

export type CandidateStatus =
    | 'NEW'
    | 'SUBMITTED_TO_ADMIN'
    | 'WITH_ADMIN'
    | 'REJECTED_BY_ADMIN'
    | 'WITH_CLIENT'
    | 'INTERVIEW_SCHEDULED'
    | 'SELECTED'
    | 'ONBOARDED'
    | 'REJECTED_BY_CLIENT'
    | 'ON_HOLD'
    | 'EXIT';

export type CandidateVendor = 'WRS' | 'GFM' | 'INTERNAL';

export interface Candidate {
    id: number;
    request_id: number | null;
    owner_id: string | null;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    vendor: CandidateVendor | null;
    current_company: string | null;
    current_ctc: number | null;
    expected_ctc: number | null;
    current_location: string | null;
    work_location: string | null;
    notice_period: number | null;
    total_experience: number | null;
    relevant_experience: number | null;
    skills: string | null;
    status: CandidateStatus | null;
    interview_date: string | null;
    interview_time: string | null;
    resume_url: string | null;
    remarks: string | null;
    onboarding_date: string | null;
    client_email: string | null;
    client_jira_id: string | null;
    exit_reason: string | null;
    last_working_day: string | null;
    created_at: string | null;
}

export interface CreateCandidatePayload {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    vendor: CandidateVendor;
    current_company?: string;
    total_experience?: number;
    relevant_experience?: number;
    skills?: string;
    current_location?: string;
    notice_period?: number;
    request_id?: number;
}

export const candidatesApi = {
    list: (filters?: { status?: string; request_id?: number }) =>
        api.get<Candidate[]>('/candidates', filters),

    create: (payload: CreateCandidatePayload) =>
        api.post<Candidate>('/candidates', payload),

    review: (id: number, status: CandidateStatus, remarks?: string) =>
        api.patch<Candidate>(`/candidates/${id}/review`, { status, remarks }),
};
