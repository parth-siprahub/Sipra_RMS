import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { resourceRequestsApi, type ResourceRequest, type RequestPriority } from '../api/resourceRequests';
import { sowApi, type SOW } from '../api/sows';
import { jobProfileApi, type JobProfile } from '../api/jobProfiles';

export function ResourceRequestEditPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [request, setRequest] = useState<ResourceRequest | null>(null);
    const [sows, setSows] = useState<SOW[]>([]);
    const [jobProfiles, setJobProfiles] = useState<JobProfile[]>([]);
    const [sowId, setSowId] = useState<number | ''>('');
    const [jobProfileId, setJobProfileId] = useState<number | ''>('');
    const [priority, setPriority] = useState<RequestPriority>('MEDIUM');
    const [isBackfill, setIsBackfill] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const n = id ? parseInt(id, 10) : NaN;
        if (Number.isNaN(n)) {
            toast.error('Invalid request');
            navigate('/resource-requests', { replace: true });
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const [reqData, sowsRes, profilesRes] = await Promise.all([
                    resourceRequestsApi.get(n),
                    sowApi.list(),
                    jobProfileApi.list(),
                ]);
                if (cancelled) return;
                setRequest(reqData);
                setSows(sowsRes.filter((s) => s.is_active !== false));
                setJobProfiles(profilesRes);
                setSowId(reqData.sow_id ?? '');
                setJobProfileId(reqData.job_profile_id ?? '');
                setPriority((reqData.priority as RequestPriority) ?? 'MEDIUM');
                setIsBackfill(reqData.is_backfill ?? false);
            } catch {
                if (!cancelled) {
                    toast.error('Resource request not found');
                    navigate('/resource-requests', { replace: true });
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [id, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!request) return;
        if (!sowId || !jobProfileId) {
            toast.error('SOW and Job Profile are required');
            return;
        }
        setSubmitting(true);
        try {
            await resourceRequestsApi.update(request.id, {
                priority,
                is_backfill: isBackfill,
                sow_id: Number(sowId),
                job_profile_id: Number(jobProfileId),
            });
            toast.success('Resource request updated!');
            navigate('/resource-requests');
        } catch {
            // error toast handled by client.ts
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="card w-full py-20 flex flex-col items-center justify-center gap-4">
                <div className="spinner w-8 h-8 border-cta" />
                <p className="text-text-muted text-sm">Loading request…</p>
            </div>
        );
    }

    if (!request) return null;

    return (
        <div className="space-y-6 animate-fade-in w-full">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <Link to="/resource-requests" className="text-sm text-cta hover:underline">
                    ← Back to Resource Requests
                </Link>
            </div>
            <div className="card p-6 md:p-8 w-full">
                <h1 className="text-xl md:text-2xl font-bold text-text mb-2">Edit Resource Request</h1>
                <p className="text-sm text-text-muted mb-6 font-mono">{request.request_display_id}</p>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="input-label" htmlFor="edit-rr-sow">
                            Statement of Work (SOW) <span className="text-danger">*</span>
                        </label>
                        <select
                            id="edit-rr-sow"
                            className="input-field"
                            value={sowId}
                            onChange={(e) => {
                                const selectedSowId = e.target.value ? Number(e.target.value) : '';
                                setSowId(selectedSowId);
                                if (selectedSowId) {
                                    const selectedSow = sows.find((s) => s.id === selectedSowId);
                                    if (selectedSow?.job_profile_id) {
                                        setJobProfileId(selectedSow.job_profile_id);
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
                        <label className="input-label" htmlFor="edit-rr-profile">
                            Job Profile <span className="text-danger">*</span>
                        </label>
                        <select
                            id="edit-rr-profile"
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
                        <label className="input-label" htmlFor="edit-rr-priority">
                            Priority <span className="text-danger">*</span>
                        </label>
                        <select
                            id="edit-rr-priority"
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
                            id="edit-rr-backfill"
                            type="checkbox"
                            className="w-4 h-4 accent-cta cursor-pointer"
                            checked={isBackfill}
                            onChange={(e) => setIsBackfill(e.target.checked)}
                        />
                        <label htmlFor="edit-rr-backfill" className="text-sm font-medium text-text cursor-pointer">
                            This is a backfill request
                        </label>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-border sm:justify-end">
                        <button
                            type="button"
                            onClick={() => navigate('/resource-requests')}
                            className="btn btn-secondary w-full sm:w-auto min-w-[10rem]"
                            disabled={submitting}
                        >
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-cta w-full sm:w-auto min-w-[10rem]" disabled={submitting}>
                            {submitting ? <span className="spinner w-4 h-4" /> : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
