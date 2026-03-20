import { useState, useEffect } from 'react';
import { timesheetsApi, type TimesheetEntry, type ImportResult } from '../api/timesheets';
import { employeesApi, type Employee } from '../api/employees';
import { billingApi, type BillingCalculationResult } from '../api/billing';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth, isAdminRole } from '../context/AuthContext';
import {
    Upload,
    Calendar,
    Clock,
    AlertTriangle,
    CheckCircle,
    Calculator,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

export function Timesheets() {
    const { user } = useAuth();
    const isAdmin = isAdminRole(user?.role);
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

    const fetchData = async () => {
        setLoading(true);
        try {
            const [tsData, empData] = await Promise.all([
                timesheetsApi.list({ import_month: selectedMonth }),
                employeesApi.list(),
            ]);
            setEntries(tsData || []);
            setEmployees(empData || []);
        } catch {
            toast.error('Failed to load timesheet data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [selectedMonth]);

    const empMap = Object.fromEntries(employees.map(e => [e.id, e]));

    // Group entries by employee
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
                    <h1 className="text-2xl font-bold text-text">Timesheets & Billing</h1>
                    <p className="text-text-muted mt-1">Import Jira/Tempo reports and manage billing calculations</p>
                </div>
                <div className="flex gap-3">
                    {isAdmin && (
                        <>
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
                </div>
            </div>

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
                            <button onClick={() => setIsImportOpen(true)} className="btn btn-secondary btn-sm">
                                <Upload size={14} /> Import XLS
                            </button>
                        ) : undefined}
                    />
                )}
            </div>

            {isImportOpen && (
                <ImportModal
                    isOpen={isImportOpen}
                    onClose={() => setIsImportOpen(false)}
                    onSuccess={(result) => {
                        setImportResult(result);
                        setSelectedMonth(result.month);
                        fetchData();
                    }}
                    defaultMonth={selectedMonth}
                />
            )}
        </div>
    );
}

function ImportModal({
    isOpen,
    onClose,
    onSuccess,
    defaultMonth,
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
                    <p><CheckCircle size={12} className="inline text-success mr-1" />Daily hours (standard = 8.0)</p>
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
