import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { vendorsApi, type Vendor } from '../api/vendors';
import { VendorForm } from '../components/vendors/VendorForm';
import toast from 'react-hot-toast';
import { FormPageLayout, FormPageLoadingCard } from '../components/layout/FormPageLayout';

export function VendorEditPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [vendor, setVendor] = useState<Vendor | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const n = id ? parseInt(id, 10) : NaN;
        if (Number.isNaN(n)) {
            toast.error('Invalid vendor');
            navigate('/vendors', { replace: true });
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const data = await vendorsApi.get(n);
                if (!cancelled) setVendor(data);
            } catch {
                if (!cancelled) {
                    toast.error('Vendor not found');
                    navigate('/vendors', { replace: true });
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [id, navigate]);

    if (loading) {
        return <FormPageLoadingCard label="Loading vendor…" />;
    }

    if (!vendor) return null;

    return (
        <FormPageLayout
            backHref="/vendors"
            backLabel="Back to Vendors"
            title={`Edit Vendor — ${vendor.name}`}
            description="Update vendor name, contacts, and active status."
            icon={Building2}
            contentWidth="compact"
        >
            <VendorForm vendor={vendor} onSaved={() => navigate('/vendors')} onCancel={() => navigate('/vendors')} />
        </FormPageLayout>
    );
}
