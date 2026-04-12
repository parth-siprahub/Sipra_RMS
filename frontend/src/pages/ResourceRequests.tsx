import React, { useEffect, useState, useCallback } from 'react';
import { Plus, RefreshCw, ChevronDown, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { resourceRequestsApi } from '../api/resourceRequests';
import type {
    ResourceRequest,
    RequestStatus,
    RequestPriority,
    CreateResourceRequestPayload,
} from '../api/resourceRequests';

import { Modal } from '../components/ui/Modal';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { TableRowSkeleton } from '../components/ui/Skeleton';
import { sowApi, type SOW } from '../api/sows';
import { jobProfileApi, type JobProfile } from '../api/jobProfiles';

// ─── Status Transition Map ────────────────────────────────────────────────────
const STATUS_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
    OPEN: ['HOLD', 'CLOSED'],
    HOLD: ['OPEN', 'CLOSED'],
    CLOSED: ['OPEN'],  // Allow reopening
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
    const [sows, setSows] = useState<SOW[]>([]);
    const [jobProfiles, setJobProfiles] = useState<JobProfile[]>([]);
    const [sowId, setSowId] = useState<number | ''>('');
    const [jobProfileId, setJobProfileId] = useState<number | ''>('');
    const [priority, setPriority] = useState<RequestPriority>('MEDIUM');
    const [isBackfill, setIsBackfill] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchData = async () => {
                try {
                    const [sowsRes, profilesRes] = await Promise.all([
                        sowApi.list(),
                        jobProfileApi.list()
                    ]);
                    setSows(sowsRes.filter(s => s.is_active !== false));
                    setJobProfiles(profilesRes);
                } catch (error) {
                    console.error('Failed to fetch master data:', error);
                }
            };
            fetchData();
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sowId || !jobProfileId) {
            toast.error('SOW and Job Profile are required');
            return;
        }
        setSubmitting(true);
        try {
            const payload: CreateResourceRequestPayload = {
                priority,
                is_backfill: isBackfill,
                sow_id: Number(sowId),
                job_profile_id: Number(jobProfileId),
            };
            await resourceRequestsApi.create(payload);
            toast.success('Resource request created!');
            onCreated();
            onClose();
            // reset
            setSowId('');
            setJobProfileId('');
            setPriority('MEDIUM');
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
                {/* SOW Selection */}
                <div>
                    <label className="input-label" htmlFor="rr-sow">
                        Statement of Work (SOW) <span className="text-danger">*</span>
                    </label>
                    <select
                        id="rr-sow"
                        className="input-field"
                        value={sowId}
                        onChange={(e) => {
                            const selectedSowId = e.target.value ? Number(e.target.value) : '';
                            setSowId(selectedSowId);
                            // Auto-select the SOW's linked job profile, or first available
                            if (selectedSowId) {
                                const selectedSow = sows.find(s => s.id === selectedSowId);
                                if (selectedSow?.job_profile_id) {
                                    setJobProfileId(selectedSow.job_profile_id);
                                } else if (jobProfiles.length > 0 && !jobProfileId) {
                                    setJobProfileId(jobProfiles[0].id);
                                }
                            }
                        }}
                        required
                    >
                        <option value="">— Select SOW —</option>
                        {sows.map((s) => {
                            const linkedProfile = s.job_profile_id
                                ? jobProfiles.find(p => p.id === s.job_profile_id)
                                : null;
                            return (
                                <option key={s.id} value={s.id}>
                                    {s.sow_number} - {s.client_name}{linkedProfile ? ` (${linkedProfile.role_name})` : ''}
                                </option>
                            );
                        })}
                    </select>
                </div>

                {/* Job Profile Selection */}
                <div>
                    <label className="input-label" htmlFor="rr-profile">
                        Job Profile <span className="text-danger">*</span>
                    </label>
                    <select
                        id="rr-profile"
                        className="input-field"
                        value={jobProfileId}
                        onChange={(e) => setJobProfileId(e.target.value ? Number(e.target.value) : '')}
                        required
                    >
                        <option value="">— Select Profile —</option>
                        {jobProfiles.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.role_name} ({p.technology})
                            </option>
                        ))}
                    </select>
                </div>

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
                                {p.charAt(0) + p.slice(1).toLowerCase()}
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

