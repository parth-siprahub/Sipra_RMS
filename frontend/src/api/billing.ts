import { api } from './client';

export interface BillingRecord {
    id: number;
    employee_id: number;
    billing_month: string;
    total_logged_hours: number;
    capped_hours: number;
    ooo_days: number;
    aws_active_hours: number | null;
    compliance_75_pct: boolean | null;
    is_billable: boolean;
    created_at: string | null;
    updated_at: string | null;
}

export interface BillingCalculationResult {
    employee_id: number;
    billing_month: string;
    total_logged_hours: number;
    capped_hours: number;
    ooo_days: number;
    is_billable: boolean;
    compliance_status: string;
}

export const billingApi = {
    list: (filters?: { employee_id?: number; billing_month?: string }) =>
        api.get<BillingRecord[]>('/billing/', filters),

    calculate: (billingMonth: string) =>
        api.post<BillingCalculationResult[]>(`/billing/calculate/${billingMonth}`, {}),
};
