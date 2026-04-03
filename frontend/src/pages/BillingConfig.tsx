import { useState, useEffect, useCallback } from 'react';
import { billingConfigApi, type BillingConfig, type BillingConfigCreate } from '../api/billingConfig';
import { Plus, Trash2, Settings2, Info, Calendar } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTHORIZED_EMAILS = new Set([
    'jaicind@siprahub.com',
    'rajapv@siprahub.com',
    'senthil.natarajan@siprahub.com',
    'sreenath.reddy@siprahub.com',
    'prasanna@siprahub.com',
]);

const DEFAULT_CLIENT = 'DCLI';

/** Generate month options from Jan 2025 to 3 months ahead of today */
function getMonthOptions(): { value: string; label: string }[] {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    const endYear = now.getFullYear();
    const endMonth = now.getMonth() + 4; // 3 months ahead
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let y = 2025; y <= endYear + 1; y++) {
        for (let m = 1; m <= 12; m++) {
            if (y === 2025 && m < 1) continue;
            if (y === endYear && m > endMonth) break;
            if (y > endYear) break;
            const value = `${y}-${String(m).padStart(2, '0')}`;
            options.push({ value, label: `${months[m - 1]} ${y}` });
        }
    }
    return options.reverse(); // newest first
}

const MONTH_OPTIONS = getMonthOptions();

function formatMonth(value: string): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const [year, month] = value.split('-');
    const idx = parseInt(month, 10) - 1;
    return `${months[idx] ?? month} ${year}`;
}

// ─── Billing Config Modal ─────────────────────────────────────────────────────

interface BillingConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    config?: BillingConfig;
}

