import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, RefreshCw, LayoutGrid, List } from 'lucide-react';
import toast from 'react-hot-toast';
import { candidatesApi } from '../api/candidates';
import type {
    Candidate,
    CandidateStatus,
    CandidateVendor,
    CreateCandidatePayload,
} from '../api/candidates';

import { Modal } from '../components/ui/Modal';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { cn } from '../lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

// Ordered pipeline stages shown as kanban columns
const PIPELINE_STAGES: CandidateStatus[] = [
    'NEW',
    'SUBMITTED_TO_ADMIN',
    'WITH_ADMIN',
    'WITH_CLIENT',
    'INTERVIEW_SCHEDULED',
    'SELECTED',
    'ONBOARDED',
];

const CLOSED_STAGES: CandidateStatus[] = [
    'REJECTED_BY_ADMIN',
    'REJECTED_BY_CLIENT',
    'ON_HOLD',
    'EXIT',
];

// Short label for kanban column headers
const STAGE_LABELS: Record<CandidateStatus, string> = {
    NEW: 'New',
    SUBMITTED_TO_ADMIN: 'Submitted',
    WITH_ADMIN: 'With Admin',
    REJECTED_BY_ADMIN: 'Rejected (Admin)',
    WITH_CLIENT: 'With Client',
    INTERVIEW_SCHEDULED: 'Interview',
    SELECTED: 'Selected',
    ONBOARDED: 'Onboarded',
    REJECTED_BY_CLIENT: 'Rejected (Client)',
    ON_HOLD: 'On Hold',
    EXIT: 'Exit',
};

// Column accent colours matching design-tokens.css status vars
const STAGE_COLORS: Record<string, string> = {
    NEW: 'border-[#3B82F6]',
    SUBMITTED_TO_ADMIN: 'border-[#8B5CF6]',
    WITH_ADMIN: 'border-[#F59E0B]',
    WITH_CLIENT: 'border-[#06B6D4]',
    INTERVIEW_SCHEDULED: 'border-[#EC4899]',
    SELECTED: 'border-[#22C55E]',
    ONBOARDED: 'border-[#10B981]',
    REJECTED_BY_ADMIN: 'border-[#EF4444]',
    REJECTED_BY_CLIENT: 'border-[#EF4444]',
    ON_HOLD: 'border-[#6B7280]',
    EXIT: 'border-[#F97316]',
};

// ─── Kanban Board ─────────────────────────────────────────────────────────────

interface KanbanBoardProps {
    candidates: Candidate[];
    onStatusChange: (id: number, status: CandidateStatus) => void;
}

