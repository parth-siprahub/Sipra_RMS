import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Clock, FileText, Coffee, Download } from 'lucide-react';
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

function daysInMonth(ym: string): number {
    const [y, m] = ym.split('-').map(Number);
    return new Date(y, m, 0).getDate();
}

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

    const summaryRow = current.rows.find(r => r.is_summary_row);
    const issueRows = current.rows.filter(r => !r.is_summary_row);

    const handleExportCsv = () => {
        const headers = ['Issue', 'Key', 'Logged', ...Array.from({ length: numDays }, (_, i) => dayLabel(i + 1, month))];
        const csvRows = [headers.join(',')];

        // Summary row
        if (summaryRow) {
            const row = ['— Total —', '', String(summaryRow.logged ?? ''), ...Array.from({ length: numDays }, (_, i) => {
                const dayKey = `day_${String(i + 1).padStart(2, '0')}` as keyof JiraRawEntry;
                const val = summaryRow[dayKey] as number | null;
                return val && val > 0 ? String(val) : '';
            })];
            csvRows.push(row.join(','));
        }

        // Issue rows
        for (const entry of issueRows) {
            const row = [
                `"${(entry.issue || '').replace(/"/g, '""')}"`,
                entry.jira_key || (entry.is_ooo ? 'OOO' : ''),
                String(entry.logged ?? ''),
                ...Array.from({ length: numDays }, (_, i) => {
                    const dayKey = `day_${String(i + 1).padStart(2, '0')}` as keyof JiraRawEntry;
                    const val = entry[dayKey] as number | null;
                    return val && val > 0 ? String(val) : '';
                }),
            ];
            csvRows.push(row.join(','));
        }

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `jira_${current.user.replace(/\s+/g, '_')}_${month}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <>
        {/* Backdrop */}
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />
        <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-3xl bg-surface shadow-xl flex flex-col animate-slide-in-right" role="dialog" aria-modal="true" aria-label={`Jira timesheet detail for ${current.user}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface-hover/20 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={() => { if (hasPrev) onNavigate(currentIndex - 1); }}
                        disabled={!hasPrev}
                        className={cn(
                            "p-2 rounded-lg transition-colors shrink-0",
                            hasPrev ? "hover:bg-surface-hover text-text cursor-pointer" : "text-text-muted/30 cursor-not-allowed"
                        )}
                        title="Previous employee (← arrow)"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-text truncate">{current.user}</h2>
                        <p className="text-sm text-text-muted">{currentIndex + 1} of {users.length} · {month}</p>
                    </div>
                    <button
                        onClick={() => { if (hasNext) onNavigate(currentIndex + 1); }}
                        disabled={!hasNext}
                        className={cn(
                            "p-2 rounded-lg transition-colors shrink-0",
                            hasNext ? "hover:bg-surface-hover text-text cursor-pointer" : "text-text-muted/30 cursor-not-allowed"
                        )}
                        title="Next employee (→ arrow)"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cta/10 text-cta text-sm font-semibold">
                        <Clock size={14} /> {current.totalHours}h
                    </span>
                    {current.oooHours > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warning/10 text-warning text-sm font-semibold">
                            <Coffee size={14} /> {current.oooHours}h OOO
                        </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-hover text-text-muted text-sm font-semibold">
                        <FileText size={14} /> {current.issueCount}
                    </span>
                    <button
                        onClick={handleExportCsv}
                        className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
                        title="Export CSV"
                    >
                        <Download size={18} className="text-text-muted" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
                        title="Close (Escape)"
                    >
                        <X size={20} className="text-text-muted" />
                    </button>
                </div>
            </div>

            {/* Content — fullscreen Excel-like grid */}
            <div className="flex-1 overflow-auto">
                <table className="text-left border-collapse text-sm w-full" style={{ minWidth: `${400 + numDays * 48}px` }}>
                    <thead className="sticky top-0 z-20 bg-surface">
                        <tr className="border-b border-border">
                            <th className="sticky left-0 z-30 bg-surface px-4 py-3 text-xs font-bold text-text-muted uppercase min-w-[220px]">Issue</th>
                            <th className="px-3 py-3 text-xs font-bold text-text-muted uppercase min-w-[90px]">Key</th>
                            <th className="px-3 py-3 text-xs font-bold text-text-muted uppercase text-right min-w-[70px]">Logged</th>
                            {Array.from({ length: numDays }, (_, i) => (
                                <th key={i + 1} className="px-1.5 py-3 text-xs font-bold text-text-muted text-center min-w-[48px]">
                                    {dayLabel(i + 1, month)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {summaryRow && (
                            <tr className="bg-cta/5 font-bold border-b border-border">
                                <td className="sticky left-0 z-10 bg-cta/5 px-4 py-3 text-text">— Total —</td>
                                <td className="px-3 py-3" />
                                <td className="px-3 py-3 text-right text-text">
                                    {summaryRow.logged != null && summaryRow.logged > 0 ? `${summaryRow.logged}h` : ''}
                                </td>
                                {Array.from({ length: numDays }, (_, i) => {
                                    const dayKey = `day_${String(i + 1).padStart(2, '0')}` as keyof JiraRawEntry;
                                    const val = summaryRow[dayKey] as number | null;
                                    return (
                                        <td key={i + 1} className={cn("px-1.5 py-3 text-center tabular-nums", val && val > 0 ? "text-text" : "text-text-muted/20")}>
                                            {val && val > 0 ? val : ''}
                                        </td>
                                    );
                                })}
                            </tr>
                        )}
                        {issueRows.map((entry) => {
                            const isOoo = entry.is_ooo;
                            return (
                                <tr key={entry.id} className={cn("border-b border-border/30 transition-colors", isOoo && "bg-warning/5", !isOoo && "hover:bg-surface-hover/30")}>
                                    <td className={cn("sticky left-0 z-10 px-4 py-2.5 truncate max-w-[300px]", isOoo ? "bg-warning/5" : "bg-surface")} title={entry.issue || ''}>
                                        {entry.issue || ''}
                                    </td>
                                    <td className="px-3 py-2.5">
                                        {isOoo ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-warning/15 text-warning text-xs font-medium">OOO</span>
                                        ) : entry.jira_key ? (
                                            <span className="text-cta font-medium">{entry.jira_key}</span>
                                        ) : null}
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-medium text-text">
                                        {entry.logged != null && entry.logged > 0 ? `${entry.logged}h` : ''}
                                    </td>
                                    {Array.from({ length: numDays }, (_, i) => {
                                        const dayKey = `day_${String(i + 1).padStart(2, '0')}` as keyof JiraRawEntry;
                                        const val = entry[dayKey] as number | null;
                                        return (
                                            <td key={i + 1} className={cn("px-1.5 py-2.5 text-center tabular-nums", val && val > 0 ? "text-text font-medium" : "text-text-muted/20")}>
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
