import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { sowApi } from '../../api/sows';
import { type SOW } from '../../api/sows';
import toast from 'react-hot-toast';
import { Calendar, Users, Hash, Building2 } from 'lucide-react';

interface SowModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    sow?: SOW;
}

export function SowModal({ isOpen, onClose, onSuccess, sow }: SowModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        sow_number: '',
        client_name: '',
        start_date: '',
        end_date: '',
        max_resources: 0,
        is_active: true,
    });

    useEffect(() => {
        if (sow) {
            setFormData({
                sow_number: sow.sow_number,
                client_name: sow.client_name,
                start_date: sow.start_date || '',
                end_date: sow.end_date || '',
                max_resources: sow.max_resources || 0,
                is_active: sow.is_active !== false,
            });
        } else {
            setFormData({
                sow_number: '',
                client_name: '',
                start_date: '',
                end_date: '',
                max_resources: 0,
                is_active: true,
            });
        }
    }, [sow, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (sow?.id) {
                await sowApi.update(sow.id, formData);
                toast.success('SOW updated successfully');
            } else {
                await sowApi.create(formData);
                toast.success('SOW created successfully');
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to save SOW');
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
                        <label className="input-label" htmlFor="client_name">Client Name *</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                            <input
                                id="client_name"
                                className="input-field pl-10"
                                value={formData.client_name}
                                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                                required
                                placeholder="Client Alpha Inc."
                            />
                        </div>
                    </div>

                    <div>
                        <label className="input-label" htmlFor="start_date">Start Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                            <input
                                id="start_date"
                                type="date"
                                className="input-field pl-10"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="input-label" htmlFor="end_date">End Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                            <input
                                id="end_date"
                                type="date"
                                className="input-field pl-10"
                                value={formData.end_date}
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
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
