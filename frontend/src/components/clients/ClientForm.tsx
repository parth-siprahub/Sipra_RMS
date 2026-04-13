import { useState, useEffect } from 'react';
import { clientsApi, type Client, type ClientCreate } from '../../api/clients';
import { Building2, Mail, Phone, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

export interface ClientFormProps {
    client?: Client;
    onSaved: () => void;
    onCancel: () => void;
}

export function ClientForm({ client, onSaved, onCancel }: ClientFormProps) {
    const [form, setForm] = useState<ClientCreate & { is_active?: boolean }>({
        client_name: '',
        client_website: '',
        contact_email: '',
        contact_phone: '',
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (client) {
            setForm({
                client_name: client.client_name,
                client_website: client.client_website || '',
                contact_email: client.contact_email || '',
                contact_phone: client.contact_phone || '',
                is_active: client.is_active !== false,
            });
        } else {
            setForm({ client_name: '', client_website: '', contact_email: '', contact_phone: '' });
        }
    }, [client]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                client_name: form.client_name,
                client_website: form.client_website || undefined,
                contact_email: form.contact_email || undefined,
                contact_phone: form.contact_phone || undefined,
                ...(client ? { is_active: form.is_active } : {}),
            };

            if (client) {
                await clientsApi.update(client.id, payload);
                toast.success('Client updated');
            } else {
                await clientsApi.create(payload);
                toast.success('Client created');
            }
            onSaved();
        } catch {
            // handled by client.ts
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="input-label" htmlFor="c-name">
                    Client Name <span className="text-danger">*</span>
                </label>
                <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                    <input
                        id="c-name"
                        className="input-field pl-10"
                        placeholder="e.g. Acme Corp"
                        required
                        value={form.client_name}
                        onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
                    />
                </div>
            </div>
            <div>
                <label className="input-label" htmlFor="c-website">
                    Website
                </label>
                <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                    <input
                        id="c-website"
                        className="input-field pl-10"
                        placeholder="https://example.com"
                        value={form.client_website || ''}
                        onChange={(e) => setForm((f) => ({ ...f, client_website: e.target.value }))}
                    />
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className="input-label" htmlFor="c-email">
                        Contact Email
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                        <input
                            id="c-email"
                            type="email"
                            className="input-field pl-10"
                            placeholder="contact@client.com"
                            value={form.contact_email || ''}
                            onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
                        />
                    </div>
                </div>
                <div>
                    <label className="input-label" htmlFor="c-phone">
                        Contact Phone
                    </label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                        <input
                            id="c-phone"
                            className="input-field pl-10"
                            placeholder="+91 98765 43210"
                            value={form.contact_phone || ''}
                            onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
                        />
                    </div>
                </div>
            </div>
            {client && (
                <div className="flex items-center gap-3 p-3 bg-surface-hover/50 rounded-lg border border-border">
                    <input
                        id="c-active"
                        type="checkbox"
                        className="w-4 h-4 accent-cta cursor-pointer"
                        checked={form.is_active !== false}
                        onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                    />
                    <label htmlFor="c-active" className="text-sm font-medium text-text cursor-pointer">
                        Active Client
                    </label>
                </div>
            )}
            <div className="flex gap-3 pt-2">
                <button type="button" onClick={onCancel} className="btn btn-secondary flex-1" disabled={submitting}>
                    Cancel
                </button>
                <button type="submit" className="btn btn-cta flex-1" disabled={submitting}>
                    {submitting ? <span className="spinner w-4 h-4" /> : client ? 'Update' : 'Add Client'}
                </button>
            </div>
        </form>
    );
}
