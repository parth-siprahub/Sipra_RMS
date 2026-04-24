import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { billingConfigApi, type BillingConfig } from '../api/billingConfig';
import { Plus, Trash2, Settings2, Calendar, Check, X, Pencil, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { BILLING_CONFIG_EMAILS } from '../lib/accessControl';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMonthOptions(): { value: string; label: string }[] {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    const endYear = now.getFullYear();
    const endMonth = now.getMonth() + 4;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let y = 2025; y <= endYear + 1; y++) {
        for (let m = 1; m <= 12; m++) {
            if (y === endYear && m > endMonth) break;
            if (y > endYear) break;
            const value = `${y}-${String(m).padStart(2, '0')}`;
            options.push({ value, label: `${months[m - 1]} ${y}` });
        }
    }
    return options.reverse();
}

const MONTH_OPTIONS = getMonthOptions();

function formatMonth(value: string): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const [year, month] = value.split('-');
    const idx = parseInt(month, 10) - 1;
    return `${months[idx] ?? month} ${year}`;
}

function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

interface DeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    config: BillingConfig | null;
    deleting: boolean;
}

function DeleteModal({ isOpen, onClose, onConfirm, config, deleting }: DeleteModalProps) {
    if (!config) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Delete Billing Config" maxWidth="max-w-sm">
            <div className="space-y-4">
                <p className="text-sm text-text-muted">
                    Delete billing config for{' '}
                    <strong className="text-text">{config.client_name} — {formatMonth(config.billing_month)}</strong>?
                    This cannot be undone.
                </p>
                <div className="flex gap-3">
                    <button onClick={onClose} className="btn btn-secondary flex-1" disabled={deleting}>Cancel</button>
                    <button onClick={onConfirm} className="btn btn-danger flex-1" disabled={deleting}>
                        {deleting ? <span className="spinner w-4 h-4" /> : 'Delete'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

// ─── Freeze / Unfreeze Confirm Modal ─────────────────────────────────────────

interface FreezeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    config: BillingConfig | null;
    loading: boolean;
    action: 'freeze' | 'unfreeze';
}

function FreezeModal({ isOpen, onClose, onConfirm, config, loading, action }: FreezeModalProps) {
    if (!config) return null;
    const isFreeze = action === 'freeze';
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isFreeze ? 'Lock Billing Month' : 'Unlock Billing Month'}
            maxWidth="max-w-sm"
        >
            <div className="space-y-4">
                <div className={`flex items-start gap-3 p-3 rounded-lg ${isFreeze ? 'bg-warning/10' : 'bg-success/10'}`}>
                    <AlertTriangle size={18} className={isFreeze ? 'text-warning mt-0.5 shrink-0' : 'text-success mt-0.5 shrink-0'} />
                    <p className="text-sm text-text">
                        {isFreeze ? (
                            <>
                                Locking <strong>{formatMonth(config.billing_month)}</strong> will
                                prevent any recalculation until it is unlocked.
                            </>
                        ) : (
                            <>
                                Unlocking <strong>{formatMonth(config.billing_month)}</strong> will
                                allow billing to be recalculated. The previous lock audit trail is preserved.
                            </>
                        )}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={onClose} className="btn btn-secondary flex-1" disabled={loading}>
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`btn flex-1 ${isFreeze ? 'btn-warning' : 'btn-cta'}`}
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="spinner w-4 h-4" />
                        ) : isFreeze ? (
                            <><Lock size={14} className="mr-1.5" />Lock Month</>
                        ) : (
                            <><Unlock size={14} className="mr-1.5" />Unlock Month</>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

// ─── Inline Edit Row ──────────────────────────────────────────────────────────

interface EditRowState {
    client_name: string;
    billable_hours: number;
    working_days: number;
}

// ─── Audit Trail Tooltip ──────────────────────────────────────────────────────

function AuditTrail({ config }: { config: BillingConfig }) {
    if (!config.frozen_by && !config.last_unfrozen_by) return null;
    return (
        <div className="mt-1 space-y-0.5">
            {config.frozen_by && (
                <p className="text-xs text-text-muted">
                    Locked by <span className="font-medium text-text">{config.frozen_by}</span>{' '}
                    on {formatDateTime(config.frozen_at)}
                </p>
            )}
            {config.last_unfrozen_by && (
                <p className="text-xs text-text-muted">
                    Unlocked by <span className="font-medium text-text">{config.last_unfrozen_by}</span>{' '}
                    on {formatDateTime(config.last_unfrozen_at)}
                </p>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function BillingConfig() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const canAccess = user?.email ? BILLING_CONFIG_EMAILS.has(user.email.toLowerCase()) : false;

    const [configs, setConfigs] = useState<BillingConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState('');

    const [deleteTarget, setDeleteTarget] = useState<BillingConfig | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Inline edit state
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editRow, setEditRow] = useState<EditRowState>({ client_name: '', billable_hours: 0, working_days: 0 });
    const [saving, setSaving] = useState(false);

    // Freeze / unfreeze state
    const [freezeTarget, setFreezeTarget] = useState<BillingConfig | null>(null);
    const [freezeAction, setFreezeAction] = useState<'freeze' | 'unfreeze'>('freeze');
    const [freezing, setFreezing] = useState(false);

    const fetchConfigs = useCallback(async () => {
        try {
            setLoading(true);
            const data = await billingConfigApi.list(selectedMonth || undefined);
            const sorted = [...(data ?? [])].sort((a, b) => b.billing_month.localeCompare(a.billing_month));
            setConfigs(sorted);
        } catch {
            toast.error('Failed to load billing configs');
        } finally {
            setLoading(false);
        }
    }, [selectedMonth]);

    useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

    // Block access entirely for unauthorized users
    if (!canAccess) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="card p-10 text-center max-w-sm">
                    <Settings2 size={40} className="mx-auto mb-4 text-text-muted opacity-30" />
                    <h2 className="text-lg font-bold text-text mb-2">Access Restricted</h2>
                    <p className="text-sm text-text-muted">
                        You don't have permission to view this page.
                        Contact your system administrator.
                    </p>
                </div>
            </div>
        );
    }

    const startEdit = (cfg: BillingConfig) => {
        setEditingId(cfg.id);
        setEditRow({
            client_name: cfg.client_name,
            billable_hours: cfg.billable_hours,
            working_days: cfg.working_days,
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
    };

    const saveEdit = async (cfg: BillingConfig) => {
        if (editRow.billable_hours <= 0) { toast.error('Billable hours must be > 0'); return; }
        if (editRow.working_days <= 0) { toast.error('Working days must be > 0'); return; }
        setSaving(true);
        try {
            await billingConfigApi.upsert({
                client_name: editRow.client_name || cfg.client_name,
                billing_month: cfg.billing_month,
                billable_hours: Number(editRow.billable_hours),
                working_days: Number(editRow.working_days),
            });
            toast.success('Billing config updated');
            setEditingId(null);
            fetchConfigs();
        } catch {
            toast.error('Failed to update billing config');
        } finally {
            setSaving(false);
        }
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

    const openFreeze = (cfg: BillingConfig) => {
        setFreezeTarget(cfg);
        setFreezeAction(cfg.is_frozen ? 'unfreeze' : 'freeze');
    };

    const handleFreezeConfirm = async () => {
        if (!freezeTarget) return;
        setFreezing(true);
        try {
            if (freezeAction === 'freeze') {
                await billingConfigApi.freeze(freezeTarget.billing_month);
                toast.success(`${formatMonth(freezeTarget.billing_month)} locked successfully`);
            } else {
                await billingConfigApi.unfreeze(freezeTarget.billing_month);
                toast.success(`${formatMonth(freezeTarget.billing_month)} unlocked successfully`);
            }
            setFreezeTarget(null);
            fetchConfigs();
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Action failed';
            toast.error(msg);
        } finally {
            setFreezing(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cta/10">
                        <Settings2 size={22} className="text-cta" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-text">Billing Config</h1>
                        <p className="text-sm text-text-muted">Monthly billable hours and working days per client</p>
                    </div>
                </div>
                <button onClick={() => navigate('/billing-config/create')} className="btn btn-cta flex items-center gap-2">
                    <Plus size={18} />
                    Add Config
                </button>
            </div>

            {/* ── Filter Bar ── */}
            <div className="card flex flex-wrap items-center gap-4 py-3 px-4">
                <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-text-muted" />
                    <label htmlFor="bc-filter-month" className="text-sm font-medium text-text-muted">Month:</label>
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
                    <button className="btn btn-secondary btn-sm text-xs" onClick={() => setSelectedMonth('')}>
                        Clear
                    </button>
                )}
                <span className="ml-auto text-xs text-text-muted">
                    {configs.length} record{configs.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* ── Table ── */}
            <div className="card p-0 overflow-hidden">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <div className="spinner w-8 h-8 border-cta" />
                        <p className="text-sm text-text-muted animate-pulse">Loading billing configs…</p>
                    </div>
                ) : configs.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th className="w-12">ID</th>
                                    <th>Client</th>
                                    <th>Billing Month</th>
                                    <th className="text-right">Billable Hours</th>
                                    <th className="text-right">Working Days</th>
                                    <th>Status / Audit</th>
                                    <th>Created At</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {configs.map((cfg) => {
                                    const isEditing = editingId === cfg.id;
                                    return (
                                        <tr key={cfg.id} className={cfg.is_frozen ? 'bg-warning/5' : ''}>
                                            {/* ID */}
                                            <td className="text-text-muted text-xs font-mono">{cfg.id}</td>

                                            {/* Client */}
                                            <td>
                                                {isEditing ? (
                                                    <input
                                                        className="input-field py-1 text-sm w-32"
                                                        value={editRow.client_name}
                                                        maxLength={100}
                                                        onChange={(e) => setEditRow(r => ({ ...r, client_name: e.target.value }))}
                                                    />
                                                ) : (
                                                    <span className="font-semibold text-text">{cfg.client_name}</span>
                                                )}
                                            </td>

                                            {/* Billing Month — never editable (locked) */}
                                            <td>
                                                <span className="inline-flex items-center gap-1.5 text-sm font-medium px-2.5 py-1 rounded-full bg-cta/10 text-cta">
                                                    <Calendar size={12} />
                                                    {formatMonth(cfg.billing_month)}
                                                </span>
                                            </td>

                                            {/* Billable Hours */}
                                            <td className="text-right">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        className="input-field py-1 text-sm w-24 text-right"
                                                        min={1} step={0.5}
                                                        value={editRow.billable_hours || ''}
                                                        onChange={(e) => setEditRow(r => ({ ...r, billable_hours: parseFloat(e.target.value) || 0 }))}
                                                    />
                                                ) : (
                                                    <>
                                                        <span className="font-mono font-semibold text-sm text-text">{cfg.billable_hours.toLocaleString()}</span>
                                                        <span className="ml-1 text-xs text-text-muted">hrs</span>
                                                    </>
                                                )}
                                            </td>

                                            {/* Working Days */}
                                            <td className="text-right">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        className="input-field py-1 text-sm w-20 text-right"
                                                        min={1} step={1}
                                                        value={editRow.working_days || ''}
                                                        onChange={(e) => setEditRow(r => ({ ...r, working_days: parseInt(e.target.value, 10) || 0 }))}
                                                    />
                                                ) : (
                                                    <>
                                                        <span className="font-mono font-semibold text-sm text-text">{cfg.working_days}</span>
                                                        <span className="ml-1 text-xs text-text-muted">days</span>
                                                    </>
                                                )}
                                            </td>

                                            {/* Status — audit trail shown only in edit mode for context */}
                                            <td>
                                                {cfg.is_frozen ? (
                                                    <div>
                                                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-warning/15 text-warning">
                                                            <Lock size={10} />
                                                            Locked
                                                        </span>
                                                        {isEditing && <AuditTrail config={cfg} />}
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-success/15 text-success">
                                                            <Unlock size={10} />
                                                            Open
                                                        </span>
                                                        {isEditing && <AuditTrail config={cfg} />}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Created At */}
                                            <td className="text-xs text-text-muted">{formatDateTime(cfg.created_at?.toString())}</td>

                                            {/* Actions */}
                                            <td>
                                                <div className="flex items-center justify-end gap-1">
                                                    {isEditing ? (
                                                        <>
                                                            <button
                                                                onClick={() => saveEdit(cfg)}
                                                                disabled={saving}
                                                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-success hover:bg-success/10 transition-colors"
                                                                title="Save"
                                                            >
                                                                {saving ? <span className="spinner w-3 h-3" /> : <Check size={14} />}
                                                                Save
                                                            </button>
                                                            <button
                                                                onClick={cancelEdit}
                                                                disabled={saving}
                                                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-text-muted hover:bg-surface-hover transition-colors"
                                                                title="Cancel"
                                                            >
                                                                <X size={14} />
                                                                Cancel
                                                            </button>
                                                            {/* Delete lives here — requires Edit intent first */}
                                                            <div className="w-px h-4 bg-border mx-0.5 shrink-0" />
                                                            <button
                                                                onClick={() => { cancelEdit(); setDeleteTarget(cfg); }}
                                                                disabled={saving}
                                                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-danger hover:bg-danger/10 transition-colors"
                                                                title="Delete this config"
                                                            >
                                                                <Trash2 size={13} />
                                                                Delete
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {/* Freeze / Unfreeze */}
                                                            <button
                                                                onClick={() => openFreeze(cfg)}
                                                                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                                                                    cfg.is_frozen
                                                                        ? 'text-warning hover:bg-warning/10'
                                                                        : 'text-text-muted hover:bg-surface-hover hover:text-warning'
                                                                }`}
                                                                title={cfg.is_frozen ? 'Unlock month' : 'Lock month'}
                                                            >
                                                                {cfg.is_frozen ? <Unlock size={13} /> : <Lock size={13} />}
                                                                {cfg.is_frozen ? 'Unlock' : 'Lock'}
                                                            </button>
                                                            {/* Edit — disabled when frozen; Delete lives inside edit mode */}
                                                            <button
                                                                onClick={() => !cfg.is_frozen && startEdit(cfg)}
                                                                disabled={cfg.is_frozen}
                                                                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                                                                    cfg.is_frozen
                                                                        ? 'text-text-muted opacity-30 cursor-not-allowed'
                                                                        : 'text-text-muted hover:bg-surface-hover hover:text-cta'
                                                                }`}
                                                                title={cfg.is_frozen ? 'Unlock month to edit' : 'Edit (Delete available inside)'}
                                                            >
                                                                <Pencil size={13} />
                                                                Edit
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <EmptyState
                        message={selectedMonth ? `No billing config for ${formatMonth(selectedMonth)}` : 'No billing configs yet'}
                        action={
                            <button
                                onClick={selectedMonth ? () => setSelectedMonth('') : () => navigate('/billing-config/create')}
                                className="btn btn-secondary btn-sm"
                            >
                                {selectedMonth ? 'Clear Filter' : 'Add Config'}
                            </button>
                        }
                    />
                )}
            </div>

            {/* ── Modals ── */}
            <DeleteModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDeleteConfirm}
                config={deleteTarget}
                deleting={deleting}
            />
            <FreezeModal
                isOpen={!!freezeTarget}
                onClose={() => setFreezeTarget(null)}
                onConfirm={handleFreezeConfirm}
                config={freezeTarget}
                loading={freezing}
                action={freezeAction}
            />
        </div>
    );
}
