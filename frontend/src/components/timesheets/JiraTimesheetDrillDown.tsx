import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Clock, FileText, Coffee } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { JiraRawEntry } from '../../api/timesheets';

interface UserSummary {
    user: string;
    rows: JiraRawEntry[];
    totalHours: number;
    oooHours: number;
    issueCount: number;
}

interface Props {
    users: UserSummary[];
    currentIndex: number;
    month: string;
    onClose: () => void;
    onNavigate: (index: number) => void;
}

/** Get number of days in a month from "YYYY-MM" */
function daysInMonth(ym: string): number {
    const [y, m] = ym.split('-').map(Number);
    return new Date(y, m, 0).getDate();
}

/** Format day number into short label like "01/Mar" */
function dayLabel(day: number, ym: string): string {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(y, m - 1, day);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${String(day).padStart(2, '0')}/${months[d.getMonth()]}`;
}

export function JiraTimesheetDrillDown({ users, currentIndex, month, onClose, onNavigate }: Props) {
    const current = users[currentIndex];
    const numDays = daysInMonth(month);
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < users.length - 1;

    // Draggable state
    const modalRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });

    // Reset position when navigating
    useEffect(() => {
        setPos({ x: 0, y: 0 });
    }, [currentIndex]);

    // Draggable handlers
    const onMouseDown = useCallback((e: React.MouseEvent) => {
        setDragging(true);
        dragStart.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    }, [pos]);

    useEffect(() => {
        if (!dragging) return;
        const onMouseMove = (e: MouseEvent) => {
            setPos({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
        };
        const onMouseUp = () => setDragging(false);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [dragging]);

    // Keyboard: Escape to close, Arrow keys to navigate
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft' && hasPrev) onNavigate(currentIndex - 1);
            if (e.key === 'ArrowRight' && hasNext) onNavigate(currentIndex + 1);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose, onNavigate, currentIndex, hasPrev, hasNext]);

    if (!current) return null;

    // Separate summary row, OOO row, and regular issue rows
    const summaryRow = current.rows.find(r => r.is_summary_row);
    const issueRows = current.rows.filter(r => !r.is_summary_row);

    return (
        <>
            {/* Blocking overlay */}
            <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

            {/* Modal */}
            <div
                ref={modalRef}
                className="fixed z-50 bg-surface border border-border rounded-xl shadow-2xl flex flex-col"
                style={{
                    left: `calc(50% + ${pos.x}px)`,
                    top: `calc(50% + ${pos.y}px)`,
                    transform: 'translate(-50%, -50%)',
                    width: 'min(92vw, 960px)',
                    maxHeight: '85vh',
                }}
                role="dialog"
                aria-modal="true"
                aria-label={`Jira timesheet detail for ${current.user}`}
            >
                {/* Draggable header with prev/next */}
                <div
                    className="flex items-center justify-between px-4 py-3 border-b border-border cursor-move select-none bg-surface-hover/20 rounded-t-xl"
                    onMouseDown={onMouseDown}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        {/* Prev button */}
                        <button
                            onClick={(e) => { e.stopPropagation(); if (hasPrev) onNavigate(currentIndex - 1); }}
                            disabled={!hasPrev}
                            className={cn(
                                "p-1.5 rounded-lg transition-colors shrink-0",
                                hasPrev
                                    ? "hover:bg-surface-hover text-text cursor-pointer"
                                    : "text-text-muted/30 cursor-not-allowed"
                            )}
                            title="Previous employee (← arrow)"
                        >
                            <ChevronLeft size={18} />
                        </button>

                        <div className="min-w-0">
                            <h2 className="text-base font-bold text-text truncate">{current.user}</h2>
                            <p className="text-xs text-text-muted">
                                {currentIndex + 1} of {users.length} · {month}
                            </p>
                        </div>

                        {/* Next button */}
                        <button
                            onClick={(e) => { e.stopPropagation(); if (hasNext) onNavigate(currentIndex + 1); }}
                            disabled={!hasNext}
                            className={cn(
                                "p-1.5 rounded-lg transition-colors shrink-0",
                                hasNext
                                    ? "hover:bg-surface-hover text-text cursor-pointer"
                                    : "text-text-muted/30 cursor-not-allowed"
                            )}
                            title="Next employee (→ arrow)"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    {/* Summary chips + close */}
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-cta/10 text-cta text-xs font-semibold">
                            <Clock size={12} /> {current.totalHours}h
                        </span>
                        {current.oooHours > 0 && (
                            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-warning/10 text-warning text-xs font-semibold">
                                <Coffee size={12} /> {current.oooHours}h OOO
                            </span>
                        )}
                        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surface-hover text-text-muted text-xs font-semibold">
                            <FileText size={12} /> {current.issueCount}
                        </span>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors ml-1"
                        >
                            <X size={18} className="text-text-muted" />
                        </button>
                    </div>
                </div>

                {/* Content — scrollable Excel-like grid */}
                <div className="overflow-auto flex-1" style={{ maxHeight: 'calc(85vh - 56px)' }}>
                    <table
                        className="text-left border-collapse text-xs w-full"
                        style={{ minWidth: `${350 + numDays * 44}px` }}
                    >
                        <thead className="sticky top-0 z-20 bg-surface">
                            <tr className="border-b border-border">
                                <th className="sticky left-0 z-30 bg-surface px-3 py-2 text-xs font-bold text-text-muted uppercase min-w-[160px]">
                                    Issue
                                </th>
                                <th className="px-2 py-2 text-xs font-bold text-text-muted uppercase min-w-[70px]">
                                    Key
                                </th>
                                <th className="px-2 py-2 text-xs font-bold text-text-muted uppercase text-right min-w-[52px]">
                                    Logged
                                </th>
                                {Array.from({ length: numDays }, (_, i) => (
                                    <th
                                        key={i + 1}
                                        className="px-1 py-2 text-xs font-bold text-text-muted text-center min-w-[40px]"
                                    >
                                        {dayLabel(i + 1, month)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {/* Summary row first (pinned at top) */}
                            {summaryRow && (
                                <tr className="bg-cta/5 font-bold border-b border-border">
                                    <td className="sticky left-0 z-10 bg-cta/5 px-3 py-2 text-text">
                                        — Total —
                                    </td>
                                    <td className="px-2 py-2" />
                                    <td className="px-2 py-2 text-right text-text">
                                        {summaryRow.logged != null && summaryRow.logged > 0 ? `${summaryRow.logged}h` : ''}
                                    </td>
                                    {Array.from({ length: numDays }, (_, i) => {
                                        const dayKey = `day_${String(i + 1).padStart(2, '0')}` as keyof JiraRawEntry;
                                        const val = summaryRow[dayKey] as number | null;
                                        return (
                                            <td key={i + 1} className={cn(
                                                "px-1 py-2 text-center tabular-nums",
                                                val && val > 0 ? "text-text" : "text-text-muted/20",
                                            )}>
                                                {val && val > 0 ? val : ''}
                                            </td>
                                        );
                                    })}
                                </tr>
                            )}

                            {/* Issue rows */}
                            {issueRows.map((entry) => {
                                const isOoo = entry.is_ooo;
                                return (
                                    <tr
                                        key={entry.id}
                                        className={cn(
                                            "border-b border-border/30 transition-colors",
                                            isOoo && "bg-warning/5",
                                            !isOoo && "hover:bg-surface-hover/30",
                                        )}
                                    >
                                        <td
                                            className={cn(
                                                "sticky left-0 z-10 px-3 py-1.5 truncate max-w-[200px]",
                                                isOoo ? "bg-warning/5" : "bg-surface",
                                            )}
                                            title={entry.issue || ''}
                                        >
                                            {entry.issue || ''}
                                        </td>
                                        <td className="px-2 py-1.5">
                                            {isOoo ? (
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-warning/15 text-warning text-xs font-medium">
                                                    OOO
                                                </span>
                                            ) : entry.jira_key ? (
                                                <span className="text-cta font-medium">{entry.jira_key}</span>
                                            ) : null}
                                        </td>
                                        <td className="px-2 py-1.5 text-right font-medium text-text">
                                            {entry.logged != null && entry.logged > 0 ? `${entry.logged}h` : ''}
                                        </td>
                                        {Array.from({ length: numDays }, (_, i) => {
                                            const dayKey = `day_${String(i + 1).padStart(2, '0')}` as keyof JiraRawEntry;
                                            const val = entry[dayKey] as number | null;
                                            return (
                                                <td key={i + 1} className={cn(
                                                    "px-1 py-1.5 text-center tabular-nums",
                                                    val && val > 0 ? "text-text font-medium" : "text-text-muted/20",
                                                )}>
                                                    {val && val > 0 ? val : ''}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
