import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobProfileApi } from '../api/jobProfiles';
import type { JobProfile } from '../api/jobProfiles';
import { JobProfileModal } from '../components/jobProfiles/JobProfileModal';
import {
    Plus,
    Edit2,
    LayoutGrid,
    Table2
} from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import toast from 'react-hot-toast';
import { useAuth, isAdminRole } from '../context/AuthContext';

export function JobProfiles() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdmin = isAdminRole(user?.role);
    const [profiles, setProfiles] = useState<JobProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
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
        navigate(`/job-profiles/${profile.id}/edit`);
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
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'An unexpected error occurred';
            toast.error(message || 'Failed to delete Profile (it may be linked to requests)');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <p className="text-text-muted">Define standard roles and required technologies</p>
                </div>
                {isAdmin && (
                    <button
                        onClick={handleCreate}
                        className="btn btn-primary flex items-center gap-2 shadow-lg shadow-cta/20"
                    >
                        <Plus size={20} />
                        <span>New Profile</span>
                    </button>
                )}
            </div>

            {/* Filter Bar */}
            <div className="card flex flex-col md:flex-row items-center gap-4 py-3 px-4">
                <div className="flex-1 w-full">
                    <input
                        type="search"
                        placeholder="Search by role or tech..."
                        className="input-field h-10 w-full"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex rounded-lg overflow-hidden border border-border">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-cta text-white' : 'bg-surface text-text-muted hover:bg-surface-hover'}`}
                    >
                        <LayoutGrid size={13} /> Grid
                    </button>
                    <button
                        onClick={() => setViewMode('table')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${viewMode === 'table' ? 'bg-cta text-white' : 'bg-surface text-text-muted hover:bg-surface-hover'}`}
                    >
                        <Table2 size={13} /> Table
                    </button>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4 card">
                    <div className="spinner w-8 h-8 border-cta"></div>
                    <p className="text-text-muted text-sm animate-pulse">Loading profiles...</p>
                </div>
            ) : filteredProfiles.length > 0 ? (
                viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredProfiles.map((profile) => (
                            <div key={profile.id} className="card group hover:border-cta/50 transition-all hover:shadow-xl hover:shadow-cta/5">
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="text-lg font-bold text-text">{profile.role_name}</h3>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleEdit(profile)} className="p-2 hover:bg-surface-hover rounded-lg text-text-muted hover:text-cta transition-colors" title="Edit" aria-label="Edit">
                                            <Edit2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-3 mt-2">
                                    <div className="text-sm text-text-muted">
                                        <span>{profile.technology}</span>
                                    </div>
                                    <div className="text-sm text-text-muted">
                                        <span className="font-medium">{profile.experience_level || 'Not Specified'}</span>
                                    </div>
                                </div>
                                <div className="mt-5 pt-3 border-t border-border flex items-center justify-between text-xs text-text-muted">
                                    <span>ID: #{profile.id}</span>
                                    <span>{new Date(profile.created_at || '').toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="card overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border text-xs font-bold text-text-muted">
                                    <th className="text-left py-3 px-4">Role Name</th>
                                    <th className="text-left py-3 px-4">Technology</th>
                                    <th className="text-left py-3 px-4">Experience Level</th>
                                    <th className="text-left py-3 px-4">Created</th>
                                    <th className="text-right py-3 px-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProfiles.map((profile) => (
                                    <tr key={profile.id} className="border-b border-border/50 hover:bg-surface-hover/50 transition-colors">
                                        <td className="py-3 px-4 font-medium text-text">{profile.role_name}</td>
                                        <td className="py-3 px-4 text-text-muted">{profile.technology}</td>
                                        <td className="py-3 px-4 text-text-muted">{profile.experience_level || '—'}</td>
                                        <td className="py-3 px-4 text-text-muted">{new Date(profile.created_at || '').toLocaleDateString()}</td>
                                        <td className="py-3 px-4 text-right">
                                            <button onClick={() => handleEdit(profile)} className="p-1.5 hover:bg-surface-hover rounded-lg text-text-muted hover:text-cta transition-colors" title="Edit">
                                                <Edit2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
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
                    onDelete={isAdmin ? handleDelete : undefined}
                />
            )}
        </div>
    );
}
