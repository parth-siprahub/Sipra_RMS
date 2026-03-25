import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, RefreshCw, LayoutGrid, List } from 'lucide-react';
import toast from 'react-hot-toast';
import { candidatesApi } from '../api/candidates';
import { resourceRequestsApi } from '../api/resourceRequests';
import type {
    Candidate,
    CandidateStatus,
    CandidateSource,
    CreateCandidatePayload,
} from '../api/candidates';
import type { ResourceRequest } from '../api/resourceRequests';
import { vendorsApi, type Vendor } from '../api/vendors';
import { sowApi, type SOW } from '../api/sows';
import { jobProfileApi, type JobProfile } from '../api/jobProfiles';

import { Modal } from '../components/ui/Modal';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton, KanbanColumnSkeleton, TableRowSkeleton } from '../components/ui/Skeleton';
import { communicationLogApi, type CommunicationLog } from '../api/communicationLogs';
import { cn } from '../lib/utils';
import {
    User,
    Mail,
    Phone,
    Building2,
    Briefcase,
    Calendar,
    MapPin,
    MessageSquare,
    Link as LinkIcon,
    History
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

// Ordered pipeline stages shown as kanban columns
// Flow: New → Screening → L1 → L2 → Selected → Admin → Client → Submitted → Onboarded
const PIPELINE_STAGES: CandidateStatus[] = [
    'NEW',
    'SCREENING',
    'L1_SCHEDULED',
    'L1_COMPLETED',
    'L1_SHORTLIST',
    'INTERVIEW_SCHEDULED',
    'SELECTED',
    'WITH_ADMIN',
    'WITH_CLIENT',
    'SUBMITTED_TO_ADMIN',
    'ONBOARDED',
];

const CLOSED_STAGES: CandidateStatus[] = [
    'REJECTED_BY_ADMIN',
    'REJECTED_BY_CLIENT',
    'SCREEN_REJECT',
    'L1_REJECT',
    'INTERVIEW_BACK_OUT',
    'OFFER_BACK_OUT',
    'ON_HOLD',
    'EXIT',
];

// Short label for kanban column headers
const STAGE_LABELS: Record<CandidateStatus, string> = {
    NEW: 'New',
    SCREENING: 'Screening',
    SUBMITTED_TO_ADMIN: 'Submitted',
    WITH_ADMIN: 'With Admin',
    REJECTED_BY_ADMIN: 'Rejected (Admin)',
    WITH_CLIENT: 'With Client',
    L1_SCHEDULED: 'L1 Scheduled',
    L1_COMPLETED: 'L1 Completed',
    L1_SHORTLIST: 'L1 Shortlist',
    L1_REJECT: 'L1 Reject',
    INTERVIEW_SCHEDULED: 'L2 / Interview',
    SELECTED: 'Selected',
    ONBOARDED: 'Onboarded',
    REJECTED_BY_CLIENT: 'Rejected (Client)',
    ON_HOLD: 'On Hold',
    SCREEN_REJECT: 'Screen Reject',
    INTERVIEW_BACK_OUT: 'Interview Back-out',
    OFFER_BACK_OUT: 'Offer Back-out',
    EXIT: 'Exit',
};

// Column accent colours matching design-tokens.css status vars
const STAGE_COLORS: Record<string, string> = {
    NEW: 'border-[#3B82F6]',
    SCREENING: 'border-[#60A5FA]',
    SUBMITTED_TO_ADMIN: 'border-[#8B5CF6]',
    WITH_ADMIN: 'border-[#F59E0B]',
    WITH_CLIENT: 'border-[#06B6D4]',
    L1_SCHEDULED: 'border-[#A855F7]',
    L1_COMPLETED: 'border-[#7C3AED]',
    L1_SHORTLIST: 'border-[#2DD4BF]',
    L1_REJECT: 'border-[#F43F5E]',
    INTERVIEW_SCHEDULED: 'border-[#EC4899]',
    SELECTED: 'border-[#22C55E]',
    ONBOARDED: 'border-[#10B981]',
    REJECTED_BY_ADMIN: 'border-[#EF4444]',
    REJECTED_BY_CLIENT: 'border-[#EF4444]',
    SCREEN_REJECT: 'border-[#DC2626]',
    INTERVIEW_BACK_OUT: 'border-[#FB923C]',
    OFFER_BACK_OUT: 'border-[#F97316]',
    ON_HOLD: 'border-[#6B7280]',
    EXIT: 'border-[#F97316]',
};

// ─── Kanban Board ─────────────────────────────────────────────────────────────

interface KanbanBoardProps {
    candidates: Candidate[];
    vendors: Vendor[];
    onStatusChange: (id: number, status: CandidateStatus) => void;
    onCandidateClick: (candidate: Candidate) => void;
}

function KanbanBoard({ candidates, vendors, onStatusChange, onCandidateClick }: KanbanBoardProps) {
    const draggingIdRef = useRef<number | null>(null);
    const [draggingId, setDraggingId] = useState<number | null>(null);
    const [dragOverStatus, setDragOverStatus] = useState<CandidateStatus | null>(null);

    const grouped = (stages: CandidateStatus[]) =>
        stages.reduce<Record<string, Candidate[]>>((acc, s) => {
            acc[s] = candidates.filter((c) => c.status === s);
            return acc;
        }, {});

    const pipelineGroups = grouped(PIPELINE_STAGES);
    const closedGroups = grouped(CLOSED_STAGES);

    const handleDragStart = (e: React.DragEvent, id: number) => {
        draggingIdRef.current = id;
        setDraggingId(id);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(id));
    };

    const handleDragOver = (e: React.DragEvent, status: CandidateStatus) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverStatus !== status) {
            setDragOverStatus(status);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        // Only clear if we're actually leaving the column (not entering a child)
        const relatedTarget = e.relatedTarget as HTMLElement | null;
        if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
            setDragOverStatus(null);
        }
    };

    const handleDrop = (e: React.DragEvent, targetStatus: CandidateStatus) => {
        e.preventDefault();
        setDragOverStatus(null);
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

    const handleDragEnd = () => {
        setDraggingId(null);
        setDragOverStatus(null);
        draggingIdRef.current = null;
    };

    const renderColumn = (status: CandidateStatus, items: Candidate[]) => {
        const isDragOver = dragOverStatus === status;
        const isDraggingFromThis = draggingId !== null && candidates.find(c => c.id === draggingId)?.status === status;

        return (
            <div
                key={status}
                className={cn(
                    'flex flex-col min-w-[220px] w-[220px] bg-surface rounded-xl border-t-2 border border-border shrink-0 transition-all duration-200',
                    STAGE_COLORS[status],
                    isDragOver && !isDraggingFromThis && 'ring-2 ring-cta/50 border-cta/40 bg-cta/5 scale-[1.02]',
                    isDragOver && isDraggingFromThis && 'ring-1 ring-border'
                )}
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status)}
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
                <div className={cn(
                    'flex-1 p-2 space-y-2 min-h-[120px] transition-colors duration-200',
                    isDragOver && !isDraggingFromThis && 'bg-cta/5'
                )}>
                    {items.length === 0 && (
                        <div className={cn(
                            'h-16 border-2 border-dashed rounded-lg flex items-center justify-center transition-all duration-200',
                            isDragOver ? 'border-cta/50 bg-cta/10 text-cta' : 'border-border'
                        )}>
                            <span className="text-xs text-text-muted">
                                {isDragOver ? 'Release to drop' : 'Drop here'}
                            </span>
                        </div>
                    )}
                    {items.map((c) => (
                        <div
                            key={c.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, c.id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => onCandidateClick(c)}
                            className={cn(
                                'card p-3 cursor-grab active:cursor-grabbing select-none transition-all duration-150 hover:border-cta',
                                draggingId === c.id && 'opacity-40 scale-95 shadow-none'
                            )}
                        >
                            <p className="text-sm font-semibold text-text truncate">
                                {c.first_name} {c.last_name}
                            </p>
                            <p className="text-xs text-text-muted truncate mt-0.5">{c.email}</p>
                            {c.current_company && (
                                <p className="text-xs text-text-muted truncate">{c.current_company}</p>
                            )}
                            <span className="badge badge-neutral mt-2 text-[10px]">
                                {vendors.find(v => v.id === c.vendor_id)?.name || c.vendor || 'INTERNAL'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

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

// ─── Details Modal ──────────────────────────────────────────────────────────

interface DetailsModalProps {
    candidate: Candidate | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdated: () => void;
    vendors: Vendor[];
    onStatusChange: (id: number, status: CandidateStatus) => void;
}

// All valid statuses for the manual status dropdown
const ALL_CANDIDATE_STATUSES: CandidateStatus[] = [...PIPELINE_STAGES, ...CLOSED_STAGES];

function CandidateDetailsModal({ candidate, isOpen, onClose, onUpdated, vendors, onStatusChange }: DetailsModalProps) {
    const [activeTab, setActiveTab] = useState<'info' | 'interview' | 'transition'>('info');
    const [submitting, setSubmitting] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Candidate>>({});
    const [logs, setLogs] = useState<CommunicationLog[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [changingStatus, setChangingStatus] = useState(false);

    useEffect(() => {
        if (candidate && isOpen) {
            setEditForm({
                l1_feedback: candidate.l1_feedback || '',
                l1_score: candidate.l1_score || 0,
                l2_feedback: candidate.l2_feedback || '',
                l2_score: candidate.l2_score || 0,
                overlap_until: candidate.overlap_until || '',
                remarks: candidate.remarks || '',
            });
            fetchLogs();
        }
    }, [candidate, isOpen]);

    const fetchLogs = async () => {
        if (!candidate) return;
        setLoadingLogs(true);
        try {
            const data = await communicationLogApi.list({ candidate_id: candidate.id });
            setLogs(data);
        } catch {
            // silent
        } finally {
            setLoadingLogs(false);
        }
    };

    if (!candidate) return null;

    const handleManualStatusChange = async (newStatus: CandidateStatus) => {
        if (!candidate || newStatus === candidate.status) return;
        setChangingStatus(true);
        try {
            await onStatusChange(candidate.id, newStatus);
        } finally {
            setChangingStatus(false);
        }
    };

    const handleUpdate = async () => {
        setSubmitting(true);
        try {
            await candidatesApi.update(candidate.id, editForm);
            toast.success('Candidate updated');
            onUpdated();
            onClose();
        } catch {
            // error
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`${candidate.first_name} ${candidate.last_name}`}
            maxWidth="max-w-2xl"
        >
            <div className="space-y-6">
                {/* Status Changer */}
                <div className="flex items-center gap-3 px-1">
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider shrink-0">
                        Status
                    </span>
                    <div className="flex items-center gap-2 flex-1">
                        <StatusBadge value={candidate.status} type="candidate" />
                        <span className="text-text-muted text-xs">→</span>
                        <select
                            className="input-field text-sm py-1.5 flex-1 max-w-[220px]"
                            value={candidate.status || ''}
                            onChange={(e) => handleManualStatusChange(e.target.value as CandidateStatus)}
                            disabled={changingStatus}
                            aria-label="Change candidate status"
                        >
                            {ALL_CANDIDATE_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                    {STAGE_LABELS[s]}
                                </option>
                            ))}
                        </select>
                        {changingStatus && <span className="spinner w-4 h-4" />}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border">
                    {([
                        { id: 'info', label: 'Candidate Info' },
                        { id: 'interview', label: 'Interview Audit' },
                        { id: 'transition', label: 'Transition' },
                    ] as const).map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={cn(
                                'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                                activeTab === t.id
                                    ? 'border-cta text-cta'
                                    : 'border-transparent text-text-muted hover:text-text'
                            )}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="min-h-[300px]">
                    {activeTab === 'info' && (
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <h4 className="text-xs font-bold text-text-muted uppercase mb-3">Basic Details</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-text-muted">Email</span>
                                        <span className="text-sm font-medium text-text">{candidate.email}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-text-muted">Phone</span>
                                        <span className="text-sm font-medium text-text">{candidate.phone || '—'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-text-muted">Vendor</span>
                                        <span className="badge badge-neutral">
                                            {vendors.find(v => v.id === candidate.vendor_id)?.name || candidate.vendor || 'INTERNAL'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-text-muted uppercase mb-3">Professional</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-text-muted">Current Co</span>
                                        <span className="text-sm font-medium text-text">{candidate.current_company || '—'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-text-muted">Exp (Total/Rel)</span>
                                        <span className="text-sm font-medium text-text">
                                            {candidate.total_experience || 0}y / {candidate.relevant_experience || 0}y
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'interview' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <label className="input-label">L1 Feedback</label>
                                    <textarea
                                        className="input-field min-h-[100px] text-sm"
                                        value={editForm.l1_feedback || ''}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, l1_feedback: e.target.value }))}
                                        placeholder="Enter technical interview notes..."
                                    />
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-medium text-text-muted">L1 Score (0-10):</label>
                                        <input
                                            type="number"
                                            className="input-field w-16 py-1 px-2 text-xs"
                                            min={0} max={10}
                                            value={editForm.l1_score || 0}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, l1_score: parseInt(e.target.value) }))}
                                            title="L1 Score"
                                        />
                                    </div>
                                    <div className="bg-surface p-3 rounded-xl border border-border hover:border-cta/30 transition-all">
                                        <label 
                                            className="text-[11px] font-semibold text-text-muted block mb-2"
                                            htmlFor="l1-feedback-file"
                                        >
                                            L1 Feedback File (PDF/DOCX)
                                        </label>
                                        {candidate.l1_feedback_file_url && (
                                            <p className="text-[10px] text-cta mb-1.5 truncate">
                                                Current: {candidate.l1_feedback_file_url}
                                            </p>
                                        )}
                                        <input
                                            id="l1-feedback-file"
                                            type="file"
                                            accept=".pdf,.doc,.docx"
                                            title="L1 Feedback File"
                                            className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-surface-hover file:text-cta hover:file:bg-cta/10 file:cursor-pointer transition-all w-full"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setEditForm(prev => ({ ...prev, l1_feedback_file_url: file.name }));
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="input-label">L2 Feedback</label>
                                    <textarea
                                        className="input-field min-h-[100px] text-sm"
                                        value={editForm.l2_feedback || ''}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, l2_feedback: e.target.value }))}
                                        placeholder="Enter client interview notes..."
                                    />
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-medium text-text-muted">L2 Score (0-10):</label>
                                        <input
                                            type="number"
                                            className="input-field w-16 py-1 px-2 text-xs"
                                            min={0} max={10}
                                            value={editForm.l2_score || 0}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, l2_score: parseInt(e.target.value) }))}
                                            title="L2 Score"
                                        />
                                    </div>
                                    <div className="bg-surface p-3 rounded-xl border border-border hover:border-cta/30 transition-all">
                                        <label 
                                            className="text-[11px] font-semibold text-text-muted block mb-2"
                                            htmlFor="l2-feedback-file"
                                        >
                                            L2 Feedback File (PDF/DOCX)
                                        </label>
                                        {candidate.l2_feedback_file_url && (
                                            <p className="text-[10px] text-cta mb-1.5 truncate">
                                                Current: {candidate.l2_feedback_file_url}
                                            </p>
                                        )}
                                        <input
                                            id="l2-feedback-file"
                                            type="file"
                                            accept=".pdf,.doc,.docx"
                                            title="L2 Feedback File"
                                            className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-surface-hover file:text-cta hover:file:bg-cta/10 file:cursor-pointer transition-all w-full"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setEditForm(prev => ({ ...prev, l2_feedback_file_url: file.name }));
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'transition' && (
                        <div className="space-y-4 max-w-sm">
                            <div className="space-y-3">
                                <label className="input-label flex items-center gap-2">
                                    <Calendar size={14} className="text-cta" />
                                    Overlap Until (Transition Period)
                                </label>
                                <input
                                    type="date"
                                    className="input-field"
                                    value={editForm.overlap_until || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, overlap_until: e.target.value }))}
                                    title="Overlap Until"
                                />
                                <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/10">
                                    <p className="text-[11px] text-text-muted leading-relaxed">
                                        Specify a date if this candidate is serving as a backfill.
                                        This helps in calculating resource overlap and dual-budget requirements.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Interaction Logs (Always visible at bottom) */}
                <div className="pt-6 border-t border-border">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-wider">
                            <History size={14} className="text-cta" />
                            Recent Interaction Logs
                        </h4>
                        <span className="text-[10px] font-medium bg-surface-hover px-2 py-0.5 rounded-full text-text-muted">
                            {logs.length} Total
                        </span>
                    </div>

                    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                        {loadingLogs ? (
                            <div className="space-y-2">
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="text-center py-6 border-2 border-dashed border-border rounded-xl">
                                <MessageSquare size={20} className="mx-auto text-text-muted opacity-20 mb-2" />
                                <p className="text-xs text-text-muted">No interactions logged yet.</p>
                            </div>
                        ) : (
                            logs.slice(0, 5).map(log => (
                                <div key={log.id} className="log-item group">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[10px] font-bold text-cta uppercase tracking-tight">
                                            {log.log_type}
                                        </span>
                                        <span className="text-[10px] text-text-muted tabular-nums">
                                            {new Date(log.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-xs text-text leading-relaxed">
                                        {log.message}
                                    </p>
                                    {log.external_contact_name && (
                                        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-text-muted italic">
                                            <span className="w-1 h-1 rounded-full bg-border" />
                                            With {log.external_contact_name}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                        {logs.length > 5 && (
                            <button className="w-full text-center py-2 text-[10px] font-semibold text-cta hover:underline">
                                View all {logs.length} logs
                            </button>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex gap-3 pt-4 border-t border-border">
                    <button onClick={onClose} className="btn btn-secondary flex-1">Close</button>
                    <button
                        onClick={handleUpdate}
                        className="btn btn-cta flex-1"
                        disabled={submitting}
                    >
                        {submitting ? <span className="spinner w-4 h-4" /> : 'Save Changes'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

// ─── Create Candidate Modal ───────────────────────────────────────────────────

interface CreateCandidateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
    requests: ResourceRequest[];
    vendors: Vendor[];
    sows: SOW[];
    jobProfiles: JobProfile[];
}

function CreateCandidateModal({ isOpen, onClose, onCreated, requests, vendors, sows, jobProfiles }: CreateCandidateModalProps) {
    const emptyForm = (): CreateCandidatePayload => ({
        first_name: '',
        last_name: '',
        email: '',
        vendor_id: undefined,
        request_id: undefined,
    });

    const [form, setForm] = useState<CreateCandidatePayload>(emptyForm());
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const set = (field: keyof CreateCandidatePayload, value: unknown) =>
        setForm((f) => ({ ...f, [field]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const candidate = await candidatesApi.create(form);

            if (resumeFile && candidate.id) {
                try {
                    await candidatesApi.uploadResume(candidate.id, resumeFile);
                    toast.success('Candidate and Resume added!');
                } catch {
                    toast.error('Candidate added, but resume upload failed.');
                }
            } else {
                toast.success(`${form.first_name} ${form.last_name} added!`);
            }

            onCreated();
            onClose();
            setForm(emptyForm());
            setResumeFile(null);
        } catch {
            // toast handled by client.ts
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Candidate" maxWidth="max-w-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Linked Request Selection - Top priority */}
                <div className="bg-surface-active/30 p-4 rounded-xl border border-cta/10 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Briefcase size={16} className="text-cta" />
                        <span className="text-sm font-bold text-text">Staffing Connection</span>
                    </div>
                    <select
                        id="c-request"
                        className="input-field border-cta/20 focus:border-cta"
                        value={form.request_id || ''}
                        onChange={(e) => set('request_id', e.target.value ? parseInt(e.target.value) : undefined)}
                        title="Select Request"
                    >
                        <option value="">Global Talent Pool (No specific request)</option>
                        {requests.filter(r => r.status === 'OPEN').map(r => {
                            const jp = jobProfiles.find(p => p.id === r.job_profile_id);
                            return (
                                <option key={r.id} value={r.id}>
                                    {r.request_display_id} | Priority: {r.priority} | Role: {jp?.role_name || '—'}
                                </option>
                            );
                        })}
                    </select>
                    {form.request_id && (() => {
                        const selectedReq = requests.find(r => r.id === form.request_id);
                        const linkedSow = selectedReq ? sows.find(s => s.id === selectedReq.sow_id) : null;
                        const linkedJp = selectedReq ? jobProfiles.find(p => p.id === selectedReq.job_profile_id) : null;
                        return (
                            <div className="p-3 bg-surface-hover/50 rounded-lg border border-border space-y-1.5">
                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Request Context</p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                                    <span className="text-text-muted">SOW:</span>
                                    <span className="text-text font-medium">{linkedSow ? `${linkedSow.sow_number} — ${linkedSow.client_name}` : '—'}</span>
                                    <span className="text-text-muted">Job Profile:</span>
                                    <span className="text-text font-medium">{linkedJp ? `${linkedJp.role_name} (${linkedJp.technology})` : '—'}</span>
                                    <span className="text-text-muted">Max Resources:</span>
                                    <span className="text-text font-medium">{linkedSow?.max_resources ?? '—'}</span>
                                </div>
                            </div>
                        );
                    })()}
                    <p className="text-[10px] text-text-muted px-1">
                        Linking a candidate to a request helps track pipeline metrics more accurately.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-8">
                    {/* Left Column: Personal Info */}
                    <div className="space-y-5">
                        <h4 className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                            <User size={14} className="text-text-muted" />
                            Personal Information
                        </h4>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-text-muted px-1" htmlFor="c-first">
                                    First Name
                                </label>
                                <input
                                    id="c-first"
                                    className="input-field"
                                    placeholder="e.g. Rahul"
                                    required
                                    value={form.first_name}
                                    onChange={(e) => set('first_name', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-text-muted px-1" htmlFor="c-last">
                                    Last Name
                                </label>
                                <input
                                    id="c-last"
                                    className="input-field"
                                    placeholder="e.g. Sharma"
                                    required
                                    value={form.last_name}
                                    onChange={(e) => set('last_name', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-text-muted px-1 flex items-center gap-1" htmlFor="c-email">
                                <Mail size={12} /> Email Address
                            </label>
                            <input
                                id="c-email"
                                type="email"
                                className="input-field"
                                placeholder="name@company.com"
                                required
                                value={form.email}
                                onChange={(e) => set('email', e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-text-muted px-1 flex items-center gap-1" htmlFor="c-phone">
                                <Phone size={12} /> Phone Number
                            </label>
                            <input
                                id="c-phone"
                                className="input-field"
                                placeholder="+91 XXXX XXX XXX"
                                value={form.phone ?? ''}
                                onChange={(e) => set('phone', e.target.value || undefined)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-text-muted px-1 flex items-center gap-1" htmlFor="c-location">
                                <MapPin size={12} /> Current Location
                            </label>
                            <input
                                id="c-location"
                                className="input-field"
                                placeholder="e.g. Bengaluru, India"
                                value={form.current_location ?? ''}
                                onChange={(e) => set('current_location', e.target.value || undefined)}
                            />
                        </div>
                    </div>

                    {/* Right Column: Professional Info */}
                    <div className="space-y-5">
                        <h4 className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                            <Building2 size={14} className="text-text-muted" />
                            Professional Details
                        </h4>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-text-muted px-1 flex items-center gap-1" htmlFor="c-source">
                                <LinkIcon size={12} /> Source
                            </label>
                            <select
                                id="c-source"
                                className="input-field"
                                value={form.source || ''}
                                onChange={(e) => {
                                    const val = e.target.value as CandidateSource | '';
                                    set('source', val || undefined);
                                    // Clear vendor when source changes away from VENDORS
                                    if (val !== 'VENDORS') {
                                        set('vendor_id', undefined);
                                    }
                                }}
                                required
                                title="Select Source"
                            >
                                <option value="">— Select Source —</option>
                                {(['PORTAL', 'JOB_BOARDS', 'NETWORK', 'VENDORS', 'LINKEDIN', 'INTERNAL'] as CandidateSource[]).map((s) => (
                                    <option key={s} value={s}>
                                        {s.replace(/_/g, ' ')}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {form.source === 'VENDORS' && (
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-text-muted px-1 flex items-center gap-1" htmlFor="c-vendor">
                                    <Building2 size={12} /> Vendor
                                </label>
                                <select
                                    id="c-vendor"
                                    className="input-field"
                                    value={form.vendor_id || ''}
                                    onChange={(e) => set('vendor_id', e.target.value ? parseInt(e.target.value) : undefined)}
                                    title="Select Vendor"
                                >
                                    <option value="">— Select Vendor —</option>
                                    {vendors.filter(v => v.is_active).map((v) => (
                                        <option key={v.id} value={v.id}>
                                            {v.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-text-muted px-1" htmlFor="c-company">
                                Current Organization
                            </label>
                            <input
                                id="c-company"
                                className="input-field"
                                placeholder="e.g. Tech Solutions Inc."
                                value={form.current_company ?? ''}
                                onChange={(e) => set('current_company', e.target.value || undefined)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-text-muted px-1" htmlFor="c-total-exp">
                                    Total Exp (Yrs)
                                </label>
                                <input
                                    id="c-total-exp"
                                    type="number"
                                    min={0}
                                    step={0.5}
                                    className="input-field"
                                    value={form.total_experience ?? ''}
                                    onChange={(e) =>
                                        set('total_experience', e.target.value ? parseFloat(e.target.value) : undefined)
                                    }
                                    title="Total Exp"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-text-muted px-1" htmlFor="c-rel-exp">
                                    Relevant Exp
                                </label>
                                <input
                                    id="c-rel-exp"
                                    type="number"
                                    min={0}
                                    step={0.5}
                                    className="input-field"
                                    value={form.relevant_experience ?? ''}
                                    onChange={(e) =>
                                        set('relevant_experience', e.target.value ? parseFloat(e.target.value) : undefined)
                                    }
                                    title="Rel Exp"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-text-muted px-1" htmlFor="c-notice">
                                Notice Period (Days)
                            </label>
                            <input
                                id="c-notice"
                                type="number"
                                min={0}
                                className="input-field"
                                placeholder="e.g. 30"
                                value={form.notice_period ?? ''}
                                onChange={(e) =>
                                    set('notice_period', e.target.value ? parseInt(e.target.value) : undefined)
                                }
                                title="Notice Period"
                            />
                        </div>
                    </div>
                </div>

                {/* Skills & Resume - Full Width */}
                <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-text-muted px-1" htmlFor="c-skills">
                            Core Skillset (Comma separated)
                        </label>
                        <textarea
                            id="c-skills"
                            className="input-field resize-none min-h-[60px]"
                            rows={2}
                            placeholder="React, TypeScript, Node.js, AWS..."
                            value={form.skills ?? ''}
                            onChange={(e) => set('skills', e.target.value || undefined)}
                        />
                    </div>

                    <div className="bg-surface p-4 rounded-xl border border-border group hover:border-cta/30 transition-all">
                        <label className="text-[11px] font-semibold text-text-muted px-1 block mb-2" htmlFor="c-resume">
                            Resume Attachment (PDF/DOCX)
                        </label>
                        <input
                            id="c-resume"
                            type="file"
                            accept=".pdf,.doc,.docx"
                            title="Resume Attachment"
                            className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-surface-hover file:text-cta hover:file:bg-cta/10 file:cursor-pointer transition-all"
                            onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                        />
                    </div>
                </div>

                {/* Submit Actions */}
                <div className="flex gap-4 pt-4 border-t border-border">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-secondary flex-1 py-3"
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-cta flex-1 py-3 font-bold uppercase tracking-wider text-xs" disabled={submitting}>
                        {submitting ? <span className="spinner w-4 h-4" /> : 'Create Candidate Profile'}
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
    const [viewMode, setViewMode] = useState<ViewMode>('kanban'); // Default to kanban for better viz
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [requests, setRequests] = useState<ResourceRequest[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [sows, setSows] = useState<SOW[]>([]);
    const [jobProfiles, setJobProfiles] = useState<JobProfile[]>([]);

    const fetchCandidates = useCallback(async () => {
        setLoading(true);
        try {
            const [cData, rData, vData, sowData, jpData] = await Promise.all([
                candidatesApi.list(
                    statusFilter && viewMode === 'table' ? { status: statusFilter } : undefined
                ),
                resourceRequestsApi.list(),
                vendorsApi.list(),
                sowApi.list(),
                jobProfileApi.list()
            ]);
            setCandidates(cData);
            setRequests(rData);
            setVendors(vData || []);
            setSows(sowData || []);
            setJobProfiles(jpData || []);
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
            // Optimistically update the selected candidate so the details modal stays in sync
            setSelectedCandidate(prev =>
                prev && prev.id === id ? { ...prev, status } : prev
            );
            fetchCandidates();
        } catch (err: unknown) {
            const msg =
                err instanceof Error ? err.message : 'Status transition not allowed';
            toast.error(msg);
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
                    <p className="text-sm text-text-muted">
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
                <div className="space-y-6 animate-fade-in">
                    {viewMode === 'kanban' ? (
                        <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <KanbanColumnSkeleton key={i} />
                            ))}
                        </div>
                    ) : (
                        <div className="card p-0 overflow-hidden">
                            <div className="space-y-0">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                    <TableRowSkeleton key={i} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : candidates.length === 0 ? (
                <div className="card border-dashed border-2">
                    <EmptyState
                        title="Pipeline is Empty"
                        message="Start by adding candidates to your pipeline or moving them from the global pool."
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
                                        <tr
                                            key={c.id}
                                            className="cursor-pointer hover:bg-surface-hover transition-colors"
                                            onClick={() => { setSelectedCandidate(c); setIsDetailsOpen(true); }}
                                        >
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
                                                <span className="badge badge-neutral">
                                                    {vendors.find(v => v.id === c.vendor_id)?.name || c.vendor || '—'}
                                                </span>
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
                <KanbanBoard
                    candidates={candidates}
                    vendors={vendors}
                    onStatusChange={handleStatusChange}
                    onCandidateClick={(c) => { setSelectedCandidate(c); setIsDetailsOpen(true); }}
                />
            )}

            {/* Create Modal */}
            <CreateCandidateModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreated={fetchCandidates}
                requests={requests}
                vendors={vendors}
                sows={sows}
                jobProfiles={jobProfiles}
            />

            {/* Details Modal */}
            <CandidateDetailsModal
                candidate={selectedCandidate}
                isOpen={isDetailsOpen}
                onClose={() => { setIsDetailsOpen(false); setSelectedCandidate(null); }}
                onUpdated={fetchCandidates}
                vendors={vendors}
                onStatusChange={handleStatusChange}
            />
        </div>
    );
}
