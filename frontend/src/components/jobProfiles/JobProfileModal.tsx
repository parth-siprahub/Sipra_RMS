import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { jobProfileApi } from '../../api/jobProfiles';
import type { JobProfile } from '../../api/jobProfiles';
import toast from 'react-hot-toast';
import { Briefcase, Code, Layers, FileText, Upload } from 'lucide-react';

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
        job_description: '',
        jd_file_url: '',
    });
    const [jdFile, setJdFile] = useState<File | null>(null);

    useEffect(() => {
        if (jobProfile) {
            setFormData({
                role_name: jobProfile.role_name,
                technology: jobProfile.technology,
                experience_level: jobProfile.experience_level || '',
                job_description: jobProfile.job_description || '',
                jd_file_url: jobProfile.jd_file_url || '',
            });
        } else {
            setFormData({
                role_name: '',
                technology: '',
                experience_level: '',
                job_description: '',
                jd_file_url: '',
            });
        }
        setJdFile(null);
    }, [jobProfile, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Strip empty strings to undefined so they are omitted from JSON
            const sanitized = {
                role_name: formData.role_name.trim(),
                technology: formData.technology.trim(),
                experience_level: formData.experience_level || undefined,
                job_description: formData.job_description || undefined,
                // Don't pass jd_file_url here — file upload is handled separately
                jd_file_url: formData.jd_file_url || undefined,
            };

            let profileId: number;
            if (jobProfile?.id) {
                await jobProfileApi.update(jobProfile.id, sanitized);
                profileId = jobProfile.id;
                toast.success('Job Profile updated successfully');
            } else {
                const created = await jobProfileApi.create(sanitized);
                profileId = created.id;
                toast.success('Job Profile created successfully');
            }

            // Upload JD file if selected
            if (jdFile && profileId) {
                try {
                    await jobProfileApi.uploadJd(profileId, jdFile);
                    toast.success('JD file uploaded');
                } catch {
                    toast.error('Profile saved, but JD file upload failed');
                }
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

                    <div>
                        <label className="input-label flex items-center gap-1.5" htmlFor="job_description">
                            <FileText size={14} className="text-text-muted" />
                            Job Description
                        </label>
                        <textarea
                            id="job_description"
                            className="input-field min-h-[120px] resize-y text-sm"
                            rows={5}
                            value={formData.job_description}
                            onChange={(e) => setFormData({ ...formData, job_description: e.target.value })}
                            placeholder="Enter the detailed job description, responsibilities, and requirements for this role..."
                        />
                    </div>

                    <div>
                        <label className="input-label flex items-center gap-1.5" htmlFor="jd_file">
                            <Upload size={14} className="text-text-muted" />
                            JD Attachment (PDF/DOCX)
                        </label>
                        <div className="bg-surface p-3 rounded-xl border border-border hover:border-cta/30 transition-all">
                            {formData.jd_file_url && !jdFile && (
                                <p className="text-xs text-text-muted mb-2">
                                    Current file:{' '}
                                    {formData.jd_file_url.startsWith('http') ? (
                                        <a href={formData.jd_file_url} target="_blank" rel="noopener noreferrer" className="font-medium text-cta hover:underline">
                                            View JD File
                                        </a>
                                    ) : (
                                        <span className="font-medium text-cta">{formData.jd_file_url}</span>
                                    )}
                                </p>
                            )}
                            <input
                                id="jd_file"
                                type="file"
                                accept=".pdf,.doc,.docx"
                                className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-surface-hover file:text-cta hover:file:bg-cta/10 file:cursor-pointer transition-all w-full"
                                onChange={(e) => setJdFile(e.target.files?.[0] || null)}
                            />
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
