import { useState, useEffect } from 'react';
import {
    reportsApi,
    type ComparisonReport,
    type ComplianceReport,
    type TimesheetComparison,
} from '../api/reports';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth, isAdminRole } from '../context/AuthContext';
import {
    BarChart3,
    ClipboardCheck,
    Download,
    AlertTriangle,
    CheckCircle,
    XCircle,
    MinusCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

type Tab = 'comparison' | 'compliance';

export function Reports() {
    const { user } = useAuth();
    const isAdmin = isAdminRole(user?.role);
    const [activeTab, setActiveTab] = useState<Tab>('comparison');
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <p className="text-text-muted">Timesheet comparison, compliance tracking, and exports</p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="month"
                        className="input-field w-48"
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(e.target.value)}
                    />
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
                <ComparisonTab month={selectedMonth} />
            ) : (
                <ComplianceTab month={selectedMonth} />
            )}
        </div>
    );
}

// ──────────────────────────────────────────────
// Comparison Tab
// ──────────────────────────────────────────────

function ComparisonTab({ month }: { month: string }) {
    const [report, setReport] = useState<ComparisonReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [flagFilter, setFlagFilter] = useState<string>('all');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const data = await reportsApi.getComparison(month);
                setReport(data);
            } catch {
                toast.error('Failed to load comparison data');
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
                <p className="text-text-muted text-sm animate-pulse">Loading comparison...</p>
            </div>
        );
    }

    if (!report || report.comparisons.length === 0) {
        return <EmptyState message={`No comparison data for ${month}`} />;
    }

    const filtered = flagFilter === 'all'
        ? report.comparisons
        : report.comparisons.filter(c => c.flag === flagFilter);

    const redCount = report.comparisons.filter(c => c.flag === 'red').length;
    const greenCount = report.comparisons.filter(c => c.flag === 'green').length;
    const noAwsCount = report.comparisons.filter(c => c.flag === 'no_aws').length;

    return (
        <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <SummaryCard label="Total Employees" value={report.total_employees} />
                <SummaryCard label="With Jira Data" value={report.employees_with_jira} color="text-cta" />
                <SummaryCard label="With AWS Data" value={report.employees_with_aws} color="text-info" />
                <SummaryCard
                    label="Flagged (Red)"
                    value={redCount}
                    color="text-danger"
                    onClick={() => setFlagFilter(f => f === 'red' ? 'all' : 'red')}
                    active={flagFilter === 'red'}
                />
                <SummaryCard
                    label="OK (Green)"
                    value={greenCount}
                    color="text-success"
                    onClick={() => setFlagFilter(f => f === 'green' ? 'all' : 'green')}
                    active={flagFilter === 'green'}
                />
            </div>

            {/* Comparison Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-surface-hover/50 border-b border-border">
                                <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase">Employee</th>
                                <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase text-right">Jira Hrs</th>
                                <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase text-right">Billable</th>
                                <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase text-center">OOO</th>
                                <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase text-right">AWS Hrs</th>
                                <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase text-right">Diff</th>
                                <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase text-right">%</th>
                                <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase text-center">Flag</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filtered.map(row => (
                                <ComparisonRow key={row.employee_id} row={row} />
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

function ComparisonRow({ row }: { row: TimesheetComparison }) {
    return (
        <tr className="hover:bg-surface-hover/30 transition-colors">
            <td className="px-4 py-3">
                <p className="font-medium text-text">{row.rms_name}</p>
                <p className="text-xs text-text-muted">{row.jira_username || row.aws_email || '—'}</p>
            </td>
            <td className="px-4 py-3 text-right font-medium">{row.jira_total_hours.toFixed(1)}</td>
            <td className="px-4 py-3 text-right font-bold text-text">{row.jira_billable_hours.toFixed(1)}</td>
            <td className="px-4 py-3 text-center">
                <span className={cn("font-medium", row.jira_ooo_days > 0 ? "text-warning" : "text-text-muted")}>
                    {row.jira_ooo_days}
                </span>
            </td>
            <td className="px-4 py-3 text-right">
                {row.aws_total_hours !== null ? (
                    <span className="font-medium">{row.aws_total_hours.toFixed(1)}</span>
                ) : (
                    <span className="text-text-muted text-xs">N/A</span>
                )}
            </td>
            <td className="px-4 py-3 text-right">
                {row.difference !== null ? (
                    <span className={cn("font-medium", row.difference > 0 ? "text-success" : row.difference < -10 ? "text-danger" : "text-text")}>
                        {row.difference > 0 ? '+' : ''}{row.difference.toFixed(1)}
                    </span>
                ) : (
                    <span className="text-text-muted">—</span>
                )}
            </td>
            <td className="px-4 py-3 text-right">
                {row.difference_pct !== null ? (
                    <span className="text-sm text-text-muted">{row.difference_pct.toFixed(1)}%</span>
                ) : (
                    <span className="text-text-muted">—</span>
                )}
            </td>
            <td className="px-4 py-3 text-center">
                <FlagBadge flag={row.flag} />
            </td>
        </tr>
    );
}

function FlagBadge({ flag }: { flag: string }) {
    if (flag === 'red') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-danger/10 text-danger text-xs font-medium">
                <XCircle size={12} /> Red
            </span>
        );
    }
    if (flag === 'green') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-medium">
                <CheckCircle size={12} /> OK
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-hover text-text-muted text-xs font-medium">
            <MinusCircle size={12} /> No AWS
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
                active && "ring-2 ring-cta"
            )}
            onClick={onClick}
        >
            <p className={cn("text-2xl font-bold", color || "text-text")}>{value}</p>
            <p className="text-xs text-text-muted mt-1">{label}</p>
        </div>
    );
}
