import { Navigate, useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { SowForm } from '../components/sows/SowForm';
import { useAuth, isAdminRole } from '../context/AuthContext';
import { FormPageLayout } from '../components/layout/FormPageLayout';

export function SowCreatePage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    if (!isAdminRole(user?.role)) {
        return <Navigate to="/sows" replace />;
    }

    return (
        <FormPageLayout
            backHref="/sows"
            backLabel="Back to SOWs"
            title="New SOW"
            description="Create a statement of work and link it to a client and optional job profile."
            icon={FileText}
            contentWidth="comfortable"
        >
            <SowForm onSaved={() => navigate('/sows')} onCancel={() => navigate('/sows')} />
        </FormPageLayout>
    );
}
