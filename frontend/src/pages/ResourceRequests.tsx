import React, { useEffect, useState, useCallback } from 'react';
import { Plus, RefreshCw, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { resourceRequestsApi } from '../api/resourceRequests';
import type {
    ResourceRequest,
    RequestStatus,
    RequestPriority,
    RequestSource,
    CreateResourceRequestPayload,
} from '../api/resourceRequests';

import { Modal } from '../components/ui/Modal';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';

// ─── Status Transition Map ────────────────────────────────────────────────────
const STATUS_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
    OPEN: ['HOLD', 'CLOSED'],
    HOLD: ['OPEN', 'CLOSED'],
    CLOSED: [],
};

// ─── Quick-Status Dropdown ────────────────────────────────────────────────────
interface StatusDropdownProps {
    request: ResourceRequest;
    onStatusChange: (id: number, status: RequestStatus) => void;
}

function StatusDropdown({ request, onStatusChange }: StatusDropdownProps) {
    const [open, setOpen] = useState(false);
    const current = (request.status as RequestStatus) ?? 'OPEN';
    const options = STATUS_TRANSITIONS[current] ?? [];

    if (options.length === 0) {
        return <StatusBadge value={request.status} type="request" />;
    }

    return (
        <div className="relative inline-block">
            <button
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-1 group"
                title="Click to change status"
            >
                <StatusBadge value={request.status} type="request" />
                <ChevronDown
                    size={12}
                    className="text-text-muted group-hover:text-text transition-colors"
                />
            </button>
            {open && (
                <div
                    className="absolute top-full left-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-dropdown py-1 min-w-[120px]"
                    onMouseLeave={() => setOpen(false)}
                >
                    {options.map((s) => (
                        <button
                            key={s}
                            aria-label={`Set status to ${s}`}
                            onClick={() => {
                                onStatusChange(request.id, s);
                                setOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-surface-hover transition-colors"
                        >
                            <StatusBadge value={s} type="request" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Create Request Modal ─────────────────────────────────────────────────────
interface CreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

function CreateRequestModal({ isOpen, onClose, onCreated }: CreateModalProps) {
    const [priority, setPriority] = useState<RequestPriority>('MEDIUM');
    const [source, setSource] = useState<RequestSource | ''>('');
    const [isBackfill, setIsBackfill] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload: CreateResourceRequestPayload = {
                priority,
                is_backfill: isBackfill,
                ...(source ? { source } : {}),
            };
            await resourceRequestsApi.create(payload);
            toast.success('Resource request created!');
            onCreated();
            onClose();
            // reset
            setPriority('MEDIUM');
            setSource('');
            setIsBackfill(false);
        } catch {
            // error toast handled by client.ts
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="New Resource Request">
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Priority */}
                <div>
                    <label className="input-label" htmlFor="rr-priority">
                        Priority <span className="text-danger">*</span>
                    </label>
                    <select
                        id="rr-priority"
                        className="input-field"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as RequestPriority)}
                        required
                    >
                        {(['URGENT', 'HIGH', 'MEDIUM', 'LOW'] as RequestPriority[]).map((p) => (
                            <option key={p} value={p}>
                                {p}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Source */}
                <div>
                    <label className="input-label" htmlFor="rr-source">
                        Source
                    </label>
                    <select
                        id="rr-source"
                        className="input-field"
                        value={source}
                        onChange={(e) => setSource(e.target.value as RequestSource | '')}
                    >
                        <option value="">— Select source —</option>
                        {(['EMAIL', 'CHAT', 'PORTAL'] as RequestSource[]).map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Backfill */}
                <div className="flex items-center gap-3">
                    <input
                        id="rr-backfill"
                        type="checkbox"
                        className="w-4 h-4 accent-cta cursor-pointer"
                        checked={isBackfill}
                        onChange={(e) => setIsBackfill(e.target.checked)}
                    />
                    <label htmlFor="rr-backfill" className="text-sm font-medium text-text cursor-pointer">
                        This is a backfill request
                    </label>
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
                        {submitting ? (
                            <span className="spinner w-4 h-4" />
                        ) : (
                            'Create Request'
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function ResourceRequests() {
    const [requests, setRequests] = useState<ResourceRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Filters
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        try {
            const data = await resourceRequestsApi.list({
                ...(statusFilter ? { status: statusFilter } : {}),
                ...(priorityFilter ? { priority: priorityFilter } : {}),
            });
            setRequests(data);
        } catch {
            // error toast handled globally
        } finally {
            setLoading(false);
        }
    }, [statusFilter, priorityFilter]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleStatusChange = async (id: number, status: RequestStatus) => {
        try {
            await resourceRequestsApi.updateStatus(id, status);
            toast.success(`Status updated to ${status}`);
            fetchRequests();
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

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text">Resource Requests</h1>
                    <p className="text-sm text-text-muted mt-1">
                        Track and manage all staffing requests
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn btn-cta shrink-0"
                    id="new-request-btn"
                >
                    <Plus size={18} /> New Request
                </button>
            </div>

            {/* Filter Bar */}
            <div className="card flex flex-wrap gap-3 items-end">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-text-muted">Status</label>
                    <select
                        className="input-field w-40"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        id="filter-status"
                        aria-label="Filter by status"
                    >
                        <option value="">All Statuses</option>
                        <option value="OPEN">Open</option>
                        <option value="HOLD">On Hold</option>
                        <option value="CLOSED">Closed</option>
                    </select>
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-text-muted">Priority</label>
                    <select
                        className="input-field w-40"
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        id="filter-priority"
                        aria-label="Filter by priority"
                    >
                        <option value="">All Priorities</option>
                        <option value="URGENT">Urgent</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                    </select>
                </div>
                <button
                    onClick={() => { setStatusFilter(''); setPriorityFilter(''); }}
                    className="btn btn-ghost btn-sm text-text-muted"
                    title="Clear filters"
                >
                    Clear
                </button>
                <button
                    onClick={fetchRequests}
                    className="btn btn-ghost btn-icon ml-auto"
                    title="Refresh"
                    id="refresh-requests-btn"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Data Table */}
            <div className="card p-0 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <div className="spinner w-8 h-8" />
                    </div>
                ) : requests.length === 0 ? (
                    <EmptyState
                        message="No resource requests found."
                        action={
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="btn btn-cta btn-sm"
                            >
                                <Plus size={14} /> Create your first request
                            </button>
                        }
                    />
                ) : (
                    <div className="table-container border-none">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Request ID</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                    <th>Source</th>
                                    <th>Backfill</th>
                                    <th>Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map((req) => (
                                    <tr key={req.id}>
                                        <td>
                                            <span className="font-mono text-sm font-semibold text-cta">
                                                {req.request_display_id}
                                            </span>
                                        </td>
                                        <td>
                                            <StatusBadge value={req.priority} type="priority" />
                                        </td>
                                        <td>
                                            <StatusDropdown
                                                request={req}
                                                onStatusChange={handleStatusChange}
                                            />
                                        </td>
                                        <td className="text-text-muted">{req.source ?? '—'}</td>
                                        <td>
                                            {req.is_backfill ? (
                                                <span className="badge badge-warning">Backfill</span>
                                            ) : (
                                                <span className="text-text-muted text-sm">No</span>
                                            )}
                                        </td>
                                        <td className="text-text-muted text-sm">
                                            {formatDate(req.created_at)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Row Count */}
            {!loading && requests.length > 0 && (
                <p className="text-xs text-text-muted text-right">
                    {requests.length} request{requests.length !== 1 ? 's' : ''}
                </p>
            )}

            {/* Create Modal */}
            <CreateRequestModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreated={fetchRequests}
            />
        </div>
    );
}
