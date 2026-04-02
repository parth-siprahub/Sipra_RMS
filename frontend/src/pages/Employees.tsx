import { useState, useEffect } from 'react';
import { employeesApi, type Employee, type EmployeeUpdate } from '../api/employees';
import { clientsApi, type Client } from '../api/clients';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { cn } from '../lib/utils';
import { useAuth, isAdminRole } from '../context/AuthContext';
import { exportEmployees } from '../api/exports';
import { authApi, type UserCreate } from '../api/auth';
import toast from 'react-hot-toast';
import {
    Search,
    Edit2,
    Download,
    Plus,
} from 'lucide-react';

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
        siprahub_email: employee.siprahub_email || '',
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
            if (form.siprahub_email !== undefined) payload.siprahub_email = form.siprahub_email || undefined;
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
                    <label className="input-label" htmlFor="rms_name">RMS Name</label>
                    <input id="rms_name" title="RMS Name" placeholder="Full Name" className="input-field" value={form.rms_name || ''} onChange={e => setForm(p => ({ ...p, rms_name: e.target.value }))} />
                </div>
                <div>
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
                    <label className="input-label">AWS Email</label>
                    <input className="input-field" type="email" value={form.aws_email || ''} onChange={e => setForm(p => ({ ...p, aws_email: e.target.value }))} placeholder="user@client.awsapps.com" />
                </div>
                <div>
                    <label className="input-label">SipraHub Email</label>
                    <input className="input-field" type="email" value={form.siprahub_email || ''} onChange={e => setForm(p => ({ ...p, siprahub_email: e.target.value }))} placeholder="user@siprahub.com" />
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
        } catch {
            // handled by client
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
    const { user } = useAuth();
    const isAdmin = isAdminRole(user?.role);
    const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ACTIVE');
    const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
    const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const data = await employeesApi.list({});
            setAllEmployees(data || []);
        } catch {
            toast.error('Failed to load employees');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const activeCount = allEmployees.filter(e => e.status === 'ACTIVE').length;
    const exitedCount = allEmployees.filter(e => e.status === 'EXITED').length;

    const employees = allEmployees.filter(e => e.status === statusFilter);

    const filtered = employees.filter(emp => {
        const q = searchQuery.toLowerCase();
        return (emp.rms_name || '').toLowerCase().includes(q)
            || (emp.client_name || '').toLowerCase().includes(q)
            || (emp.jira_username || '').toLowerCase().includes(q)
            || (emp.aws_email || '').toLowerCase().includes(q)
            || (emp.siprahub_email || '').toLowerCase().includes(q);
    });

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <p className="text-text-muted">Manage employee identifiers and the Verification Triad</p>
                </div>
                <div className="flex items-center gap-3">
                    {user?.role === 'SUPER_ADMIN' && (
                        <button 
                            onClick={() => setIsCreateUserModalOpen(true)} 
                            className="btn btn-cta flex items-center gap-2"
                        >
                            <Plus size={18} /> Add User
                        </button>
                    )}
                    <button onClick={() => exportEmployees()} className="btn btn-secondary flex items-center gap-2">
                        <Download size={18} /> Export CSV
                    </button>
                </div>
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
                ) : filtered.length > 0 ? (
                    <div className="overflow-auto max-h-[70vh] custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-surface-hover/50 border-b border-border">
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Employee</th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Client Name</th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">IDs</th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Dates</th>
                                    {isAdmin && <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filtered.map(emp => (
                                    <tr key={emp.id} className="hover:bg-surface-hover/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-bold text-text">{emp.rms_name}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-text">
                                            {emp.client_name ? emp.client_name.toUpperCase() : '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1 text-xs">
                                                <span className={emp.aws_email ? 'text-text' : 'text-text-muted italic'}>{emp.aws_email || 'Missing DCLI Email'}</span>
                                                <br />
                                                <span className={emp.siprahub_email ? 'text-text' : 'text-text-muted italic'}>{emp.siprahub_email || 'Missing SipraHub'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    'w-2 h-2 rounded-full',
                                                    emp.status === 'EXITED' 
                                                        ? 'bg-danger shadow-[0_0_8px_rgba(239,68,68,0.5)]' 
                                                        : 'bg-[#0F9D58] shadow-[0_0_8px_rgba(15,157,88,0.5)]'
                                                )} />
                                                <span className={cn(
                                                    'text-sm font-medium',
                                                    emp.status === 'EXITED' ? 'text-danger' : 'text-[#0F9D58]'
                                                )}>
                                                    {emp.status === 'EXITED' ? 'Exited' : 'Active'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-text-muted whitespace-nowrap">
                                            <span>{emp.start_date || 'N/A'}</span>
                                            {emp.exit_date && (
                                                <span className="text-danger"> → {emp.exit_date}</span>
                                            )}
                                        </td>
                                        {isAdmin && (
                                            <td className="px-6 py-4">
                                                <div className="flex justify-end">
                                                    <button
                                                        onClick={() => setEditEmployee(emp)}
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

            {editEmployee && (
                <EditEmployeeModal
                    isOpen={!!editEmployee}
                    onClose={() => setEditEmployee(null)}
                    onSuccess={fetchEmployees}
                    employee={editEmployee}
                />
            )}
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
