import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { sowApi } from '../../api/sows';
import { type SOW } from '../../api/sows';
import { jobProfileApi, type JobProfile } from '../../api/jobProfiles';
import { clientsApi, type Client } from '../../api/clients';
import toast from 'react-hot-toast';
import { Calendar, Users, Hash, Building2, Briefcase } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SowModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (updatedIsActive?: boolean) => void;
    sow?: SOW;
}

export function SowModal({ isOpen, onClose, onSuccess, sow }: SowModalProps) {
    const [loading, setLoading] = useState(false);
    const [jobProfiles, setJobProfiles] = useState<JobProfile[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [errors, _setErrors] = useState<Record<string, string>>({});
    const [formData, setFormData] = useState({
        sow_number: '',
        client_name: '',
        start_date: '',
        target_date: '',
        submitted_date: '',
        max_resources: 0,
        job_profile_id: undefined as number | undefined,
        is_active: true,
    });

    useEffect(() => {
        if (isOpen) {
            Promise.all([
                jobProfileApi.list(),
                clientsApi.list(),
            ]).then(([profiles, clientsList]) => {
                setJobProfiles(profiles);
                setClients(clientsList.filter(c => c.is_active !== false));
            }).catch(() => {});
        }
    }, [isOpen]);

    useEffect(() => {
        if (sow) {
            setFormData({
                sow_number: sow.sow_number,
                client_name: sow.client_name,
                start_date: sow.start_date || '',
                target_date: sow.target_date || '',
                submitted_date: sow.submitted_date || '',
                max_resources: sow.max_resources || 0,
                job_profile_id: sow.job_profile_id ?? undefined,
                is_active: sow.is_active !== false,
            });
        } else {
            setFormData({
                sow_number: '',
                client_name: '',
                start_date: '',
                target_date: '',
                submitted_date: '',
                max_resources: 0,
                job_profile_id: undefined,
                is_active: true,
            });
        }
    }, [sow, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Strip empty strings to null/undefined so Pydantic doesn't reject them
            const sanitized = {
                sow_number: formData.sow_number,
                client_name: formData.client_name,
                start_date: formData.start_date || undefined,
                target_date: formData.target_date || undefined,
                submitted_date: formData.submitted_date || undefined,
                max_resources: formData.max_resources || undefined,
                job_profile_id: formData.job_profile_id,
                is_active: formData.is_active,
            };

            if (sow?.id) {
                await sowApi.update(sow.id, sanitized);
                const wasActive = sow.is_active !== false;
                const nowActive = sanitized.is_active !== false;
                if (wasActive && !nowActive) {
                    toast.success('SOW marked as inactive — switch to Inactive tab to view it');
                } else if (!wasActive && nowActive) {
                    toast.success('SOW reactivated successfully');
                } else {
                    toast.success('SOW updated successfully');
                }
                onSuccess(sanitized.is_active);
            } else {
                await sowApi.create(sanitized);
                toast.success('SOW created successfully');
                onSuccess(true);
            }
            onClose();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'An unexpected error occurred';
            toast.error(message || 'Failed to save SOW');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={sow ? 'Edit SOW' : 'New SOW'}
            maxWidth="max-w-xl"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="input-label" htmlFor="sow_number">SOW Number *</label>
                        <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                            <input
                                id="sow_number"
                                className="input-field pl-10"
                                value={formData.sow_number}
                                onChange={(e) => setFormData({ ...formData, sow_number: e.target.value })}
                                required
                                placeholder="SOW-2024-001"
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className="input-label" htmlFor="client_name">Client *</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                            <select
                                id="client_name"
                                className="input-field pl-10 appearance-none"
                                value={formData.client_name}
                                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                                required
                            >
                                <option value="">— Select Client —</option>
                                {clients.map((c) => (
                                    <option key={c.id} value={c.client_name}>
                                        {c.client_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className="input-label" htmlFor="job_profile_id">Linked Job Profile</label>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                            <select
                                id="job_profile_id"
                                className="input-field pl-10 appearance-none"
                                value={formData.job_profile_id ?? ''}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    job_profile_id: e.target.value ? parseInt(e.target.value) : undefined
                                })}
                            >
                                <option value="">— No linked profile —</option>
                                {jobProfiles.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.role_name} ({p.technology})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="input-label" htmlFor="start_date">Start Date</label>
                        <div className="relative">
                            <Calendar
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted cursor-pointer z-10"
                                size={18}
                                onClick={() => (document.getElementById('start_date') as HTMLInputElement)?.showPicker?.()}
                            />
                            <input
                                id="start_date"
                                type="date"
                                className={cn('input-field pl-10', errors.start_date && 'input-error')}
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                            />
                        </div>
                        {errors.start_date && <span className="error-text">{errors.start_date}</span>}
                    </div>

                    <div>
                        <label className="input-label" htmlFor="target_date">Target Date</label>
                        <div className="relative">
                            <Calendar
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted cursor-pointer z-10"
                                size={18}
                                onClick={() => (document.getElementById('target_date') as HTMLInputElement)?.showPicker?.()}
                            />
                            <input
                                id="target_date"
                                type="date"
                                className={cn('input-field pl-10', errors.target_date && 'input-error')}
                                value={formData.target_date}
                                onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                            />
                        </div>
                        {errors.target_date && <span className="error-text">{errors.target_date}</span>}
                    </div>

                    <div>
                        <label className="input-label" htmlFor="submitted_date">Submitted Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                            <input
                                id="submitted_date"
                                type="date"
                                className="input-field pl-10"
                                value={formData.submitted_date}
                                onChange={(e) => setFormData({ ...formData, submitted_date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2 space-y-4">
                        <div className="flex items-center gap-3">
                            <label className="input-label mb-0" htmlFor="max_resources">Max Resources</label>
                            <div className="relative flex-1">
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                                <input
                                    id="max_resources"
                                    type="number"
                                    className="input-field pl-10"
                                    value={formData.max_resources}
                                    onChange={(e) => setFormData({ ...formData, max_resources: parseInt(e.target.value) || 0 })}
                                    min="0"
                                />
                            </div>
                        </div>

                        {sow && (
                            <div className="flex items-center gap-3 p-3 bg-surface-hover/50 rounded-lg border border-border">
                                <input
                                    id="is_active"
                                    type="checkbox"
                                    className="w-4 h-4 accent-cta cursor-pointer"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                />
                                <label htmlFor="is_active" className="text-sm font-medium text-text cursor-pointer">
                                    This SOW is currently Active
                                </label>
                            </div>
                        )}
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
                        {sow ? 'Update SOW' : 'Create SOW'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
