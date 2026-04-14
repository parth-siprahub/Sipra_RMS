import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Briefcase } from 'lucide-react';
import { jobProfileApi, type JobProfile } from '../api/jobProfiles';
import { JobProfileForm } from '../components/jobProfiles/JobProfileForm';
import { useAuth, isAdminRole } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { FormPageLayout, FormPageLoadingCard } from '../components/layout/FormPageLayout';

export function JobProfileEditPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdmin = isAdminRole(user?.role);
    const [profile, setProfile] = useState<JobProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const n = id ? parseInt(id, 10) : NaN;
        if (Number.isNaN(n)) {
            toast.error('Invalid profile');
            navigate('/job-profiles', { replace: true });
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const data = await jobProfileApi.get(n);
                if (!cancelled) setProfile(data);
            } catch {
                if (!cancelled) {
                    toast.error('Job profile not found');
                    navigate('/job-profiles', { replace: true });
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [id, navigate]);

    const handleDelete = useCallback(
        async (profileId: number) => {
            if (!window.confirm('Are you sure you want to delete this job profile?')) return;
            try {
                await jobProfileApi.delete(profileId);
                toast.success('Job Profile deleted');
                navigate('/job-profiles');
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'An unexpected error occurred';
                toast.error(message || 'Failed to delete Profile (it may be linked to requests)');
            }
        },
        [navigate]
    );

    if (loading) {
        return <FormPageLoadingCard label="Loading job profile…" />;
    }

    if (!profile) return null;

    return (
        <FormPageLayout
            backHref="/job-profiles"
            backLabel="Back to Job Profiles"
            title={`Edit Job Profile — ${profile.role_name}`}
            description="Update role details and documents. Admins can delete when unused."
            icon={Briefcase}
            contentWidth="comfortable"
        >
            <JobProfileForm
                jobProfile={profile}
                onSaved={() => navigate('/job-profiles')}
                onCancel={() => navigate('/job-profiles')}
                onDelete={isAdmin ? handleDelete : undefined}
            />
        </FormPageLayout>
    );
}
