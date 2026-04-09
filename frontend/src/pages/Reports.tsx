import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    reportsApi,
    type ComparisonReport,
    type ComputedReport,
} from '../api/reports';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth, isAdminRole } from '../context/AuthContext';
import {
    Download,
    Calculator,
    ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import { formatPersonName } from '../lib/personNames';

function getMonthOptions(): { value: string; label: string }[] {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    const endYear = now.getFullYear();
    const endMonth = now.getMonth() + 4;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let y = 2025; y <= endYear + 1; y++) {
        for (let m = 1; m <= 12; m++) {
            if (y === 2025 && m < 1) continue;
            if (y === endYear && m > endMonth) break;
            if (y > endYear) break;
            const value = `${y}-${String(m).padStart(2, '0')}`;
            options.push({ value, label: `${months[m - 1]} ${y}` });
        }
    }
    return options.reverse();
}

const MONTH_OPTIONS = getMonthOptions();

type ReportsLocationState = { selectedMonth?: string };

export function Reports() {
    const { user } = useAuth();
    const isAdmin = isAdminRole(user?.role);
    const location = useLocation();
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const fromNav = (location.state as ReportsLocationState | null)?.selectedMonth;
        if (fromNav && /^\d{4}-(0[1-9]|1[0-2])$/.test(fromNav)) {
            return fromNav;
        }
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    return (
        <div className="animate-fade-in">
            <ComparisonTab
                month={selectedMonth}
                onMonthChange={setSelectedMonth}
                monthOptions={MONTH_OPTIONS}
                isAdmin={isAdmin}
            />
        </div>
    );
}

