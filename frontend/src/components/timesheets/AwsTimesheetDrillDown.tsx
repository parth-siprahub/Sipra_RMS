import { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Monitor, Download } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatPersonName } from '../../lib/personNames';
import type { AwsTimesheetV2Entry } from '../../api/timesheets';

interface Props {
    entries: AwsTimesheetV2Entry[];
    currentIndex: number;
    onClose: () => void;
    onNavigate: (index: number) => void;
    empMap: Record<number, { rms_name: string }>;
}

const METRIC_COLS: { label: string; hmsKey: keyof AwsTimesheetV2Entry; secsKey: keyof AwsTimesheetV2Entry }[] = [
    { label: 'Work Time', hmsKey: 'work_time_hms', secsKey: 'work_time_secs' },
    { label: 'Productive', hmsKey: 'productive_hms', secsKey: 'productive_secs' },
    { label: 'Unproductive', hmsKey: 'unproductive_hms', secsKey: 'unproductive_secs' },
    { label: 'Undefined', hmsKey: 'undefined_hms', secsKey: 'undefined_secs' },
    { label: 'Active', hmsKey: 'active_hms', secsKey: 'active_secs' },
    { label: 'Passive', hmsKey: 'passive_hms', secsKey: 'passive_secs' },
    { label: 'Screen Time', hmsKey: 'screen_time_hms', secsKey: 'screen_time_secs' },
    { label: 'Offline Meetings', hmsKey: 'offline_meetings_hms', secsKey: 'offline_meetings_secs' },
];

export function AwsTimesheetDrillDown({ entries, currentIndex, onClose, onNavigate, empMap }: Props) {
    const current = entries[currentIndex];
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < entries.length - 1;

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

    const emp = current.employee_id ? empMap[current.employee_id] : null;
    const displayName = formatPersonName(emp?.rms_name || '') || current.aws_email || 'Unknown';

    return (
        <>
        {/* Backdrop */}
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />
        <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-3xl bg-surface shadow-xl flex flex-col animate-slide-in-right" role="dialog" aria-modal="true">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface-hover/20 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={() => { if (hasPrev) onNavigate(currentIndex - 1); }}
                        disabled={!hasPrev}
                        className={cn("p-2 rounded-lg transition-colors shrink-0", hasPrev ? "hover:bg-surface-hover text-text cursor-pointer" : "text-text-muted/30 cursor-not-allowed")}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-text truncate">{displayName}</h2>
                        <p className="text-sm text-text-muted">{currentIndex + 1} of {entries.length} · {current.aws_email}</p>
                    </div>
                    <button
                        onClick={() => { if (hasNext) onNavigate(currentIndex + 1); }}
                        disabled={!hasNext}
                        className={cn("p-2 rounded-lg transition-colors shrink-0", hasNext ? "hover:bg-surface-hover text-text cursor-pointer" : "text-text-muted/30 cursor-not-allowed")}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cta/10 text-cta text-sm font-semibold">
                        <Monitor size={14} /> {current.work_time_hms || '0:00:00'}
                    </span>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-hover transition-colors" title="Close (Escape)">
                        <X size={20} className="text-text-muted" />
                    </button>
                </div>
            </div>

            {/* Metrics grid */}
            <div className="flex-1 overflow-auto p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {METRIC_COLS.map(col => {
                        const hms = current[col.hmsKey] as string | null;
                        const secs = current[col.secsKey] as number;
                        const hrs = (secs / 3600).toFixed(1);
                        return (
                            <div key={col.label} className="card py-4 px-5 text-center">
                                <p className="text-2xl font-bold text-text">{hms || '0:00:00'}</p>
                                <p className="text-xs text-text-muted mt-1">{col.label}</p>
                                <p className="text-xs text-text-muted">{hrs}h</p>
                            </div>
                        );
                    })}
                </div>

                {/* Details table */}
                <div className="card overflow-hidden">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-surface-hover/50 border-b border-border">
                                <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase">Metric</th>
                                <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase text-right">Duration (h:mm:ss)</th>
                                <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase text-right">Hours</th>
                                <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase text-right">Seconds</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {METRIC_COLS.map(col => {
                                const hms = current[col.hmsKey] as string | null;
                                const secs = current[col.secsKey] as number;
                                return (
                                    <tr key={col.label} className="hover:bg-surface-hover/30">
                                        <td className="px-4 py-3 font-medium text-text">{col.label}</td>
                                        <td className="px-4 py-3 text-right font-mono text-text">{hms || '0:00:00'}</td>
                                        <td className="px-4 py-3 text-right text-text-muted">{(secs / 3600).toFixed(1)}h</td>
                                        <td className="px-4 py-3 text-right text-text-muted">{secs.toLocaleString()}s</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        </>
    );
}
