import { Navigate, useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { ClientForm } from '../components/clients/ClientForm';
import { useAuth, isAdminRole } from '../context/AuthContext';
import { FormPageLayout } from '../components/layout/FormPageLayout';

export function ClientCreatePage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const canManage = isAdminRole(user?.role);

    if (!canManage) {
        return <Navigate to="/clients" replace />;
    }

    return (
        <FormPageLayout
            backHref="/clients"
            backLabel="Back to Clients"
            title="New Client"
            description="Register a client organization and contact information."
            icon={Building2}
            contentWidth="compact"
        >
            <ClientForm onSaved={() => navigate('/clients')} onCancel={() => navigate('/clients')} />
        </FormPageLayout>
    );
}
