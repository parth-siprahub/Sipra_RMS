import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { employeesApi, type Employee, type EmployeeUpdate } from '../api/employees';
import { clientsApi, type Client } from '../api/clients';
import { candidatesApi } from '../api/candidates';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { cn } from '../lib/utils';
import { formatPersonName } from '../lib/personNames';
import { useAuth, isAdminRole } from '../context/AuthContext';
import { exportEmployees } from '../api/exports';
import { authApi, type UserCreate } from '../api/auth';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import {
    Search,
    Edit2,
    Download,
    UserPlus,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
    ChevronDown,
    RotateCcw,
} from 'lucide-react';

type EmployeeSortKey = 'rms_name' | 'job_profile_name' | 'client_name' | 'status' | 'start_date';
type SortDir = 'asc' | 'desc';

function todayIsoDate(): string {
    return new Date().toISOString().slice(0, 10);
}

function sortValueForKey(emp: Employee, key: EmployeeSortKey): string {
    switch (key) {
        case 'rms_name':
            return (emp.rms_name || '').toLowerCase();
        case 'job_profile_name':
            return (emp.job_profile_name || '').toLowerCase();
        case 'client_name':
            return (emp.client_name || '').toLowerCase();
        case 'status':
            return (emp.status || '').toLowerCase();
        case 'start_date':
            return emp.start_date || '';
        default:
            return '';
    }
}

function hiringTypeLabel(emp: Employee): string {
    if (emp.is_backfill === true) return 'Backfill';
    if (emp.is_backfill === false) return 'New';
    return '';
}

