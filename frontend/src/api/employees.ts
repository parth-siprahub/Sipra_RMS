import { api } from './client';

export interface Employee {
    id: number;
    candidate_id: number | null;
    rms_name: string;
    client_name: string | null;
    aws_email: string | null;
    siprahub_email: string | null;
    github_id: string | null;
    jira_username: string | null;
    start_date: string | null;
    exit_date: string | null;
    status: 'ACTIVE' | 'EXITED' | 'TERMINATED' | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface EmployeeCreate {
    candidate_id: number;
    rms_name: string;
    client_name?: string;
    aws_email?: string;
    github_id?: string;
    jira_username?: string;
    start_date?: string;
}

export interface EmployeeUpdate {
    rms_name?: string;
    client_name?: string;
    aws_email?: string;
    siprahub_email?: string;
    github_id?: string;
    jira_username?: string;
    start_date?: string;
    exit_date?: string;
    status?: 'ACTIVE' | 'EXITED' | 'TERMINATED';
}

export const employeesApi = {
    list: (filters?: { employee_status?: string; page_size?: number }) =>
        api.get<Employee[]>('/employees/', filters),

    get: (id: number) =>
        api.get<Employee>(`/employees/${id}/`),

    create: (payload: EmployeeCreate) =>
        api.post<Employee>('/employees/', payload),

    createFromCandidate: (candidateId: number) =>
        api.post<Employee>(`/employees/from-candidate/${candidateId}`, {}),

    update: (id: number, payload: EmployeeUpdate) =>
        api.patch<Employee>(`/employees/${id}/`, payload),
};
