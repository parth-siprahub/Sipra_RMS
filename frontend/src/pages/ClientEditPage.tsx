import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { clientsApi, type Client } from '../api/clients';
import { ClientForm } from '../components/clients/ClientForm';
import toast from 'react-hot-toast';
import { FormPageLayout, FormPageLoadingCard } from '../components/layout/FormPageLayout';

export function ClientEditPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [client, setClient] = useState<Client | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const n = id ? parseInt(id, 10) : NaN;
        if (Number.isNaN(n)) {
            toast.error('Invalid client');
            navigate('/clients', { replace: true });
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const data = await clientsApi.get(n);
                if (!cancelled) setClient(data);
            } catch {
                if (!cancelled) {
                    toast.error('Client not found');
                    navigate('/clients', { replace: true });
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
        return <FormPageLoadingCard label="Loading client…" />;
    }

    if (!client) return null;

    return (
        <FormPageLayout
            backHref="/clients"
            backLabel="Back to Clients"
            title={`Edit Client — ${client.client_name}`}
            description="Update client name, website, and contacts."
            icon={Building2}
            contentWidth="compact"
        >
            <ClientForm client={client} onSaved={() => navigate('/clients')} onCancel={() => navigate('/clients')} />
        </FormPageLayout>
    );
}
