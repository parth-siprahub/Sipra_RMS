import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import { resourceRequestsApi } from '../api/resourceRequests';
import type { RequestPriority, CreateResourceRequestPayload } from '../api/resourceRequests';
import { sowApi, type SOW } from '../api/sows';
import { jobProfileApi, type JobProfile } from '../api/jobProfiles';
import { FormPageLayout, FormPageLoadingCard } from '../components/layout/FormPageLayout';

export function ResourceRequestCreatePage() {
    const navigate = useNavigate();
    const [sows, setSows] = useState<SOW[]>([]);
    const [jobProfiles, setJobProfiles] = useState<JobProfile[]>([]);
    const [sowId, setSowId] = useState<number | ''>('');
    const [jobProfileId, setJobProfileId] = useState<number | ''>('');
    const [priority, setPriority] = useState<RequestPriority>('MEDIUM');
    const [isBackfill, setIsBackfill] = useState(false);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [sowsRes, profilesRes] = await Promise.all([sowApi.list(), jobProfileApi.list()]);
                if (!cancelled) {
                    setSows(sowsRes.filter((s) => s.is_active !== false));
                    setJobProfiles(profilesRes);
                }
            } catch {
                if (!cancelled) toast.error('Failed to load form data');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sowId || !jobProfileId) {
            toast.error('SOW and Job Profile are required');
            return;
        }
        setSubmitting(true);
        try {
            const payload: CreateResourceRequestPayload = {
                priority,
                is_backfill: isBackfill,
                sow_id: Number(sowId),
                job_profile_id: Number(jobProfileId),
                notes: notes.trim() || undefined,
            };
            await resourceRequestsApi.create(payload);
            toast.success('Resource request created!');
            navigate('/resource-requests');
        } catch {
            // error toast handled by client.ts
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <FormPageLoadingCard label="Loading…" />;
    }

    return (
        <FormPageLayout
            backHref="/resource-requests"
            backLabel="Back to Resource Requests"
            title="New Resource Request"
            description="Link an active SOW and job profile, set priority, and mark backfill if applicable."
            icon={ClipboardList}
            contentWidth="comfortable"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="input-label" htmlFor="rr-sow">
                        Statement of Work (SOW) <span className="text-danger">*</span>
                    </label>
                    <select
                        id="rr-sow"
                        className="input-field"
                        value={sowId}
                        onChange={(e) => {
                            const selectedSowId = e.target.value ? Number(e.target.value) : '';
                            setSowId(selectedSowId);
                            if (selectedSowId) {
                                const selectedSow = sows.find((s) => s.id === selectedSowId);
                                if (selectedSow?.job_profile_id) {
                                    setJobProfileId(selectedSow.job_profile_id);
                                } else if (jobProfiles.length > 0 && !jobProfileId) {
                                    setJobProfileId(jobProfiles[0].id);
                                }
                            }
                        }}
                        required
                    >
                        <option value="">— Select SOW —</option>
                        {sows.map((s) => {
                            const linkedProfile = s.job_profile_id
                                ? jobProfiles.find((p) => p.id === s.job_profile_id)
                                : null;
                            return (
                                <option key={s.id} value={s.id}>
                                    {s.sow_number} - {s.client_name}
                                    {linkedProfile ? ` (${linkedProfile.role_name})` : ''}
                                </option>
                            );
                        })}
                    </select>
                </div>

                <div>
                    <label className="input-label" htmlFor="rr-profile">
                        Job Profile <span className="text-danger">*</span>
                    </label>
                    <select
                        id="rr-profile"
                        className="input-field"
                        value={jobProfileId}
                        onChange={(e) => setJobProfileId(e.target.value ? Number(e.target.value) : '')}
                        required
                    >
                        <option value="">— Select Profile —</option>
                        {jobProfiles.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.role_name} ({p.technology})
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="input-label" htmlFor="rr-priority">
                        Priority <span className="text-danger">*</span>
                    </label>
                    <select
                        id="rr-priority"
                        className="input-field"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as RequestPriority)}
                        required
                    >
                        {(['URGENT', 'HIGH', 'MEDIUM', 'LOW'] as RequestPriority[]).map((p) => (
                            <option key={p} value={p}>
                                {p.charAt(0) + p.slice(1).toLowerCase()}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-3">
                    <input
                        id="rr-backfill"
                        type="checkbox"
                        className="w-4 h-4 accent-cta cursor-pointer"
                        checked={isBackfill}
                        onChange={(e) => setIsBackfill(e.target.checked)}
                    />
                    <label htmlFor="rr-backfill" className="text-sm font-medium text-text cursor-pointer">
                        This is a backfill request
                    </label>
                </div>

                <div>
                    <label className="input-label" htmlFor="rr-notes">
                        Notes
                    </label>
                    <textarea
                        id="rr-notes"
                        className="input-field resize-none"
                        rows={3}
                        placeholder="Add any additional context or notes…"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-border sm:justify-end">
                    <button
                        type="button"
                        onClick={() => navigate('/resource-requests')}
                        className="btn btn-secondary w-full sm:w-auto min-h-[44px] min-w-[10rem]"
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn btn-cta w-full sm:w-auto min-h-[44px] min-w-[10rem]"
                        disabled={submitting}
                    >
                        {submitting ? <span className="spinner w-4 h-4" /> : 'Create Request'}
                    </button>
                </div>
            </form>
        </FormPageLayout>
    );
}
