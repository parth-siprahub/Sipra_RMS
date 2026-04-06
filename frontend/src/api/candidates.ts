import { api } from './client';

export type CandidateStatus =
    | 'NEW'
    | 'SCREENING'
    | 'SUBMITTED_TO_ADMIN'
    | 'WITH_ADMIN'
    | 'REJECTED_BY_ADMIN'
    | 'WITH_CLIENT'
    | 'L1_SCHEDULED'
    | 'L1_COMPLETED'
    | 'L1_SHORTLIST'
    | 'L1_REJECT'
    | 'INTERVIEW_SCHEDULED'
    | 'SELECTED'
    | 'ONBOARDED'
    | 'REJECTED_BY_CLIENT'
    | 'ON_HOLD'
    | 'SCREEN_REJECT'
    | 'INTERVIEW_BACK_OUT'
    | 'OFFER_BACK_OUT'
    | 'EXIT';

export interface Candidate {
    id: number;
    request_id: number | null;
    owner_id: string | null;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    source: string | null;
    vendor: string | null;
    vendor_id: number | null;
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
    l1_feedback: string | null;
    l1_score: number | null;
    l2_feedback: string | null;
    l2_score: number | null;
    l1_feedback_file_url: string | null;
    l2_feedback_file_url: string | null;
    overlap_until: string | null;
    created_at: string | null;
}

export type CandidateSource = 'PORTAL' | 'JOB_BOARDS' | 'NETWORK' | 'VENDORS' | 'LINKEDIN' | 'INTERNAL';

export interface CreateCandidatePayload {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    source?: CandidateSource;
    vendor?: string;
    vendor_id?: number;
    current_company?: string;
    total_experience?: number;
    relevant_experience?: number;
    skills?: string;
    current_location?: string;
    notice_period?: number;
    request_id?: number;
    l1_feedback_file_url?: string;
    l2_feedback_file_url?: string;
}

export const candidatesApi = {
    list: (filters?: { status?: string; request_id?: number; page_size?: number; search?: string }) =>
        api.get<Candidate[]>('/candidates/', filters),

    create: (payload: CreateCandidatePayload) =>
        api.post<Candidate>('/candidates/', payload),

    review: (id: number, status: CandidateStatus, remarks?: string) =>
        api.patch<Candidate>(`/candidates/${id}/review`, { status, remarks }),

    uploadResume: (id: number, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.upload<{ message: string; resume_url: string; candidate_id: number }>(
            `/candidates/${id}/resume`,
            formData
        );
    },
    update: (id: number, payload: Partial<Candidate>) =>
        api.patch<Candidate>(`/candidates/${id}/`, payload),
};
