import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { jobProfileApi, type JobProfile } from '../api/jobProfiles';
import { JobProfileForm } from '../components/jobProfiles/JobProfileForm';
import { useAuth, isAdminRole } from '../context/AuthContext';
import toast from 'react-hot-toast';

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
        return (
            <div className="card w-full py-20 flex flex-col items-center justify-center gap-4">
                <div className="spinner w-8 h-8 border-cta" />
                <p className="text-text-muted text-sm">Loading job profile…</p>
            </div>
        );
    }

    if (!profile) return null;

    return (
        <div className="space-y-6 animate-fade-in w-full">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <Link to="/job-profiles" className="text-sm text-cta hover:underline">
                    ← Back to Job Profiles
                </Link>
            </div>
            <div className="card p-6 md:p-8 w-full">
                <h1 className="text-xl md:text-2xl font-bold text-text mb-6">Edit Job Profile — {profile.role_name}</h1>
                <JobProfileForm
                    jobProfile={profile}
                    onSaved={() => navigate('/job-profiles')}
                    onCancel={() => navigate('/job-profiles')}
                    onDelete={isAdmin ? handleDelete : undefined}
                />
            </div>
        </div>
    );
}
