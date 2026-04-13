import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, LayoutGrid, List, Download, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { candidatesApi } from '../api/candidates';
import { resourceRequestsApi } from '../api/resourceRequests';
import type {
    Candidate,
    CandidateStatus,
    CandidateSource,
    CreateCandidatePayload,
    ExitPayload,
} from '../api/candidates';
import type { ResourceRequest } from '../api/resourceRequests';
import { vendorsApi, type Vendor } from '../api/vendors';
import { sowApi, type SOW } from '../api/sows';
import { jobProfileApi, type JobProfile } from '../api/jobProfiles';

import { Modal } from '../components/ui/Modal';
import { ExitConfirmModal } from '../components/ui/ExitConfirmModal';
import { RevertExitModal } from '../components/ui/RevertExitModal';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton, KanbanColumnSkeleton, TableRowSkeleton } from '../components/ui/Skeleton';
import { communicationLogApi, type CommunicationLog } from '../api/communicationLogs';
import { exportCandidates } from '../api/exports';
import { cn } from '../lib/utils';
import { formatCandidateFullName } from '../lib/personNames';
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
export const STAGE_LABELS: Record<CandidateStatus, string> = {
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
    sows: SOW[];
    requests: ResourceRequest[];
    onStatusChange: (id: number, status: CandidateStatus) => void;
    onCandidateClick: (candidate: Candidate) => void;
    onExitRequest: (id: number) => void;
    onRevertExit: (id: number) => void;
}

function useDragScroll() {
    const ref = useRef<HTMLDivElement>(null);
    const isDown = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);

    const onMouseDown = (e: React.MouseEvent) => {
        if (!ref.current) return;
        isDown.current = true;
        startX.current = e.pageX - ref.current.offsetLeft;
        scrollLeft.current = ref.current.scrollLeft;
        ref.current.style.cursor = 'grabbing';
    };
    const onMouseLeave = () => {
        isDown.current = false;
        if (ref.current) ref.current.style.cursor = '';
    };
    const onMouseUp = () => {
        isDown.current = false;
        if (ref.current) ref.current.style.cursor = '';
    };
    const onMouseMove = (e: React.MouseEvent) => {
        if (!isDown.current || !ref.current) return;
        e.preventDefault();
        const x = e.pageX - ref.current.offsetLeft;
        const walk = (x - startX.current) * 1.2;
        ref.current.scrollLeft = scrollLeft.current - walk;
    };

    return { ref, onMouseDown, onMouseLeave, onMouseUp, onMouseMove };
}

