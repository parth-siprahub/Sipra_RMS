import { api } from './client';

// ── Legacy Jira types (timesheet_logs) ──────────────────────────────────────
export interface TimesheetEntry {
    id: number;
    employee_id: number;
    log_date: string;
    hours_logged: number;
    is_ooo: boolean;
    import_month: string;
    created_at: string | null;
}

export interface ImportResult {
    month: string;
    total_rows_processed: number;
    employees_matched: number;
    employees_unmatched: string[];
    entries_upserted: number;
}

// ── Jira Raw types (jira_timesheet_raw — mirrors Excel) ─────────────────────
export interface JiraRawEntry {
    id: number;
    employee_id: number | null;
    billing_month: string;
    team: string | null;
    jira_user: string;
    issue: string | null;
    jira_key: string | null;
    logged: number | null;
    day_01: number | null; day_02: number | null; day_03: number | null;
    day_04: number | null; day_05: number | null; day_06: number | null;
    day_07: number | null; day_08: number | null; day_09: number | null;
    day_10: number | null; day_11: number | null; day_12: number | null;
    day_13: number | null; day_14: number | null; day_15: number | null;
    day_16: number | null; day_17: number | null; day_18: number | null;
    day_19: number | null; day_20: number | null; day_21: number | null;
    day_22: number | null; day_23: number | null; day_24: number | null;
    day_25: number | null; day_26: number | null; day_27: number | null;
    day_28: number | null; day_29: number | null; day_30: number | null;
    day_31: number | null;
    is_summary_row: boolean;
    is_ooo: boolean;
    created_at: string | null;
}

export interface UnmatchedSuggestion {
    employee_id: number;
    rms_name: string;
    score: number;
    match_type: string;
}

export interface UnmatchedDetail {
    source_name: string;
    source_type: 'JIRA' | 'AWS';
    suggestions: UnmatchedSuggestion[];
}

export interface JiraRawImportResult {
    month: string;
    total_rows_processed: number;
    employees_matched: number;
    employees_unmatched: string[];
    entries_inserted: number;
    unmatched_details?: UnmatchedDetail[];
}

// ── AWS v2 types (aws_timesheet_logs_v2 — mirrors CSV) ──────────────────────
export interface AwsTimesheetV2Entry {
    id: number;
    employee_id: number | null;
    aws_email: string;
    billing_month: string;
    client_name: string | null;
    work_time_hms: string | null;
    productive_hms: string | null;
    unproductive_hms: string | null;
    undefined_hms: string | null;
    active_hms: string | null;
    passive_hms: string | null;
    screen_time_hms: string | null;
    offline_meetings_hms: string | null;
    work_time_secs: number;
    productive_secs: number;
    unproductive_secs: number;
    undefined_secs: number;
    active_secs: number;
    passive_secs: number;
    screen_time_secs: number;
    offline_meetings_secs: number;
    prod_active_hms: string | null;
    prod_passive_hms: string | null;
    unprod_active_hms: string | null;
    unprod_passive_hms: string | null;
    undefined_active_hms: string | null;
    undefined_passive_hms: string | null;
    prod_active_secs: number;
    prod_passive_secs: number;
    unprod_active_secs: number;
    unprod_passive_secs: number;
    undefined_active_secs: number;
    undefined_passive_secs: number;
    created_at: string | null;
}

export interface AwsImportV2Result {
    month: string;
    total_rows: number;
    employees_matched: number;
    employees_unmatched: number;
    entries_inserted: number;
    unmatched_emails: string[];
    unmatched_details?: UnmatchedDetail[];
}

// ── Legacy AWS types (kept for backward compat) ─────────────────────────────
export interface AwsTimesheetEntry {
    id: number;
    employee_id: number | null;
    aws_email: string;
    week_start: string;
    week_end: string;
    work_time_secs: number;
    productive_secs: number;
    unproductive_secs: number;
    active_secs: number;
    passive_secs: number;
    screen_time_secs: number;
    work_time_hours: number;
    is_below_threshold: boolean;
    created_at: string | null;
}

export interface AwsImportResult {
    week_start: string;
    week_end: string;
    total_rows: number;
    employees_matched: number;
    employees_unmatched: number;
    entries_inserted: number;
    skipped_existing: number;
    unmatched_emails: string[];
}

export const timesheetsApi = {
    // ── Legacy Jira endpoints ───────────────────────────────────────────────
    list: (filters?: { employee_id?: number; import_month?: string; page_size?: number }) =>
        api.get<TimesheetEntry[]>('/timesheets/', { page_size: 2000, ...filters }),

    import: async (file: File, importMonth: string): Promise<ImportResult> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('import_month', importMonth);
        return api.upload<ImportResult>('/timesheets/import', formData);
    },

    // ── Jira Raw endpoints (mirrors Excel) ──────────────────────────────────
    listJiraRaw: (month: string) =>
        api.get<JiraRawEntry[]>('/timesheets/jira-raw', { billing_month: month, page_size: 5000 }),

    importJiraRaw: async (file: File, importMonth: string): Promise<JiraRawImportResult> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('import_month', importMonth);
        return api.upload<JiraRawImportResult>('/timesheets/jira-raw/import', formData);
    },

    // ── AWS v2 endpoints (mirrors CSV, monthly) ─────────────────────────────
    listAwsV2: (month: string) =>
        api.get<AwsTimesheetV2Entry[]>('/timesheets/aws', { billing_month: month, page_size: 500 }),

    importAwsV2: async (file: File, importMonth: string): Promise<AwsImportV2Result> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('import_month', importMonth);
        return api.upload<AwsImportV2Result>('/timesheets/aws/import', formData);
    },

    linkAwsToEmployee: (logId: number, employeeId: number) =>
        api.patch<AwsTimesheetV2Entry>(`/timesheets/aws/${logId}/link?employee_id=${employeeId}`, {}),

    // ── Unmatched records management ──────────────────────────────────────────
    getUnmatched: (billingMonth: string, sourceType: 'JIRA' | 'AWS') =>
        api.get<{ unmatched: UnmatchedDetail[] }>('/timesheets/unmatched', {
            billing_month: billingMonth,
            source_type: sourceType,
        }),

    getUnmatchedCount: (billingMonth: string) =>
        api.get<{ jira: number; aws: number; total: number }>('/timesheets/unmatched-count', {
            billing_month: billingMonth,
        }),

    linkBulk: (sourceType: 'JIRA' | 'AWS', sourceIdentifier: string, employeeId: number, billingMonth: string) =>
        api.post<{ updated_count: number; mapping_created: boolean }>(
            '/timesheets/link-bulk',
            {
                source_type: sourceType,
                source_identifier: sourceIdentifier,
                employee_id: employeeId,
                billing_month: billingMonth,
            },
        ),

    // ── Legacy AWS endpoints (kept for backward compat) ─────────────────────
    listAws: (filters?: { employee_id?: number; week_start?: string; page_size?: number }) =>
        api.get<AwsTimesheetEntry[]>('/timesheets/aws', { page_size: 200, ...filters }),

    importAws: async (file: File, weekStart: string, weekEnd: string): Promise<AwsImportResult> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('week_start', weekStart);
        formData.append('week_end', weekEnd);
        return api.upload<AwsImportResult>('/timesheets/aws/import', formData);
    },
};
