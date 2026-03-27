import { api } from './client';

export interface TimesheetComparison {
    employee_id: number;
    rms_name: string;
    jira_username: string | null;
    aws_email: string | null;
    jira_total_hours: number;
    jira_capped_hours: number;
    jira_ooo_days: number;
    jira_billable_hours: number;
    aws_total_hours: number | null;
    difference: number | null;
    difference_pct: number | null;
    flag: 'green' | 'red' | 'no_aws';
}

export interface ComparisonReport {
    month: string;
    total_employees: number;
    employees_with_jira: number;
    employees_with_aws: number;
    comparisons: TimesheetComparison[];
}

export interface ComplianceEntry {
    employee_id: number;
    rms_name: string;
    jira_username: string | null;
    status: 'complete' | 'partial' | 'missing';
    days_logged: number;
    total_hours: number;
}

export interface ComplianceReport {
    month: string;
    total_active: number;
    complete: number;
    partial: number;
    missing: number;
    entries: ComplianceEntry[];
}

export const reportsApi = {
    getComparison: (month: string) =>
        api.get<ComparisonReport>('/reports/timesheet-comparison', { month }),

    getCompliance: (month: string) =>
        api.get<ComplianceReport>('/reports/compliance', { month }),

    exportComparison: (month: string) => {
        // Direct download — open in new tab
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const token = localStorage.getItem('rms_access_token');
        window.open(
            `${baseUrl}/reports/timesheet-comparison/export?month=${month}`,
            '_blank'
        );
    },
};
