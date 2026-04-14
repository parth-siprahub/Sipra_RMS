import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { sowApi, type SOW } from '../api/sows';
import { SowForm } from '../components/sows/SowForm';
import toast from 'react-hot-toast';
import { FormPageLayout, FormPageLoadingCard } from '../components/layout/FormPageLayout';

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
        return <FormPageLoadingCard label="Loading SOW…" />;
    }

    if (!sow) return null;

    return (
        <FormPageLayout
            backHref="/sows"
            backLabel="Back to SOWs"
            title={`Edit SOW — ${sow.sow_number}`}
            description="Update contract details, dates, and resource limits."
            icon={FileText}
            contentWidth="comfortable"
        >
            <SowForm
                sow={sow}
                onSaved={() => navigate('/sows')}
                onCancel={() => navigate('/sows')}
            />
        </FormPageLayout>
    );
}
