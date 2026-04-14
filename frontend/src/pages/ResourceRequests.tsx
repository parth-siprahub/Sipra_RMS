import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, ChevronDown, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { resourceRequestsApi } from '../api/resourceRequests';
import type {
    ResourceRequest,
    RequestStatus,
} from '../api/resourceRequests';

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

// ─── Main Page ────────────────────────────────────────────────────────────────
export function ResourceRequests() {
    const navigate = useNavigate();
    const [requests, setRequests] = useState<ResourceRequest[]>([]);
    const [loading, setLoading] = useState(true);
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
                    onClick={() => navigate('/resource-requests/create')}
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
                                    onClick={() => navigate('/resource-requests/create')}
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
                                                onClick={() => navigate(`/resource-requests/${req.id}/edit`)}
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

        </div>
    );
}