function ReportsToolbar({
    month,
    onMonthChange,
    monthOptions,
    isAdmin,
    onExport,
    onCalculate,
    calculating,
}: {
    month: string;
    onMonthChange: (value: string) => void;
    monthOptions: { value: string; label: string }[];
    isAdmin: boolean;
    onExport: () => void;
    onCalculate: () => void;
    calculating: boolean;
}) {
    return (
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
            <p className="text-sm text-text-muted leading-snug">
                Jira vs AWS timesheet comparison and exports
            </p>
            <div className="flex flex-wrap items-center gap-2">
                <select
                    className="input-field w-[11rem] text-sm py-1.5 min-h-0"
                    value={month}
                    onChange={e => onMonthChange(e.target.value)}
                >
                    {monthOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                {isAdmin && (
                    <>
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm inline-flex items-center gap-1.5 shrink-0"
                            onClick={onExport}
                        >
                            <Download size={14} />
                            Export CSV
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary btn-sm inline-flex items-center gap-1.5 shrink-0"
                            onClick={onCalculate}
                            disabled={calculating}
                        >
                            <Calculator size={14} />
                            {calculating ? 'Calculating...' : 'Calculate Billing'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────
// Comparison "tab" — main reports body
// ──────────────────────────────────────────────

function ComparisonTab({
    month,
    onMonthChange,
    monthOptions,
    isAdmin,
}: {
    month: string;
    onMonthChange: (value: string) => void;
    monthOptions: { value: string; label: string }[];
    isAdmin: boolean;
}) {
    const navigate = useNavigate();

    const goEmployeeDrillDown = (employeeId: number, name: string) => {
        navigate(`/reports/employee/${employeeId}?month=${encodeURIComponent(month)}`, { state: { name } });
    };
    const [report, setReport] = useState<ComparisonReport | null>(null);
    const [computed, setComputed] = useState<ComputedReport[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [calculating, setCalculating] = useState(false);
    const [flagFilter, setFlagFilter] = useState<string>('all');

    const fetchData = async () => {
        setLoading(true);
        try {
            // Try computed reports first, fallback to live comparison
            const computedData = await reportsApi.getComputedReports(month);
            if (computedData && computedData.length > 0) {
                setComputed(computedData);
                setReport(null);
            } else {
                const data = await reportsApi.getComparison(month);
                setReport(data);
                setComputed(null);
            }
        } catch {
            toast.error('Failed to load comparison data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [month]);

    const handleCalculate = async () => {
        setCalculating(true);
        try {
            const result = await reportsApi.calculateBilling(month);
            toast.success(`Calculated billing for ${result.total_computed} employees`);
            setComputed(result.reports);
            setReport(null);
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Calculation failed';
            toast.error(msg);
        } finally {
            setCalculating(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-3">
                <ReportsToolbar
                    month={month}
                    onMonthChange={onMonthChange}
                    monthOptions={monthOptions}
                    isAdmin={isAdmin}
                    onExport={() => reportsApi.exportComparison(month)}
                    onCalculate={handleCalculate}
                    calculating={calculating}
                />
                <div className="card py-12 flex flex-col items-center justify-center gap-3">
                    <div className="spinner w-7 h-7 border-cta" />
                    <p className="text-text-muted text-sm animate-pulse">Loading comparison...</p>
                </div>
            </div>
        );
    }

    // Use computed data if available, otherwise live comparison
    const rows: RowData[] = computed
        ? computed.map(c => ({
            employee_id: c.employee_id,
            rms_name: c.rms_name || 'Unknown',
            jira_username: c.jira_username ?? null,
            aws_email: c.aws_email ?? null,
            jira_hours: c.jira_hours,
            billable_hours: c.billable_hours,
            ooo_days: c.ooo_days,
            aws_hours: c.aws_hours,
            difference: c.difference,
            difference_pct: c.difference_pct,
            flag: c.flag,
            source: c.source ?? null,
        }))
        : (report?.comparisons || []).map(c => ({
            employee_id: c.employee_id,
            rms_name: c.rms_name,
            jira_username: c.jira_username ?? null,
            aws_email: c.aws_email,
            jira_hours: c.jira_billable_hours,
            billable_hours: null,
            ooo_days: c.jira_ooo_days,
            aws_hours: c.aws_total_hours,
            difference: c.difference,
            difference_pct: c.difference_pct,
            flag: c.flag,
            source: c.source ?? null,
        }));

    if (rows.length === 0) {
        return (
            <div className="space-y-3">
                <ReportsToolbar
                    month={month}
                    onMonthChange={onMonthChange}
                    monthOptions={monthOptions}
                    isAdmin={isAdmin}
                    onExport={() => reportsApi.exportComparison(month)}
                    onCalculate={handleCalculate}
                    calculating={calculating}
                />
                <EmptyState message={`No comparison data for ${month}. Import data and run Calculate Billing.`} />
            </div>
        );
    }

    const isNonCompliantFlag = (f: string) => f === 'red' || f === 'no_aws';

    const filtered = rows
        .filter(c => {
            if (flagFilter === 'all') return true;
            if (flagFilter === 'red') return isNonCompliantFlag(c.flag);
            return c.flag === flagFilter;
        })
        .slice()
        .sort((a, b) => (FLAG_ORDER[a.flag] ?? 9) - (FLAG_ORDER[b.flag] ?? 9) || a.rms_name.localeCompare(b.rms_name));

    const redCount = rows.filter(c => isNonCompliantFlag(c.flag)).length;
    const amberCount = rows.filter(c => c.flag === 'amber').length;
    const greenCount = rows.filter(c => c.flag === 'green').length;

    return (
        <div className="space-y-3">
            <ReportsToolbar
                month={month}
                onMonthChange={onMonthChange}
                monthOptions={monthOptions}
                isAdmin={isAdmin}
                onExport={() => reportsApi.exportComparison(month)}
                onCalculate={handleCalculate}
                calculating={calculating}
            />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <SummaryCard
                    label="Total"
                    value={rows.length}
                    valueClassName="text-cta"
                    activeBorderCssVar="--color-cta"
                    onClick={() => setFlagFilter('all')}
                    active={flagFilter === 'all'}
                />
                <SummaryCard
                    label="Non-compliant"
                    value={redCount}
                    valueClassName="text-danger"
                    activeBorderCssVar="--color-danger"
                    onClick={() => setFlagFilter(f => f === 'red' ? 'all' : 'red')}
                    active={flagFilter === 'red'}
                />
                <SummaryCard
                    label="Needs review"
                    value={amberCount}
                    valueClassName="text-warning"
                    activeBorderCssVar="--color-warning"
                    onClick={() => setFlagFilter(f => f === 'amber' ? 'all' : 'amber')}
                    active={flagFilter === 'amber'}
                />
                <SummaryCard
                    label="Compliant"
                    value={greenCount}
                    valueClassName="text-success"
                    activeBorderCssVar="--color-success"
                    onClick={() => setFlagFilter(f => f === 'green' ? 'all' : 'green')}
                    active={flagFilter === 'green'}
                />
            </div>

            <div className="card overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-surface border-b border-border">
                                <th className="px-3 py-2 text-[11px] font-bold text-text-muted">Employee</th>
                                <th className="px-3 py-2 text-[11px] font-bold text-text-muted">Payroll</th>
                                <th className="px-3 py-2 text-[11px] font-bold text-text-muted text-right">Billable Target</th>
                                <th className="px-3 py-2 text-[11px] font-bold text-text-muted text-right">Jira Hrs</th>
                                <th className="px-3 py-2 text-[11px] font-bold text-text-muted text-right">AWS Hrs</th>
                                <th className="px-3 py-2 text-[11px] font-bold text-text-muted text-center">OOO</th>
                                <th className="px-3 py-2 text-[11px] font-bold text-text-muted text-right">Diff</th>
                                <th className="px-3 py-2 text-[11px] font-bold text-text-muted text-right">%</th>
                                <th className="px-3 py-2 text-[11px] font-bold text-text-muted text-center">Flag</th>
                                <th className="px-2 py-2 w-9"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filtered.map(row => (
                                <tr
                                    key={row.employee_id}
                                    className="hover:bg-surface-hover/30 transition-colors cursor-pointer"
                                    onClick={() => goEmployeeDrillDown(row.employee_id, formatPersonName(row.rms_name))}
                                >
                                    <td className="px-3 py-2">
                                        <p className="font-medium text-text leading-tight">{formatPersonName(row.rms_name)}</p>
                                        <p className="text-xs text-text-muted leading-tight mt-0.5">{row.jira_username || row.aws_email || '—'}</p>
                                    </td>
                                    <td className="px-3 py-2">
                                        {row.source ? (
                                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-surface-hover text-text-muted capitalize">
                                                {row.source}
                                            </span>
                                        ) : (
                                            <span className="text-text-muted text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-right text-text-muted tabular-nums">
                                        {row.billable_hours != null ? `${row.billable_hours}h` : '—'}
                                    </td>
                                    <td className="px-3 py-2 text-right font-bold text-text tabular-nums">{row.jira_hours.toFixed(1)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                        {row.aws_hours != null ? (
                                            <span className="font-medium">{row.aws_hours.toFixed(1)}</span>
                                        ) : (
                                            <span className="text-text-muted text-xs">N/A</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-center tabular-nums">
                                        <span className={cn("font-medium", row.ooo_days > 0 ? "text-warning" : "text-text-muted")}>
                                            {row.ooo_days}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                        {row.difference != null ? (
                                            <span className={cn("font-medium", row.difference > 0 ? "text-success" : row.difference < -10 ? "text-danger" : "text-text")}>
                                                {row.difference > 0 ? '+' : ''}{row.difference.toFixed(1)}
                                            </span>
                                        ) : (
                                            <span className="text-text-muted">—</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                        {row.difference_pct != null ? (
                                            <span className="text-text-muted">{row.difference_pct.toFixed(1)}%</span>
                                        ) : (
                                            <span className="text-text-muted">—</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <FlagBadge flag={row.flag === 'no_aws' ? 'red' : row.flag} />
                                    </td>
                                    <td className="px-1.5 py-2 text-center">
                                        <ExternalLink size={14} className="text-text-muted" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length === 0 && (
                    <div className="py-6 text-center text-text-muted text-sm">
                        No entries match the selected filter
                    </div>
                )}
            </div>
        </div>
    );
}

interface RowData {
    employee_id: number;
    rms_name: string;
    jira_username: string | null;
    aws_email: string | null;
    source: string | null;
    jira_hours: number;
    billable_hours: number | null;
    ooo_days: number;
    aws_hours: number | null;
    difference: number | null;
    difference_pct: number | null;
    flag: string;
}

/** Sort: non-compliant first (red + legacy no_aws), then amber, then green */
const FLAG_ORDER: Record<string, number> = { red: 0, no_aws: 0, amber: 1, green: 2 };

function FlagBadge({ flag }: { flag: string }) {
    if (flag === 'red') {
        return (
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-danger/15" title="Non-compliant">
                <span className="w-3 h-3 rounded-full bg-danger shadow-[0_0_6px_var(--color-danger)]" />
            </span>
        );
    }
    if (flag === 'amber') {
        return (
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-warning/15" title="Needs review (30–50% discrepancy)">
                <span className="w-3 h-3 rounded-full bg-warning shadow-[0_0_6px_var(--color-warning)]" />
            </span>
        );
    }
    if (flag === 'green') {
        return (
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-success/15" title="Compliant (≤30% discrepancy)">
                <span className="w-3 h-3 rounded-full bg-success shadow-[0_0_6px_var(--color-success)]" />
            </span>
        );
    }
    return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-surface-hover" title="Unknown status">
            <span className="w-3 h-3 rounded-full bg-text-muted/40" />
        </span>
    );
}

// ──────────────────────────────────────────────
// Shared Components
// ──────────────────────────────────────────────

function SummaryCard({
    label,
    value,
    valueClassName,
    activeBorderCssVar,
    onClick,
    active,
}: {
    label: string;
    value: number;
    valueClassName?: string;
    /** When active, border uses this design-token variable, e.g. `--color-danger` */
    activeBorderCssVar?: string;
    onClick?: () => void;
    active?: boolean;
}) {
    const showAccentBorder = Boolean(active && activeBorderCssVar);

    return (
        <div
            className={cn(
                'card py-2.5 px-3 text-center transition-[border-color,box-shadow] duration-200',
                onClick && 'cursor-pointer hover:shadow-md',
                showAccentBorder && 'border-2',
            )}
            style={
                showAccentBorder
                    ? { borderColor: `var(${activeBorderCssVar})` }
                    : undefined
            }
            onClick={onClick}
            onKeyDown={
                onClick
                    ? e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onClick();
                          }
                      }
                    : undefined
            }
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
        >
            <p className={cn('text-xl font-bold tabular-nums leading-none', valueClassName || 'text-text')}>{value}</p>
            <p className="text-[11px] text-text-muted mt-1.5 leading-tight">{label}</p>
        </div>
    );
}
