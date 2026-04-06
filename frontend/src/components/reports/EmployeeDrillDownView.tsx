import { useState, useEffect } from 'react';
import { reportsApi, type EmployeeDetail } from '../../api/reports';
import { AlertTriangle, CheckCircle, XCircle, MinusCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatPersonName } from '../../lib/personNames';
import toast from 'react-hot-toast';

export const AWS_DISPLAY_FIELDS: { label: string; key: string }[] = [
    { label: 'Work Time', key: 'work_time_hms' },
    { label: 'Productive', key: 'productive_hms' },
    { label: 'Unproductive', key: 'unproductive_hms' },
    { label: 'Active', key: 'active_hms' },
    { label: 'Passive', key: 'passive_hms' },
    { label: 'Screen Time', key: 'screen_time_hms' },
    { label: 'Offline Meetings', key: 'offline_meetings_hms' },
];

interface Props {
    employeeId: number;
    month: string;
    /** From navigation state for immediate header before fetch completes */
    initialDisplayName?: string;
}

export function EmployeeDrillDownView({ employeeId, month, initialDisplayName }: Props) {
    const [detail, setDetail] = useState<EmployeeDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetail = async () => {
            setLoading(true);
            try {
                const data = await reportsApi.getEmployeeDetail(employeeId, month);
                setDetail(data);
            } catch {
                toast.error('Failed to load employee detail');
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [employeeId, month]);

    const summary = detail?.summary;
    const aws = detail?.aws_data;
    const jiraRows = detail?.jira_entries || [];

    const displayTitle =
        (summary?.rms_name && formatPersonName(summary.rms_name)) ||
        initialDisplayName ||
        'Employee';

    const [y, m] = month.split('-').map(Number);
    const numDays = new Date(y, m, 0).getDate();

    return (
        <div className="space-y-6">
            <div className="border-b border-border pb-4">
                <h2 className="text-lg font-bold text-text">{displayTitle}</h2>
                <p className="text-xs text-text-muted">Drill-down for {month}</p>
            </div>

            {loading ? (
                <div className="py-16 flex flex-col items-center gap-3">
                    <div className="spinner w-6 h-6 border-cta" />
                    <p className="text-sm text-text-muted">Loading details...</p>
                </div>
            ) : (
                <>
                    <section>
                        <h3 className="text-sm font-bold text-text-muted uppercase mb-2">Summary</h3>
                        {summary ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <StatCard label="Jira Hours" value={`${summary.jira_hours}h`} />
                                <StatCard label="AWS Hours" value={summary.aws_hours != null ? `${summary.aws_hours}h` : 'N/A'} />
                                <StatCard label="OOO Days" value={String(summary.ooo_days)} />
                                <StatCard label="Billable Target" value={summary.billable_hours != null ? `${summary.billable_hours}h` : 'N/A'} />
                                <StatCard label="Difference" value={summary.difference != null ? `${summary.difference > 0 ? '+' : ''}${summary.difference}h` : '—'} />
                                <StatCard label="Diff %" value={summary.difference_pct != null ? `${summary.difference_pct}%` : '—'} />
                                <div className="card py-3 px-4 flex items-center justify-center">
                                    <FlagBadgeLarge flag={summary.flag === 'no_aws' ? 'red' : summary.flag} />
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-text-muted">No computed report. Run &quot;Calculate Billing&quot; first.</p>
                        )}
                    </section>

                    <section>
                        <h3 className="text-sm font-bold text-text-muted uppercase mb-2">AWS ActiveTrack Data</h3>
                        {aws ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {AWS_DISPLAY_FIELDS.map(f => (
                                    <StatCard
                                        key={f.key}
                                        label={f.label}
                                        value={(aws[f.key] as string) || '0:00:00'}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-text-muted">No AWS data for this employee/month.</p>
                        )}
                    </section>

                    <section>
                        <h3 className="text-sm font-bold text-text-muted uppercase mb-2">
                            Jira Entries ({jiraRows.length} rows)
                        </h3>
                        {jiraRows.length > 0 ? (
                            <div className="overflow-x-auto border border-border rounded-lg" style={{ maxHeight: 'min(400px, 50vh)' }}>
                                <table className="w-full text-left border-collapse text-xs" style={{ minWidth: `${400 + numDays * 44}px` }}>
                                    <thead className="sticky top-0 bg-surface z-10">
                                        <tr className="border-b border-border">
                                            <th className="sticky left-0 z-20 bg-surface px-2 py-2 text-xs font-bold text-text-muted uppercase min-w-[140px]">Issue</th>
                                            <th className="px-2 py-2 text-xs font-bold text-text-muted uppercase min-w-[70px]">Key</th>
                                            <th className="px-2 py-2 text-xs font-bold text-text-muted uppercase text-right min-w-[50px]">Logged</th>
                                            {Array.from({ length: numDays }, (_, i) => (
                                                <th key={i} className="px-1 py-2 text-xs font-bold text-text-muted text-center min-w-[40px]">
                                                    {String(i + 1).padStart(2, '0')}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {jiraRows.map((row, idx) => {
                                            const isSummary = Boolean(row.is_summary_row);
                                            const isOoo = Boolean(row.is_ooo);
                                            const issueStr =
                                                typeof row.issue === 'string'
                                                    ? row.issue
                                                    : row.issue != null
                                                      ? String(row.issue)
                                                      : '';
                                            return (
                                                <tr
                                                    key={idx}
                                                    className={cn(
                                                        'border-b border-border/30',
                                                        isSummary && 'bg-cta/5 font-bold',
                                                        isOoo && 'bg-warning/5',
                                                    )}
                                                >
                                                    <td
                                                        className={cn(
                                                            'sticky left-0 z-10 px-2 py-1 truncate max-w-[160px]',
                                                            isSummary ? 'bg-cta/5' : isOoo ? 'bg-warning/5' : 'bg-surface',
                                                        )}
                                                        title={issueStr || (isSummary ? '— Total —' : '')}
                                                    >
                                                        {issueStr || (isSummary ? '— Total —' : '')}
                                                    </td>
                                                    <td className="px-2 py-1">
                                                        {isOoo ? (
                                                            <span className="text-warning font-medium">OOO</span>
                                                        ) : (
                                                            <span className="text-cta">{String(row.jira_key || '')}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-2 py-1 text-right font-medium">
                                                        {row.logged && Number(row.logged) > 0 ? `${row.logged}h` : ''}
                                                    </td>
                                                    {Array.from({ length: numDays }, (_, i) => {
                                                        const key = `day_${String(i + 1).padStart(2, '0')}`;
                                                        const val = row[key] as number | null | undefined;
                                                        return (
                                                            <td
                                                                key={i}
                                                                className={cn(
                                                                    'px-1 py-1 text-center tabular-nums',
                                                                    val && Number(val) > 0 ? 'text-text' : 'text-text-muted/20',
                                                                )}
                                                            >
                                                                {val && Number(val) > 0 ? val : ''}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-sm text-text-muted">No Jira entries for this employee/month.</p>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="card py-3 px-4 text-center">
            <p className="text-lg font-bold text-text">{value}</p>
            <p className="text-xs text-text-muted mt-0.5">{label}</p>
        </div>
    );
}

function FlagBadgeLarge({ flag }: { flag: string }) {
    if (flag === 'red') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-danger/10 text-danger text-sm font-bold">
                <XCircle size={16} /> Non-compliant
            </span>
        );
    }
    if (flag === 'amber') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning/10 text-warning text-sm font-bold">
                <AlertTriangle size={16} /> Needs review
            </span>
        );
    }
    if (flag === 'green') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/10 text-success text-sm font-bold">
                <CheckCircle size={16} /> Compliant
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-hover text-text-muted text-sm font-bold">
            <MinusCircle size={16} /> Unknown
        </span>
    );
}
