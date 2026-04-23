import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { reportsApi, type ComparisonReport, type ComputedReport } from '../api/reports';
import { formatPersonName } from '../lib/personNames';

interface RowData {
    employee_id: number;
    rms_name: string;
    source: string | null;
    ooo_days: number | null;
}

function formatMonthLabel(month: string): string {
    const [y, m] = month.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(m, 10) - 1]} ${y}`;
}

export function HolidayDetailPage() {
    const { month = '' } = useParams<{ month: string }>();
    const navigate = useNavigate();
    const [rows, setRows] = useState<RowData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const computedData: ComputedReport[] | null = await reportsApi.getComputedReports(month);
                if (cancelled) return;
                if (computedData && computedData.length > 0) {
                    setRows(computedData.map(c => ({
                        employee_id: c.employee_id,
                        rms_name: c.rms_name || 'Unknown',
                        source: c.source ?? null,
                        ooo_days: c.ooo_days,
                    })));
                } else {
                    const live: ComparisonReport | null = await reportsApi.getComparison(month);
                    if (cancelled) return;
                    setRows((live?.comparisons || []).map(c => ({
                        employee_id: c.employee_id,
                        rms_name: c.rms_name,
                        source: c.source ?? null,
                        ooo_days: c.jira_ooo_days,
                    })));
                }
            } catch {
                // silently stay empty
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [month]);

    const holidayRows = useMemo(
        () => rows.filter(r => (r.ooo_days ?? 0) > 0).sort((a, b) => (b.ooo_days ?? 0) - (a.ooo_days ?? 0)),
        [rows],
    );

    const totalDays = useMemo(() => holidayRows.reduce((s, r) => s + (r.ooo_days ?? 0), 0), [holidayRows]);

    const handleBack = () => navigate('/reports', { state: { selectedMonth: month } });

    if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <p className="text-text-muted">Invalid or missing month. Open this page from Reports.</p>
                <button type="button" onClick={handleBack} className="btn btn-secondary flex items-center gap-2">
                    <ArrowLeft size={16} /> Back to Reports
                </button>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-4 max-w-2xl mx-auto px-4 py-6">
            {/* Back nav */}
            <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors"
            >
                <ArrowLeft size={15} />
                Back to Reports
            </button>

            {/* Header */}
            <div className="card p-5">
                <div className="flex items-center gap-3">
                    <CalendarDays size={20} className="text-cta shrink-0" />
                    <div>
                        <h1 className="text-lg font-bold text-text">Employees on Holiday</h1>
                        <p className="text-sm text-text-muted">{formatMonthLabel(month)}</p>
                    </div>
                </div>
                {!loading && (
                    <div className="flex gap-6 mt-4 pt-4 border-t border-border">
                        <div>
                            <p className="text-xs text-text-muted uppercase tracking-wide font-semibold">Employees</p>
                            <p className="text-2xl font-bold text-cta tabular-nums">{holidayRows.length}</p>
                        </div>
                        <div>
                            <p className="text-xs text-text-muted uppercase tracking-wide font-semibold">Total Days</p>
                            <p className="text-2xl font-bold text-warning tabular-nums">{totalDays}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="card overflow-hidden p-0">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <div className="spinner w-6 h-6 border-cta" />
                        <p className="text-sm text-text-muted animate-pulse">Loading…</p>
                    </div>
                ) : holidayRows.length === 0 ? (
                    <p className="text-center text-text-muted text-sm py-10">No holiday data for {formatMonthLabel(month)}.</p>
                ) : (
                    <table className="w-full text-sm text-left border-collapse">
                        <thead>
                            <tr className="bg-surface-hover/50 border-b border-border">
                                <th className="px-4 py-2.5 text-[11px] font-bold text-text-muted uppercase tracking-wide">#</th>
                                <th className="px-4 py-2.5 text-[11px] font-bold text-text-muted uppercase tracking-wide">Employee</th>
                                <th className="px-4 py-2.5 text-[11px] font-bold text-text-muted uppercase tracking-wide">Payroll</th>
                                <th className="px-4 py-2.5 text-[11px] font-bold text-text-muted uppercase tracking-wide text-right">OOO Days</th>
                            </tr>
                        </thead>
                        <tbody>
                            {holidayRows.map((r, i) => (
                                <tr key={r.employee_id} className="border-b border-border last:border-0 hover:bg-surface-hover/30 transition-colors">
                                    <td className="px-4 py-2.5 text-text-muted tabular-nums">{i + 1}</td>
                                    <td className="px-4 py-2.5 font-medium text-text">{formatPersonName(r.rms_name)}</td>
                                    <td className="px-4 py-2.5 text-text-muted">{r.source ?? '—'}</td>
                                    <td className="px-4 py-2.5 text-right font-semibold text-warning tabular-nums">{r.ooo_days}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
