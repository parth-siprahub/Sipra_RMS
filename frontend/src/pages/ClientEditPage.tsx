import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { clientsApi, type Client } from '../api/clients';
import { ClientForm } from '../components/clients/ClientForm';
import toast from 'react-hot-toast';

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
        return (
            <div className="card w-full py-20 flex flex-col items-center justify-center gap-4">
                <div className="spinner w-8 h-8 border-cta" />
                <p className="text-text-muted text-sm">Loading client…</p>
            </div>
        );
    }

    if (!client) return null;

    return (
        <div className="space-y-6 animate-fade-in w-full">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <Link to="/clients" className="text-sm text-cta hover:underline">
                    ← Back to Clients
                </Link>
            </div>
            <div className="card p-6 md:p-8 w-full">
                <h1 className="text-xl md:text-2xl font-bold text-text mb-6">Edit Client — {client.client_name}</h1>
                <ClientForm client={client} onSaved={() => navigate('/clients')} onCancel={() => navigate('/clients')} />
            </div>
        </div>
    );
}
