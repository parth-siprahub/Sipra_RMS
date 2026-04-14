import { Navigate, useNavigate } from 'react-router-dom';
import { Briefcase } from 'lucide-react';
import { JobProfileForm } from '../components/jobProfiles/JobProfileForm';
import { useAuth, isAdminRole } from '../context/AuthContext';
import { FormPageLayout } from '../components/layout/FormPageLayout';

export function JobProfileCreatePage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdmin = isAdminRole(user?.role);

    if (!isAdmin) {
        return <Navigate to="/job-profiles" replace />;
    }

    return (
        <FormPageLayout
            backHref="/job-profiles"
            backLabel="Back to Job Profiles"
            title="New Job Profile"
            description="Define role name, technology stack, experience level, and optional JD."
            icon={Briefcase}
            contentWidth="comfortable"
        >
            <JobProfileForm onSaved={() => navigate('/job-profiles')} onCancel={() => navigate('/job-profiles')} />
        </FormPageLayout>
    );
}
