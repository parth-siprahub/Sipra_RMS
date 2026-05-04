import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Monitor, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import { formatPersonName } from '../lib/personNames';
import type { AwsTimesheetV2Entry, AwsDailyLog } from '../api/timesheets';
import { timesheetsApi } from '../api/timesheets';

interface PageState {
    entries: AwsTimesheetV2Entry[];
    currentIndex: number;
    empMap: Record<number, { rms_name: string }>;
    billing_month?: string;   // YYYY-MM — added in Timesheets.tsx navigation
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

function secsToHms(secs: number): string {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatLogDate(isoDate: string): string {
    // "2026-04-07" → "Tue, Apr 7"
    const d = new Date(isoDate + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ──────────────────────────────────────────────────────────────────────────
// Summary stat card
// ──────────────────────────────────────────────────────────────────────────

function StatCard({ label, hms }: { label: string; hms: string | null }) {
    return (
        <div className="card px-4 py-3 flex flex-col gap-0.5 min-w-0">
            <span className="text-xs text-text-muted font-medium uppercase tracking-wide">{label}</span>
            <span className="text-lg font-mono font-bold text-text tabular-nums">{hms || '00:00:00'}</span>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────────
// Page component
// ──────────────────────────────────────────────────────────────────────────

export function TimesheetAwsDrillDown() {
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state as PageState | null;

    const [currentIndex, setCurrentIndex] = useState(state?.currentIndex ?? 0);
    const [dailyLogs, setDailyLogs] = useState<AwsDailyLog[]>([]);
    const [dailyLoading, setDailyLoading] = useState(false);

    const entries = state?.entries ?? [];
    const empMap = state?.empMap ?? {};
    const billingMonth = state?.billing_month ?? '';
    const current = entries[currentIndex];
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < entries.length - 1;

    const handleBack = useCallback(() => navigate(-1), [navigate]);

    // Keyboard navigation
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' && hasPrev) setCurrentIndex(i => i - 1);
            if (e.key === 'ArrowRight' && hasNext) setCurrentIndex(i => i + 1);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [hasPrev, hasNext]);

    // Fetch daily logs whenever employee or month changes
    useEffect(() => {
        if (!current?.employee_id || !billingMonth) {
            setDailyLogs([]);
            return;
        }
        setDailyLoading(true);
        timesheetsApi
            .getAwsDailyLogs(current.employee_id, billingMonth)
            .then(rows => setDailyLogs(rows))
            .catch(() => setDailyLogs([]))
            .finally(() => setDailyLoading(false));
    }, [current?.employee_id, billingMonth]);

    if (!state || !current) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <p className="text-text-muted">No drill-down data available.</p>
                <button onClick={handleBack} className="btn btn-secondary flex items-center gap-2">
                    <ArrowLeft size={16} /> Back to Timesheets
                </button>
            </div>
        );
    }

    const emp = current.employee_id ? empMap[current.employee_id] : null;
    const displayName = formatPersonName(emp?.rms_name || '') || current.aws_email || 'Unknown';

    // Separate weekend vs weekday rows for count badge
    const weekdayLogs = dailyLogs.filter(r => !r.is_weekend);
    const hasPostExitRows = dailyLogs.some(r => r.post_exit_flag);

    return (
        <div className="flex flex-col h-full animate-fade-in">
            {/* ── Page header ── */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={handleBack}
                        className="p-2 rounded-lg hover:bg-surface-hover transition-colors shrink-0 text-text-muted"
                        title="Back to Timesheets"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <button
                        onClick={() => { if (hasPrev) setCurrentIndex(i => i - 1); }}
                        disabled={!hasPrev}
                        className={cn(
                            "p-2 rounded-lg transition-colors shrink-0",
                            hasPrev ? "hover:bg-surface-hover text-text cursor-pointer" : "text-text-muted/30 cursor-not-allowed",
                        )}
                        title="Previous employee (← arrow)"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-text truncate">{displayName}</h2>
                        <p className="text-sm text-text-muted">
                            {currentIndex + 1} of {entries.length}
                            {billingMonth && <> · {billingMonth}</>}
                            {' · '}{current.aws_email}
                        </p>
                    </div>
                    <button
                        onClick={() => { if (hasNext) setCurrentIndex(i => i + 1); }}
                        disabled={!hasNext}
                        className={cn(
                            "p-2 rounded-lg transition-colors shrink-0",
                            hasNext ? "hover:bg-surface-hover text-text cursor-pointer" : "text-text-muted/30 cursor-not-allowed",
                        )}
                        title="Next employee (→ arrow)"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cta/10 text-cta text-sm font-semibold shrink-0">
                    <Monitor size={14} /> {current.work_time_hms || '00:00:00'}
                </span>
            </div>

            {/* ── Content ── */}
            <div className="flex-1 overflow-auto p-6 space-y-6">

                {/* Monthly summary stat cards */}
                <div>
                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wide mb-3">
                        Monthly Summary
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <StatCard label="Work Time"   hms={current.work_time_hms} />
                        <StatCard label="Productive"  hms={current.productive_hms} />
                        <StatCard label="Screen Time" hms={current.screen_time_hms} />
                        <StatCard label="Active"      hms={current.active_hms} />
                    </div>
                </div>

                {/* post_exit warning banner */}
                {hasPostExitRows && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm">
                        <AlertTriangle size={16} className="shrink-0" />
                        <span>
                            Some rows below are after this employee's exit date
                            (<span className="font-semibold">post-exit data</span>).
                        </span>
                    </div>
                )}

                {/* Date-wise table */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wide">
                            Daily Breakdown
                        </h3>
                        {!dailyLoading && dailyLogs.length > 0 && (
                            <span className="text-xs text-text-muted">
                                {weekdayLogs.length} working day{weekdayLogs.length !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>

                    {dailyLoading ? (
                        <div className="card flex items-center justify-center py-12 text-text-muted gap-2">
                            <span className="spinner w-5 h-5" />
                            Loading daily breakdown…
                        </div>
                    ) : dailyLogs.length === 0 ? (
                        <div className="card flex flex-col items-center justify-center py-12 gap-2 text-text-muted">
                            <Monitor size={28} className="opacity-30" />
                            <p className="text-sm">
                                {!billingMonth
                                    ? 'No billing month in navigation state — daily data unavailable.'
                                    : !current.employee_id
                                    ? 'Employee not yet linked — no daily logs.'
                                    : 'No daily logs for this month. Upload the Working Hours CSV to enable this view.'}
                            </p>
                        </div>
                    ) : (
                        <div className="card overflow-hidden">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="bg-surface-hover/50 border-b border-border">
                                        <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase">Date</th>
                                        <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase text-right">Work Time</th>
                                        <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase text-right">Productive</th>
                                        <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase text-right">Screen Time</th>
                                        <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase text-center w-8"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {dailyLogs.map(row => {
                                        const isWeekend = row.is_weekend;
                                        const isZeroWeekend = isWeekend && row.work_seconds === 0;
                                        const isPostExit = row.post_exit_flag;
                                        return (
                                            <tr
                                                key={row.id}
                                                className={cn(
                                                    "transition-colors",
                                                    isZeroWeekend
                                                        ? "opacity-40 bg-surface-hover/10"
                                                        : "hover:bg-surface-hover/30",
                                                    isPostExit && "bg-warning/5",
                                                )}
                                            >
                                                <td className="px-4 py-2.5 font-medium text-text">
                                                    {formatLogDate(row.log_date)}
                                                    {isWeekend && (
                                                        <span className="ml-2 text-xs text-text-muted">(weekend)</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2.5 text-right font-mono text-text tabular-nums">
                                                    {secsToHms(row.work_seconds)}
                                                </td>
                                                <td className="px-4 py-2.5 text-right font-mono text-text-muted tabular-nums">
                                                    {secsToHms(row.productive_seconds)}
                                                </td>
                                                <td className="px-4 py-2.5 text-right font-mono text-text-muted tabular-nums">
                                                    {secsToHms(row.screen_time_seconds)}
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    {isPostExit && (
                                                        <AlertTriangle
                                                            size={13}
                                                            className="text-warning mx-auto"
                                                            title="Post-exit data — logged after employee exit date"
                                                        />
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