function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function exportVisibleEmployeesCsv(rows: Employee[], statusFilter: string) {
    const headers = [
        'Employee Name',
        'Job Profile',
        'Client Name',
        'SOW',
        'Hiring Type',
        'Payroll',
        'Status',
        'Start Date',
        'Exit Date',
    ];
    const lines = [
        headers.join(','),
        ...rows.map((emp) => {
            const cells = [
                emp.rms_name || '',
                emp.job_profile_name || '',
                emp.client_name || '',
                emp.sow_number || '',
                hiringTypeLabel(emp),
                emp.source || '',
                emp.status || '',
                emp.start_date || '',
                emp.exit_date || '',
            ];
            return cells
                .map((c) => `"${String(c).replace(/"/g, '""')}"`)
                .join(',');
        }),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const stamp = new Date().toISOString().slice(0, 10);
    triggerDownload(blob, `employees_${statusFilter.toLowerCase()}_${stamp}.csv`);
}

function exportVisibleEmployeesXlsx(rows: Employee[], statusFilter: string) {
    const data = rows.map((emp) => ({
        'Employee Name': emp.rms_name || '',
        'Job Profile': emp.job_profile_name || '',
        'Client Name': emp.client_name || '',
        SOW: emp.sow_number || '',
        'Hiring Type': hiringTypeLabel(emp),
        Payroll: emp.source || '',
        Status: emp.status || '',
        'Start Date': emp.start_date || '',
        'Exit Date': emp.exit_date || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    const ab = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([ab], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const stamp = new Date().toISOString().slice(0, 10);
    triggerDownload(blob, `employees_${statusFilter.toLowerCase()}_${stamp}.xlsx`);
}

function EmployeeSortTh({
    label,
    columnKey,
    sortKey,
    sortDir,
    onSort,
    className,
}: {
    label: string;
    columnKey: EmployeeSortKey;
    sortKey: EmployeeSortKey;
    sortDir: SortDir;
    onSort: (k: EmployeeSortKey) => void;
    className?: string;
}) {
    const active = sortKey === columnKey;
    return (
        <th className={cn('px-6 py-4 text-xs font-bold text-text-muted', className)}>
            <button
                type="button"
                onClick={() => onSort(columnKey)}
                className="inline-flex items-center gap-1.5 hover:text-text transition-colors -ml-1 px-1 py-0.5 rounded-md hover:bg-surface-hover/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-cta/40"
                aria-label={`Sort by ${label}`}
            >
                {label}
                {active ? (
                    sortDir === 'asc' ? <ArrowUp size={14} className="text-cta shrink-0" /> : <ArrowDown size={14} className="text-cta shrink-0" />
                ) : (
                    <ArrowUpDown size={14} className="text-text-muted opacity-50 shrink-0" />
                )}
            </button>
        </th>
    );
}

export function EditEmployeeForm({
    onSaved,
    onCancel,
    employee,
    payrollOptions,
}: {
    onSaved: () => void;
    onCancel: () => void;
    employee: Employee;
    payrollOptions: string[];
}) {
    const initiallyExited = employee.status === 'EXITED';
    const [form, setForm] = useState<EmployeeUpdate>({
        rms_name: employee.rms_name,
        client_name: employee.client_name || '',
        aws_email: employee.aws_email || '',
        siprahub_email: employee.siprahub_email || '',
        github_id: employee.github_id || '',
        jira_username: employee.jira_username || '',
        source: employee.source || '',
    });
    const [employmentStatus, setEmploymentStatus] = useState<'ACTIVE' | 'EXITED'>(
        initiallyExited ? 'EXITED' : 'ACTIVE'
    );
    const [exitDate, setExitDate] = useState<string>(employee.exit_date || todayIsoDate());
    const [exitReason, setExitReason] = useState<string>('');
    const [clientOffboardingDate, setClientOffboardingDate] = useState<string>(employee.client_offboarding_date || '');
    const [siprahubOffboardingDate, setSiprahubOffboardingDate] = useState<string>(employee.siprahub_offboarding_date || '');
    const [showRevertConfirm, setShowRevertConfirm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    useEffect(() => {
        clientsApi.list().then(setClients).catch(() => {});
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (employmentStatus === 'EXITED' && !exitReason.trim()) {
                toast.error('Please provide an exit reason');
                setSubmitting(false);
                return;
            }
            if (employmentStatus === 'EXITED' && !exitDate) {
                toast.error('Please select an exit date');
                setSubmitting(false);
                return;
            }

            const payload: EmployeeUpdate = {};
            if (form.rms_name && form.rms_name !== employee.rms_name) payload.rms_name = form.rms_name;
            if (form.client_name !== undefined) payload.client_name = form.client_name || undefined;
            if (form.aws_email !== undefined) payload.aws_email = form.aws_email || undefined;
            if (form.siprahub_email !== undefined) payload.siprahub_email = form.siprahub_email || undefined;
            if (form.github_id !== undefined) payload.github_id = form.github_id || undefined;
            if (form.jira_username !== undefined) payload.jira_username = form.jira_username || undefined;
            if (form.source !== undefined) payload.source = form.source || undefined;
            payload.status = employmentStatus;
            payload.exit_date = employmentStatus === 'EXITED' ? exitDate : null;
            payload.client_offboarding_date = employmentStatus === 'EXITED' ? (clientOffboardingDate || null) : null;
            payload.siprahub_offboarding_date = employmentStatus === 'EXITED' ? (siprahubOffboardingDate || null) : null;

            await employeesApi.update(employee.id, payload);
            // Persist exit details on linked candidate record and sync status.
            if (employee.candidate_id && employmentStatus === 'EXITED') {
                try {
                    // Use the proper exit endpoint to sync candidate.status → EXIT
                    await candidatesApi.exit(employee.candidate_id, {
                        last_working_day: exitDate,
                        ...(exitReason.trim() ? { exit_reason: exitReason.trim() } : {}),
                    });
                } catch {
                    // Candidate may already be EXIT or not ONBOARDED — fallback to field update only
                    await candidatesApi.update(employee.candidate_id, {
                        exit_reason: exitReason.trim() || undefined,
                        last_working_day: exitDate,
                    });
                }
            }
            // Sync candidate back to ONBOARDED if reverting employee to ACTIVE
            if (employee.candidate_id && employmentStatus === 'ACTIVE' && initiallyExited) {
                try {
                    await candidatesApi.revertExit(employee.candidate_id);
                } catch {
                    // Already active or not in EXIT state — ignore
                }
            }
            toast.success('Employee updated');
            onSaved();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update employee');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                    <div className="lg:col-span-2">
                        <label className="input-label" htmlFor="rms_name">RMS Name</label>
                        <input id="rms_name" title="RMS Name" placeholder="Full Name" className="input-field" value={form.rms_name || ''} onChange={e => setForm(p => ({ ...p, rms_name: e.target.value }))} />
                    </div>
                    <div className="lg:col-span-2">
                        <label className="input-label" htmlFor="client_name">Client Name</label>
                        <select
                            id="client_name"
                            title="Client Name"
                            className="input-field"
                            value={form.client_name || ''}
                            onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))}
                        >
                            <option value="">Select client...</option>
                            {clients.map(c => (
                                <option key={c.id} value={c.client_name}>{c.client_name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="input-label" htmlFor="aws_email">AWS Email</label>
                        <input id="aws_email" className="input-field" type="email" value={form.aws_email || ''} onChange={e => setForm(p => ({ ...p, aws_email: e.target.value }))} placeholder="user@client.awsapps.com" />
                    </div>
                    <div>
                        <label className="input-label" htmlFor="siprahub_email">SipraHub Email</label>
                        <input id="siprahub_email" className="input-field" type="email" value={form.siprahub_email || ''} onChange={e => setForm(p => ({ ...p, siprahub_email: e.target.value }))} placeholder="user@siprahub.com" />
                    </div>
                    <div>
                        <label className="input-label" htmlFor="github_id">GitHub ID</label>
                        <input id="github_id" className="input-field" value={form.github_id || ''} onChange={e => setForm(p => ({ ...p, github_id: e.target.value }))} placeholder="github-username" />
                    </div>
                    <div>
                        <label className="input-label" htmlFor="jira_username">Jira Username</label>
                        <input id="jira_username" className="input-field" value={form.jira_username || ''} onChange={e => setForm(p => ({ ...p, jira_username: e.target.value }))} placeholder="jira-username" />
                    </div>
                    <div className="lg:col-span-2">
                        <label className="input-label" htmlFor="payroll_source">Payroll</label>
                        <select
                            id="payroll_source"
                            title="Payroll"
                            className="input-field"
                            value={form.source || ''}
                            onChange={e => setForm(p => ({ ...p, source: e.target.value }))}
                        >
                            <option value="">Select payroll...</option>
                            {payrollOptions.map((payroll) => (
                                <option key={payroll} value={payroll}>
                                    {payroll}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="input-label" htmlFor="payroll_source">Payroll</label>
                    <select
                        id="payroll_source"
                        title="Payroll"
                        className="input-field"
                        value={form.source || ''}
                        onChange={e => setForm(p => ({ ...p, source: e.target.value }))}
                    >
                        <option value="">Select payroll...</option>
                        {payrollOptions.map((payroll) => (
                            <option key={payroll} value={payroll}>
                                {payroll}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="card p-3 space-y-3 border border-border">
                    <div className="flex items-center justify-between gap-3">
                        <label className="input-label mb-0">Employment Status</label>
                        <div className="flex items-center gap-2">
                            {(initiallyExited || employmentStatus === 'EXITED') && (
                                <button
                                    type="button"
                                    onClick={() => setShowRevertConfirm(true)}
                                    className={cn(
                                        'btn btn-sm',
                                        employmentStatus === 'ACTIVE' ? 'btn-secondary' : 'btn-ghost'
                                    )}
                                >
                                    Revert to Active
                                </button>
                            )}
                            {employmentStatus !== 'EXITED' && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEmploymentStatus('EXITED');
                                        if (!exitDate) setExitDate(todayIsoDate());
                                    }}
                                    className="btn btn-sm btn-ghost"
                                >
                                    Mark as Exited
                                </button>
                            )}
                        </div>
                    </div>
                    {employmentStatus === 'EXITED' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="md:col-span-2">
                                <label className="input-label" htmlFor="exit_reason">Exit Reason *</label>
                                <textarea
                                    id="exit_reason"
                                    className="input-field min-h-[80px]"
                                    value={exitReason}
                                    onChange={e => setExitReason(e.target.value)}
                                    placeholder="Enter reason for exit"
                                />
                            </div>
                            <div>
                                <label className="input-label" htmlFor="exit_date">Exit Date *</label>
                                <input
                                    id="exit_date"
                                    type="date"
                                    className="input-field"
                                    value={exitDate}
                                    onChange={e => setExitDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="input-label" htmlFor="client_offboarding_date">
                                    Client Offboarding Date
                                </label>
                                <input
                                    id="client_offboarding_date"
                                    type="date"
                                    className="input-field"
                                    value={clientOffboardingDate}
                                    onChange={e => setClientOffboardingDate(e.target.value)}
                                    onFocus={(e) => e.currentTarget.showPicker?.()}
                                    onClick={(e) => e.currentTarget.showPicker?.()}
                                />
                            </div>
                            <div>
                                <label className="input-label" htmlFor="siprahub_offboarding_date">
                                    Siprahub Offboarding Date
                                </label>
                                <input
                                    id="siprahub_offboarding_date"
                                    type="date"
                                    className="input-field"
                                    value={siprahubOffboardingDate}
                                    onChange={e => setSiprahubOffboardingDate(e.target.value)}
                                    onFocus={(e) => e.currentTarget.showPicker?.()}
                                    onClick={(e) => e.currentTarget.showPicker?.()}
                                />
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-border sm:justify-end">
                    <button type="button" onClick={onCancel} className="btn btn-secondary w-full sm:w-auto min-w-[10rem]" disabled={submitting}>Cancel</button>
                    <button type="submit" className="btn btn-cta w-full sm:w-auto min-w-[10rem]" disabled={submitting}>
                        {submitting ? <span className="spinner w-4 h-4" /> : 'Save Changes'}
                    </button>
                </div>
            </form>

            <Modal
                isOpen={showRevertConfirm}
                onClose={() => setShowRevertConfirm(false)}
                title="Revert Exit"
                maxWidth="max-w-md"
            >
                <div className="space-y-5">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                        <RotateCcw size={18} className="text-warning shrink-0 mt-0.5" />
                        <p className="text-sm text-text">
                            Revert <span className="font-semibold">{formatPersonName(employee.rms_name)}</span> from{' '}
                            <span className="font-semibold text-danger">Exit</span>? Their employee record
                            will be restored to <span className="font-semibold">Active</span> and the
                            exit date will be cleared.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setShowRevertConfirm(false)}
                            className="btn btn-secondary flex-1"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setEmploymentStatus('ACTIVE');
                                setShowRevertConfirm(false);
                            }}
                            className="btn btn-cta flex-1 font-semibold"
                        >
                            Revert Exit
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

function CreateUserModal({
    isOpen,
    onClose,
    onSuccess,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [form, setForm] = useState<UserCreate>({
        email: '',
        password: '',
        full_name: '',
        role: 'MANAGER',
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.password || form.password.length < 6) {
            return toast.error('Password must be at least 6 characters');
        }
        setSubmitting(true);
        try {
            await authApi.createUser(form);
            toast.success('User created successfully');
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to create user');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New User Account">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="input-label text-xs uppercase tracking-wider font-bold text-text-muted mb-1" htmlFor="full_name_input">Full Name</label>
                    <input 
                        id="full_name_input"
                        className="input-field" 
                        required
                        value={form.full_name} 
                        onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} 
                        placeholder="e.g. John Doe"
                        title="Full Name"
                    />
                </div>
                <div>
                    <label className="input-label text-xs uppercase tracking-wider font-bold text-text-muted mb-1" htmlFor="email_input">Email Address</label>
                    <input 
                        id="email_input"
                        className="input-field" 
                        type="email" 
                        required
                        value={form.email} 
                        onChange={e => setForm(p => ({ ...p, email: e.target.value }))} 
                        placeholder="user@siprahub.com"
                        title="Email Address"
                    />
                </div>
                <div>
                    <label className="input-label text-xs uppercase tracking-wider font-bold text-text-muted mb-1" htmlFor="password_input">Temporary Password</label>
                    <input 
                        id="password_input"
                        className="input-field" 
                        type="password" 
                        required
                        value={form.password} 
                        onChange={e => setForm(p => ({ ...p, password: e.target.value }))} 
                        placeholder="Min 6 characters"
                        title="Temporary Password"
                    />
                </div>
                <div>
                    <label className="input-label text-xs uppercase tracking-wider font-bold text-text-muted mb-1" htmlFor="sys_role">System Role</label>
                    <select
                        id="sys_role"
                        title="System Role"
                        className="input-field"
                        value={form.role}
                        onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                    >
                        <option value="MANAGER">MANAGER</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="RECRUITER">RECRUITER</option>
                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                    </select>
                </div>
                <div className="flex gap-3 pt-4 border-t border-border mt-6">
                    <button type="button" onClick={onClose} className="btn btn-secondary flex-1" disabled={submitting}>Cancel</button>
                    <button type="submit" className="btn btn-cta flex-1" disabled={submitting}>
                        {submitting ? <span className="spinner w-4 h-4" /> : 'Create User'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

export function Employees() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdmin = isAdminRole(user?.role);
    const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ACTIVE');
    const [payrollFilter, setPayrollFilter] = useState('ALL');
    const [sowFilter, setSowFilter] = useState('ALL');
    const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
    const [sortKey, setSortKey] = useState<EmployeeSortKey>('rms_name');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [exportMenuOpen, setExportMenuOpen] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!exportMenuOpen) return;
        const onDoc = (e: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
                setExportMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [exportMenuOpen]);

    const fetchEmployees = useCallback(async () => {
        setLoading(true);
        try {
            const employeesData = await employeesApi.list({ page_size: 500 });
            setAllEmployees(employeesData || []);
        } catch {
            toast.error('Failed to load employees');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const activeCount = allEmployees.filter(e => e.status === 'ACTIVE').length;
    const exitedCount = allEmployees.filter(e => e.status === 'EXITED').length;

    const employees = allEmployees.filter(e => e.status === statusFilter);

    const payrollOptions = useMemo(() => {
        const values = new Set<string>();
        for (const emp of employees) {
            if (emp.source?.trim()) {
                values.add(emp.source.trim());
            }
        }
        return Array.from(values).sort((a, b) => a.localeCompare(b));
    }, [employees]);

    const sowOptions = useMemo(() => {
        const values = new Set<string>();
        for (const emp of employees) {
            if (emp.sow_number?.trim()) {
                values.add(emp.sow_number.trim());
            }
        }
        return Array.from(values).sort((a, b) => a.localeCompare(b));
    }, [employees]);

    const filtered = employees.filter(emp => {
        const q = searchQuery.toLowerCase();
        const matchesSearch = (emp.rms_name || '').toLowerCase().includes(q)
            || (emp.client_name || '').toLowerCase().includes(q)
            || (emp.jira_username || '').toLowerCase().includes(q)
            || (emp.aws_email || '').toLowerCase().includes(q)
            || (emp.siprahub_email || '').toLowerCase().includes(q)
            || (emp.job_profile_name || '').toLowerCase().includes(q);

        const matchesPayroll =
            payrollFilter === 'ALL'
                ? true
                : (emp.source || '').trim() === payrollFilter;

        const matchesSow =
            sowFilter === 'ALL'
                ? true
                : (emp.sow_number || '').trim() === sowFilter;

        return matchesSearch && matchesPayroll && matchesSow;
    });

    const toggleSort = (key: EmployeeSortKey) => {
        if (sortKey === key) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const sortedRows = useMemo(() => {
        const rows = [...filtered];
        const mul = sortDir === 'asc' ? 1 : -1;
        rows.sort((a, b) => {
            const va = sortValueForKey(a, sortKey);
            const vb = sortValueForKey(b, sortKey);
            if (va < vb) return -1 * mul;
            if (va > vb) return 1 * mul;
            return 0;
        });
        return rows;
    }, [filtered, sortKey, sortDir]);


    if (user?.role === 'SUPER_ADMIN') {
        return (
            <div className="space-y-8 animate-fade-in py-4">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Header Card */}
                    <div className="card p-8 bg-gradient-to-br from-surface to-surface-hover border-primary/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <UserPlus size={120} />
                        </div>
                        <div className="relative z-10">
                            <h1 className="text-3xl font-bold text-text mb-2">Create User</h1>
                            <p className="text-text-muted text-lg max-w-xl">
                                Welcome to the SipraHub User Management portal. 
                                Use the controls below to provision new system accounts for Managers, Recruiters, and Administrators.
                            </p>
                        </div>
                    </div>

                    {/* Action Card */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div 
                            onClick={() => setIsCreateUserModalOpen(true)}
                            className="card p-8 border-2 border-dashed border-border hover:border-cta/50 hover:bg-cta/5 transition-all cursor-pointer group flex flex-col items-center text-center gap-4"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-cta/10 text-cta flex items-center justify-center group-hover:scale-110 transition-transform">
                                <UserPlus size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-text mb-1">Create New User</h3>
                                <p className="text-text-muted">Generate credentials and assign system roles</p>
                            </div>
                        </div>

                        <div className="card p-8 bg-surface-hover/30 border-border flex flex-col items-center text-center gap-4 opacity-80">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                <Search size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-text mb-1">Directory Search</h3>
                                <p className="text-text-muted">Restricted Access — Contact Super Admin for employee records</p>
                            </div>
                        </div>
                    </div>

                    {/* Info Section */}
                    <div className="card p-6 bg-primary/5 border-primary/20 flex gap-4 items-start">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                            <Search size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-primary mb-1">Role Permissions Note</h4>
                            <p className="text-sm text-text-muted leading-relaxed">
                                As a User Administrator, you have the authority to create system accounts. However, visibility into existing employee records and sensitive SOW/Resource data is restricted to Super Admin and Management roles to maintain data privacy.
                            </p>
                        </div>
                    </div>
                </div>

                {isCreateUserModalOpen && (
                    <CreateUserModal
                        isOpen={isCreateUserModalOpen}
                        onClose={() => setIsCreateUserModalOpen(false)}
                        onSuccess={fetchEmployees}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="card flex flex-col lg:flex-row items-stretch lg:items-center gap-4 py-3 px-4">
                <div className="flex-1 w-full">
                    <input
                        type="search"
                        placeholder="Search employees..."
                        className="input-field h-10 w-full"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <div className="relative" ref={exportMenuRef}>
                        <button
                            type="button"
                            className="btn btn-secondary flex items-center gap-2"
                            aria-expanded={exportMenuOpen}
                            aria-haspopup="menu"
                            onClick={() => setExportMenuOpen((o) => !o)}
                        >
                            <Download size={18} /> Export
                            <ChevronDown
                                size={16}
                                className={cn('transition-transform', exportMenuOpen && 'rotate-180')}
                                aria-hidden
                            />
                        </button>
                        {exportMenuOpen && (
                            <div
                                role="menu"
                                className="absolute right-0 top-full z-20 mt-1 min-w-[12rem] rounded-lg border border-border bg-surface py-1 shadow-lg"
                            >
                                <button
                                    type="button"
                                    role="menuitem"
                                    className="flex w-full items-center px-4 py-2.5 text-left text-sm text-text hover:bg-surface-hover"
                                    onClick={() => {
                                        setExportMenuOpen(false);
                                        if (sortedRows.length === 0) {
                                            toast.error('No rows to export');
                                            return;
                                        }
                                        exportVisibleEmployeesCsv(sortedRows, statusFilter);
                                        toast.success(`Exported ${sortedRows.length} row(s) as CSV`);
                                    }}
                                >
                                    CSV (.csv)
                                </button>
                                <button
                                    type="button"
                                    role="menuitem"
                                    className="flex w-full items-center px-4 py-2.5 text-left text-sm text-text hover:bg-surface-hover"
                                    onClick={() => {
                                        setExportMenuOpen(false);
                                        if (sortedRows.length === 0) {
                                            toast.error('No rows to export');
                                            return;
                                        }
                                        exportVisibleEmployeesXlsx(sortedRows, statusFilter);
                                        toast.success(`Exported ${sortedRows.length} row(s) as Excel`);
                                    }}
                                >
                                    Excel (.xlsx)
                                </button>
                            </div>
                        )}
                    </div>
                    {(user?.role as string) === 'SUPER_ADMIN' && (
                        <button
                            type="button"
                            onClick={() => exportEmployees()}
                            className="btn btn-secondary text-xs"
                            title="Download full employee export from server (all records)"
                        >
                            Server CSV (all)
                        </button>
                    )}
                </div>
                <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
                    <button
                        onClick={() => setStatusFilter('ACTIVE')}
                        className={cn(
                            'px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2',
                            statusFilter === 'ACTIVE'
                                ? 'bg-primary text-text-inverse'
                                : 'bg-surface text-text-muted hover:bg-surface-hover'
                        )}
                    >
                        ACTIVE
                        <span className={cn(
                            'text-xs font-bold px-1.5 py-0.5 rounded-full',
                            statusFilter === 'ACTIVE' ? 'bg-white/20' : 'bg-success/10 text-success'
                        )}>
                            {activeCount}
                        </span>
                    </button>
                    <button
                        onClick={() => setStatusFilter('EXITED')}
                        className={cn(
                            'px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 border-l border-border',
                            statusFilter === 'EXITED'
                                ? 'bg-primary text-text-inverse'
                                : 'bg-surface text-text-muted hover:bg-surface-hover'
                        )}
                    >
                        EXITED
                        <span className={cn(
                            'text-xs font-bold px-1.5 py-0.5 rounded-full',
                            statusFilter === 'EXITED' ? 'bg-white/20' : 'bg-danger/10 text-danger'
                        )}>
                            {exitedCount}
                        </span>
                    </button>
                </div>
            </div>

            <div className="card overflow-hidden">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <div className="spinner w-8 h-8 border-cta" />
                        <p className="text-text-muted text-sm animate-pulse">Loading employees...</p>
                    </div>
                ) : sortedRows.length > 0 ? (
                    <div className="overflow-auto max-h-[70vh] custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-surface border-b border-border">
                                    <EmployeeSortTh label="Employee" columnKey="rms_name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                                    <EmployeeSortTh label="Client Name" columnKey="client_name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted">
                                        <div className="inline-flex items-center gap-1.5">
                                            <span>SOW</span>
                                            <div className="relative">
                                                <select
                                                    className="absolute inset-0 w-5 h-5 opacity-0 cursor-pointer"
                                                    value={sowFilter}
                                                    onChange={(e) => setSowFilter(e.target.value)}
                                                    title="Filter by SOW"
                                                >
                                                    <option value="ALL">All</option>
                                                    {sowOptions.map((sow) => (
                                                        <option key={sow} value={sow}>
                                                            {sow}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown
                                                    size={14}
                                                    className={cn(
                                                        'pointer-events-none',
                                                        sowFilter === 'ALL' ? 'text-text-muted' : 'text-cta'
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted">Hiring Type</th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted">
                                        <div className="inline-flex items-center gap-1.5">
                                            <span>Payroll</span>
                                            <div className="relative">
                                                <select
                                                    className="absolute inset-0 w-5 h-5 opacity-0 cursor-pointer"
                                                    value={payrollFilter}
                                                    onChange={(e) => setPayrollFilter(e.target.value)}
                                                    title="Filter by Payroll"
                                                >
                                                    <option value="ALL">All</option>
                                                    {payrollOptions.map((payroll) => (
                                                        <option key={payroll} value={payroll}>
                                                            {payroll}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown
                                                    size={14}
                                                    className={cn(
                                                        'pointer-events-none',
                                                        payrollFilter === 'ALL' ? 'text-text-muted' : 'text-cta'
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    </th>
                                    <EmployeeSortTh label="Status" columnKey="status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                                    <EmployeeSortTh label="Start Date" columnKey="start_date" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                                    {isAdmin && <th className="px-6 py-4 text-xs font-bold text-text-muted text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {sortedRows.map(emp => (
                                    <tr key={emp.id} className="hover:bg-surface-hover/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-bold text-text">{formatPersonName(emp.rms_name)}</p>
                                                <p className="text-xs text-text-muted mt-0.5">
                                                    {emp.job_profile_name || '—'}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-text">
                                            {emp.client_name ? emp.client_name.toUpperCase() : '—'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-text-muted">
                                            {emp.sow_number || <span className="italic">—</span>}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-text">
                                            {emp.is_backfill === true
                                                ? 'Backfill'
                                                : emp.is_backfill === false
                                                    ? 'New'
                                                    : <span className="text-text-muted italic">—</span>
                                            }
                                        </td>
                                        <td className="px-6 py-4 text-sm text-text">
                                            {emp.source
                                                ? emp.source
                                                : <span className="text-text-muted italic">—</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    'w-2 h-2 rounded-full',
                                                    emp.status === 'EXITED' 
                                                        ? 'bg-danger shadow-[0_0_8px_rgba(239,68,68,0.5)]' 
                                                        : 'bg-[var(--brand-green)] shadow-[0_0_8px_rgba(15,157,88,0.5)]'
                                                )} />
                                                <span className={cn(
                                                    'text-sm font-medium',
                                                    emp.status === 'EXITED' ? 'text-danger' : 'text-[var(--brand-green)]'
                                                )}>
                                                    {emp.status === 'EXITED' ? 'Exited' : 'Active'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-text-muted whitespace-nowrap">
                                            <span>{emp.start_date || 'N/A'}</span>
                                            {emp.exit_date && (
                                                <span className="text-text-muted"> → {emp.exit_date}</span>
                                            )}
                                        </td>
                                        {isAdmin && (
                                            <td className="px-6 py-4">
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        onClick={() => navigate(`/employees/${emp.id}/edit`)}
                                                        className="p-2 hover:bg-surface-hover rounded-lg text-text-muted hover:text-cta transition-colors"
                                                        title="Edit Employee"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <EmptyState message="No employees found" />
                )}
            </div>

        </div>
    );
}
