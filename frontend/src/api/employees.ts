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
    /** Final billing date — last day billed to the client */
    client_offboarding_date: string | null;
    /** Final salary date — last day on Siprahub payroll */
    siprahub_offboarding_date: string | null;
    status: 'ACTIVE' | 'EXITED' | 'TERMINATED' | null;
    created_at: string | null;
    updated_at: string | null;
    job_profile_name: string | null;
    source: string | null;       // payroll type: internal / vendor / contractor
    sow_number: string | null;   // from resource_request → sow
}

export interface EmployeeCreate {
    candidate_id: number;
    rms_name: string;
    client_name?: string;
    aws_email?: string;
    siprahub_email?: string;
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
    exit_date?: string | null;
    /** Final billing date — last day billed to the client */
    client_offboarding_date?: string | null;
    /** Final salary date — last day on Siprahub payroll */
    siprahub_offboarding_date?: string | null;
    status?: 'ACTIVE' | 'EXITED' | 'TERMINATED';
}

export interface UserProfile {
    id: string;
    full_name: string | null;
    email: string | null;
    role: string | null;
    employee_id: number | null;
}

export const employeesApi = {
    list: (filters?: { employee_status?: string; page_size?: number; search?: string; exclude_system?: string }) =>
        api.get<Employee[]>('/employees/', filters),

    get: (id: number) =>
        api.get<Employee>(`/employees/${id}/`),

    create: (payload: EmployeeCreate) =>
        api.post<Employee>('/employees/', payload),

    createFromCandidate: (candidateId: number) =>
        api.post<Employee>(`/employees/from-candidate/${candidateId}`, {}),

    update: (id: number, payload: EmployeeUpdate) =>
        api.patch<Employee>(`/employees/${id}/`, payload),

    listProfiles: (filters?: { search?: string; exclude_linked?: boolean }) =>
        api.get<UserProfile[]>('/employees/profiles/list', filters),

    linkProfile: (employeeId: number, profileId: string) =>
        api.post(`/employees/${employeeId}/link-profile?profile_id=${encodeURIComponent(profileId)}`, {}),

    unlinkProfile: (employeeId: number) =>
        api.delete(`/employees/${employeeId}/link-profile`),
};
