import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { resourceRequestsApi } from '../api/resourceRequests';
import type { ResourceRequest } from '../api/resourceRequests';
import { vendorsApi, type Vendor } from '../api/vendors';
import { sowApi, type SOW } from '../api/sows';
import { jobProfileApi, type JobProfile } from '../api/jobProfiles';
import { CandidateCreateForm } from '../components/candidates/CandidateCreateForm';
import { FormPageLayout, FormPageLoadingCard } from '../components/layout/FormPageLayout';

export function CandidateCreatePage() {
    const navigate = useNavigate();
    const [requests, setRequests] = useState<ResourceRequest[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [sows, setSows] = useState<SOW[]>([]);
    const [jobProfiles, setJobProfiles] = useState<JobProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [rData, vData, sowData, jpData] = await Promise.all([
                    resourceRequestsApi.list(),
                    vendorsApi.list(),
                    sowApi.list(),
                    jobProfileApi.list(),
                ]);
                if (!cancelled) {
                    setRequests(rData || []);
                    setVendors(vData || []);
                    setSows(sowData || []);
                    setJobProfiles(jpData || []);
                }
            } catch {
                if (!cancelled) toast.error('Failed to load form data');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    if (loading) {
        return <FormPageLoadingCard label="Loading…" />;
    }

    return (
        <FormPageLayout
            backHref="/candidates"
            backLabel="Back to Candidates"
            title="Add New Candidate"
            description="Link to an open request when possible, then add profile, source, and optional resume."
            icon={UserPlus}
            contentWidth="full"
        >
            <CandidateCreateForm
                requests={requests}
                vendors={vendors}
                sows={sows}
                jobProfiles={jobProfiles}
                onCancel={() => navigate('/candidates')}
                onCreated={() => navigate('/candidates')}
                onViewDuplicate={(c) => navigate(`/candidates/${c.id}/edit`)}
            />
        </FormPageLayout>
    );
}
