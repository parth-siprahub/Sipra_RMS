import { useState, useEffect } from 'react';
import { vendorsApi, type Vendor, type CreateVendorPayload } from '../api/vendors';
import { Plus, Search, Edit2, Building2, Mail, Phone, User } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

// ─── Vendor Modal ─────────────────────────────────────────────────────────────

interface VendorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    vendor?: Vendor;
}

function VendorModal({ isOpen, onClose, onSuccess, vendor }: VendorModalProps) {
    const [form, setForm] = useState<CreateVendorPayload>({
        name: '',
        contact_person: '',
        contact_email: '',
        contact_phone: '',
        is_active: true,
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (vendor) {
            setForm({
                name: vendor.name,
                contact_person: vendor.contact_person || '',
                contact_email: vendor.contact_email || '',
                contact_phone: vendor.contact_phone || '',
                is_active: vendor.is_active,
            });
        } else {
            setForm({ name: '', contact_person: '', contact_email: '', contact_phone: '', is_active: true });
        }
    }, [vendor]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (vendor) {
                await vendorsApi.update(vendor.id, form);
                toast.success('Vendor updated');
            } else {
                await vendorsApi.create(form);
                toast.success('Vendor created');
            }
            onSuccess();
            onClose();
        } catch {
            // handled by client
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={vendor ? 'Edit Vendor' : 'Add Vendor'} maxWidth="max-w-md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="input-label" htmlFor="v-name">
                        Vendor Name <span className="text-danger">*</span>
                    </label>
                    <input
                        id="v-name"
                        className="input-field"
                        placeholder="e.g. WRS Global"
                        required
                        value={form.name}
                        onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    />
                </div>
                <div>
                    <label className="input-label" htmlFor="v-contact">Contact Person</label>
                    <input
                        id="v-contact"
                        className="input-field"
                        placeholder="John Doe"
                        value={form.contact_person || ''}
                        onChange={(e) => setForm(f => ({ ...f, contact_person: e.target.value || undefined }))}
                    />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="input-label" htmlFor="v-email">Email</label>
                        <input
                            id="v-email"
                            type="email"
                            className="input-field"
                            placeholder="vendor@example.com"
                            value={form.contact_email || ''}
                            onChange={(e) => setForm(f => ({ ...f, contact_email: e.target.value || undefined }))}
                        />
                    </div>
                    <div>
                        <label className="input-label" htmlFor="v-phone">Phone</label>
                        <input
                            id="v-phone"
                            className="input-field"
                            placeholder="+91 98765 43210"
                            value={form.contact_phone || ''}
                            onChange={(e) => setForm(f => ({ ...f, contact_phone: e.target.value || undefined }))}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        id="v-active"
                        type="checkbox"
                        className="w-4 h-4 accent-cta"
                        checked={form.is_active}
                        onChange={(e) => setForm(f => ({ ...f, is_active: e.target.checked }))}
                    />
                    <label htmlFor="v-active" className="text-sm text-text">Active Vendor</label>
                </div>
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="btn btn-secondary flex-1" disabled={submitting}>
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-cta flex-1" disabled={submitting}>
                        {submitting ? <span className="spinner w-4 h-4" /> : vendor ? 'Update' : 'Add Vendor'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function Vendors() {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | 'ALL'>('ACTIVE');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState<Vendor | undefined>();

    const fetchVendors = async () => {
        try {
            setLoading(true);
            const data = await vendorsApi.list();
            setVendors(data || []);
        } catch {
            toast.error('Failed to load vendors');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchVendors(); }, []);

    const filteredVendors = vendors.filter(v => {
        const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (v.contact_person || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' ||
            (statusFilter === 'ACTIVE' && v.is_active) ||
            (statusFilter === 'INACTIVE' && !v.is_active);
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text">Vendor Management</h1>
                    <p className="text-text-muted mt-1">Manage staffing vendors and their contact information</p>
                </div>
                <button
                    onClick={() => { setSelectedVendor(undefined); setIsModalOpen(true); }}
                    className="btn btn-primary flex items-center gap-2 shadow-lg shadow-cta/20"
                >
                    <Plus size={20} /> <span>New Vendor</span>
                </button>
            </div>

            {/* Filter Bar */}
            <div className="card flex flex-col md:flex-row items-center gap-4 py-3 px-4">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input
                        type="search"
                        placeholder="Search vendors..."
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
                        <p className="text-text-muted text-sm animate-pulse">Loading vendors...</p>
                    </div>
                ) : filteredVendors.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-surface-hover/50 border-b border-border">
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Vendor</th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Email / Phone</th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-center">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredVendors.map((v) => (
                                    <tr key={v.id} className="hover:bg-surface-hover/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-cta/10 text-cta rounded-lg">
                                                    <Building2 size={20} />
                                                </div>
                                                <p className="font-bold text-text">{v.name}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-text-muted">
                                                <User size={14} />
                                                <span>{v.contact_person || '—'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                {v.contact_email && (
                                                    <div className="flex items-center gap-2 text-sm text-text-muted">
                                                        <Mail size={13} /> <span>{v.contact_email}</span>
                                                    </div>
                                                )}
                                                {v.contact_phone && (
                                                    <div className="flex items-center gap-2 text-sm text-text-muted">
                                                        <Phone size={13} /> <span>{v.contact_phone}</span>
                                                    </div>
                                                )}
                                                {!v.contact_email && !v.contact_phone && (
                                                    <span className="text-sm text-text-muted">—</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={cn(
                                                'badge text-xs',
                                                v.is_active ? 'badge-success' : 'badge-neutral'
                                            )}>
                                                {v.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => { setSelectedVendor(v); setIsModalOpen(true); }}
                                                className="p-2 hover:bg-surface-hover rounded-lg transition-colors text-text-muted hover:text-cta"
                                                title="Edit Vendor"
                                                aria-label="Edit Vendor"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <EmptyState
                        message={searchQuery ? 'No vendors match your search' : 'Add your first vendor'}
                        action={
                            <button
                                onClick={searchQuery ? () => setSearchQuery('') : () => { setSelectedVendor(undefined); setIsModalOpen(true); }}
                                className="btn btn-secondary btn-sm"
                            >
                                {searchQuery ? 'Clear Search' : 'New Vendor'}
                            </button>
                        }
                    />
                )}
            </div>

            {isModalOpen && (
                <VendorModal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setSelectedVendor(undefined); }}
                    onSuccess={fetchVendors}
                    vendor={selectedVendor}
                />
            )}
        </div>
    );
}