function KanbanBoard({ candidates, onStatusChange }: KanbanBoardProps) {
    const draggingIdRef = useRef<number | null>(null);
    const [draggingId, setDraggingId] = useState<number | null>(null);

    const grouped = (stages: CandidateStatus[]) =>
        stages.reduce<Record<string, Candidate[]>>((acc, s) => {
            acc[s] = candidates.filter((c) => c.status === s);
            return acc;
        }, {});

    const pipelineGroups = grouped(PIPELINE_STAGES);
    const closedGroups = grouped(CLOSED_STAGES);

    const handleDragStart = (id: number) => {
        draggingIdRef.current = id;
        setDraggingId(id);
    };

    const handleDrop = (targetStatus: CandidateStatus) => {
        const id = draggingIdRef.current;
        if (id === null) return;
        const candidate = candidates.find((c) => c.id === id);
        if (!candidate || candidate.status === targetStatus) {
            setDraggingId(null);
            draggingIdRef.current = null;
            return;
        }
        onStatusChange(id, targetStatus);
        setDraggingId(null);
        draggingIdRef.current = null;
    };

    const renderColumn = (status: CandidateStatus, items: Candidate[]) => (
        <div
            key={status}
            className={cn(
                'flex flex-col min-w-[220px] w-[220px] bg-surface rounded-xl border-t-2 border border-border shrink-0',
                STAGE_COLORS[status]
            )}
            onMouseUp={() => handleDrop(status)}
        >
            {/* Column Header */}
            <div className="px-3 py-2 border-b border-border">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                        {STAGE_LABELS[status]}
                    </span>
                    <span className="text-xs font-bold bg-surface-hover text-text-muted rounded-full px-2 py-0.5">
                        {items.length}
                    </span>
                </div>
            </div>

            {/* Cards */}
            <div className="flex-1 p-2 space-y-2 min-h-[120px]">
                {items.length === 0 && (
                    <div className="h-16 border-2 border-dashed border-border rounded-lg flex items-center justify-center">
                        <span className="text-xs text-text-muted">Drop here</span>
                    </div>
                )}
                {items.map((c) => (
                    <div
                        key={c.id}
                        draggable
                        onDragStart={() => handleDragStart(c.id)}
                        onMouseDown={() => handleDragStart(c.id)}
                        onMouseUp={(e) => e.stopPropagation()}
                        onDragEnd={() => { setDraggingId(null); draggingIdRef.current = null; }}
                        className={cn(
                            'card p-3 cursor-grab active:cursor-grabbing select-none transition-all duration-150',
                            draggingId === c.id && 'opacity-50 scale-95'
                        )}
                    >
                        <p className="text-sm font-semibold text-text truncate">
                            {c.first_name} {c.last_name}
                        </p>
                        <p className="text-xs text-text-muted truncate mt-0.5">{c.email}</p>
                        {c.current_company && (
                            <p className="text-xs text-text-muted truncate">{c.current_company}</p>
                        )}
                        {c.vendor && (
                            <span className="badge badge-neutral mt-2 text-[10px]">{c.vendor}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Pipeline Columns */}
            <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                    Active Pipeline
                </p>
                <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
                    {PIPELINE_STAGES.map((s) => renderColumn(s, pipelineGroups[s]))}
                </div>
            </div>

            {/* Closed Columns */}
            <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                    Closed / Inactive
                </p>
                <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
                    {CLOSED_STAGES.map((s) => renderColumn(s, closedGroups[s]))}
                </div>
            </div>
        </div>
    );
}

// ─── Create Candidate Modal ───────────────────────────────────────────────────

interface CreateCandidateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

function CreateCandidateModal({ isOpen, onClose, onCreated }: CreateCandidateModalProps) {
    const emptyForm = (): CreateCandidatePayload => ({
        first_name: '',
        last_name: '',
        email: '',
        vendor: 'INTERNAL',
    });

    const [form, setForm] = useState<CreateCandidatePayload>(emptyForm());
    const [submitting, setSubmitting] = useState(false);

    const set = (field: keyof CreateCandidatePayload, value: unknown) =>
        setForm((f) => ({ ...f, [field]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await candidatesApi.create(form);
            toast.success(`${form.first_name} ${form.last_name} added!`);
            onCreated();
            onClose();
            setForm(emptyForm());
        } catch {
            // toast handled by client.ts
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Candidate" maxWidth="max-w-xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Row: Names */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="input-label" htmlFor="c-first">
                            First Name <span className="text-danger">*</span>
                        </label>
                        <input
                            id="c-first"
                            className="input-field"
                            placeholder="Rahul"
                            required
                            value={form.first_name}
                            onChange={(e) => set('first_name', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="input-label" htmlFor="c-last">
                            Last Name <span className="text-danger">*</span>
                        </label>
                        <input
                            id="c-last"
                            className="input-field"
                            placeholder="Sharma"
                            required
                            value={form.last_name}
                            onChange={(e) => set('last_name', e.target.value)}
                        />
                    </div>
                </div>

                {/* Email */}
                <div>
                    <label className="input-label" htmlFor="c-email">
                        Email <span className="text-danger">*</span>
                    </label>
                    <input
                        id="c-email"
                        type="email"
                        className="input-field"
                        placeholder="rahul@example.com"
                        required
                        value={form.email}
                        onChange={(e) => set('email', e.target.value)}
                    />
                </div>

                {/* Row: Phone + Vendor */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="input-label" htmlFor="c-phone">
                            Phone
                        </label>
                        <input
                            id="c-phone"
                            className="input-field"
                            placeholder="+91 98765 43210"
                            value={form.phone ?? ''}
                            onChange={(e) => set('phone', e.target.value || undefined)}
                        />
                    </div>
                    <div>
                        <label className="input-label" htmlFor="c-vendor">
                            Vendor <span className="text-danger">*</span>
                        </label>
                        <select
                            id="c-vendor"
                            className="input-field"
                            value={form.vendor}
                            onChange={(e) => set('vendor', e.target.value as CandidateVendor)}
                            required
                        >
                            {(['WRS', 'GFM', 'INTERNAL'] as CandidateVendor[]).map((v) => (
                                <option key={v} value={v}>
                                    {v}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Current Company */}
                <div>
                    <label className="input-label" htmlFor="c-company">
                        Current Company
                    </label>
                    <input
                        id="c-company"
                        className="input-field"
                        placeholder="Infosys"
                        value={form.current_company ?? ''}
                        onChange={(e) => set('current_company', e.target.value || undefined)}
                    />
                </div>

                {/* Row: Experience + Notice */}
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className="input-label" htmlFor="c-total-exp">
                            Total Exp (yrs)
                        </label>
                        <input
                            id="c-total-exp"
                            type="number"
                            min={0}
                            step={0.5}
                            className="input-field"
                            placeholder="5"
                            value={form.total_experience ?? ''}
                            onChange={(e) =>
                                set('total_experience', e.target.value ? parseFloat(e.target.value) : undefined)
                            }
                        />
                    </div>
                    <div>
                        <label className="input-label" htmlFor="c-rel-exp">
                            Relevant Exp (yrs)
                        </label>
                        <input
                            id="c-rel-exp"
                            type="number"
                            min={0}
                            step={0.5}
                            className="input-field"
                            placeholder="3"
                            value={form.relevant_experience ?? ''}
                            onChange={(e) =>
                                set('relevant_experience', e.target.value ? parseFloat(e.target.value) : undefined)
                            }
                        />
                    </div>
                    <div>
                        <label className="input-label" htmlFor="c-notice">
                            Notice (days)
                        </label>
                        <input
                            id="c-notice"
                            type="number"
                            min={0}
                            className="input-field"
                            placeholder="30"
                            value={form.notice_period ?? ''}
                            onChange={(e) =>
                                set('notice_period', e.target.value ? parseInt(e.target.value) : undefined)
                            }
                        />
                    </div>
                </div>

                {/* Location */}
                <div>
                    <label className="input-label" htmlFor="c-location">
                        Current Location
                    </label>
                    <input
                        id="c-location"
                        className="input-field"
                        placeholder="Bengaluru"
                        value={form.current_location ?? ''}
                        onChange={(e) => set('current_location', e.target.value || undefined)}
                    />
                </div>

                {/* Skills */}
                <div>
                    <label className="input-label" htmlFor="c-skills">
                        Skills
                    </label>
                    <textarea
                        id="c-skills"
                        className="input-field resize-none"
                        rows={2}
                        placeholder="React, TypeScript, Node.js"
                        value={form.skills ?? ''}
                        onChange={(e) => set('skills', e.target.value || undefined)}
                    />
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
                    <button type="submit" className="btn btn-cta flex-1" disabled={submitting}>
                        {submitting ? <span className="spinner w-4 h-4" /> : 'Add Candidate'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type ViewMode = 'table' | 'kanban';

export function Candidates() {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');

    const fetchCandidates = useCallback(async () => {
        setLoading(true);
        try {
            const data = await candidatesApi.list(
                statusFilter && viewMode === 'table' ? { status: statusFilter } : undefined
            );
            setCandidates(data);
        } catch {
            // handled globally
        } finally {
            setLoading(false);
        }
    }, [statusFilter, viewMode]);

    useEffect(() => {
        fetchCandidates();
    }, [fetchCandidates]);

    const handleStatusChange = async (id: number, status: CandidateStatus) => {
        try {
            await candidatesApi.review(id, status);
            toast.success(`Moved to ${STAGE_LABELS[status]}`);
            fetchCandidates();
        } catch {
            // handled
        }
    };

    const formatDate = (iso: string | null) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const ALL_STATUSES: CandidateStatus[] = [...PIPELINE_STAGES, ...CLOSED_STAGES];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text">Candidates Pipeline</h1>
                    <p className="text-sm text-text-muted mt-1">
                        Manage your candidate journey from submission to onboarding
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn btn-cta shrink-0"
                    id="add-candidate-btn"
                >
                    <Plus size={18} /> Add Candidate
                </button>
            </div>

            {/* Controls Bar */}
            <div className="card flex flex-wrap gap-3 items-end">
                {/* View Toggle */}
                <div className="flex rounded-lg border border-border overflow-hidden">
                    <button
                        onClick={() => setViewMode('table')}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors',
                            viewMode === 'table'
                                ? 'bg-primary text-text-inverse'
                                : 'bg-surface text-text-muted hover:bg-surface-hover'
                        )}
                        id="view-table-btn"
                    >
                        <List size={14} /> Table
                    </button>
                    <button
                        onClick={() => setViewMode('kanban')}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors',
                            viewMode === 'kanban'
                                ? 'bg-primary text-text-inverse'
                                : 'bg-surface text-text-muted hover:bg-surface-hover'
                        )}
                        id="view-kanban-btn"
                    >
                        <LayoutGrid size={14} /> Kanban
                    </button>
                </div>

                {/* Status filter (table view only) */}
                {viewMode === 'table' && (
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-text-muted">Status</label>
                        <select
                            className="input-field w-48"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            id="candidate-filter-status"
                            aria-label="Filter by candidate status"
                        >
                            <option value="">All Statuses</option>
                            {ALL_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                    {STAGE_LABELS[s]}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {statusFilter && viewMode === 'table' && (
                    <button
                        onClick={() => setStatusFilter('')}
                        className="btn btn-ghost btn-sm text-text-muted"
                    >
                        Clear
                    </button>
                )}

                <button
                    onClick={fetchCandidates}
                    className="btn btn-ghost btn-icon ml-auto"
                    title="Refresh"
                    id="refresh-candidates-btn"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <div className="spinner w-8 h-8" />
                </div>
            ) : candidates.length === 0 ? (
                <div className="card">
                    <EmptyState
                        message="No candidates found."
                        action={
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="btn btn-cta btn-sm"
                            >
                                <Plus size={14} /> Add your first candidate
                            </button>
                        }
                    />
                </div>
            ) : viewMode === 'table' ? (
                <>
                    <div className="card p-0 overflow-hidden">
                        <div className="table-container border-none">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Vendor</th>
                                        <th>Status</th>
                                        <th>Company</th>
                                        <th>Exp (yrs)</th>
                                        <th>Added</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {candidates.map((c) => (
                                        <tr key={c.id}>
                                            <td>
                                                <div className="font-semibold text-text">
                                                    {c.first_name} {c.last_name}
                                                </div>
                                                {c.current_location && (
                                                    <div className="text-xs text-text-muted">{c.current_location}</div>
                                                )}
                                            </td>
                                            <td className="text-text-muted text-sm">{c.email}</td>
                                            <td>
                                                <span className="badge badge-neutral">{c.vendor ?? '—'}</span>
                                            </td>
                                            <td>
                                                <StatusBadge value={c.status} type="candidate" />
                                            </td>
                                            <td className="text-text-muted text-sm">{c.current_company ?? '—'}</td>
                                            <td className="text-text-muted text-sm">
                                                {c.total_experience != null ? `${c.total_experience}y` : '—'}
                                            </td>
                                            <td className="text-text-muted text-sm">{formatDate(c.created_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <p className="text-xs text-text-muted text-right">
                        {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}
                    </p>
                </>
            ) : (
                <KanbanBoard candidates={candidates} onStatusChange={handleStatusChange} />
            )}

            {/* Create Modal */}
            <CreateCandidateModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreated={fetchCandidates}
            />
        </div>
    );
}
