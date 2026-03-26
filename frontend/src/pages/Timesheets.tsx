import { useState, useEffect } from 'react';
import { timesheetsApi, type TimesheetEntry, type ImportResult, type AwsTimesheetEntry, type AwsImportResult } from '../api/timesheets';
import { employeesApi, type Employee } from '../api/employees';
import { billingApi } from '../api/billing';
import { exportTimesheets } from '../api/exports';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth, isAdminRole } from '../context/AuthContext';
import {
    Upload,
    Download,
    Clock,
    AlertTriangle,
    CheckCircle,
    Calculator,
    Monitor,
    FileSpreadsheet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

type Tab = 'jira' | 'aws';

export function Timesheets() {
    const { user } = useAuth();
    const isAdmin = isAdminRole(user?.role);
    const [activeTab, setActiveTab] = useState<Tab>('jira');

    // Jira state
    const [entries, setEntries] = useState<TimesheetEntry[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [calculating, setCalculating] = useState(false);

    // AWS state
    const [awsEntries, setAwsEntries] = useState<AwsTimesheetEntry[]>([]);
    const [awsLoading, setAwsLoading] = useState(false);
    const [isAwsImportOpen, setIsAwsImportOpen] = useState(false);
    const [awsImportResult, setAwsImportResult] = useState<AwsImportResult | null>(null);

    const fetchJiraData = async () => {
        setLoading(true);
        try {
            const [tsData, empData] = await Promise.all([
                timesheetsApi.list({ import_month: selectedMonth }),
                employeesApi.list({ page_size: 200 }),
            ]);
            setEntries(tsData || []);
            setEmployees(empData || []);
        } catch {
            toast.error('Failed to load timesheet data');
        } finally {
            setLoading(false);
        }
    };

    const fetchAwsData = async () => {
        setAwsLoading(true);
        try {
            const [awsData, empData] = await Promise.all([
                timesheetsApi.listAws(),
                employees.length ? Promise.resolve(employees) : employeesApi.list({ page_size: 200 }),
            ]);
            setAwsEntries(awsData || []);
            if (!employees.length) setEmployees(empData || []);
        } catch {
            toast.error('Failed to load AWS data');
        } finally {
            setAwsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'jira') fetchJiraData();
        else fetchAwsData();
    }, [selectedMonth, activeTab]);

    const empMap = Object.fromEntries(employees.map(e => [e.id, e]));

    // Group Jira entries by employee
    const grouped = entries.reduce<Record<number, TimesheetEntry[]>>((acc, e) => {
        (acc[e.employee_id] ??= []).push(e);
        return acc;
    }, {});

    const handleCalculate = async () => {
        setCalculating(true);
        try {
            const results = await billingApi.calculate(selectedMonth);
            toast.success(`Billing calculated for ${results.length} employees`);
        } catch {
            // handled
        } finally {
            setCalculating(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <p className="text-text-muted">Import Jira/Tempo reports, AWS ActiveTrack data, and manage billing</p>
                </div>
                <div className="flex gap-3">
                    {isAdmin && activeTab === 'jira' && (
                        <>
                            <button onClick={() => exportTimesheets(selectedMonth)} className="btn btn-secondary flex items-center gap-2">
                                <Download size={18} />
                                Export CSV
                            </button>
                            <button onClick={handleCalculate} className="btn btn-secondary flex items-center gap-2" disabled={calculating}>
                                <Calculator size={18} />
                                {calculating ? 'Calculating...' : 'Calculate Billing'}
                            </button>
                            <button onClick={() => setIsImportOpen(true)} className="btn btn-primary flex items-center gap-2">
                                <Upload size={18} />
                                Import XLS
                            </button>
                        </>
                    )}
                    {isAdmin && activeTab === 'aws' && (
                        <button onClick={() => setIsAwsImportOpen(true)} className="btn btn-primary flex items-center gap-2">
                            <Upload size={18} />
                            Import AWS CSV
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border">
                <button
                    onClick={() => setActiveTab('jira')}
                    className={cn(
                        "px-4 py-2.5 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors",
                        activeTab === 'jira'
                            ? "border-cta text-cta"
                            : "border-transparent text-text-muted hover:text-text"
                    )}
                >
                    <FileSpreadsheet size={16} />
                    Jira Timesheets
                </button>
                <button
                    onClick={() => setActiveTab('aws')}
                    className={cn(
                        "px-4 py-2.5 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors",
                        activeTab === 'aws'
                            ? "border-cta text-cta"
                            : "border-transparent text-text-muted hover:text-text"
                    )}
                >
                    <Monitor size={16} />
                    AWS ActiveTrack
                </button>
            </div>

            {activeTab === 'jira' ? (
                <JiraTab
                    entries={entries}
                    grouped={grouped}
                    empMap={empMap}
                    loading={loading}
                    selectedMonth={selectedMonth}
                    setSelectedMonth={setSelectedMonth}
                    importResult={importResult}
                    isAdmin={isAdmin}
                    onImport={() => setIsImportOpen(true)}
                />
            ) : (
                <AwsTab
                    entries={awsEntries}
                    empMap={empMap}
                    loading={awsLoading}
                    importResult={awsImportResult}
                    isAdmin={isAdmin}
                    onImport={() => setIsAwsImportOpen(true)}
                />
            )}

            {isImportOpen && (
                <JiraImportModal
                    isOpen={isImportOpen}
                    onClose={() => setIsImportOpen(false)}
                    onSuccess={(result) => {
                        setImportResult(result);
                        setSelectedMonth(result.month);
                        fetchJiraData();
                    }}
                    defaultMonth={selectedMonth}
                />
            )}

            {isAwsImportOpen && (
                <AwsImportModal
                    isOpen={isAwsImportOpen}
                    onClose={() => setIsAwsImportOpen(false)}
                    onSuccess={(result) => {
                        setAwsImportResult(result);
                        fetchAwsData();
                    }}
                />
            )}
        </div>
    );
}

// ──────────────────────────────────────────────
// Jira Tab
// ──────────────────────────────────────────────

function JiraTab({
    entries, grouped, empMap, loading, selectedMonth, setSelectedMonth, importResult, isAdmin, onImport,
}: {
    entries: TimesheetEntry[];
    grouped: Record<number, TimesheetEntry[]>;
    empMap: Record<number, Employee>;
    loading: boolean;
    selectedMonth: string;
    setSelectedMonth: (m: string) => void;
    importResult: ImportResult | null;
    isAdmin: boolean;
    onImport: () => void;
}) {
    return (
        <>
            <div className="card flex items-center gap-4 py-3 px-4">
                <label className="text-sm font-medium text-text-muted">Month</label>
                <input
                    type="month"
                    className="input-field w-48"
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                />
                <span className="text-sm text-text-muted ml-auto">
                    {entries.length} entries from {Object.keys(grouped).length} employees
                </span>
            </div>

            {importResult && (
                <div className="card bg-info/5 border-info/20">
                    <h3 className="font-bold text-text mb-2">Last Import Result</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div><span className="text-text-muted">Month:</span> <span className="font-medium">{importResult.month}</span></div>
                        <div><span className="text-text-muted">Rows:</span> <span className="font-medium">{importResult.total_rows_processed}</span></div>
                        <div><span className="text-text-muted">Matched:</span> <span className="font-medium text-success">{importResult.employees_matched}</span></div>
                        <div><span className="text-text-muted">Upserted:</span> <span className="font-medium">{importResult.entries_upserted}</span></div>
                    </div>
                    {importResult.employees_unmatched.length > 0 && (
                        <div className="mt-2 flex items-start gap-2">
                            <AlertTriangle size={14} className="text-warning mt-0.5 shrink-0" />
                            <span className="text-xs text-warning">
                                Unmatched: {importResult.employees_unmatched.join(', ')}
                            </span>
                        </div>
                    )}
                </div>
            )}

            <div className="card overflow-hidden">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <div className="spinner w-8 h-8 border-cta" />
                        <p className="text-text-muted text-sm animate-pulse">Loading timesheets...</p>
                    </div>
                ) : Object.keys(grouped).length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-surface-hover/50 border-b border-border">
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase">Employee</th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase text-center">Working Days</th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase text-center">OOO Days</th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase text-center">Total Hours</th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase text-center">Avg/Day</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {Object.entries(grouped).map(([empIdStr, empEntries]) => {
                                    const empId = Number(empIdStr);
                                    const emp = empMap[empId];
                                    const totalHours = empEntries.reduce((s, e) => s + e.hours_logged, 0);
                                    const oooDays = empEntries.filter(e => e.is_ooo).length;
                                    const workingDays = empEntries.filter(e => !e.is_ooo && e.hours_logged > 0).length;
                                    const avgPerDay = workingDays > 0 ? totalHours / workingDays : 0;

                                    return (
                                        <tr key={empId} className="hover:bg-surface-hover/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-text">{emp?.rms_name || `Employee #${empId}`}</p>
                                                <p className="text-xs text-text-muted">{emp?.jira_username || '—'}</p>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <Clock size={14} className="text-cta" />
                                                    <span className="font-medium">{workingDays}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={cn("font-medium", oooDays > 0 ? "text-warning" : "text-text-muted")}>
                                                    {oooDays}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold text-text">{totalHours.toFixed(1)}h</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={cn(
                                                    "font-medium",
                                                    avgPerDay >= 8 ? "text-success" : avgPerDay >= 6 ? "text-cta" : "text-danger"
                                                )}>
                                                    {avgPerDay.toFixed(1)}h
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <EmptyState
                        message={`No timesheet data for ${selectedMonth}`}
                        action={isAdmin ? (
                            <button onClick={onImport} className="btn btn-secondary btn-sm">
                                <Upload size={14} /> Import XLS
                            </button>
                        ) : undefined}
                    />
                )}
            </div>
        </>
    );
}

// ──────────────────────────────────────────────
// AWS Tab
// ──────────────────────────────────────────────

function AwsTab({
    entries, empMap, loading, importResult, isAdmin, onImport,
}: {
    entries: AwsTimesheetEntry[];
    empMap: Record<number, Employee>;
    loading: boolean;
    importResult: AwsImportResult | null;
    isAdmin: boolean;
    onImport: () => void;
}) {
    // Group by week
    const weekGroups = entries.reduce<Record<string, AwsTimesheetEntry[]>>((acc, e) => {
        const key = `${e.week_start} to ${e.week_end}`;
        (acc[key] ??= []).push(e);
        return acc;
    }, {});

    const sortedWeeks = Object.keys(weekGroups).sort().reverse();

    return (
        <>
            {importResult && (
                <div className="card bg-info/5 border-info/20">
                    <h3 className="font-bold text-text mb-2">Last AWS Import Result</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div><span className="text-text-muted">Week:</span> <span className="font-medium">{importResult.week_start} — {importResult.week_end}</span></div>
                        <div><span className="text-text-muted">Total Rows:</span> <span className="font-medium">{importResult.total_rows}</span></div>
                        <div><span className="text-text-muted">Matched:</span> <span className="font-medium text-success">{importResult.employees_matched}</span></div>
                        <div><span className="text-text-muted">Inserted:</span> <span className="font-medium">{importResult.entries_inserted}</span></div>
                    </div>
                    {importResult.unmatched_emails.length > 0 && (
                        <div className="mt-2 flex items-start gap-2">
                            <AlertTriangle size={14} className="text-warning mt-0.5 shrink-0" />
                            <span className="text-xs text-warning">
                                {importResult.employees_unmatched} unmatched emails
                            </span>
                        </div>
                    )}
                    {importResult.skipped_existing > 0 && (
                        <div className="mt-1 text-xs text-text-muted">
                            {importResult.skipped_existing} entries skipped (already imported)
                        </div>
                    )}
                </div>
            )}

            <div className="card overflow-hidden">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <div className="spinner w-8 h-8 border-cta" />
                        <p className="text-text-muted text-sm animate-pulse">Loading AWS data...</p>
                    </div>
                ) : entries.length > 0 ? (
                    <div className="overflow-x-auto">
                        {sortedWeeks.map(weekLabel => {
                            const weekEntries = weekGroups[weekLabel];
                            const belowThreshold = weekEntries.filter(e => e.is_below_threshold).length;

                            return (
                                <div key={weekLabel} className="mb-6 last:mb-0">
                                    <div className="px-6 py-3 bg-surface-hover/30 border-b border-border flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-text">Week: {weekLabel}</h3>
                                        <div className="flex items-center gap-4 text-xs text-text-muted">
                                            <span>{weekEntries.length} users</span>
                                            {belowThreshold > 0 && (
                                                <span className="text-danger font-medium">
                                                    {belowThreshold} below 30hrs
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-border">
                                                <th className="px-6 py-3 text-xs font-bold text-text-muted uppercase">Employee / Email</th>
                                                <th className="px-6 py-3 text-xs font-bold text-text-muted uppercase text-center">Work Hours</th>
                                                <th className="px-6 py-3 text-xs font-bold text-text-muted uppercase text-center">Productive</th>
                                                <th className="px-6 py-3 text-xs font-bold text-text-muted uppercase text-center">Active</th>
                                                <th className="px-6 py-3 text-xs font-bold text-text-muted uppercase text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {weekEntries
                                                .sort((a, b) => a.work_time_hours - b.work_time_hours)
                                                .map(entry => {
                                                    const emp = entry.employee_id ? empMap[entry.employee_id] : null;
                                                    const productiveHrs = (entry.productive_secs / 3600).toFixed(1);
                                                    const activeHrs = (entry.active_secs / 3600).toFixed(1);

                                                    return (
                                                        <tr key={entry.id} className="hover:bg-surface-hover/30 transition-colors">
                                                            <td className="px-6 py-3">
                                                                <p className="font-medium text-text">
                                                                    {emp?.rms_name || entry.aws_email}
                                                                </p>
                                                                {emp && (
                                                                    <p className="text-xs text-text-muted">{entry.aws_email}</p>
                                                                )}
                                                                {!emp && (
                                                                    <p className="text-xs text-warning">Unlinked</p>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-3 text-center">
                                                                <span className={cn(
                                                                    "font-bold",
                                                                    entry.is_below_threshold ? "text-danger" : "text-text"
                                                                )}>
                                                                    {entry.work_time_hours.toFixed(1)}h
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-3 text-center text-text-muted">{productiveHrs}h</td>
                                                            <td className="px-6 py-3 text-center text-text-muted">{activeHrs}h</td>
                                                            <td className="px-6 py-3 text-center">
                                                                {entry.is_below_threshold ? (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-danger/10 text-danger text-xs font-medium">
                                                                        <AlertTriangle size={12} /> Below 30h
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-medium">
                                                                        <CheckCircle size={12} /> OK
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <EmptyState
                        message="No AWS ActiveTrack data imported yet"
                        action={isAdmin ? (
                            <button onClick={onImport} className="btn btn-secondary btn-sm">
                                <Upload size={14} /> Import AWS CSV
                            </button>
                        ) : undefined}
                    />
                )}
            </div>
        </>
    );
}

// ──────────────────────────────────────────────
// Modals
// ──────────────────────────────────────────────

function JiraImportModal({
    isOpen, onClose, onSuccess, defaultMonth,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (result: ImportResult) => void;
    defaultMonth: string;
}) {
    const [file, setFile] = useState<File | null>(null);
    const [month, setMonth] = useState(defaultMonth);
    const [uploading, setUploading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) { toast.error('Select a file'); return; }
        setUploading(true);
        try {
            const result = await timesheetsApi.import(file, month);
            toast.success(`Imported ${result.entries_upserted} entries`);
            onSuccess(result);
            onClose();
        } catch {
            // handled
        } finally {
            setUploading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Import Jira/Tempo Timesheet">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="input-label">Timesheet File (.xls / .xlsx)</label>
                    <input
                        type="file"
                        accept=".xls,.xlsx"
                        className="input-field"
                        onChange={e => setFile(e.target.files?.[0] || null)}
                    />
                </div>
                <div>
                    <label className="input-label">Import Month</label>
                    <input type="month" className="input-field" value={month} onChange={e => setMonth(e.target.value)} />
                </div>
                <div className="text-xs text-text-muted space-y-1">
                    <p><CheckCircle size={12} className="inline text-success mr-1" />8-hour daily cap applied automatically</p>
                    <p><AlertTriangle size={12} className="inline text-warning mr-1" />Value "01" / 1.0 = Out of Office (OOO)</p>
                    <p><CheckCircle size={12} className="inline text-info mr-1" />Re-uploading same month overwrites previous data</p>
                </div>
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="btn btn-secondary flex-1" disabled={uploading}>Cancel</button>
                    <button type="submit" className="btn btn-cta flex-1" disabled={uploading || !file}>
                        {uploading ? <span className="spinner w-4 h-4" /> : 'Upload & Import'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function AwsImportModal({
    isOpen, onClose, onSuccess,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (result: AwsImportResult) => void;
}) {
    const [file, setFile] = useState<File | null>(null);
    const [weekStart, setWeekStart] = useState('');
    const [weekEnd, setWeekEnd] = useState('');
    const [uploading, setUploading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) { toast.error('Select a CSV file'); return; }
        if (!weekStart || !weekEnd) { toast.error('Set week start and end dates'); return; }
        setUploading(true);
        try {
            const result = await timesheetsApi.importAws(file, weekStart, weekEnd);
            toast.success(`Imported ${result.entries_inserted} AWS entries`);
            onSuccess(result);
            onClose();
        } catch {
            // handled
        } finally {
            setUploading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Import AWS ActiveTrack Data">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="input-label">CSV File</label>
                    <input
                        type="file"
                        accept=".csv"
                        className="input-field"
                        onChange={e => setFile(e.target.files?.[0] || null)}
                    />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="input-label">Week Start</label>
                        <input
                            type="date"
                            className="input-field"
                            value={weekStart}
                            onChange={e => setWeekStart(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="input-label">Week End</label>
                        <input
                            type="date"
                            className="input-field"
                            value={weekEnd}
                            onChange={e => setWeekEnd(e.target.value)}
                        />
                    </div>
                </div>
                <div className="text-xs text-text-muted space-y-1">
                    <p><Monitor size={12} className="inline text-cta mr-1" />Weekly export from AWS ActiveTrack</p>
                    <p><CheckCircle size={12} className="inline text-success mr-1" />Users below 30 hrs/week flagged automatically</p>
                    <p><AlertTriangle size={12} className="inline text-warning mr-1" />Unmatched emails can be linked to employees later</p>
                </div>
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="btn btn-secondary flex-1" disabled={uploading}>Cancel</button>
                    <button type="submit" className="btn btn-cta flex-1" disabled={uploading || !file || !weekStart || !weekEnd}>
                        {uploading ? <span className="spinner w-4 h-4" /> : 'Upload & Import'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
