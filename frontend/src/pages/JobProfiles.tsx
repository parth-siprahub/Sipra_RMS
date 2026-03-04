import { useState, useEffect } from 'react';
import { jobProfileApi } from '../api/jobProfiles';
import type { JobProfile } from '../api/jobProfiles';
import { JobProfileModal } from '../components/jobProfiles/JobProfileModal';
import {
    Briefcase,
    Plus,
    Search,
    Edit2,
    Trash2,
    Code,
    Layers
} from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import toast from 'react-hot-toast';

export function JobProfiles() {
    const [profiles, setProfiles] = useState<JobProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<JobProfile | undefined>();

    const fetchProfiles = async () => {
        try {
            setLoading(true);
            const data = await jobProfileApi.list();
            setProfiles(data || []);
        } catch (error) {
            console.error('Failed to fetch profiles:', error);
            toast.error('Failed to load Job Profiles');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfiles();
    }, []);

    const filteredProfiles = (profiles || []).filter(profile =>
        (profile.role_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (profile.technology || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleEdit = (profile: JobProfile) => {
        setSelectedProfile(profile);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setSelectedProfile(undefined);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this job profile?')) return;

        try {
            await jobProfileApi.delete(id);
            toast.success('Job Profile deleted');
            fetchProfiles();
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete Profile (it may be linked to requests)');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text">Job Profiles</h1>
                    <p className="text-text-muted mt-1">Define standard roles and required technologies</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="btn btn-primary flex items-center gap-2 shadow-lg shadow-cta/20"
                >
                    <Plus size={20} />
                    <span>New Profile</span>
                </button>
            </div>

            {/* Filter Bar */}
            <div className="card flex flex-col md:flex-row items-center gap-4 py-3 px-4">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input
                        type="search"
                        placeholder="Search by role or tech..."
                        className="input-field pl-10 h-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Grid Container */}
            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4 card">
                    <div className="spinner w-8 h-8 border-cta"></div>
                    <p className="text-text-muted text-sm animate-pulse">Loading profiles...</p>
                </div>
            ) : filteredProfiles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProfiles.map((profile) => (
                        <div key={profile.id} className="card group hover:border-cta/50 transition-all hover:shadow-xl hover:shadow-cta/5">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-cta/10 text-cta rounded-xl group-hover:scale-110 transition-transform">
                                    <Briefcase size={24} />
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleEdit(profile)}
                                        className="p-2 hover:bg-surface-hover rounded-lg text-text-muted hover:text-cta transition-colors"
                                        title="Edit profile"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(profile.id)}
                                        className="p-2 hover:bg-surface-hover rounded-lg text-text-muted hover:text-danger transition-colors"
                                        title="Delete profile"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-text mb-1">{profile.role_name}</h3>

                            <div className="space-y-3 mt-4">
                                <div className="flex items-center gap-2 text-sm text-text-muted">
                                    <Code size={16} className="text-cta" />
                                    <span>{profile.technology}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-text-muted">
                                    <Layers size={16} className="text-info" />
                                    <span className="font-medium">{profile.experience_level || 'Not Specified'}</span>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs text-text-muted">
                                <span>ID: #{profile.id}</span>
                                <span>Added {new Date(profile.created_at || '').toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card">
                    <EmptyState
                        message={searchQuery ? "No job profiles match your search" : "No job profiles defined yet"}
                        action={
                            <button
                                onClick={searchQuery ? () => setSearchQuery('') : handleCreate}
                                className="btn btn-secondary btn-sm"
                            >
                                {searchQuery ? "Clear Search" : "New Profile"}
                            </button>
                        }
                    />
                </div>
            )}

            {isModalOpen && (
                <JobProfileModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedProfile(undefined);
                    }}
                    onSuccess={fetchProfiles}
                    jobProfile={selectedProfile}
                />
            )}
        </div>
    );
}
