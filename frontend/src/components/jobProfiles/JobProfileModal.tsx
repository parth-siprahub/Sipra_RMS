import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { jobProfileApi } from '../../api/jobProfiles';
import type { JobProfile } from '../../api/jobProfiles';
import toast from 'react-hot-toast';
import { Briefcase, Code, Layers } from 'lucide-react';

interface JobProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    jobProfile?: JobProfile;
}

export function JobProfileModal({ isOpen, onClose, onSuccess, jobProfile }: JobProfileModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        role_name: '',
        technology: '',
        experience_level: '',
    });

    useEffect(() => {
        if (jobProfile) {
            setFormData({
                role_name: jobProfile.role_name,
                technology: jobProfile.technology,
                experience_level: jobProfile.experience_level || '',
            });
        } else {
            setFormData({
                role_name: '',
                technology: '',
                experience_level: '',
            });
        }
    }, [jobProfile, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (jobProfile?.id) {
                await jobProfileApi.update(jobProfile.id, formData);
                toast.success('Job Profile updated successfully');
            } else {
                await jobProfileApi.create(formData);
                toast.success('Job Profile created successfully');
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to save Job Profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={jobProfile ? 'Edit Job Profile' : 'New Job Profile'}
            maxWidth="max-w-lg"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    <div>
                        <label className="input-label" htmlFor="role_name">Role Name *</label>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                            <input
                                id="role_name"
                                className="input-field pl-10"
                                value={formData.role_name}
                                onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                                required
                                placeholder="Software Engineer"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="input-label" htmlFor="technology">Technology *</label>
                        <div className="relative">
                            <Code className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                            <input
                                id="technology"
                                className="input-field pl-10"
                                value={formData.technology}
                                onChange={(e) => setFormData({ ...formData, technology: e.target.value })}
                                required
                                placeholder="React / Python"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="input-label" htmlFor="experience_level">Experience Level</label>
                        <div className="relative">
                            <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                            <select
                                id="experience_level"
                                className="input-field pl-10 appearance-none"
                                value={formData.experience_level}
                                onChange={(e) => setFormData({ ...formData, experience_level: e.target.value })}
                            >
                                <option value="">Select Level</option>
                                <option value="ENTRY">Entry Level</option>
                                <option value="MID">Mid Level</option>
                                <option value="SENIOR">Senior Level</option>
                                <option value="LEAD">Lead / Architect</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-secondary px-6"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary px-8 flex items-center gap-2"
                        disabled={loading}
                    >
                        {loading && <span className="spinner w-4 h-4 border-white"></span>}
                        {jobProfile ? 'Update Profile' : 'Create Profile'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
