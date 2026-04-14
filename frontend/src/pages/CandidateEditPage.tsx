import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User } from 'lucide-react';
import toast from 'react-hot-toast';
import { candidatesApi } from '../api/candidates';
import type { Candidate, CandidateStatus } from '../api/candidates';
import { resourceRequestsApi } from '../api/resourceRequests';
import type { ResourceRequest } from '../api/resourceRequests';
import { vendorsApi, type Vendor } from '../api/vendors';
import { CandidateDetailsPanel, STAGE_LABELS } from './Candidates';
import { FormPageLayout, FormPageLoadingCard } from '../components/layout/FormPageLayout';

export function CandidateEditPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [candidate, setCandidate] = useState<Candidate | null>(null);
    const [requests, setRequests] = useState<ResourceRequest[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);

    const numericId = id ? parseInt(id, 10) : NaN;

    const load = useCallback(async () => {
        if (Number.isNaN(numericId)) {
            toast.error('Invalid candidate');
            navigate('/candidates', { replace: true });
            return;
        }
        setLoading(true);
        try {
            const [cData, rData, vData] = await Promise.all([
                candidatesApi.get(numericId),
                resourceRequestsApi.list(),
                vendorsApi.list(),
            ]);
            setCandidate(cData);
            setRequests(rData);
            setVendors(vData || []);
        } catch {
            toast.error('Candidate not found');
            navigate('/candidates', { replace: true });
        } finally {
            setLoading(false);
        }
    }, [numericId, navigate]);

    useEffect(() => {
        load();
    }, [load]);

    const handleStatusChange = async (cid: number, status: CandidateStatus) => {
        try {
            await candidatesApi.review(cid, status);
            toast.success(`Moved to ${STAGE_LABELS[status]}`);
            const fresh = await candidatesApi.get(cid);
            setCandidate(fresh);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Status transition not allowed';
            toast.error(msg);
        }
    };

    if (loading) {
        return <FormPageLoadingCard label="Loading candidate…" />;
    }

    if (!candidate) return null;

    const displayName = `${candidate.first_name} ${candidate.last_name}`.trim();

    return (
        <FormPageLayout
            backHref="/candidates"
            backLabel="Back to Candidates"
            title={displayName || 'Candidate'}
            description="Pipeline details, interviews, logs, and status transitions."
            icon={User}
            contentWidth="full"
        >
            <CandidateDetailsPanel
                candidate={candidate}
                vendors={vendors}
                requests={requests}
                onStatusChange={handleStatusChange}
                onUpdated={() => {}}
                onDismiss={() => navigate('/candidates')}
            />
        </FormPageLayout>
    );
}
