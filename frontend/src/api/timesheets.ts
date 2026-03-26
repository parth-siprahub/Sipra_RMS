import { api } from './client';

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
    list: (filters?: { employee_id?: number; import_month?: string; page_size?: number }) =>
        api.get<TimesheetEntry[]>('/timesheets/', { page_size: 2000, ...filters }),

    import: async (file: File, importMonth: string): Promise<ImportResult> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('import_month', importMonth);
        return api.upload<ImportResult>('/timesheets/import', formData);
    },

    listAws: (filters?: { employee_id?: number; week_start?: string; page_size?: number }) =>
        api.get<AwsTimesheetEntry[]>('/timesheets/aws', { page_size: 200, ...filters }),

    importAws: async (file: File, weekStart: string, weekEnd: string): Promise<AwsImportResult> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('week_start', weekStart);
        formData.append('week_end', weekEnd);
        return api.upload<AwsImportResult>('/timesheets/aws/import', formData);
    },

    linkAwsToEmployee: (logId: number, employeeId: number) =>
        api.patch<AwsTimesheetEntry>(`/timesheets/aws/${logId}/link?employee_id=${employeeId}`, {}),
};