function KanbanBoard({ candidates, vendors, sows, requests, onStatusChange, onCandidateClick, onExitRequest, onRevertExit }: KanbanBoardProps) {
    const draggingIdRef = useRef<number | null>(null);
    const [draggingId, setDraggingId] = useState<number | null>(null);
    const [dragOverStatus, setDragOverStatus] = useState<CandidateStatus | null>(null);
    const pipelineScroll = useDragScroll();
    const closedScroll = useDragScroll();

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
        // Enforce sequential pipeline movement
        const allowed = NEXT_STEP_TRANSITIONS[candidate.status as CandidateStatus] || [];
        if (!allowed.includes(targetStatus)) {
            toast.error(`Cannot jump from "${STAGE_LABELS[candidate.status as CandidateStatus]}" to "${STAGE_LABELS[targetStatus]}". Only the next step is allowed.`);
            setDraggingId(null);
            draggingIdRef.current = null;
            return;
        }
        // EXIT requires a confirmation modal — do not commit immediately
        if (targetStatus === 'EXIT') {
            onExitRequest(id);
        } else {
            onStatusChange(id, targetStatus);
        }
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
                    'flex-1 p-2 space-y-2 min-h-[120px] max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar transition-colors duration-200',
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
                            draggable={status !== 'EXIT'}
                            onDragStart={(e) => handleDragStart(e, c.id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => onCandidateClick(c)}
                            className={cn(
                                'card p-3 select-none transition-all duration-150 hover:border-cta',
                                status !== 'EXIT' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
                                draggingId === c.id && 'opacity-40 scale-95 shadow-none'
                            )}
                        >
                            <p className="text-sm font-semibold text-text truncate">
                                {formatCandidateFullName(c.first_name, c.last_name)}
                            </p>
                            {(() => {
                                const req = requests.find(r => r.id === c.request_id);
                                const sow = req ? sows.find(s => s.id === req.sow_id) : null;
                                return sow ? (
                                    <p className="text-xs text-text-muted truncate mt-0.5">{sow.sow_number}</p>
                                ) : status !== 'ONBOARDED' ? (
                                    <p className="text-xs text-text-muted truncate mt-0.5">{c.email}</p>
                                ) : null;
                                
                            })()}
                            {c.current_company && (
                                <p className="text-xs text-text-muted truncate">{c.current_company}</p>
                            )}
                            <span className="badge badge-neutral mt-2 text-[10px]">
                                {vendors.find(v => v.id === c.vendor_id)?.name || c.vendor || 'Internal'}
                            </span>
                            {status === 'EXIT' && (
                                <div className="mt-2 flex items-center justify-between">
                                    {c.last_working_day && (
                                        <span className="text-[10px] text-text-muted">
                                            LWD: {new Date(c.last_working_day).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onRevertExit(c.id); }}
                                        className="text-[10px] font-semibold text-warning hover:text-warning/70 transition-colors ml-auto"
                                        title="Revert exit — move back to Onboarded"
                                    >
                                        ↩ Revert
                                    </button>
                                </div>
                            )}
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
                <div
                    ref={pipelineScroll.ref}
                    className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar select-none"
                    style={{ cursor: 'grab' }}
                    onMouseDown={pipelineScroll.onMouseDown}
                    onMouseLeave={pipelineScroll.onMouseLeave}
                    onMouseUp={pipelineScroll.onMouseUp}
                    onMouseMove={pipelineScroll.onMouseMove}
                >
                    {PIPELINE_STAGES.map((s) => renderColumn(s, pipelineGroups[s]))}
                </div>
            </div>

            {/* Closed Columns */}
            <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                    Closed / Inactive
                </p>
                <div
                    ref={closedScroll.ref}
                    className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar select-none"
                    style={{ cursor: 'grab' }}
                    onMouseDown={closedScroll.onMouseDown}
                    onMouseLeave={closedScroll.onMouseLeave}
                    onMouseUp={closedScroll.onMouseUp}
                    onMouseMove={closedScroll.onMouseMove}
                >
                    {CLOSED_STAGES.map((s) => renderColumn(s, closedGroups[s]))}
                </div>
            </div>
        </div>
    );
}

// ─── Details Modal ──────────────────────────────────────────────────────────

export interface CandidateDetailsPanelProps {
    candidate: Candidate;
    onUpdated: () => void;
    onDismiss: () => void;
    vendors: Vendor[];
    requests: ResourceRequest[];
    onStatusChange: (id: number, status: CandidateStatus) => void;
}

// Allowed next-step transitions for pipeline enforcement
// Correct sequence: NEW → SCREENING → L1_SCHEDULED → L1_COMPLETED → L1_SHORTLIST
// → INTERVIEW_SCHEDULED → SELECTED → WITH_ADMIN → WITH_CLIENT → SUBMITTED_TO_ADMIN → ONBOARDED
const NEXT_STEP_TRANSITIONS: Record<CandidateStatus, CandidateStatus[]> = {
    NEW: ['SCREENING', 'SCREEN_REJECT'],
    SCREENING: ['L1_SCHEDULED', 'SCREEN_REJECT'],
    L1_SCHEDULED: ['L1_COMPLETED', 'L1_REJECT', 'INTERVIEW_BACK_OUT'],
    L1_COMPLETED: ['L1_SHORTLIST', 'L1_REJECT'],
    L1_SHORTLIST: ['INTERVIEW_SCHEDULED', 'L1_REJECT'],
    INTERVIEW_SCHEDULED: ['SELECTED', 'REJECTED_BY_CLIENT', 'INTERVIEW_BACK_OUT'],
    SELECTED: ['WITH_ADMIN', 'OFFER_BACK_OUT'],
    WITH_ADMIN: ['WITH_CLIENT', 'REJECTED_BY_ADMIN'],
    WITH_CLIENT: ['SUBMITTED_TO_ADMIN', 'ONBOARDED', 'REJECTED_BY_CLIENT'],
    SUBMITTED_TO_ADMIN: ['ONBOARDED', 'REJECTED_BY_ADMIN'],
    ONBOARDED: ['EXIT'],
    // Terminal / closed statuses — no forward transitions
    REJECTED_BY_ADMIN: ['ON_HOLD'],
    REJECTED_BY_CLIENT: ['ON_HOLD'],
    SCREEN_REJECT: [],
    L1_REJECT: [],
    INTERVIEW_BACK_OUT: [],
    OFFER_BACK_OUT: [],
    ON_HOLD: ['NEW'],
    EXIT: [],
};

export function CandidateDetailsPanel({
    candidate,
    onDismiss,
    onUpdated,
    vendors,
    requests,
    onStatusChange,
}: CandidateDetailsPanelProps) {
    const [activeTab, setActiveTab] = useState<'info' | 'interview' | 'transition'>('info');
    const [submitting, setSubmitting] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Candidate>>({});
    const [logs, setLogs] = useState<CommunicationLog[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [pendingStatus, setPendingStatus] = useState<CandidateStatus | null>(null);

    const fetchLogs = async () => {
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

    useEffect(() => {
        setEditForm({
            first_name: candidate.first_name || '',
            last_name: candidate.last_name || '',
            phone: candidate.phone || '',
            current_company: candidate.current_company || '',
            current_location: candidate.current_location || '',
            total_experience: candidate.total_experience ?? undefined,
            relevant_experience: candidate.relevant_experience ?? undefined,
            notice_period: candidate.notice_period ?? undefined,
            skills: candidate.skills || '',
            l1_feedback: candidate.l1_feedback || '',
            l1_score: candidate.l1_score || 0,
            l2_feedback: candidate.l2_feedback || '',
            l2_score: candidate.l2_score || 0,
            overlap_until: candidate.overlap_until || null,
            last_working_day: candidate.last_working_day || null,
            exit_reason: candidate.exit_reason || '',
            remarks: candidate.remarks || '',
        });
        setPendingStatus(null);
        fetchLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when switching candidate
    }, [candidate.id]);

    const handleManualStatusChange = (newStatus: CandidateStatus) => {
        if (newStatus === candidate.status) return;
        setPendingStatus(newStatus);
    };

    const handleUpdate = async () => {
        setSubmitting(true);
        try {
            await candidatesApi.update(candidate.id, editForm);
            if (pendingStatus) {
                await onStatusChange(candidate.id, pendingStatus);
            } else {
                toast.success('Candidate updated');
            }
            onUpdated();
            onDismiss();
        } catch {
            // error
        } finally {
            setSubmitting(false);
        }
    };

    return (
            <div className="space-y-6">
                {/* Status Changer */}
                <div className="flex items-center gap-3 px-1">
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider shrink-0">
                        Status
                    </span>
                    <div className="flex items-center gap-2 flex-1 flex-wrap">
                        <StatusBadge value={candidate.status} type="candidate" />
                        {pendingStatus ? (
                            <>
                                <span className="text-text-muted text-xs">→</span>
                                <StatusBadge value={pendingStatus} type="candidate" />
                                <button
                                    type="button"
                                    className="text-[10px] text-text-muted hover:text-danger transition-colors"
                                    onClick={() => setPendingStatus(null)}
                                    title="Clear staged status change"
                                >
                                    ✕ clear
                                </button>
                            </>
                        ) : (
                            <>
                                <span className="text-text-muted text-xs">→</span>
                                <select
                                    className="input-field text-sm py-1.5 flex-1 max-w-[220px]"
                                    value=""
                                    onChange={(e) => handleManualStatusChange(e.target.value as CandidateStatus)}
                                    aria-label="Change candidate status"
                                >
                                    <option value="" disabled>Move to...</option>
                                    {(NEXT_STEP_TRANSITIONS[candidate.status as CandidateStatus] || []).map((s) => (
                                        <option key={s} value={s}>
                                            {STAGE_LABELS[s]}
                                        </option>
                                    ))}
                                </select>
                            </>
                        )}
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
                        <div className="space-y-4">
                            {/* Name row */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="input-label">First Name</label>
                                    <input className="input-field mt-1" value={editForm.first_name ?? ''} onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="input-label">Last Name</label>
                                    <input className="input-field mt-1" value={editForm.last_name ?? ''} onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))} />
                                </div>
                            </div>
                            {/* Contact row */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="input-label">Email</label>
                                    <input className="input-field mt-1 bg-surface-hover cursor-not-allowed" value={candidate.email} readOnly />
                                </div>
                                <div>
                                    <label className="input-label">Phone</label>
                                    <input className="input-field mt-1" value={editForm.phone ?? ''} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="10-digit number" />
                                </div>
                            </div>
                            {/* Professional row */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="input-label">Current Company</label>
                                    <input className="input-field mt-1" value={editForm.current_company ?? ''} onChange={e => setEditForm(f => ({ ...f, current_company: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="input-label">Current Location</label>
                                    <input className="input-field mt-1" value={editForm.current_location ?? ''} onChange={e => setEditForm(f => ({ ...f, current_location: e.target.value }))} />
                                </div>
                            </div>
                            {/* Experience row */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="input-label">Total Exp (yrs)</label>
                                    <input type="number" min="0" step="0.5" className="input-field mt-1" value={editForm.total_experience ?? ''} onChange={e => setEditForm(f => ({ ...f, total_experience: parseFloat(e.target.value) || undefined }))} />
                                </div>
                                <div>
                                    <label className="input-label">Relevant Exp (yrs)</label>
                                    <input type="number" min="0" step="0.5" className="input-field mt-1" value={editForm.relevant_experience ?? ''} onChange={e => setEditForm(f => ({ ...f, relevant_experience: parseFloat(e.target.value) || undefined }))} />
                                </div>
                                <div>
                                    <label className="input-label">Notice (days)</label>
                                    <input type="number" min="0" className="input-field mt-1" value={editForm.notice_period ?? ''} onChange={e => setEditForm(f => ({ ...f, notice_period: parseInt(e.target.value) || undefined }))} />
                                </div>
                            </div>
                            {/* Skills */}
                            <div>
                                <label className="input-label">Skills</label>
                                <input className="input-field mt-1" value={editForm.skills ?? ''} onChange={e => setEditForm(f => ({ ...f, skills: e.target.value }))} placeholder="e.g. React, Node.js, Python" />
                            </div>
                            {/* Exit / Rejection Info — show only for terminal statuses */}
                            {(['EXIT', 'REJECTED_BY_ADMIN', 'REJECTED_BY_CLIENT', 'L1_REJECT', 'SCREEN_REJECT', 'OFFER_BACK_OUT', 'INTERVIEW_BACK_OUT'] as CandidateStatus[]).includes(candidate.status as CandidateStatus) && (
                                <div className="space-y-3 pt-3 border-t border-border">
                                    <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Exit / Rejection Details</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="input-label">Last Working Day</label>
                                            <input
                                                type="date"
                                                className="input-field mt-1"
                                                value={editForm.last_working_day || ''}
                                                onChange={e => setEditForm(f => ({ ...f, last_working_day: e.target.value || null }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="input-label">Reason</label>
                                            <input
                                                className="input-field mt-1"
                                                value={editForm.exit_reason ?? ''}
                                                placeholder="e.g. Better offer, project end..."
                                                onChange={e => setEditForm(f => ({ ...f, exit_reason: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* Read-only fields */}
                            <div className="flex items-center gap-4 pt-1 text-sm text-text-muted border-t border-border">
                                <span>Source: <span className="badge badge-neutral ml-1">{candidate.source?.replace(/_/g, ' ') || '—'}</span></span>
                                {candidate.source === 'VENDORS' && <span>Vendor: <span className="badge badge-neutral ml-1">{vendors.find(v => v.id === candidate.vendor_id)?.name || candidate.vendor || '—'}</span></span>}
                                {candidate.resume_url ? (
                                    <a href={candidate.resume_url} target="_blank" rel="noopener noreferrer" className="text-cta hover:underline ml-auto">View Resume ↗</a>
                                ) : (
                                    <span className="text-sm text-text-muted italic ml-auto">Not uploaded</span>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'interview' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <label className="input-label" htmlFor="l1-feedback">L1 Feedback</label>
                                    <textarea
                                        id="l1-feedback"
                                        className="input-field min-h-[100px] text-sm"
                                        value={editForm.l1_feedback || ''}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, l1_feedback: e.target.value }))}
                                        placeholder="Enter technical interview notes..."
                                        title="L1 Feedback"
                                    />
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-medium text-text-muted" htmlFor="l1-score">L1 Score (0-10):</label>
                                        <input
                                            id="l1-score"
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
                                            title="Upload L1 Feedback File"
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
                                    <label className="input-label" htmlFor="l2-feedback">L2 Feedback</label>
                                    <textarea
                                        id="l2-feedback"
                                        className="input-field min-h-[100px] text-sm"
                                        value={editForm.l2_feedback || ''}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, l2_feedback: e.target.value }))}
                                        placeholder="Enter client interview notes..."
                                        title="L2 Feedback"
                                    />
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-medium text-text-muted" htmlFor="l2-score">L2 Score (0-10):</label>
                                        <input
                                            id="l2-score"
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
                                            title="Upload L2 Feedback File"
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

                    {activeTab === 'transition' && (() => {
                        const linkedReq = candidate.request_id
                            ? requests.find(r => r.id === candidate.request_id)
                            : null;
                        const isBackfill = linkedReq?.is_backfill === true;

                        return (
                            <div className="space-y-4">
                                {isBackfill ? (
                                    <div className="space-y-3">
                                        <label className="input-label flex items-center gap-2" htmlFor="overlap-until">
                                            <Calendar size={14} className="text-cta" />
                                            Overlap Until (Transition Period)
                                        </label>
                                        <input
                                            id="overlap-until"
                                            type="date"
                                            className="input-field"
                                            value={editForm.overlap_until || ''}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, overlap_until: e.target.value || null }))}
                                            title="Overlap Until"
                                        />
                                        <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/10">
                                            <p className="text-[11px] text-text-muted leading-relaxed">
                                                This candidate is serving as a backfill. Specify the overlap end date
                                                to calculate resource overlap and dual-budget requirements.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 text-center border-2 border-dashed border-border rounded-xl">
                                        <p className="text-sm text-text-muted">
                                            Overlap / Transition Period is only applicable for backfill requests.
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
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
                    <button type="button" onClick={onDismiss} className="btn btn-secondary flex-1">Close</button>
                    <button
                        type="button"
                        onClick={handleUpdate}
                        className="btn btn-cta flex-1"
                        disabled={submitting}
                    >
                        {submitting ? <span className="spinner w-4 h-4" /> : 'Save Changes'}
                    </button>
                </div>
            </div>
    );
}

// ─── Create Candidate Modal ───────────────────────────────────────────────────

interface CreateCandidateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
    onViewDuplicate: (candidate: Candidate) => void;
    requests: ResourceRequest[];
    vendors: Vendor[];
    sows: SOW[];
    jobProfiles: JobProfile[];
}

const COUNTRY_CODES = [
    { code: '+91', label: 'IN +91' },
    { code: '+1', label: 'US +1' },
    { code: '+44', label: 'UK +44' },
    { code: '+61', label: 'AU +61' },
    { code: '+971', label: 'AE +971' },
    { code: '+65', label: 'SG +65' },
    { code: '+49', label: 'DE +49' },
    { code: '+33', label: 'FR +33' },
    { code: '+81', label: 'JP +81' },
    { code: '+86', label: 'CN +86' },
];

function CreateCandidateModal({ isOpen, onClose, onCreated, onViewDuplicate, requests, vendors, sows, jobProfiles }: CreateCandidateModalProps) {
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
    const [countryCode, setCountryCode] = useState('+91');
    const [phoneDigits, setPhoneDigits] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [duplicateCandidate, setDuplicateCandidate] = useState<Candidate | null>(null);

    const set = (field: keyof CreateCandidatePayload, value: unknown) =>
        setForm((f) => ({ ...f, [field]: value }));

    // Check for duplicate candidate
    const checkDuplicate = useCallback(async (firstName: string, lastName: string, email: string, phone: string | undefined) => {
        if (!firstName || !lastName || !email) return;
        try {
            const existing = await candidatesApi.list();
            const normalizedEmail = email.toLowerCase().trim();
            const normalizedFirst = firstName.toLowerCase().trim();
            const normalizedLast = lastName.toLowerCase().trim();
            const strippedPhone = phone ? phone.replace(/\D/g, '').slice(-10) : '';

            const dup = existing.find(c => {
                const matchName = c.first_name.toLowerCase().trim() === normalizedFirst
                    && c.last_name.toLowerCase().trim() === normalizedLast;
                const matchEmail = c.email.toLowerCase().trim() === normalizedEmail;
                const matchPhone = strippedPhone && c.phone
                    ? c.phone.replace(/\D/g, '').slice(-10) === strippedPhone
                    : false;
                return matchEmail || (matchName && matchPhone);
            });
            setDuplicateCandidate(dup || null);
        } catch {
            // silent
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errors: Record<string, string> = {};

        if (!form.first_name.trim()) errors.first_name = 'First name is required';
        if (!form.last_name.trim()) errors.last_name = 'Last name is required';
        if (!form.email.trim()) errors.email = 'Email is required';
        if (!form.source) errors.source = 'Source is required';
        if (form.source === 'VENDORS' && !form.vendor_id) errors.vendor_id = 'Vendor is required when source is Vendors';

        // Phone validation: if provided, must be exactly 10 digits
        if (phoneDigits) {
            const digitsOnly = phoneDigits.replace(/\D/g, '');
            if (digitsOnly.length !== 10) {
                errors.phone = 'Phone number must be exactly 10 digits';
            }
        }

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            toast.error('Please fix the highlighted errors');
            return;
        }
        setValidationErrors({});

        if (duplicateCandidate) {
            toast.error(`Duplicate candidate found: ${formatCandidateFullName(duplicateCandidate.first_name, duplicateCandidate.last_name)} (${duplicateCandidate.email})`);
            return;
        }

        // Compose phone with country code
        const fullPhone = phoneDigits ? `${countryCode}${phoneDigits.replace(/\D/g, '')}` : undefined;

        setSubmitting(true);
        try {
            const payload = { ...form, phone: fullPhone };
            const candidate = await candidatesApi.create(payload);

            if (resumeFile && candidate.id) {
                try {
                    await candidatesApi.uploadResume(candidate.id, resumeFile);
                    toast.success('Candidate and Resume added!');
                } catch {
                    toast.error('Candidate added, but resume upload failed.');
                }
            } else {
                toast.success(`${formatCandidateFullName(form.first_name, form.last_name)} added!`);
            }

            onCreated();
            onClose();
            setForm(emptyForm());
            setResumeFile(null);
            setPhoneDigits('');
            setCountryCode('+91');
            setDuplicateCandidate(null);
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
                                    First Name <span className="text-danger">*</span>
                                </label>
                                <input
                                    id="c-first"
                                    className={cn("input-field", validationErrors.first_name && "border-danger")}
                                    placeholder="e.g. Rahul"
                                    required
                                    value={form.first_name}
                                    onChange={(e) => { set('first_name', e.target.value); setValidationErrors(p => ({ ...p, first_name: '' })); }}
                                    onBlur={() => checkDuplicate(form.first_name, form.last_name, form.email, phoneDigits)}
                                />
                                {validationErrors.first_name && <p className="text-[10px] text-danger px-1">{validationErrors.first_name}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-text-muted px-1" htmlFor="c-last">
                                    Last Name <span className="text-danger">*</span>
                                </label>
                                <input
                                    id="c-last"
                                    className={cn("input-field", validationErrors.last_name && "border-danger")}
                                    placeholder="e.g. Sharma"
                                    required
                                    value={form.last_name}
                                    onChange={(e) => { set('last_name', e.target.value); setValidationErrors(p => ({ ...p, last_name: '' })); }}
                                    onBlur={() => checkDuplicate(form.first_name, form.last_name, form.email, phoneDigits)}
                                />
                                {validationErrors.last_name && <p className="text-[10px] text-danger px-1">{validationErrors.last_name}</p>}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-text-muted px-1 flex items-center gap-1" htmlFor="c-email">
                                <Mail size={12} /> Email Address <span className="text-danger">*</span>
                            </label>
                            <input
                                id="c-email"
                                type="email"
                                className={cn("input-field", validationErrors.email && "border-danger")}
                                placeholder="Personal email address"
                                required
                                value={form.email}
                                onChange={(e) => { set('email', e.target.value); setValidationErrors(p => ({ ...p, email: '' })); }}
                                onBlur={() => checkDuplicate(form.first_name, form.last_name, form.email, phoneDigits)}
                            />
                            {validationErrors.email && <p className="text-[10px] text-danger px-1">{validationErrors.email}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-text-muted px-1 flex items-center gap-1" htmlFor="c-phone">
                                <Phone size={12} /> Phone Number
                            </label>
                            <div className="flex gap-2">
                                <select
                                    className="input-field w-28 shrink-0"
                                    value={countryCode}
                                    onChange={(e) => setCountryCode(e.target.value)}
                                    title="Country Code"
                                >
                                    {COUNTRY_CODES.map(cc => (
                                        <option key={cc.code} value={cc.code}>{cc.label}</option>
                                    ))}
                                </select>
                                <input
                                    id="c-phone"
                                    className={cn("input-field flex-1", (validationErrors.phone || phoneError) && "border-danger")}
                                    placeholder="10-digit number"
                                    maxLength={10}
                                    value={phoneDigits}
                                    onChange={(e) => {
                                        const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                                        setPhoneDigits(digits);
                                        setPhoneError(digits && digits.length !== 10 ? 'Must be 10 digits' : '');
                                        setValidationErrors(p => ({ ...p, phone: '' }));
                                    }}
                                    onBlur={() => checkDuplicate(form.first_name, form.last_name, form.email, phoneDigits)}
                                />
                            </div>
                            {(validationErrors.phone || phoneError) && (
                                <p className="text-[10px] text-danger px-1">{validationErrors.phone || phoneError}</p>
                            )}
                        </div>

                        {/* Duplicate Warning */}
                        {duplicateCandidate && (
                            <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg">
                                <p className="text-xs font-bold text-danger mb-1">Duplicate Candidate Found</p>
                                <p className="text-[11px] text-text">
                                    {formatCandidateFullName(duplicateCandidate.first_name, duplicateCandidate.last_name)} — {duplicateCandidate.email}
                                    {duplicateCandidate.phone && ` — ${duplicateCandidate.phone}`}
                                </p>
                                <p className="text-[10px] text-text-muted mt-1">
                                    Status: {STAGE_LABELS[duplicateCandidate.status as CandidateStatus] || duplicateCandidate.status}
                                </p>
                                <button
                                    type="button"
                                    className="mt-2 text-xs font-semibold text-cta hover:underline"
                                    onClick={() => {
                                        onClose();
                                        onViewDuplicate(duplicateCandidate);
                                    }}
                                >
                                    View Existing Candidate Details →
                                </button>
                            </div>
                        )}

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
                                <LinkIcon size={12} /> Source <span className="text-danger">*</span>
                            </label>
                            <select
                                id="c-source"
                                className={cn("input-field", validationErrors.source && "border-danger")}
                                value={form.source || ''}
                                onChange={(e) => {
                                    const val = e.target.value as CandidateSource | '';
                                    set('source', val || undefined);
                                    setValidationErrors(p => ({ ...p, source: '', vendor_id: '' }));
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
                                        {s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                                    </option>
                                ))}
                            </select>
                            {validationErrors.source && <p className="text-[10px] text-danger px-1">{validationErrors.source}</p>}
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
                            title="Skills List"
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
                            className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-surface-hover file:text-cta hover:file:bg-cta/10 file:cursor-pointer transition-all"
                            title="Upload Resume File"
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
    const navigate = useNavigate();
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('kanban'); // Default to kanban for better viz
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [requests, setRequests] = useState<ResourceRequest[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [sows, setSows] = useState<SOW[]>([]);
    const [jobProfiles, setJobProfiles] = useState<JobProfile[]>([]);
    const [exitPendingId, setExitPendingId] = useState<number | null>(null);
    const [isExitModalOpen, setIsExitModalOpen] = useState(false);
    const [revertPendingId, setRevertPendingId] = useState<number | null>(null);
    const [isRevertModalOpen, setIsRevertModalOpen] = useState(false);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchCandidates = useCallback(async () => {
        setLoading(true);
        try {
            const [cData, rData, vData, sowData, jpData] = await Promise.all([
                candidatesApi.list({
                    ...(statusFilter && viewMode === 'table' ? { status: statusFilter } : {}),
                    ...(debouncedSearch ? { search: debouncedSearch } : {}),
                    page_size: 2000
                }),
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
    }, [statusFilter, viewMode, debouncedSearch]);

    useEffect(() => {
        fetchCandidates();
    }, [fetchCandidates]);

    const handleStatusChange = async (id: number, status: CandidateStatus) => {
        try {
            await candidatesApi.review(id, status);
            toast.success(`Moved to ${STAGE_LABELS[status]}`);
            fetchCandidates();
        } catch (err: unknown) {
            const msg =
                err instanceof Error ? err.message : 'Status transition not allowed';
            toast.error(msg);
        }
    };

    const handleExitRequest = (id: number) => {
        setExitPendingId(id);
        setIsExitModalOpen(true);
    };

    const handleExitConfirm = async (payload: ExitPayload) => {
        if (exitPendingId === null) return;
        try {
            await candidatesApi.exit(exitPendingId, payload);
            toast.success('Candidate exited successfully');
            fetchCandidates();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to process exit';
            toast.error(msg);
        } finally {
            setIsExitModalOpen(false);
            setExitPendingId(null);
        }
    };

    const handleRevertExit = (id: number) => {
        setRevertPendingId(id);
        setIsRevertModalOpen(true);
    };

    const handleRevertConfirm = async (targetStatus: CandidateStatus) => {
        if (revertPendingId === null) return;
        try {
            await candidatesApi.revertExit(revertPendingId, targetStatus);
            toast.success(`Exit reverted — candidate moved to ${STAGE_LABELS[targetStatus]}`);
            fetchCandidates();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to revert exit';
            toast.error(msg);
        } finally {
            setIsRevertModalOpen(false);
            setRevertPendingId(null);
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
                <div className="flex gap-2 shrink-0">
                    <button onClick={() => exportCandidates()} className="btn btn-secondary flex items-center gap-2">
                        <Download size={18} /> Export CSV
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="btn btn-cta"
                        id="add-candidate-btn"
                    >
                        <Plus size={18} /> Add Candidate
                    </button>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="card flex flex-wrap gap-4 items-center">
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

                {/* Search Bar */}
                <div className="flex-1 min-w-[250px]">
                    <input
                        type="text"
                        className="input-field w-full"
                        placeholder="Search candidates..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        aria-label="Search candidates"
                    />
                </div>

                {/* Status filter (table view only) */}
                {viewMode === 'table' && (
                    <div className="flex flex-col gap-1">
                        <select
                            className="input-field w-40"
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
                        <div className="table-container border-none max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Vendor</th>
                                        <th>Status</th>
                                        <th>Added</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {candidates.map((c) => (
                                        <tr
                                            key={c.id}
                                            className="cursor-pointer hover:bg-surface-hover transition-colors"
                                            onClick={() => navigate(`/candidates/${c.id}/edit`)}
                                        >
                                            <td>
                                                <div className="font-semibold text-text">
                                                    {formatCandidateFullName(c.first_name, c.last_name)}
                                                </div>
                                                {c.current_location && (
                                                    <div className="text-xs text-text-muted">{c.current_location}</div>
                                                )}
                                            </td>
                                            <td className="text-text-muted text-sm">
                                                {c.status === 'ONBOARDED' ? '—' : c.email}
                                            </td>
                                            <td>
                                                <span className="badge badge-neutral">
                                                    {vendors.find(v => v.id === c.vendor_id)?.name || c.vendor || '—'}
                                                </span>
                                            </td>
                                            <td>
                                                <StatusBadge value={c.status} type="candidate" />
                                            </td>
                                            <td className="text-text-muted text-sm">{formatDate(c.created_at)}</td>
                                            <td onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => navigate(`/candidates/${c.id}/edit`)}
                                                    className="p-2 hover:bg-surface-hover rounded-lg text-text-muted hover:text-cta transition-colors"
                                                    title="Edit Candidate"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            </td>
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
                    sows={sows}
                    requests={requests}
                    onStatusChange={handleStatusChange}
                    onCandidateClick={(c) => navigate(`/candidates/${c.id}/edit`)}
                    onExitRequest={handleExitRequest}
                    onRevertExit={handleRevertExit}
                />
            )}

            {/* Create Modal */}
            <CreateCandidateModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreated={fetchCandidates}
                onViewDuplicate={(c) => navigate(`/candidates/${c.id}/edit`)}
                requests={requests}
                vendors={vendors}
                sows={sows}
                jobProfiles={jobProfiles}
            />

            {/* Revert Exit Modal */}
            <RevertExitModal
                isOpen={isRevertModalOpen}
                candidateName={
                    revertPendingId
                        ? (() => {
                              const c = candidates.find(x => x.id === revertPendingId);
                              return c ? formatCandidateFullName(c.first_name, c.last_name) : 'this candidate';
                          })()
                        : 'this candidate'
                }
                onConfirm={handleRevertConfirm}
                onCancel={() => { setIsRevertModalOpen(false); setRevertPendingId(null); }}
            />

            {/* Exit Confirmation Modal */}
            <ExitConfirmModal
                isOpen={isExitModalOpen}
                candidateName={
                    exitPendingId
                        ? (() => {
                              const c = candidates.find(x => x.id === exitPendingId);
                              return c ? formatCandidateFullName(c.first_name, c.last_name) : 'this candidate';
                          })()
                        : 'this candidate'
                }
                onConfirm={handleExitConfirm}
                onCancel={() => { setIsExitModalOpen(false); setExitPendingId(null); }}
            />
        </div>
    );
}
