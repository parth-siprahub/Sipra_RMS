import { api } from './client';

export type LogType = 'EMAIL' | 'CALL' | 'MEETING' | 'NOTE';

export interface CommunicationLog {
    id: number;
    request_id: number | null;
    candidate_id: number | null;
    logged_by_id: string | null;
    log_type: LogType;
    message: string;
    external_contact_name: string | null;
    log_date: string | null;
    created_at: string;
}

export interface CommunicationLogCreate {
    request_id?: number;
    candidate_id?: number;
    log_type: LogType;
    message: string;
    external_contact_name?: string;
    log_date?: string;
}

export const communicationLogApi = {
    list: (params?: { request_id?: number; candidate_id?: number }) =>
        api.get<CommunicationLog[]>('/logs', params),
    create: (data: CommunicationLogCreate) =>
        api.post<CommunicationLog>('/logs', data),
};
