import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    reportsApi,
    type ComparisonReport,
    type ComputedReport,
} from '../api/reports';
import { billingConfigApi, type BillingConfig } from '../api/billingConfig';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth, isAdminRole } from '../context/AuthContext';
import {
    Download,
    Calculator,
    ExternalLink,
    Lock,
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
    frozenMonths,
}: {
    month: string;
    onMonthChange: (value: string) => void;
    monthOptions: { value: string; label: string }[];
    isAdmin: boolean;
    onExport: () => void;
    onCalculate: () => void;
    calculating: boolean;
    frozenMonths?: Set<string>;
}) {
    const _frozenMonths = frozenMonths ?? new Set<string>();
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
                        <option key={opt.value} value={opt.value}>
                            {_frozenMonths.has(opt.value) ? `🔒 ${opt.label}` : opt.label}
                        </option>
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

function flagColor(flag: string): string {
    if (flag === 'red' || flag === 'no_aws') return 'text-danger';
    if (flag === 'amber') return 'text-warning';
    if (flag === 'green') return 'text-success';
    return 'text-text-muted';
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
    const [search, setSearch] = useState('');
    const [sourceFilter, setSourceFilter] = useState<string>('all');
    const [frozenError, setFrozenError] = useState<string | null>(null);
    const [sortCol, setSortCol] = useState<string>('flag');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [billingConfigs, setBillingConfigs] = useState<BillingConfig[]>([]);
    const frozenMonths = new Set(billingConfigs.filter(c => c.is_frozen).map(c => c.billing_month));
    const currentMonthFrozen = frozenMonths.has(month);

    const toggleSort = (col: string) => {
        if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortCol(col); setSortDir('asc'); }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch billing configs for freeze status (best-effort, non-blocking)
            billingConfigApi.list().then(configs => {
                if (configs) setBillingConfigs(configs);
            }).catch(() => { /* ignore */ });

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
        setFrozenError(null);
        try {
            const result = await reportsApi.calculateBilling(month);
            toast.success(`Calculated billing for ${result.total_computed} employees`);
            setComputed(result.reports);
            setReport(null);
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Calculation failed';
            if (msg.toLowerCase().includes('frozen') || msg.toLowerCase().includes('already frozen')) {
                setFrozenError(msg);
            } else {
                toast.error(msg);
            }
        } finally {
            setCalculating(false);
        }
    };

    // ── All hooks must be above any early return ──────────────────────────────

    // Build rows — useMemo keeps reference stable so downstream memos don't thrash
    const rows: RowData[] = useMemo(() => {
        if (computed) {
            return computed.map(c => ({
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
            }));
        }
        return (report?.comparisons || []).map(c => ({
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
    }, [computed, report]);

    const sourceOptions = useMemo(
        () => Array.from(new Set(rows.map(r => r.source).filter((s): s is string => Boolean(s)))).sort(),
        [rows],
    );

    // ── Early returns (after all hooks) ───────────────────────────────────────

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
                    frozenMonths={frozenMonths}
                />
                <div className="card py-12 flex flex-col items-center justify-center gap-3">
                    <div className="spinner w-7 h-7 border-cta" />
                    <p className="text-text-muted text-sm animate-pulse">Loading comparison...</p>
                </div>
            </div>
        );
    }

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
                    frozenMonths={frozenMonths}
                />
                <EmptyState message={`No comparison data for ${month}. Import data and run Calculate Billing.`} />
            </div>
        );
    }

    const isNonCompliantFlag = (f: string) => f === 'red' || f === 'no_aws';

    const q = search.trim().toLowerCase();
    const hasFilters = !!(q || sourceFilter !== 'all' || flagFilter !== 'all');

    const filtered = rows
        .filter(c => {
            if (flagFilter === 'all') return true;
            if (flagFilter === 'red') return isNonCompliantFlag(c.flag);
            return c.flag === flagFilter;
        })
        .filter(c => sourceFilter === 'all' || c.source === sourceFilter)
        .filter(c => {
            if (!q) return true;
            const name = (c.rms_name || '').toLowerCase();
            return (
                name.includes(q) ||
                (c.jira_username || '').toLowerCase().includes(q) ||
                (c.aws_email || '').toLowerCase().includes(q)
            );
        })
        .slice()
        .sort((a, b) => {
            const dir = sortDir === 'asc' ? 1 : -1;
            switch (sortCol) {
                case 'flag': return ((FLAG_ORDER[a.flag] ?? 9) - (FLAG_ORDER[b.flag] ?? 9) || (a.rms_name || '').localeCompare(b.rms_name || '')) * dir;
                case 'name': return (a.rms_name || '').localeCompare(b.rms_name || '') * dir;
                case 'source': return ((a.source || '').localeCompare(b.source || '')) * dir;
                case 'jira': return ((a.jira_hours ?? 0) - (b.jira_hours ?? 0)) * dir;
                case 'aws': return ((a.aws_hours ?? -1) - (b.aws_hours ?? -1)) * dir;
                case 'ooo': return ((a.ooo_days ?? 0) - (b.ooo_days ?? 0)) * dir;
                case 'diff': return ((a.difference ?? -9999) - (b.difference ?? -9999)) * dir;
                case 'pct': return ((a.difference_pct ?? -9999) - (b.difference_pct ?? -9999)) * dir;
                default: return 0;
            }
        });

    const redCount = rows.filter(c => isNonCompliantFlag(c.flag)).length;
    const amberCount = rows.filter(c => c.flag === 'amber').length;
    const greenCount = rows.filter(c => c.flag === 'green').length;

    const holidayCount = rows.filter(r => (r.ooo_days ?? 0) > 0).length;
    const totalOooDays = rows.reduce((sum, r) => sum + (r.ooo_days ?? 0), 0);

    const payrollCounts = sourceOptions.reduce<Record<string, number>>((acc, src) => {
        acc[src] = rows.filter(r => r.source === src).length;
        return acc;
    }, {});

    const SortIcon = ({ col }: { col: string }) => {
        if (sortCol !== col) return <span className="ml-1 opacity-30">↕</span>;
        return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
    };

    const thClass = (_col: string, align = 'left') =>
        cn('px-3 py-2 text-[11px] font-bold text-text-muted uppercase tracking-wide cursor-pointer select-none hover:text-text transition-colors',
            align === 'right' && 'text-right',
            align === 'center' && 'text-center',
        );

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
                frozenMonths={frozenMonths}
            />

            {/* Persistent lock banner when selected month is frozen */}
            {currentMonthFrozen && !frozenError && (
                <div className="flex items-center gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm">
                    <Lock size={15} className="text-warning shrink-0" />
                    <p className="flex-1 text-text">
                        <span className="font-semibold">This billing month is locked.</span>{' '}
                        Recalculation is disabled.{' '}
                        <button
                            onClick={() => navigate('/billing-config')}
                            className="underline text-cta hover:opacity-80 transition-opacity"
                        >
                            Go to Billing Config to unlock
                        </button>
                    </p>
                </div>
            )}

            {/* Error banner shown after a failed calculate attempt */}
            {frozenError && (
                <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
                    <Lock size={16} className="text-warning mt-0.5 shrink-0" />
                    <div className="flex-1">
                        <p className="font-semibold text-text">Billing month is locked</p>
                        <p className="text-text-muted mt-0.5">{frozenError}</p>
                        <button
                            onClick={() => navigate('/billing-config')}
                            className="text-cta text-xs underline hover:opacity-80 mt-1 inline-block"
                        >
                            Go to Billing Config to unlock →
                        </button>
                    </div>
                    <button
                        onClick={() => setFrozenError(null)}
                        className="text-text-muted hover:text-text text-xs px-1"
                        aria-label="Dismiss"
                    >&#x2715;</button>
                </div>
            )}

            {/* Summary stat cards */}
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

            {/* Holiday + Payroll breakdown cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <SummaryCard
                    label="On Holiday (employees : days)"
                    value={`${holidayCount}:${totalOooDays}`}
                    valueClassName="text-text"
                />
                {sourceOptions.map(src => (
                    <SummaryCard
                        key={src}
                        label={`${src} Payroll`}
                        value={payrollCounts[src] ?? 0}
                        valueClassName="text-text"
                        activeBorderCssVar="--color-cta"
                        onClick={() => setSourceFilter(f => f === src ? 'all' : src)}
                        active={sourceFilter === src}
                    />
                ))}
            </div>

            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-2">
                <input
                    type="text"
                    className="input-field flex-1 min-w-[180px] max-w-xs"
                    placeholder="Search by name, Jira user, or AWS email…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <select
                    className="input-field w-[140px]"
                    value={sourceFilter}
                    onChange={e => setSourceFilter(e.target.value)}
                    aria-label="Payroll filter"
                >
                    <option value="all">All Payroll</option>
                    {sourceOptions.map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
                <select
                    className="input-field w-[160px]"
                    value={flagFilter}
                    onChange={e => setFlagFilter(e.target.value)}
                    aria-label="Status filter"
                >
                    <option value="all">All Status</option>
                    <option value="red">Non-compliant</option>
                    <option value="amber">Needs Review</option>
                    <option value="green">Compliant</option>
                </select>
                {hasFilters && (
                    <button
                        className="text-xs text-text-muted hover:text-text transition-colors"
                        onClick={() => { setSearch(''); setSourceFilter('all'); setFlagFilter('all'); }}
                    >
                        Clear filters
                    </button>
                )}
                <span className="ml-auto text-xs text-text-muted tabular-nums">
                    {filtered.length === rows.length
                        ? `${rows.length} employees`
                        : `${filtered.length} of ${rows.length} employees`}
                </span>
            </div>

            {/* Table */}
            <div className="card overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-surface-hover/50 border-b border-border">
                                <th className={thClass('name')} onClick={() => toggleSort('name')}>Employee <SortIcon col="name" /></th>
                                <th className={thClass('source')} onClick={() => toggleSort('source')}>Payroll <SortIcon col="source" /></th>
                                <th className={thClass('flag', 'center')} onClick={() => toggleSort('flag')}>Status <SortIcon col="flag" /></th>
                                <th className={thClass('billable', 'right')}>Billable Target</th>
                                <th className={thClass('jira', 'right')} onClick={() => toggleSort('jira')}>Jira Hrs <SortIcon col="jira" /></th>
                                <th className={thClass('aws', 'right')} onClick={() => toggleSort('aws')}>AWS Hrs <SortIcon col="aws" /></th>
                                <th className={thClass('ooo', 'center')} onClick={() => toggleSort('ooo')}>OOO <SortIcon col="ooo" /></th>
                                <th className={thClass('diff', 'right')} onClick={() => toggleSort('diff')}>Diff <SortIcon col="diff" /></th>
                                <th className={thClass('pct', 'right')} onClick={() => toggleSort('pct')}>% <SortIcon col="pct" /></th>
                                <th className="px-2 py-2 w-9"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filtered.map(row => (
                                <tr
                                    key={row.employee_id}
                                    className="hover:bg-surface-hover/30 transition-colors cursor-pointer"
                                    onClick={() => goEmployeeDrillDown(row.employee_id, formatPersonName(row.rms_name || ''))}
                                >
                                    <td className="px-3 py-2">
                                        <p className="font-medium text-text leading-tight">{formatPersonName(row.rms_name || '')}</p>
                                        <p className="text-xs text-text-muted leading-tight mt-0.5">{row.jira_username || row.aws_email || '—'}</p>
                                    </td>
                                    <td className="px-3 py-2">
                                        {row.source ? (
                                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-surface-hover text-text-muted">
                                                {row.source}
                                            </span>
                                        ) : (
                                            <span className="text-text-muted text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <span className={cn('inline-block px-2 py-0.5 rounded text-[11px] font-semibold',
                                            isNonCompliantFlag(row.flag) ? 'bg-danger/10 text-danger' :
                                            row.flag === 'amber' ? 'bg-warning/10 text-warning' :
                                            'bg-success/10 text-success'
                                        )}>
                                            {isNonCompliantFlag(row.flag) ? 'Non-compliant' : row.flag === 'amber' ? 'Needs review' : 'Compliant'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-right text-text-muted tabular-nums">
                                        {row.billable_hours != null ? `${row.billable_hours}h` : '—'}
                                    </td>
                                    <td className="px-3 py-2 text-right font-bold text-text tabular-nums">{(row.jira_hours ?? 0).toFixed(1)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                        {row.aws_hours != null ? (
                                            <span className="font-medium">{row.aws_hours.toFixed(1)}</span>
                                        ) : (
                                            <span className="text-text-muted text-xs">N/A</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-center tabular-nums">
                                        <span className="font-medium text-text">{row.ooo_days}</span>
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                        {row.difference != null ? (
                                            <span className={cn('font-semibold', flagColor(row.flag))}>
                                                {row.difference > 0 ? '+' : ''}{row.difference.toFixed(1)}
                                            </span>
                                        ) : (
                                            <span className="text-text-muted">—</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                        {row.difference_pct != null ? (
                                            <span className={cn('font-semibold', flagColor(row.flag))}>
                                                {row.difference_pct.toFixed(1)}%
                                            </span>
                                        ) : (
                                            <span className="text-text-muted">—</span>
                                        )}
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
                        No entries match the selected filters
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
    value: number | string;
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
