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
    flag: 'green' | 'amber' | 'red' | 'no_aws';
    source: string | null;
    job_role?: string | null;
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

export interface ComputedReport {
    id: number;
    employee_id: number;
    billing_month: string;
    jira_hours: number;
    ooo_days: number;
    aws_hours: number | null;
    billable_hours: number | null;
    difference: number | null;
    difference_pct: number | null;
    flag: 'green' | 'amber' | 'red' | 'no_aws';
    computed_at: string | null;
    // Joined fields
    rms_name?: string;
    jira_username?: string | null;
    aws_email?: string | null;
    source?: string | null;
    job_role?: string | null;
}

export interface CalculateResult {
    month: string;
    total_computed: number;
    reports: ComputedReport[];
}

export interface EmployeeDetail {
    summary: ComputedReport;
    aws_data: Record<string, unknown> | null;
    jira_entries: Record<string, unknown>[];
}

export interface MonthTarget {
    month: string;
    working_days: number;
    target_hours: number;
}

export const reportsApi = {
    getMonthTarget: (month: string) =>
        api.get<MonthTarget>('/reports/month-target', { month }),

    getComparison: (month: string) =>
        api.get<ComparisonReport>('/reports/timesheet-comparison', { month }),

    getCompliance: (month: string) =>
        api.get<ComplianceReport>('/reports/compliance', { month }),

    exportComparison: (month: string) =>
        api.download(`/reports/timesheet-comparison/export?month=${month}`, `comparison_${month}.csv`),

    /** Finance hand-off: leaves taken per employee for the month.
     *  Per the May 4 directive, RMS does not compute payout/LOP — Finance handles policy. */
    exportLeavesTaken: (month: string) =>
        api.download(`/exports/leaves-taken?month=${month}`, `leaves_taken_${month}.csv`),

    calculateBilling: (month: string) =>
        api.post<CalculateResult>(`/reports/calculate/${month}`, {}),

    getComputedReports: (month: string) =>
        api.get<ComputedReport[]>('/reports/computed', { month }),

    getEmployeeDetail: (employeeId: number, month: string) =>
        api.get<EmployeeDetail>(`/reports/employee-detail/${employeeId}`, { month }),
};
