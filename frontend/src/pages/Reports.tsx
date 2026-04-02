import { useState, useEffect } from 'react';
import {
    reportsApi,
    type ComparisonReport,
    type ComplianceReport,
    type TimesheetComparison,
    type ComputedReport,
} from '../api/reports';
import { EmptyState } from '../components/ui/EmptyState';
import { EmployeeDrillDownModal } from '../components/reports/EmployeeDrillDownModal';
import { useAuth, isAdminRole } from '../context/AuthContext';
import {
    BarChart3,
    ClipboardCheck,
    Download,
    AlertTriangle,
    CheckCircle,
    XCircle,
    MinusCircle,
    Calculator,
    ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

type Tab = 'comparison' | 'compliance';

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

export function Reports() {
    const { user } = useAuth();
    const isAdmin = isAdminRole(user?.role);
    const [activeTab, setActiveTab] = useState<Tab>('comparison');
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    // Drill-down modal state
    const [drillDown, setDrillDown] = useState<{ employeeId: number; name: string } | null>(null);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <p className="text-text-muted">Timesheet comparison, compliance tracking, and exports</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        className="input-field w-48"
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(e.target.value)}
                    >
                        {MONTH_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    {isAdmin && activeTab === 'comparison' && (
                        <button
                            onClick={() => reportsApi.exportComparison(selectedMonth)}
                            className="btn btn-secondary flex items-center gap-2"
                        >
                            <Download size={16} />
                            Export CSV
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border">
                <button
                    onClick={() => setActiveTab('comparison')}
                    className={cn(
                        "px-4 py-2.5 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors",
                        activeTab === 'comparison'
                            ? "border-cta text-cta"
                            : "border-transparent text-text-muted hover:text-text"
                    )}
                >
                    <BarChart3 size={16} />
                    Jira vs AWS Comparison
                </button>
                <button
                    onClick={() => setActiveTab('compliance')}
                    className={cn(
                        "px-4 py-2.5 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors",
                        activeTab === 'compliance'
                            ? "border-cta text-cta"
                            : "border-transparent text-text-muted hover:text-text"
                    )}
                >
                    <ClipboardCheck size={16} />
                    Compliance
                </button>
            </div>

            {activeTab === 'comparison' ? (
                <ComparisonTab
                    month={selectedMonth}
                    isAdmin={isAdmin}
                    onDrillDown={(id, name) => setDrillDown({ employeeId: id, name })}
                />
            ) : (
                <ComplianceTab month={selectedMonth} />
            )}

            {drillDown && (
                <EmployeeDrillDownModal
                    employeeId={drillDown.employeeId}
                    employeeName={drillDown.name}
                    month={selectedMonth}
                    onClose={() => setDrillDown(null)}
                />
            )}
        </div>
    );
}

// ──────────────────────────────────────────────
// Comparison Tab
// ──────────────────────────────────────────────

function ComparisonTab({
    month,
    isAdmin,
    onDrillDown,
}: {
    month: string;
    isAdmin: boolean;
    onDrillDown: (employeeId: number, name: string) => void;
}) {
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
            <div className="card py-20 flex flex-col items-center justify-center gap-4">
                <div className="spinner w-8 h-8 border-cta" />
                <p className="text-text-muted text-sm animate-pulse">Loading comparison...</p>
            </div>
        );
    }

    // Use computed data if available, otherwise live comparison
    const rows: RowData[] = computed
        ? computed.map(c => ({
            employee_id: c.employee_id,
            rms_name: c.rms_name || 'Unknown',
            jira_username: c.jira_username,
            aws_email: c.aws_email,
            jira_hours: c.jira_hours,
            billable_hours: c.billable_hours,
            ooo_days: c.ooo_days,
            aws_hours: c.aws_hours,
            difference: c.difference,
            difference_pct: c.difference_pct,
            flag: c.flag,
        }))
        : (report?.comparisons || []).map(c => ({
            employee_id: c.employee_id,
            rms_name: c.rms_name,
            jira_username: c.jira_username,
            aws_email: c.aws_email,
            jira_hours: c.jira_billable_hours,
            billable_hours: null,
            ooo_days: c.jira_ooo_days,
            aws_hours: c.aws_total_hours,
            difference: c.difference,
            difference_pct: c.difference_pct,
            flag: c.flag,
        }));

    if (rows.length === 0) {
        return (
            <>
                {isAdmin && (
                    <div className="flex justify-end">
                        <button onClick={handleCalculate} className="btn btn-primary flex items-center gap-2" disabled={calculating}>
                            <Calculator size={16} />
                            {calculating ? 'Calculating...' : 'Calculate Billing'}
                        </button>
                    </div>
                )}
                <EmptyState message={`No comparison data for ${month}. Import data and run Calculate Billing.`} />
            </>
        );
    }

    const filtered = (flagFilter === 'all' ? rows : rows.filter(c => c.flag === flagFilter))
        .slice()
        .sort((a, b) => (FLAG_ORDER[a.flag] ?? 9) - (FLAG_ORDER[b.flag] ?? 9) || a.rms_name.localeCompare(b.rms_name));

    const redCount = rows.filter(c => c.flag === 'red').length;
    const amberCount = rows.filter(c => c.flag === 'amber').length;
    const greenCount = rows.filter(c => c.flag === 'green').length;
    const noAwsCount = rows.filter(c => c.flag === 'no_aws').length;

    return (
        <>
            {/* Calculate button */}
            {isAdmin && (
                <div className="flex justify-end">
                    <button onClick={handleCalculate} className="btn btn-primary flex items-center gap-2" disabled={calculating}>
                        <Calculator size={16} />
                        {calculating ? 'Calculating...' : 'Calculate Billing'}
                    </button>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <SummaryCard
                    label="Total"
                    value={rows.length}
                    color="text-cta"
                    onClick={() => setFlagFilter('all')}
                    active={flagFilter === 'all'}
                />
                <SummaryCard
                    label="Red"
                    value={redCount}
                    color="text-danger"
                    onClick={() => setFlagFilter(f => f === 'red' ? 'all' : 'red')}
                    active={flagFilter === 'red'}
                />
                <SummaryCard
                    label="Amber"
                    value={amberCount}
                    color="text-warning"
                    onClick={() => setFlagFilter(f => f === 'amber' ? 'all' : 'amber')}
                    active={flagFilter === 'amber'}
                />
                <SummaryCard
                    label="Green"
                    value={greenCount}
                    color="text-success"
                    onClick={() => setFlagFilter(f => f === 'green' ? 'all' : 'green')}
                    active={flagFilter === 'green'}
                />
                <SummaryCard
                    label="No AWS"
                    value={noAwsCount}
                    color="text-text-muted"
                    onClick={() => setFlagFilter(f => f === 'no_aws' ? 'all' : 'no_aws')}
                    active={flagFilter === 'no_aws'}
                />
            </div>

            {/* Comparison Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-surface-hover/50 border-b border-border">
                                <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase">Employee</th>
                                <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase text-right">Billable Target</th>
                                <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase text-right">Jira Hrs</th>
                                <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase text-right">AWS Hrs</th>
                                <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase text-center">OOO</th>
                                <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase text-right">Diff</th>
                                <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase text-right">%</th>
                                <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase text-center">Flag</th>
                                <th className="px-4 py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filtered.map(row => (
                                <tr
                                    key={row.employee_id}
                                    className="hover:bg-surface-hover/30 transition-colors cursor-pointer"
                                    onClick={() => onDrillDown(row.employee_id, row.rms_name)}
                                >
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-text">{row.rms_name}</p>
                                        <p className="text-xs text-text-muted">{row.jira_username || row.aws_email || '—'}</p>
                                    </td>
                                    <td className="px-4 py-3 text-right text-text-muted">
                                        {row.billable_hours != null ? `${row.billable_hours}h` : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-text">{row.jira_hours.toFixed(1)}</td>
                                    <td className="px-4 py-3 text-right">
                                        {row.aws_hours != null ? (
                                            <span className="font-medium">{row.aws_hours.toFixed(1)}</span>
                                        ) : (
                                            <span className="text-text-muted text-xs">N/A</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={cn("font-medium", row.ooo_days > 0 ? "text-warning" : "text-text-muted")}>
                                            {row.ooo_days}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {row.difference != null ? (
                                            <span className={cn("font-medium", row.difference > 0 ? "text-success" : row.difference < -10 ? "text-danger" : "text-text")}>
                                                {row.difference > 0 ? '+' : ''}{row.difference.toFixed(1)}
                                            </span>
                                        ) : (
                                            <span className="text-text-muted">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {row.difference_pct != null ? (
                                            <span className="text-sm text-text-muted">{row.difference_pct.toFixed(1)}%</span>
                                        ) : (
                                            <span className="text-text-muted">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <FlagBadge flag={row.flag} />
                                    </td>
                                    <td className="px-2 py-3 text-center">
                                        <ExternalLink size={14} className="text-text-muted" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length === 0 && (
                    <div className="py-8 text-center text-text-muted text-sm">
                        No entries match the selected filter
                    </div>
                )}
            </div>
        </>
    );
}

interface RowData {
    employee_id: number;
    rms_name: string;
    jira_username: string | null;
    aws_email: string | null;
    jira_hours: number;
    billable_hours: number | null;
    ooo_days: number;
    aws_hours: number | null;
    difference: number | null;
    difference_pct: number | null;
    flag: string;
}

const FLAG_ORDER: Record<string, number> = { red: 0, amber: 1, no_aws: 2, green: 3 };

function FlagBadge({ flag }: { flag: string }) {
    if (flag === 'red') {
        return (
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-danger/15" title="Red — Non-compliant">
                <span className="w-3 h-3 rounded-full bg-danger shadow-[0_0_6px_var(--color-danger)]" />
            </span>
        );
    }
    if (flag === 'amber') {
        return (
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-warning/15" title="Amber — Needs attention">
                <span className="w-3 h-3 rounded-full bg-warning shadow-[0_0_6px_var(--color-warning)]" />
            </span>
        );
    }
    if (flag === 'green') {
        return (
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-success/15" title="Green — Compliant">
                <span className="w-3 h-3 rounded-full bg-success shadow-[0_0_6px_var(--color-success)]" />
            </span>
        );
    }
    return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-surface-hover" title="No AWS data">
            <span className="w-3 h-3 rounded-full bg-text-muted/40" />
        </span>
    );
}

// ──────────────────────────────────────────────
// Compliance Tab
// ──────────────────────────────────────────────

function ComplianceTab({ month }: { month: string }) {
    const [report, setReport] = useState<ComplianceReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const data = await reportsApi.getCompliance(month);
                setReport(data);
            } catch {
                toast.error('Failed to load compliance data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [month]);

    if (loading) {
        return (
            <div className="card py-20 flex flex-col items-center justify-center gap-4">
                <div className="spinner w-8 h-8 border-cta" />
                <p className="text-text-muted text-sm animate-pulse">Loading compliance...</p>
            </div>
        );
    }

    if (!report) {
        return <EmptyState message={`No compliance data for ${month}`} />;
    }

    const filtered = statusFilter === 'all'
        ? report.entries
        : report.entries.filter(e => e.status === statusFilter);

    return (
        <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryCard label="Active Employees" value={report.total_active} />
                <SummaryCard
                    label="Complete"
                    value={report.complete}
                    color="text-success"
                    onClick={() => setStatusFilter(f => f === 'complete' ? 'all' : 'complete')}
                    active={statusFilter === 'complete'}
                />
                <SummaryCard
                    label="Partial"
                    value={report.partial}
                    color="text-warning"
                    onClick={() => setStatusFilter(f => f === 'partial' ? 'all' : 'partial')}
                    active={statusFilter === 'partial'}
                />
                <SummaryCard
                    label="Missing"
                    value={report.missing}
                    color="text-danger"
                    onClick={() => setStatusFilter(f => f === 'missing' ? 'all' : 'missing')}
                    active={statusFilter === 'missing'}
                />
            </div>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-surface-hover/50 border-b border-border">
                                <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase">Employee</th>
                                <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase text-center">Days Logged</th>
                                <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase text-right">Total Hours</th>
                                <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filtered.map(entry => (
                                <tr key={entry.employee_id} className="hover:bg-surface-hover/30 transition-colors">
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-text">{entry.rms_name}</p>
                                        <p className="text-xs text-text-muted">{entry.jira_username || '—'}</p>
                                    </td>
                                    <td className="px-4 py-3 text-center font-medium">{entry.days_logged}</td>
                                    <td className="px-4 py-3 text-right font-medium">{entry.total_hours.toFixed(1)}h</td>
                                    <td className="px-4 py-3 text-center">
                                        {entry.status === 'complete' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-medium">
                                                <CheckCircle size={12} /> Complete
                                            </span>
                                        )}
                                        {entry.status === 'partial' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/10 text-warning text-xs font-medium">
                                                <AlertTriangle size={12} /> Partial
                                            </span>
                                        )}
                                        {entry.status === 'missing' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-danger/10 text-danger text-xs font-medium">
                                                <XCircle size={12} /> Missing
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length === 0 && (
                    <div className="py-8 text-center text-text-muted text-sm">
                        No entries match the selected filter
                    </div>
                )}
            </div>
        </>
    );
}

// ──────────────────────────────────────────────
// Shared Components
// ──────────────────────────────────────────────

function SummaryCard({
    label, value, color, onClick, active,
}: {
    label: string;
    value: number;
    color?: string;
    onClick?: () => void;
    active?: boolean;
}) {
    return (
        <div
            className={cn(
                "card py-4 px-5 text-center transition-all",
                onClick && "cursor-pointer hover:shadow-md",
                active && "ring-2 ring-offset-2",
                active && color === "text-danger" && "ring-danger",
                active && color === "text-warning" && "ring-warning",
                active && color === "text-success" && "ring-success",
                active && color === "text-cta" && "ring-cta",
                active && color === "text-text-muted" && "ring-text-muted",
                active && !color && "ring-cta",
            )}
            onClick={onClick}
        >
            <p className={cn("text-2xl font-bold", color || "text-text")}>{value}</p>
            <p className="text-xs text-text-muted mt-1">{label}</p>
        </div>
    );
}
