import { useState, useEffect, useCallback } from 'react';
import { employeesApi, type Employee, type EmployeeUpdate, type UserProfile } from '../api/employees';
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
    UserPlus,
    Link2,
    Unlink,
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
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update employee');
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

function LinkProfileModal({
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
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [selectedId, setSelectedId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        employeesApi.listProfiles()
            .then(data => setProfiles(data || []))
            .catch(() => toast.error('Failed to load profiles'))
            .finally(() => setLoading(false));
    }, [isOpen]);

    const linkedProfile = profiles.find(p => p.employee_id === employee.id);

    const handleLink = async () => {
        if (!selectedId) return;
        setSubmitting(true);
        try {
            await employeesApi.linkProfile(employee.id, selectedId);
            toast.success('Profile linked');
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to link profile');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUnlink = async () => {
        setSubmitting(true);
        try {
            await employeesApi.unlinkProfile(employee.id);
            toast.success('Profile unlinked');
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to unlink profile');
        } finally {
            setSubmitting(false);
        }
    };

    const unlinkedProfiles = profiles.filter(p => !p.employee_id || p.employee_id === employee.id);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Link Profile — ${employee.rms_name}`} maxWidth="max-w-md">
            <div className="space-y-4">
                {loading ? (
                    <div className="py-8 flex justify-center"><div className="spinner w-6 h-6 border-cta" /></div>
                ) : (
                    <>
                        {linkedProfile && (
                            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-hover/30">
                                <div>
                                    <p className="text-sm font-medium text-text">{linkedProfile.full_name || linkedProfile.email}</p>
                                    <p className="text-xs text-text-muted">{linkedProfile.email} · {linkedProfile.role}</p>
                                </div>
                                <button
                                    onClick={handleUnlink}
                                    disabled={submitting}
                                    className="flex items-center gap-1.5 text-xs text-danger hover:text-danger/80 transition-colors"
                                >
                                    <Unlink size={14} /> Unlink
                                </button>
                            </div>
                        )}

                        {!linkedProfile && (
                            <p className="text-sm text-text-muted">No profile currently linked to this employee.</p>
                        )}

                        <div>
                            <label className="input-label" htmlFor="link-profile-select">
                                {linkedProfile ? 'Change linked profile' : 'Select a profile to link'}
                            </label>
                            <select
                                id="link-profile-select"
                                className="input-field"
                                value={selectedId}
                                onChange={e => setSelectedId(e.target.value)}
                            >
                                <option value="">— Choose profile —</option>
                                {unlinkedProfiles.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.full_name || p.email} ({p.role}) {p.employee_id === employee.id ? '← current' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={onClose} className="btn btn-secondary flex-1" disabled={submitting}>
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleLink}
                                className="btn btn-cta flex-1 flex items-center justify-center gap-2"
                                disabled={submitting || !selectedId}
                            >
                                {submitting ? <span className="spinner w-4 h-4" /> : <><Link2 size={16} /> Link Profile</>}
                            </button>
                        </div>
                    </>
                )}
            </div>
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
    const [linkEmployee, setLinkEmployee] = useState<Employee | null>(null);
    const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);

    const fetchEmployees = useCallback(async () => {
        setLoading(true);
        try {
            const data = await employeesApi.list({ page_size: 500 });
            setAllEmployees(data || []);
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

    const filtered = employees.filter(emp => {
        const q = searchQuery.toLowerCase();
        return (emp.rms_name || '').toLowerCase().includes(q)
            || (emp.client_name || '').toLowerCase().includes(q)
            || (emp.jira_username || '').toLowerCase().includes(q)
            || (emp.aws_email || '').toLowerCase().includes(q)
            || (emp.siprahub_email || '').toLowerCase().includes(q)
            || (emp.job_profile_name || '').toLowerCase().includes(q);
    });

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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <p className="text-text-muted">Manage employee identifiers and the Verification Triad</p>
                </div>
                <div className="flex items-center gap-3">
                    {isAdmin && (
                        <button
                            onClick={() => setIsCreateUserModalOpen(true)}
                            className="btn btn-cta flex items-center gap-2 px-5"
                        >
                            <Plus size={18} /> Add New User
                        </button>
                    )}
                    {user?.role === 'SUPER_ADMIN' && (
                        <button onClick={() => exportEmployees()} className="btn btn-secondary flex items-center gap-2">
                            <Download size={18} /> Export CSV
                        </button>
                    )}

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
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Job Profile</th>
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
                                            {emp.job_profile_name || <span className="text-text-muted italic">—</span>}
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
                                                <span className="text-danger"> → {emp.exit_date}</span>
                                            )}
                                        </td>
                                        {isAdmin && (
                                            <td className="px-6 py-4">
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        onClick={() => setLinkEmployee(emp)}
                                                        className="p-2 hover:bg-surface-hover rounded-lg text-text-muted hover:text-info transition-colors"
                                                        title="Link Profile"
                                                    >
                                                        <Link2 size={18} />
                                                    </button>
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
            {linkEmployee && (
                <LinkProfileModal
                    isOpen={!!linkEmployee}
                    onClose={() => setLinkEmployee(null)}
                    onSuccess={fetchEmployees}
                    employee={linkEmployee}
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
