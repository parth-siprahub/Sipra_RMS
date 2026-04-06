import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { EmployeeDrillDownView } from '../components/reports/EmployeeDrillDownView';

type LocationState = { name?: string };

export function ReportEmployeeDrillDown() {
    const { employeeId: idParam } = useParams<{ employeeId: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state as LocationState | null;

    const month = searchParams.get('month') || '';
    const employeeId = idParam ? parseInt(idParam, 10) : NaN;

    const handleBack = () => {
        navigate('/reports', { replace: false, state: { selectedMonth: month } });
    };

    if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <p className="text-text-muted">Missing or invalid billing month. Open this page from Reports and pick a month.</p>
                <button type="button" onClick={handleBack} className="btn btn-secondary flex items-center gap-2">
                    <ArrowLeft size={16} /> Back to Reports
                </button>
            </div>
        );
    }

    if (Number.isNaN(employeeId) || employeeId < 1) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <p className="text-text-muted">Invalid employee.</p>
                <button type="button" onClick={handleBack} className="btn btn-secondary flex items-center gap-2">
                    <ArrowLeft size={16} /> Back to Reports
                </button>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-surface hover:bg-surface-hover text-text text-sm font-medium transition-colors"
                >
                    <ArrowLeft size={18} />
                    Back to Reports
                </button>
            </div>

            <div className="card p-5 md:p-6">
                <EmployeeDrillDownView
                    employeeId={employeeId}
                    month={month}
                    initialDisplayName={state?.name}
                />
            </div>
        </div>
    );
}
