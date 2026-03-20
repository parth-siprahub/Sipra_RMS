import { api } from './client';

export interface Client {
    id: number;
    client_name: string;
    client_website: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    is_active: boolean | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface ClientCreate {
    client_name: string;
    client_website?: string;
    contact_email?: string;
    contact_phone?: string;
}

export interface ClientUpdate {
    client_name?: string;
    client_website?: string;
    contact_email?: string;
    contact_phone?: string;
    is_active?: boolean;
}

export const clientsApi = {
    list: () => api.get<Client[]>('/clients/'),
    get: (id: number) => api.get<Client>(`/clients/${id}`),
    create: (data: ClientCreate) => api.post<Client>('/clients/', data),
    update: (id: number, data: ClientUpdate) => api.patch<Client>(`/clients/${id}`, data),
};
