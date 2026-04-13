import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { employeesApi, type Employee } from '../api/employees';
import { EditEmployeeForm } from './Employees';
import toast from 'react-hot-toast';

export function EmployeeEditPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);

    const payrollOptions = useMemo(() => {
        const set = new Set<string>();
        for (const e of allEmployees) {
            const s = (e.source || '').trim();
            if (s) set.add(s);
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [allEmployees]);

    const load = useCallback(async () => {
        const n = id ? parseInt(id, 10) : NaN;
        if (Number.isNaN(n)) {
            toast.error('Invalid employee');
            navigate('/employees', { replace: true });
            return;
        }
        setLoading(true);
        try {
            const [empData, listData] = await Promise.all([
                employeesApi.get(n),
                employeesApi.list({ page_size: 500 }),
            ]);
            setEmployee(empData);
            setAllEmployees(listData || []);
        } catch {
            toast.error('Employee not found');
            navigate('/employees', { replace: true });
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        load();
    }, [load]);

    if (loading) {
        return (
            <div className="card w-full py-20 flex flex-col items-center justify-center gap-4">
                <div className="spinner w-8 h-8 border-cta" />
                <p className="text-text-muted text-sm">Loading employee…</p>
            </div>
        );
    }

    if (!employee) return null;

    return (
        <div className="space-y-6 animate-fade-in w-full">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <Link to="/employees" className="text-sm text-cta hover:underline">
                    ← Back to Employees
                </Link>
            </div>
            <div className="card p-6 md:p-8 w-full">
                <h1 className="text-xl md:text-2xl font-bold text-text mb-6">Edit Employee — Triad Mapping</h1>
                <EditEmployeeForm
                    employee={employee}
                    payrollOptions={payrollOptions}
                    onSaved={() => navigate('/employees')}
                    onCancel={() => navigate('/employees')}
                />
            </div>
        </div>
    );
}
