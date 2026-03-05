import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { communicationLogApi } from '../../api/communicationLogs';
import type { LogType } from '../../api/communicationLogs';
import toast from 'react-hot-toast';
import { Mail, Phone, Users, MessageSquare, Calendar, User } from 'lucide-react';

interface LogModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    candidateId?: number;
    requestId?: number;
    candidateName?: string;
}

export function LogModal({ isOpen, onClose, onSuccess, candidateId, requestId, candidateName }: LogModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        log_type: 'EMAIL' as LogType,
        message: '',
        external_contact_name: candidateName || '',
        log_date: new Date().toISOString().split('T')[0],
        candidate_id: candidateId,
        request_id: requestId,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await communicationLogApi.create(formData);
            toast.success('Communication logged successfully');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to log communication');
        } finally {
            setLoading(false);
        }
    };

    const typeIcons = {
        EMAIL: Mail,
        CALL: Phone,
        MEETING: Users,
        NOTE: MessageSquare,
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Log Communication"
            maxWidth="max-w-lg"
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="flex gap-2 p-1 bg-surface-hover rounded-xl mb-2">
                    {(['EMAIL', 'CALL', 'MEETING', 'NOTE'] as LogType[]).map((type) => {
                        const Icon = typeIcons[type];
                        return (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setFormData({ ...formData, log_type: type })}
                                className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-lg transition-all ${formData.log_type === type
                                    ? 'bg-cta text-white shadow-lg shadow-cta/20'
                                    : 'text-text-muted hover:bg-white hover:text-text'
                                    }`}
                            >
                                <Icon size={20} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">{type}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="input-label">Contact Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                            <input
                                className="input-field pl-10"
                                value={formData.external_contact_name}
                                onChange={(e) => setFormData({ ...formData, external_contact_name: e.target.value })}
                                placeholder="Candidate or Recruiter name"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="input-label">Log Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                            <input
                                type="date"
                                className="input-field pl-10"
                                value={formData.log_date}
                                onChange={(e) => setFormData({ ...formData, log_date: e.target.value })}
                                title="Log date"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="input-label">Communication Message *</label>
                        <textarea
                            className="input-field min-h-[120px] py-3 resize-none"
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            placeholder="Detail what was discussed..."
                            required
                        />
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
                        Log Activity
                    </button>
                </div>
            </form>
        </Modal>
    );
}
