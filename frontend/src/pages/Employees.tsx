import { useState, useEffect } from 'react';
import { employeesApi, type Employee, type EmployeeUpdate } from '../api/employees';
import { clientsApi, type Client } from '../api/clients';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useAuth, isAdminRole } from '../context/AuthContext';
import {
    Users,
    Search,
    Edit2,
    UserCheck,
    UserX,
    Mail,
    GitBranch,
    Calendar,
    Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import { exportEmployees } from '../api/exports';

function EditEmployeeModal({
    isOpen,
    onClose,
    onSuccess,
    employee,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    employee: Employee;
}) {
    const [form, setForm] = useState<EmployeeUpdate>({
        rms_name: employee.rms_name,
        client_name: employee.client_name || '',
        aws_email: employee.aws_email || '',
        github_id: employee.github_id || '',
        jira_username: employee.jira_username || '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    useEffect(() => {
        clientsApi.list().then(setClients).catch(() => {});
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload: EmployeeUpdate = {};
            if (form.rms_name && form.rms_name !== employee.rms_name) payload.rms_name = form.rms_name;
            if (form.client_name !== undefined) payload.client_name = form.client_name || undefined;
            if (form.aws_email !== undefined) payload.aws_email = form.aws_email || undefined;
            if (form.github_id !== undefined) payload.github_id = form.github_id || undefined;
            if (form.jira_username !== undefined) payload.jira_username = form.jira_username || undefined;

            await employeesApi.update(employee.id, payload);
            toast.success('Employee updated');
            onSuccess();
            onClose();
        } catch {
            // handled by client
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Employee — Triad Mapping">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="input-label">RMS Name</label>
                    <input className="input-field" value={form.rms_name || ''} onChange={e => setForm(p => ({ ...p, rms_name: e.target.value }))} />
                </div>
                <div>
                    <label className="input-label">Client Name</label>
                    <select
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
                    <label className="input-label">AWS Email</label>
                    <input className="input-field" type="email" value={form.aws_email || ''} onChange={e => setForm(p => ({ ...p, aws_email: e.target.value }))} placeholder="user@client.awsapps.com" />
                </div>
                <div>
                    <label className="input-label">GitHub ID</label>
                    <input className="input-field" value={form.github_id || ''} onChange={e => setForm(p => ({ ...p, github_id: e.target.value }))} placeholder="github-username" />
                </div>
                <div>
                    <label className="input-label">Jira Username</label>
                    <input className="input-field" value={form.jira_username || ''} onChange={e => setForm(p => ({ ...p, jira_username: e.target.value }))} placeholder="jira-username" />
                </div>
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="btn btn-secondary flex-1" disabled={submitting}>Cancel</button>
                    <button type="submit" className="btn btn-cta flex-1" disabled={submitting}>
                        {submitting ? <span className="spinner w-4 h-4" /> : 'Save'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

export function Employees() {
    const { user } = useAuth();
    const isAdmin = isAdminRole(user?.role);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ACTIVE');
    const [editEmployee, setEditEmployee] = useState<Employee | null>(null);

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const data = await employeesApi.list({ employee_status: statusFilter });
            setEmployees(data || []);
        } catch {
            toast.error('Failed to load employees');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, [statusFilter]);

    const filtered = employees.filter(emp => {
        const q = searchQuery.toLowerCase();
        return (emp.rms_name || '').toLowerCase().includes(q)
            || (emp.client_name || '').toLowerCase().includes(q)
            || (emp.jira_username || '').toLowerCase().includes(q)
            || (emp.aws_email || '').toLowerCase().includes(q);
    });

    const triadComplete = (emp: Employee) =>
        !!emp.jira_username && !!emp.aws_email && !!emp.github_id;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <p className="text-text-muted">Manage employee identifiers and the Verification Triad</p>
                </div>
                <button onClick={() => exportEmployees()} className="btn btn-secondary flex items-center gap-2">
                    <Download size={18} /> Export CSV
                </button>
            </div>

            <div className="card flex flex-col md:flex-row items-center gap-4 py-3 px-4">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input
                        type="search"
                        placeholder="Search employees..."
                        className="input-field pl-10 h-10"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
                    {['ACTIVE', 'EXITED'].map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={cn(
                                'px-4 py-2 text-sm font-medium transition-colors',
                                statusFilter === s
                                    ? 'bg-primary text-text-inverse'
                                    : 'bg-surface text-text-muted hover:bg-surface-hover'
                            )}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            <div className="card overflow-hidden">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <div className="spinner w-8 h-8 border-cta" />
                        <p className="text-text-muted text-sm animate-pulse">Loading employees...</p>
                    </div>
                ) : filtered.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-surface-hover/50 border-b border-border">
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Employee</th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Client Name</th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Triad IDs</th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Dates</th>
                                    {isAdmin && <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filtered.map(emp => (
                                    <tr key={emp.id} className="hover:bg-surface-hover/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "p-2 rounded-lg",
                                                    triadComplete(emp) ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                                                )}>
                                                    {triadComplete(emp) ? <UserCheck size={20} /> : <UserX size={20} />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-text">{emp.rms_name}</p>
                                                    <p className="text-xs text-text-muted">ID: #{emp.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-text">
                                            {emp.client_name ? emp.client_name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1 text-xs">
                                                <div className="flex items-center gap-1.5">
                                                    <Mail size={12} className={emp.aws_email ? 'text-success' : 'text-text-muted'} />
                                                    <span className={emp.aws_email ? 'text-text' : 'text-text-muted italic'}>{emp.aws_email || 'Missing AWS'}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <GitBranch size={12} className={emp.github_id ? 'text-success' : 'text-text-muted'} />
                                                    <span className={emp.github_id ? 'text-text' : 'text-text-muted italic'}>{emp.github_id || 'Missing GitHub'}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Users size={12} className={emp.jira_username ? 'text-success' : 'text-text-muted'} />
                                                    <span className={emp.jira_username ? 'text-text' : 'text-text-muted italic'}>{emp.jira_username || 'Missing Jira'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge value={emp.status || 'ACTIVE'} type="request" />
                                        </td>
                                        <td className="px-6 py-4 text-sm text-text-muted">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar size={12} />
                                                <span>{emp.start_date || 'N/A'}</span>
                                                {emp.exit_date && (
                                                    <>
                                                        <span className="text-danger">→ {emp.exit_date}</span>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        {isAdmin && (
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => setEditEmployee(emp)}
                                                    className="p-2 hover:bg-surface-hover rounded-lg text-text-muted hover:text-cta transition-colors"
                                                    title="Edit Employee"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
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

            {editEmployee && (
                <EditEmployeeModal
                    isOpen={!!editEmployee}
                    onClose={() => setEditEmployee(null)}
                    onSuccess={fetchEmployees}
                    employee={editEmployee}
                />
            )}
        </div>
    );
}
