import { useState, useEffect } from 'react';
import { clientsApi, type Client, type ClientCreate } from '../api/clients';
import { Plus, Search, Edit2, Building2, Mail, Phone, Globe, Shield } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import { useAuth, isAdminRole } from '../context/AuthContext';

// ─── Client Modal ────────────────────────────────────────────────────────────

interface ClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    client?: Client;
}

function ClientModal({ isOpen, onClose, onSuccess, client }: ClientModalProps) {
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
            onSuccess();
            onClose();
        } catch {
            // handled by client.ts
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={client ? 'Edit Client' : 'Add Client'} maxWidth="max-w-md">
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
                            onChange={(e) => setForm(f => ({ ...f, client_name: e.target.value }))}
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
                            onChange={(e) => setForm(f => ({ ...f, client_website: e.target.value }))}
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
                                onChange={(e) => setForm(f => ({ ...f, contact_email: e.target.value }))}
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
                                onChange={(e) => setForm(f => ({ ...f, contact_phone: e.target.value }))}
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
                            onChange={(e) => setForm(f => ({ ...f, is_active: e.target.checked }))}
                        />
                        <label htmlFor="c-active" className="text-sm font-medium text-text cursor-pointer">
                            Active Client
                        </label>
                    </div>
                )}
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="btn btn-secondary flex-1" disabled={submitting}>
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-cta flex-1" disabled={submitting}>
                        {submitting ? <span className="spinner w-4 h-4" /> : client ? 'Update' : 'Add Client'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function Clients() {
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    const canManage = isAdminRole(user?.role);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | 'ALL'>('ACTIVE');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | undefined>();

    const fetchClients = async () => {
        try {
            setLoading(true);
            const data = await clientsApi.list();
            setClients(data || []);
        } catch {
            toast.error('Failed to load clients');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchClients(); }, []);

    const filteredClients = clients.filter(c => {
        const matchesSearch = c.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.contact_email || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' ||
            (statusFilter === 'ACTIVE' && c.is_active !== false) ||
            (statusFilter === 'INACTIVE' && c.is_active === false);
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-text">Client Management</h1>
                        {isSuperAdmin && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                <Shield size={10} />
                                Super Admin
                            </span>
                        )}
                    </div>
                    <p className="text-text-muted mt-1">Manage client organizations and contact information</p>
                </div>
                {canManage && (
                    <button
                        onClick={() => { setSelectedClient(undefined); setIsModalOpen(true); }}
                        className="btn btn-primary flex items-center gap-2 shadow-lg shadow-cta/20"
                    >
                        <Plus size={20} /> <span>New Client</span>
                    </button>
                )}
            </div>

            {/* Filter Bar */}
            <div className="card flex flex-col md:flex-row items-center gap-4 py-3 px-4">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input
                        type="search"
                        placeholder="Search clients..."
                        className="input-field pl-10 h-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
                    {(['ACTIVE', 'INACTIVE', 'ALL'] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={cn(
                                'px-4 py-2 text-sm font-medium transition-colors',
                                statusFilter === s
                                    ? 'bg-primary text-text-inverse'
                                    : 'bg-surface text-text-muted hover:bg-surface-hover'
                            )}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <div className="spinner w-8 h-8 border-cta"></div>
                        <p className="text-text-muted text-sm animate-pulse">Loading clients...</p>
                    </div>
                ) : filteredClients.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-surface-hover/50 border-b border-border">
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Client</th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Website</th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-center">Status</th>
                                    {canManage && (
                                        <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Actions</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredClients.map((c) => (
                                    <tr key={c.id} className="hover:bg-surface-hover/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-cta/10 text-cta rounded-lg">
                                                    <Building2 size={20} />
                                                </div>
                                                <p className="font-bold text-text">{c.client_name}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {c.client_website ? (
                                                <div className="flex items-center gap-2 text-sm text-cta">
                                                    <Globe size={14} />
                                                    <span className="truncate max-w-[200px]">{c.client_website}</span>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-text-muted">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                {c.contact_email && (
                                                    <div className="flex items-center gap-2 text-sm text-text-muted">
                                                        <Mail size={13} /> <span>{c.contact_email}</span>
                                                    </div>
                                                )}
                                                {c.contact_phone && (
                                                    <div className="flex items-center gap-2 text-sm text-text-muted">
                                                        <Phone size={13} /> <span>{c.contact_phone}</span>
                                                    </div>
                                                )}
                                                {!c.contact_email && !c.contact_phone && (
                                                    <span className="text-sm text-text-muted">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={cn(
                                                'badge text-xs',
                                                c.is_active !== false ? 'badge-success' : 'badge-neutral'
                                            )}>
                                                {c.is_active !== false ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        {canManage && (
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => { setSelectedClient(c); setIsModalOpen(true); }}
                                                    className="p-2 hover:bg-surface-hover rounded-lg transition-colors text-text-muted hover:text-cta"
                                                    title="Edit Client"
                                                    aria-label="Edit Client"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <EmptyState
                        message={searchQuery ? 'No clients match your search' : 'Add your first client'}
                        action={
                            canManage ? (
                                <button
                                    onClick={searchQuery ? () => setSearchQuery('') : () => { setSelectedClient(undefined); setIsModalOpen(true); }}
                                    className="btn btn-secondary btn-sm"
                                >
                                    {searchQuery ? 'Clear Search' : 'New Client'}
                                </button>
                            ) : undefined
                        }
                    />
                )}
            </div>

            {/* Row count */}
            {!loading && filteredClients.length > 0 && (
                <p className="text-xs text-text-muted text-right">
                    {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''}
                </p>
            )}

            {isModalOpen && (
                <ClientModal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setSelectedClient(undefined); }}
                    onSuccess={fetchClients}
                    client={selectedClient}
                />
            )}
        </div>
    );
}
