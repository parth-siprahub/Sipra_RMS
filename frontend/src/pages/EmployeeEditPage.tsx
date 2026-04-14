import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UserCog } from 'lucide-react';
import { employeesApi, type Employee } from '../api/employees';
import { EditEmployeeForm } from './Employees';
import toast from 'react-hot-toast';
import { FormPageLayout, FormPageLoadingCard } from '../components/layout/FormPageLayout';

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
        return <FormPageLoadingCard label="Loading employee…" />;
    }

    if (!employee) return null;

    return (
        <FormPageLayout
            backHref="/employees"
            backLabel="Back to Employees"
            title={`Edit — ${employee.rms_name || 'Employee'}`}
            description="Triad mapping: Jira, AWS, GitHub, payroll source, and identifiers."
            icon={UserCog}
            contentWidth="comfortable"
        >
            <EditEmployeeForm
                employee={employee}
                payrollOptions={payrollOptions}
                onSaved={() => navigate('/employees')}
                onCancel={() => navigate('/employees')}
            />
        </FormPageLayout>
    );
}
