import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { VendorForm } from '../components/vendors/VendorForm';
import { FormPageLayout } from '../components/layout/FormPageLayout';

export function VendorCreatePage() {
    const navigate = useNavigate();

    return (
        <FormPageLayout
            backHref="/vendors"
            backLabel="Back to Vendors"
            title="New Vendor"
            description="Add a staffing vendor and primary contact details."
            icon={Building2}
            contentWidth="compact"
        >
            <VendorForm onSaved={() => navigate('/vendors')} onCancel={() => navigate('/vendors')} />
        </FormPageLayout>
    );
}
