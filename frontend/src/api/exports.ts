import { api } from './client';

/**
 * Export candidates as CSV download.
 * Optionally filter by status.
 */
export function exportCandidates(status?: string): Promise<void> {
    const endpoint = status
        ? `/exports/candidates?status=${encodeURIComponent(status)}`
        : '/exports/candidates';
    const filename = status
        ? `candidates_${status}_export.csv`
        : 'candidates_export.csv';
    return api.download(endpoint, filename);
}

/**
 * Export employees as CSV download.
 */
export function exportEmployees(): Promise<void> {
    return api.download('/exports/employees', 'employees_export.csv');
}

/**
 * Export timesheets for a given month as CSV download.
 * @param month - YYYY-MM format (e.g. "2026-03")
 */
export function exportTimesheets(month: string): Promise<void> {
    const endpoint = `/exports/timesheets?month=${encodeURIComponent(month)}`;
    return api.download(endpoint, `timesheets_${month}_export.csv`);
}
