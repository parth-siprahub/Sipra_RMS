import { api } from './client';

export interface SOW {
    id: number;
    sow_number: string;
    client_name: string;
    start_date: string | null;
    target_date: string | null;
    submitted_date: string | null;
    max_resources: number | null;
    is_active?: boolean;
    created_at?: string;
}

export interface SowCreate {
    sow_number: string;
    client_name: string;
    start_date?: string;
    target_date?: string;
    submitted_date?: string;
    max_resources?: number;
}

export interface SowUpdate {
    sow_number?: string;
    client_name?: string;
    start_date?: string;
    target_date?: string;
    submitted_date?: string;
    max_resources?: number;
    is_active?: boolean;
}

export const sowApi = {
    list: () => api.get<SOW[]>('/sows/'),
    get: (id: number) => api.get<SOW>(`/sows/${id}/`),
    create: (data: SowCreate) => api.post<SOW>('/sows/', data),
    update: (id: number, data: SowUpdate) => api.patch<SOW>(`/sows/${id}/`, data),
};
