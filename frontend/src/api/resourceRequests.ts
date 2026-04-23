import { api } from './client';

export type RequestStatus = 'OPEN' | 'CLOSED' | 'HOLD' | 'CANCELLED';
export type RequestPriority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
export type RequestSource = 'PORTAL' | 'JOB_BOARDS' | 'NETWORK' | 'VENDORS';

export interface ResourceRequest {
    id: number;
    request_display_id: string;
    job_profile_id: number | null;
    sow_id: number | null;
    priority: RequestPriority | null;
    status: RequestStatus | null;
    source: RequestSource | null;
    is_backfill: boolean | null;
    replacement_for_candidate_id: number | null;
    created_by_id: string | null;
    created_at: string | null;
    notes: string | null;
}

export interface CreateResourceRequestPayload {
    priority: RequestPriority;
    source?: RequestSource;
    is_backfill?: boolean;
    job_profile_id?: number;
    sow_id?: number;
    notes?: string;
}

export const resourceRequestsApi = {
    list: (filters?: { status?: string; priority?: string; search?: string }) =>
        api.get<ResourceRequest[]>('/requests/', filters),

    get: (id: number) => api.get<ResourceRequest>(`/requests/${id}`),

    create: (payload: CreateResourceRequestPayload) =>
        api.post<ResourceRequest>('/requests/', payload),

    update: (id: number, data: Partial<CreateResourceRequestPayload>) =>
        api.patch<ResourceRequest>(`/requests/${id}`, data),

    updateStatus: (id: number, status: RequestStatus) =>
        api.patch<ResourceRequest>(`/requests/${id}/status/`, { status }),
};
