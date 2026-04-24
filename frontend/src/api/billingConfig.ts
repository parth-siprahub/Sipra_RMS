import { api } from './client';

export interface BillingConfig {
    id: number;
    client_name: string;
    billing_month: string;
    billable_hours: number;
    working_days: number;
    created_at: string | null;
    updated_at: string | null;
    // Freeze fields
    is_frozen: boolean;
    frozen_by: string | null;
    frozen_at: string | null;
    last_unfrozen_by: string | null;
    last_unfrozen_at: string | null;
}

export interface BillingConfigCreate {
    client_name?: string;
    billing_month: string;
    billable_hours: number;
    working_days: number;
}

export interface BillingConfigFreezeResponse {
    id: number;
    billing_month: string;
    is_frozen: boolean;
    frozen_by: string | null;
    frozen_at: string | null;
    last_unfrozen_by: string | null;
    last_unfrozen_at: string | null;
    message: string;
}

export const billingConfigApi = {
    list: (month?: string, clientName?: string) =>
        api.get<BillingConfig[]>('/billing-config/', {
            ...(month && { month }),
            ...(clientName && { client_name: clientName }),
        }),

    get: (id: number) =>
        api.get<BillingConfig>(`/billing-config/${id}`),

    upsert: (data: BillingConfigCreate) =>
        api.post<BillingConfig>('/billing-config/', data),

    delete: (id: number) =>
        api.delete(`/billing-config/${id}`),

    freeze: (billingMonth: string) =>
        api.post<BillingConfigFreezeResponse>(`/billing-config/${billingMonth}/freeze`, {}),

    unfreeze: (billingMonth: string) =>
        api.post<BillingConfigFreezeResponse>(`/billing-config/${billingMonth}/unfreeze`, {}),
};
