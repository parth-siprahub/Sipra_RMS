import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { communicationLogApi } from '../api/communicationLogs';
import type { LogType } from '../api/communicationLogs';
import toast from 'react-hot-toast';
import { Mail, Phone, Users, MessageSquare, Calendar, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { FormPageLayout } from '../components/layout/FormPageLayout';

export function CommunicationLogCreatePage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        log_type: 'EMAIL' as LogType,
        message: '',
        external_contact_name: '',
        log_date: new Date().toISOString().split('T')[0],
        candidate_id: undefined as number | undefined,
        request_id: undefined as number | undefined,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await communicationLogApi.create(formData);
            toast.success('Communication logged successfully');
            navigate('/communication-logs');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'An unexpected error occurred';
            toast.error(message || 'Failed to log communication');
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
        <FormPageLayout
            backHref="/communication-logs"
            backLabel="Back to Communication Logs"
            title="Log Communication"
            description="Record calls, emails, meetings, or notes with date and contact."
            icon={MessageSquare}
            contentWidth="comfortable"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-1.5 p-1 bg-surface-hover rounded-xl border border-border/60">
                    {(['EMAIL', 'CALL', 'MEETING', 'NOTE'] as LogType[]).map((type) => {
                        const Icon = typeIcons[type];
                        const active = formData.log_type === type;
                        return (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setFormData({ ...formData, log_type: type })}
                                className={cn(
                                    'flex-1 flex flex-col items-center gap-1 py-2.5 rounded-lg transition-colors duration-200 min-h-[44px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cta/35',
                                    active
                                        ? 'bg-cta text-cta-text shadow-md shadow-cta/15'
                                        : 'text-text-muted hover:bg-surface hover:text-text'
                                )}
                            >
                                <Icon size={18} strokeWidth={2} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">{type}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="input-label" htmlFor="log-contact">
                            Contact Name
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={18} />
                            <input
                                id="log-contact"
                                className="input-field pl-10"
                                value={formData.external_contact_name}
                                onChange={(e) => setFormData({ ...formData, external_contact_name: e.target.value })}
                                placeholder="Candidate or Recruiter name"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="input-label" htmlFor="log-date">
                            Log Date
                        </label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={18} />
                            <input
                                id="log-date"
                                type="date"
                                className="input-field pl-10"
                                value={formData.log_date}
                                onChange={(e) => setFormData({ ...formData, log_date: e.target.value })}
                                title="Log date"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="input-label" htmlFor="log-message">
                            Communication Message *
                        </label>
                        <textarea
                            id="log-message"
                            className="input-field min-h-[100px] py-3 resize-y"
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            placeholder="Detail what was discussed..."
                            required
                        />
                    </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-border sm:justify-end">
                    <button
                        type="button"
                        onClick={() => navigate('/communication-logs')}
                        className="btn btn-secondary w-full sm:w-auto min-h-[44px] min-w-[10rem]"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-cta w-full sm:w-auto min-h-[44px] min-w-[10rem] flex items-center justify-center gap-2" disabled={loading}>
                        {loading && <span className="spinner w-4 h-4" />}
                        Log Activity
                    </button>
                </div>
            </form>
        </FormPageLayout>
    );
}