function BillingConfigModal({ isOpen, onClose, onSuccess, config }: BillingConfigModalProps) {
    const [form, setForm] = useState<BillingConfigCreate>({
        client_name: DEFAULT_CLIENT,
        billing_month: MONTH_OPTIONS[0]?.value ?? '',
        billable_hours: 0,
        working_days: 0,
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (config) {
            setForm({
                client_name: config.client_name,
                billing_month: config.billing_month,
                billable_hours: config.billable_hours,
                working_days: config.working_days,
            });
        } else {
            setForm({
                client_name: DEFAULT_CLIENT,
                billing_month: MONTH_OPTIONS[0]?.value ?? '',
                billable_hours: 0,
                working_days: 0,
            });
        }
    }, [config, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.billing_month) {
            toast.error('Please select a billing month');
            return;
        }
        if (form.billable_hours <= 0) {
            toast.error('Billable hours must be greater than 0');
            return;
        }
        if (form.working_days <= 0) {
            toast.error('Working days must be greater than 0');
            return;
        }
        setSubmitting(true);
        try {
            await billingConfigApi.upsert({
                client_name: form.client_name || DEFAULT_CLIENT,
                billing_month: form.billing_month,
                billable_hours: Number(form.billable_hours),
                working_days: Number(form.working_days),
            });
            toast.success(config ? 'Billing config updated' : 'Billing config saved');
            onSuccess();
            onClose();
        } catch {
            toast.error('Failed to save billing config');
        } finally {
            setSubmitting(false);
        }
    };

    const title = config
        ? `Edit Config — ${formatMonth(config.billing_month)}`
        : 'Add / Edit Billing Config';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Client Name */}
                <div>
                    <label className="input-label" htmlFor="bc-client">
                        Client Name <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                    <input
                        id="bc-client"
                        className="input-field"
                        placeholder="e.g. DCLI"
                        required
                        value={form.client_name ?? DEFAULT_CLIENT}
                        onChange={(e) => setForm(f => ({ ...f, client_name: e.target.value }))}
                    />
                </div>

                {/* Billing Month */}
                <div>
                    <label className="input-label" htmlFor="bc-month">
                        Billing Month <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                    <select
                        id="bc-month"
                        className="input-field"
                        required
                        value={form.billing_month}
                        onChange={(e) => setForm(f => ({ ...f, billing_month: e.target.value }))}
                        disabled={!!config}
                    >
                        <option value="">Select month…</option>
                        {MONTH_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    {config && (
                        <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            Month is locked — delete and re-create to change it.
                        </p>
                    )}
                </div>

                {/* Billable Hours & Working Days */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="input-label" htmlFor="bc-hours">
                            Billable Hours <span style={{ color: 'var(--color-danger)' }}>*</span>
                        </label>
                        <input
                            id="bc-hours"
                            type="number"
                            className="input-field"
                            min={1}
                            step={0.5}
                            required
                            placeholder="e.g. 176"
                            value={form.billable_hours || ''}
                            onChange={(e) => setForm(f => ({ ...f, billable_hours: parseFloat(e.target.value) || 0 }))}
                        />
                    </div>
                    <div>
                        <label className="input-label" htmlFor="bc-days">
                            Working Days <span style={{ color: 'var(--color-danger)' }}>*</span>
                        </label>
                        <input
                            id="bc-days"
                            type="number"
                            className="input-field"
                            min={1}
                            step={1}
                            required
                            placeholder="e.g. 22"
                            value={form.working_days || ''}
                            onChange={(e) => setForm(f => ({ ...f, working_days: parseInt(e.target.value, 10) || 0 }))}
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-secondary flex-1"
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn btn-cta flex-1"
                        disabled={submitting}
                    >
                        {submitting ? <span className="spinner w-4 h-4" /> : config ? 'Update' : 'Save Config'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    config: BillingConfig | null;
    deleting: boolean;
}

function DeleteConfirmModal({ isOpen, onClose, onConfirm, config, deleting }: DeleteConfirmModalProps) {
    if (!config) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Delete Billing Config" maxWidth="max-w-sm">
            <div className="space-y-4">
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Are you sure you want to delete the billing config for{' '}
                    <strong style={{ color: 'var(--color-text)' }}>
                        {config.client_name} — {formatMonth(config.billing_month)}
                    </strong>?
                    This action cannot be undone.
                </p>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-secondary flex-1"
                        disabled={deleting}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="btn btn-danger flex-1"
                        disabled={deleting}
                    >
                        {deleting ? <span className="spinner w-4 h-4" /> : 'Delete'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function BillingConfig() {
    const { user } = useAuth();
    const canEdit = user?.email ? AUTHORIZED_EMAILS.has(user.email) : false;

    const [configs, setConfigs] = useState<BillingConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState('');

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingConfig, setEditingConfig] = useState<BillingConfig | undefined>();

    const [deleteTarget, setDeleteTarget] = useState<BillingConfig | null>(null);
    const [deleting, setDeleting] = useState(false);

    const fetchConfigs = useCallback(async () => {
        try {
            setLoading(true);
            const data = await billingConfigApi.list(selectedMonth || undefined);
            // Sort by billing_month descending
            const sorted = [...(data ?? [])].sort((a, b) =>
                b.billing_month.localeCompare(a.billing_month)
            );
            setConfigs(sorted);
        } catch {
            toast.error('Failed to load billing configs');
        } finally {
            setLoading(false);
        }
    }, [selectedMonth]);

    useEffect(() => {
        fetchConfigs();
    }, [fetchConfigs]);

    const handleEdit = (config: BillingConfig) => {
        setEditingConfig(config);
        setIsFormOpen(true);
    };

    const handleAddNew = () => {
        setEditingConfig(undefined);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingConfig(undefined);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await billingConfigApi.delete(deleteTarget.id);
            toast.success('Billing config deleted');
            setDeleteTarget(null);
            fetchConfigs();
        } catch {
            toast.error('Failed to delete billing config');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* ── Header ───────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: 'var(--color-cta, #16A34A)1a' }}
                    >
                        <Settings2 size={22} style={{ color: 'var(--color-cta, #16A34A)' }} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
                            Billing Config
                        </h1>
                        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            Monthly billable hours and working days per client
                        </p>
                    </div>
                </div>

                {canEdit && (
                    <button
                        onClick={handleAddNew}
                        className="btn btn-cta flex items-center gap-2 shadow-lg"
                        style={{ boxShadow: '0 4px 14px rgba(22,163,74,0.25)' }}
                    >
                        <Plus size={18} />
                        <span>Add / Edit Config</span>
                    </button>
                )}
            </div>

            {/* ── Read-only banner ──────────────────────────────────── */}
            {!canEdit && (
                <div
                    className="flex items-start gap-3 px-4 py-3 rounded-lg border"
                    style={{
                        backgroundColor: 'var(--color-info, #3B82F6)0d',
                        borderColor: 'var(--color-info, #3B82F6)33',
                        color: 'var(--color-info, #3B82F6)',
                    }}
                >
                    <Info size={16} className="flex-shrink-0 mt-0.5" />
                    <p className="text-sm">
                        You have read-only access to billing configuration.
                        Contact your system admin to modify billing configuration.
                    </p>
                </div>
            )}

            {/* ── Filter Bar ────────────────────────────────────────── */}
            <div className="card flex flex-wrap items-center gap-4 py-3 px-4">
                <div className="flex items-center gap-2">
                    <Calendar size={16} style={{ color: 'var(--color-text-muted)' }} />
                    <label
                        htmlFor="bc-filter-month"
                        className="text-sm font-medium"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        Month:
                    </label>
                </div>
                <select
                    id="bc-filter-month"
                    className="input-field w-48"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                >
                    <option value="">All Months</option>
                    {MONTH_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>

                {selectedMonth && (
                    <button
                        className="btn btn-secondary btn-sm text-xs"
                        onClick={() => setSelectedMonth('')}
                    >
                        Clear Filter
                    </button>
                )}

                <span className="ml-auto text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {configs.length} record{configs.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* ── Table ─────────────────────────────────────────────── */}
            <div className="card overflow-hidden">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <div className="spinner w-8 h-8 border-cta" />
                        <p className="text-sm animate-pulse" style={{ color: 'var(--color-text-muted)' }}>
                            Loading billing configs…
                        </p>
                    </div>
                ) : configs.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr
                                    className="border-b"
                                    style={{
                                        backgroundColor: 'var(--color-surface-hover, rgba(0,0,0,0.03))',
                                        borderColor: 'var(--color-border)',
                                    }}
                                >
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                                        Client
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                                        Billing Month
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right" style={{ color: 'var(--color-text-muted)' }}>
                                        Billable Hours
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right" style={{ color: 'var(--color-text-muted)' }}>
                                        Working Days
                                    </th>
                                    {canEdit && (
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right" style={{ color: 'var(--color-text-muted)' }}>
                                            Actions
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {configs.map((cfg, idx) => (
                                    <tr
                                        key={cfg.id}
                                        className="transition-colors"
                                        style={{
                                            borderBottom: idx < configs.length - 1 ? '1px solid var(--color-border)' : undefined,
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface-hover, rgba(0,0,0,0.02))')}
                                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                                    >
                                        {/* Client */}
                                        <td className="px-6 py-4">
                                            <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                                                {cfg.client_name}
                                            </span>
                                        </td>

                                        {/* Billing Month */}
                                        <td className="px-6 py-4">
                                            <span
                                                className="inline-flex items-center gap-1.5 text-sm font-medium px-2.5 py-1 rounded-full"
                                                style={{
                                                    backgroundColor: 'var(--color-cta, #16A34A)15',
                                                    color: 'var(--color-cta, #16A34A)',
                                                }}
                                            >
                                                <Calendar size={12} />
                                                {formatMonth(cfg.billing_month)}
                                            </span>
                                        </td>

                                        {/* Billable Hours (right-aligned) */}
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-mono font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                                                {cfg.billable_hours.toLocaleString()}
                                            </span>
                                            <span className="ml-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>hrs</span>
                                        </td>

                                        {/* Working Days (right-aligned) */}
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-mono font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                                                {cfg.working_days}
                                            </span>
                                            <span className="ml-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>days</span>
                                        </td>

                                        {/* Actions */}
                                        {canEdit && (
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => handleEdit(cfg)}
                                                        className="p-2 rounded-lg transition-colors text-sm font-medium"
                                                        style={{ color: 'var(--color-text-muted)' }}
                                                        onMouseEnter={e => {
                                                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-surface-hover)';
                                                            (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-cta, #16A34A)';
                                                        }}
                                                        onMouseLeave={e => {
                                                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '';
                                                            (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-muted)';
                                                        }}
                                                        title="Edit"
                                                        aria-label="Edit billing config"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteTarget(cfg)}
                                                        className="p-2 rounded-lg transition-colors"
                                                        style={{ color: 'var(--color-text-muted)' }}
                                                        onMouseEnter={e => {
                                                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(239,68,68,0.08)';
                                                            (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-danger, #EF4444)';
                                                        }}
                                                        onMouseLeave={e => {
                                                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '';
                                                            (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-muted)';
                                                        }}
                                                        title="Delete"
                                                        aria-label="Delete billing config"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <EmptyState
                        message={selectedMonth ? `No billing config for ${formatMonth(selectedMonth)}` : 'No billing configs yet'}
                        action={
                            canEdit ? (
                                <button
                                    onClick={selectedMonth ? () => setSelectedMonth('') : handleAddNew}
                                    className="btn btn-secondary btn-sm"
                                >
                                    {selectedMonth ? 'Clear Filter' : 'Add Config'}
                                </button>
                            ) : undefined
                        }
                    />
                )}
            </div>

            {/* ── Modals ────────────────────────────────────────────── */}
            {isFormOpen && (
                <BillingConfigModal
                    isOpen={isFormOpen}
                    onClose={handleCloseForm}
                    onSuccess={fetchConfigs}
                    config={editingConfig}
                />
            )}

            <DeleteConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDeleteConfirm}
                config={deleteTarget}
                deleting={deleting}
            />
        </div>
    );
}
