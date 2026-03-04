import { api } from './client';

export interface Vendor {
    id: number;
    name: string;
    contact_person: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    is_active: boolean;
    created_at: string | null;
}

export interface CreateVendorPayload {
    name: string;
    contact_person?: string;
    contact_email?: string;
    contact_phone?: string;
    is_active?: boolean;
}

export const vendorsApi = {
    list: (activeOnly = false) =>
        api.get<Vendor[]>('/vendors', activeOnly ? { active_only: '1' } : undefined),

    create: (payload: CreateVendorPayload) =>
        api.post<Vendor>('/vendors', payload),

    get: (id: number) =>
        api.get<Vendor>(`/vendors/${id}`),

    update: (id: number, payload: Partial<CreateVendorPayload>) =>
        api.patch<Vendor>(`/vendors/${id}`, payload),
};
