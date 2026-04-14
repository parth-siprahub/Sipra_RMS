import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi, type UserCreate } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { FormPageLayout } from '../components/layout/FormPageLayout';

export function EmployeeUserCreatePage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [form, setForm] = useState<UserCreate>({
        email: '',
        password: '',
        full_name: '',
        role: 'MANAGER',
    });
    const [submitting, setSubmitting] = useState(false);

    if (user?.role !== 'SUPER_ADMIN') {
        return <Navigate to="/employees" replace />;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.password || form.password.length < 6) {
            return toast.error('Password must be at least 6 characters');
        }
        setSubmitting(true);
        try {
            await authApi.createUser(form);
            toast.success('User created successfully');
            navigate('/employees');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to create user');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <FormPageLayout
            backHref="/employees"
            backLabel="Back to Employees"
            title="Add New User Account"
            description="Provision credentials and assign a system role."
            icon={UserPlus}
            contentWidth="compact"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="input-label" htmlFor="full_name_input">
                        Full Name
                    </label>
                    <input
                        id="full_name_input"
                        className="input-field"
                        required
                        value={form.full_name}
                        onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                        placeholder="e.g. John Doe"
                        title="Full Name"
                    />
                </div>
                <div>
                    <label className="input-label" htmlFor="email_input">
                        Email Address
                    </label>
                    <input
                        id="email_input"
                        className="input-field"
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                        placeholder="user@siprahub.com"
                        title="Email Address"
                    />
                </div>
                <div>
                    <label className="input-label" htmlFor="password_input">
                        Temporary Password
                    </label>
                    <input
                        id="password_input"
                        className="input-field"
                        type="password"
                        required
                        value={form.password}
                        onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                        placeholder="Min 6 characters"
                        title="Temporary Password"
                    />
                </div>
                <div>
                    <label className="input-label" htmlFor="sys_role">
                        System Role
                    </label>
                    <select
                        id="sys_role"
                        title="System Role"
                        className="input-field"
                        value={form.role}
                        onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                    >
                        <option value="MANAGER">MANAGER</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="RECRUITER">RECRUITER</option>
                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                    </select>
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-border sm:justify-end">
                    <button
                        type="button"
                        onClick={() => navigate('/employees')}
                        className="btn btn-secondary w-full sm:w-auto min-h-[44px] min-w-[10rem]"
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-cta w-full sm:w-auto min-h-[44px] min-w-[10rem]" disabled={submitting}>
                        {submitting ? <span className="spinner w-4 h-4" /> : 'Create User'}
                    </button>
                </div>
            </form>
        </FormPageLayout>
    );
}
