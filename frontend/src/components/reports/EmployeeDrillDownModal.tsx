import { useState, useEffect, useRef, useCallback } from 'react';
import { reportsApi, type EmployeeDetail } from '../../api/reports';
import { X, AlertTriangle, CheckCircle, XCircle, MinusCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

interface Props {
    employeeId: number;
    employeeName: string;
    month: string;
    onClose: () => void;
}

const AWS_DISPLAY_FIELDS: { label: string; key: string }[] = [
    { label: 'Work Time', key: 'work_time_hms' },
    { label: 'Productive', key: 'productive_hms' },
    { label: 'Unproductive', key: 'unproductive_hms' },
    { label: 'Active', key: 'active_hms' },
    { label: 'Passive', key: 'passive_hms' },
    { label: 'Screen Time', key: 'screen_time_hms' },
    { label: 'Offline Meetings', key: 'offline_meetings_hms' },
];

export function EmployeeDrillDownModal({ employeeId, employeeName, month, onClose }: Props) {
    const [detail, setDetail] = useState<EmployeeDetail | null>(null);
    const [loading, setLoading] = useState(true);

    // Draggable state
    const modalRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });

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

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const summary = detail?.summary;
    const aws = detail?.aws_data;
    const jiraRows = detail?.jira_entries || [];

    // Get day count from month
    const [y, m] = month.split('-').map(Number);
    const numDays = new Date(y, m, 0).getDate();

    return (
        <>
            {/* Blocking overlay */}
            <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

            {/* Modal */}
            <div
                ref={modalRef}
                className="fixed z-50 bg-surface border border-border rounded-xl shadow-2xl flex flex-col"
                style={{
                    left: `calc(50% + ${pos.x}px)`,
                    top: `calc(50% + ${pos.y}px)`,
                    transform: 'translate(-50%, -50%)',
                    width: 'min(95vw, 1000px)',
                    maxHeight: '90vh',
                }}
            >
                {/* Draggable header */}
                <div
                    className="flex items-center justify-between px-5 py-3 border-b border-border cursor-move select-none bg-surface-hover/30 rounded-t-xl"
                    onMouseDown={onMouseDown}
                >
                    <div>
                        <h2 className="text-lg font-bold text-text">{employeeName}</h2>
                        <p className="text-xs text-text-muted">Drill-down for {month}</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded hover:bg-surface-hover transition-colors">
                        <X size={20} className="text-text-muted" />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto p-5 space-y-5" style={{ maxHeight: 'calc(90vh - 60px)' }}>
                    {loading ? (
                        <div className="py-16 flex flex-col items-center gap-3">
                            <div className="spinner w-6 h-6 border-cta" />
                            <p className="text-sm text-text-muted">Loading details...</p>
                        </div>
                    ) : (
                        <>
                            {/* Panel 1: Summary */}
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
                                            <FlagBadgeLarge flag={summary.flag} />
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-text-muted">No computed report. Run "Calculate Billing" first.</p>
                                )}
                            </section>

                            {/* Panel 2: AWS Data */}
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

                            {/* Panel 3: Jira Entries */}
                            <section>
                                <h3 className="text-sm font-bold text-text-muted uppercase mb-2">
                                    Jira Entries ({jiraRows.length} rows)
                                </h3>
                                {jiraRows.length > 0 ? (
                                    <div className="overflow-x-auto border border-border rounded-lg" style={{ maxHeight: '300px' }}>
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
                                                    const isSummary = row.is_summary_row;
                                                    const isOoo = row.is_ooo;
                                                    return (
                                                        <tr key={idx} className={cn(
                                                            "border-b border-border/30",
                                                            isSummary && "bg-cta/5 font-bold",
                                                            isOoo && "bg-warning/5",
                                                        )}>
                                                            <td className={cn(
                                                                "sticky left-0 z-10 px-2 py-1 truncate max-w-[160px]",
                                                                isSummary ? "bg-cta/5" : isOoo ? "bg-warning/5" : "bg-surface",
                                                            )} title={row.issue || ''}>
                                                                {row.issue || (isSummary ? '— Total —' : '')}
                                                            </td>
                                                            <td className="px-2 py-1">
                                                                {isOoo ? (
                                                                    <span className="text-warning font-medium">OOO</span>
                                                                ) : (
                                                                    <span className="text-cta">{row.jira_key || ''}</span>
                                                                )}
                                                            </td>
                                                            <td className="px-2 py-1 text-right font-medium">
                                                                {row.logged && Number(row.logged) > 0 ? `${row.logged}h` : ''}
                                                            </td>
                                                            {Array.from({ length: numDays }, (_, i) => {
                                                                const key = `day_${String(i + 1).padStart(2, '0')}`;
                                                                const val = row[key] as number | null | undefined;
                                                                return (
                                                                    <td key={i} className={cn(
                                                                        "px-1 py-1 text-center tabular-nums",
                                                                        val && Number(val) > 0 ? "text-text" : "text-text-muted/20",
                                                                    )}>
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
            </div>
        </>
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
                <XCircle size={16} /> Red Flag
            </span>
        );
    }
    if (flag === 'amber') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning/10 text-warning text-sm font-bold">
                <AlertTriangle size={16} /> Amber
            </span>
        );
    }
    if (flag === 'green') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/10 text-success text-sm font-bold">
                <CheckCircle size={16} /> OK
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-hover text-text-muted text-sm font-bold">
            <MinusCircle size={16} /> No AWS
        </span>
    );
}
