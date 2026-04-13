import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { sowApi, type SOW } from '../api/sows';
import { SowForm } from '../components/sows/SowForm';
import toast from 'react-hot-toast';

export function SowEditPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [sow, setSow] = useState<SOW | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const n = id ? parseInt(id, 10) : NaN;
        if (Number.isNaN(n)) {
            toast.error('Invalid SOW');
            navigate('/sows', { replace: true });
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const data = await sowApi.get(n);
                if (!cancelled) setSow(data);
            } catch {
                if (!cancelled) {
                    toast.error('SOW not found');
                    navigate('/sows', { replace: true });
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
                <p className="text-text-muted text-sm">Loading SOW…</p>
            </div>
        );
    }

    if (!sow) return null;

    return (
        <div className="space-y-6 animate-fade-in w-full">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <Link to="/sows" className="text-sm text-cta hover:underline">
                    ← Back to SOWs
                </Link>
            </div>
            <div className="card p-6 md:p-8 w-full">
                <h1 className="text-xl md:text-2xl font-bold text-text mb-6">Edit SOW — {sow.sow_number}</h1>
                <SowForm
                    sow={sow}
                    onSaved={() => navigate('/sows')}
                    onCancel={() => navigate('/sows')}
                />
            </div>
        </div>
    );
}
