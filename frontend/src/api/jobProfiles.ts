import { api } from './client';

export interface JobProfile {
    id: number;
    role_name: string;
    technology: string;
    experience_level: string | null;
    job_description: string | null;
    jd_file_url: string | null;
    created_at?: string;
}

export interface JobProfileCreate {
    role_name: string;
    technology: string;
    experience_level?: string;
    job_description?: string;
    jd_file_url?: string;
}

export interface JobProfileUpdate {
    role_name?: string;
    technology?: string;
    experience_level?: string;
    job_description?: string;
    jd_file_url?: string;
}

export const jobProfileApi = {
    list: () => api.get<JobProfile[]>('/job-profiles/'),
    get: (id: number) => api.get<JobProfile>(`/job-profiles/${id}/`),
    create: (data: JobProfileCreate) => api.post<JobProfile>('/job-profiles/', data),
    update: (id: number, data: JobProfileUpdate) => api.put<JobProfile>(`/job-profiles/${id}/`, data),
    delete: (id: number) => api.delete<void>(`/job-profiles/${id}/`),
};