// ─── Edit Request Modal ──────────────────────────────────────────────────────
interface EditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdated: () => void;
    request: ResourceRequest | null;
}

function EditRequestModal({ isOpen, onClose, onUpdated, request }: EditModalProps) {
    const [sows, setSows] = useState<SOW[]>([]);
    const [jobProfiles, setJobProfiles] = useState<JobProfile[]>([]);
    const [sowId, setSowId] = useState<number | ''>('');
    const [jobProfileId, setJobProfileId] = useState<number | ''>('');
    const [priority, setPriority] = useState<RequestPriority>('MEDIUM');
    const [isBackfill, setIsBackfill] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Pre-populate fields when request changes
    useEffect(() => {
        if (isOpen && request) {
            setSowId(request.sow_id ?? '');
            setJobProfileId(request.job_profile_id ?? '');
            setPriority((request.priority as RequestPriority) ?? 'MEDIUM');
            setIsBackfill(request.is_backfill ?? false);

            const fetchData = async () => {
                try {
                    const [sowsRes, profilesRes] = await Promise.all([
                        sowApi.list(),
                        jobProfileApi.list()
                    ]);
                    setSows(sowsRes.filter(s => s.is_active !== false));
                    setJobProfiles(profilesRes);
                } catch (error) {
                    console.error('Failed to fetch master data:', error);
                }
            };
            fetchData();
        }
    }, [isOpen, request]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!request) return;
        if (!sowId || !jobProfileId) {
            toast.error('SOW and Job Profile are required');
            return;
        }
        setSubmitting(true);
        try {
            await resourceRequestsApi.update(request.id, {
                priority,
                is_backfill: isBackfill,
                sow_id: Number(sowId),
                job_profile_id: Number(jobProfileId),
            });
            toast.success('Resource request updated!');
            onUpdated();
            onClose();
        } catch {
            // error toast handled by client.ts
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Resource Request">
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* SOW Selection */}
                <div>
                    <label className="input-label" htmlFor="edit-rr-sow">
                        Statement of Work (SOW) <span className="text-danger">*</span>
                    </label>
                    <select
                        id="edit-rr-sow"
                        className="input-field"
                        value={sowId}
                        onChange={(e) => {
                            const selectedSowId = e.target.value ? Number(e.target.value) : '';
                            setSowId(selectedSowId);
                            if (selectedSowId) {
                                const selectedSow = sows.find(s => s.id === selectedSowId);
                                if (selectedSow?.job_profile_id) {
                                    setJobProfileId(selectedSow.job_profile_id);
                                }
                            }
                        }}
                        required
                    >
                        <option value="">— Select SOW —</option>
                        {sows.map((s) => {
                            const linkedProfile = s.job_profile_id
                                ? jobProfiles.find(p => p.id === s.job_profile_id)
                                : null;
                            return (
                                <option key={s.id} value={s.id}>
                                    {s.sow_number} - {s.client_name}{linkedProfile ? ` (${linkedProfile.role_name})` : ''}
                                </option>
                            );
                        })}
                    </select>
                </div>

                {/* Job Profile Selection */}
                <div>
                    <label className="input-label" htmlFor="edit-rr-profile">
                        Job Profile <span className="text-danger">*</span>
                    </label>
                    <select
                        id="edit-rr-profile"
                        className="input-field"
                        value={jobProfileId}
                        onChange={(e) => setJobProfileId(e.target.value ? Number(e.target.value) : '')}
                        required
                    >
                        <option value="">— Select Profile —</option>
                        {jobProfiles.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.role_name} ({p.technology})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Priority */}
                <div>
                    <label className="input-label" htmlFor="edit-rr-priority">
                        Priority <span className="text-danger">*</span>
                    </label>
                    <select
                        id="edit-rr-priority"
                        className="input-field"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as RequestPriority)}
                        required
                    >
                        {(['URGENT', 'HIGH', 'MEDIUM', 'LOW'] as RequestPriority[]).map((p) => (
                            <option key={p} value={p}>
                                {p.charAt(0) + p.slice(1).toLowerCase()}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Backfill */}
                <div className="flex items-center gap-3">
                    <input
                        id="edit-rr-backfill"
                        type="checkbox"
                        className="w-4 h-4 accent-cta cursor-pointer"
                        checked={isBackfill}
                        onChange={(e) => setIsBackfill(e.target.checked)}
                    />
                    <label htmlFor="edit-rr-backfill" className="text-sm font-medium text-text cursor-pointer">
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
                            'Save Changes'
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
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingRequest, setEditingRequest] = useState<ResourceRequest | null>(null);
    const [jobProfiles, setJobProfiles] = useState<JobProfile[]>([]);
    const [sows, setSows] = useState<SOW[]>([]);

    // Filters
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        try {
            const [reqData, profilesRes, sowsRes] = await Promise.all([
                resourceRequestsApi.list({
                    ...(statusFilter ? { status: statusFilter } : {}),
                    ...(priorityFilter ? { priority: priorityFilter } : {}),
                    ...(debouncedSearch ? { search: debouncedSearch } : {}),
                }),
                jobProfileApi.list(),
                sowApi.list()
            ]);
            setRequests(reqData);
            setJobProfiles(profilesRes);
            setSows(sowsRes);
        } catch {
            // error toast handled globally
        } finally {
            setLoading(false);
        }
    }, [statusFilter, priorityFilter, debouncedSearch]);

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


    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <p className="text-sm text-text-muted">
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
                <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                    <label className="text-xs font-medium text-text-muted">Search</label>
                    <div className="relative">
                        <input
                            type="text"
                            className="input-field pl-9"
                            placeholder="Search by ID, SOW, Client, Role..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                            <span className="text-sm">🔍</span>
                        </div>
                    </div>
                </div>
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
                {!loading && requests.length > 0 && (
                    <span className="ml-2 text-xs font-semibold text-text-muted bg-surface-hover px-3 py-1.5 rounded-full border border-border">
                        {requests.length} total
                    </span>
                )}
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
                    <div className="divide-y divide-border/50">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <TableRowSkeleton key={i} />
                        ))}
                    </div>
                ) : requests.length === 0 ? (
                    <div className="p-8">
                        <EmptyState
                            title="No Staffing Requests"
                            message="All clear! There are no active or pending resource requests at the moment."
                            action={
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="btn btn-cta btn-sm"
                                >
                                    <Plus size={14} /> Create your first request
                                </button>
                            }
                        />
                    </div>
                ) : (
                    <div className="table-container border-none max-h-[70vh] overflow-y-auto overflow-x-auto custom-scrollbar">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Request ID</th>
                                    <th>SOW / Client</th>
                                    <th>Role</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                    <th>Actions</th>
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
                                            <div className="flex flex-col">
                                                <span className="font-medium text-text">
                                                    {sows.find(s => s.id === req.sow_id)?.sow_number || 'Internal'}
                                                </span>
                                                <span className="text-xs text-text-muted">
                                                    {sows.find(s => s.id === req.sow_id)?.client_name || '—'}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="font-medium text-text">
                                                {jobProfiles.find(p => p.id === req.job_profile_id)?.role_name || 'Unknown Role'}
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
                                        <td className="whitespace-nowrap">
                                            <span className="text-xs text-text-muted">
                                                {req.created_at ? new Date(req.created_at).toLocaleDateString() : '—'}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                onClick={() => {
                                                    setEditingRequest(req);
                                                    setIsEditModalOpen(true);
                                                }}
                                                className="btn btn-ghost btn-icon"
                                                title="Edit request"
                                                aria-label={`Edit ${req.request_display_id}`}
                                            >
                                                <Pencil size={14} />
                                            </button>
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

            {/* Edit Modal */}
            <EditRequestModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setEditingRequest(null);
                }}
                onUpdated={fetchRequests}
                request={editingRequest}
            />
        </div>
    );
}
