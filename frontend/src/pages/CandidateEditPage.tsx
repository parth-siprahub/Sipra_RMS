import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { candidatesApi } from '../api/candidates';
import type { Candidate, CandidateStatus } from '../api/candidates';
import { resourceRequestsApi } from '../api/resourceRequests';
import type { ResourceRequest } from '../api/resourceRequests';
import { vendorsApi, type Vendor } from '../api/vendors';
import { CandidateDetailsPanel, STAGE_LABELS } from './Candidates';

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
        return (
            <div className="card w-full py-20 flex flex-col items-center justify-center gap-4">
                <div className="spinner w-8 h-8 border-cta" />
                <p className="text-text-muted text-sm">Loading candidate…</p>
            </div>
        );
    }

    if (!candidate) return null;

    return (
        <div className="space-y-6 animate-fade-in w-full">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <Link to="/candidates" className="text-sm text-cta hover:underline">
                    ← Back to Candidates
                </Link>
            </div>
            <div className="card p-6 md:p-8 w-full">
                <h1 className="text-xl md:text-2xl font-bold text-text mb-6">
                    {candidate.first_name} {candidate.last_name}
                </h1>
                <CandidateDetailsPanel
                    candidate={candidate}
                    vendors={vendors}
                    requests={requests}
                    onStatusChange={handleStatusChange}
                    onUpdated={() => {}}
                    onDismiss={() => navigate('/candidates')}
                />
            </div>
        </div>
    );
}
