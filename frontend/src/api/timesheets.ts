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

export interface AWSImportResult {
    month: string;
    total_rows: number;
    matched: number;
    unmatched_emails: string[];
    records_upserted: number;
}

export const timesheetsApi = {
    list: (filters?: { employee_id?: number; import_month?: string }) =>
        api.get<TimesheetEntry[]>('/timesheets/', filters),

    import: async (file: File, importMonth: string): Promise<ImportResult> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('import_month', importMonth);
        return api.upload<ImportResult>('/timesheets/import', formData);
    },

    importAws: async (file: File, importMonth: string): Promise<AWSImportResult> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('import_month', importMonth);
        return api.upload<AWSImportResult>('/timesheets/import-aws', formData);
    },
};
