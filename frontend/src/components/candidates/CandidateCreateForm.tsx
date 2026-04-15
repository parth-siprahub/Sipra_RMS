import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { candidatesApi } from '../../api/candidates';
import type {
    Candidate,
    CandidateStatus,
    CandidateSource,
    CreateCandidatePayload,
} from '../../api/candidates';
import type { ResourceRequest } from '../../api/resourceRequests';
import type { Vendor } from '../../api/vendors';
import type { SOW } from '../../api/sows';
import type { JobProfile } from '../../api/jobProfiles';
import { cn } from '../../lib/utils';
import { formatCandidateFullName } from '../../lib/personNames';
import {
    User,
    Mail,
    Phone,
    Building2,
    Briefcase,
    MapPin,
    Link as LinkIcon,
} from 'lucide-react';

const STAGE_LABELS: Record<CandidateStatus, string> = {
    NEW: 'New',
    SCREENING: 'Screening',
    SUBMITTED_TO_ADMIN: 'Submitted',
    WITH_ADMIN: 'With Admin',
    REJECTED_BY_ADMIN: 'Rejected (Admin)',
    WITH_CLIENT: 'With Client',
    L1_SCHEDULED: 'L1 Scheduled',
    L1_COMPLETED: 'L1 Completed',
    L1_SHORTLIST: 'L1 Shortlist',
    L1_REJECT: 'L1 Reject',
    INTERVIEW_SCHEDULED: 'L2 / Interview',
    SELECTED: 'Selected',
    ONBOARDED: 'Onboarded',
    REJECTED_BY_CLIENT: 'Rejected (Client)',
    ON_HOLD: 'On Hold',
    SCREEN_REJECT: 'Screen Reject',
    INTERVIEW_BACK_OUT: 'Interview Back-out',
    OFFER_BACK_OUT: 'Offer Back-out',
    EXIT: 'Exit',
};

const COUNTRY_CODES = [
    { code: '+91', label: 'IN +91' },
    { code: '+1', label: 'US +1' },
    { code: '+44', label: 'UK +44' },
    { code: '+61', label: 'AU +61' },
    { code: '+971', label: 'AE +971' },
    { code: '+65', label: 'SG +65' },
    { code: '+49', label: 'DE +49' },
    { code: '+33', label: 'FR +33' },
    { code: '+81', label: 'JP +81' },
    { code: '+86', label: 'CN +86' },
];

export interface CandidateCreateFormProps {
    requests: ResourceRequest[];
    vendors: Vendor[];
    sows: SOW[];
    jobProfiles: JobProfile[];
    onCancel: () => void;
    onCreated: () => void;
    onViewDuplicate: (candidate: Candidate) => void;
}

export function CandidateCreateForm({
    requests,
    vendors,
    sows,
    jobProfiles,
    onCancel,
    onCreated,
    onViewDuplicate,
}: CandidateCreateFormProps) {
    const emptyForm = (): CreateCandidatePayload => ({
        first_name: '',
        last_name: '',
        email: '',
        vendor_id: undefined,
        request_id: undefined,
    });

    const [form, setForm] = useState<CreateCandidatePayload>(emptyForm());
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [countryCode, setCountryCode] = useState('+91');
    const [phoneDigits, setPhoneDigits] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [duplicateCandidate, setDuplicateCandidate] = useState<Candidate | null>(null);

    const set = (field: keyof CreateCandidatePayload, value: unknown) =>
        setForm((f) => ({ ...f, [field]: value }));

    const checkDuplicate = useCallback(async (firstName: string, lastName: string, email: string, phone: string | undefined) => {
        if (!firstName || !lastName || !email) return;
        try {
            const existing = await candidatesApi.list();
            const normalizedEmail = email.toLowerCase().trim();
            const normalizedFirst = firstName.toLowerCase().trim();
            const normalizedLast = lastName.toLowerCase().trim();
            const strippedPhone = phone ? phone.replace(/\D/g, '').slice(-10) : '';

            const duplicates = existing.filter((c) => {
                const matchName =
                    c.first_name.toLowerCase().trim() === normalizedFirst &&
                    c.last_name.toLowerCase().trim() === normalizedLast;
                const matchEmail = c.email.toLowerCase().trim() === normalizedEmail;
                const matchPhone =
                    strippedPhone && c.phone ? c.phone.replace(/\D/g, '').slice(-10) === strippedPhone : false;
                return matchEmail || (matchName && matchPhone);
            });

            // Keep indicator visible for any duplicate, but prioritize ONBOARDED
            // so submit blocking behavior stays aligned with business rules.
            const blockingDuplicate = duplicates.find((c) => c.status === 'ONBOARDED');
            setDuplicateCandidate(blockingDuplicate || duplicates[0] || null);
        } catch {
            // silent
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errors: Record<string, string> = {};

        if (!form.first_name.trim()) errors.first_name = 'First name is required';
        if (!form.last_name.trim()) errors.last_name = 'Last name is required';
        if (!form.email.trim()) errors.email = 'Email is required';
        if (!form.source) errors.source = 'Source is required';
        if (form.source === 'VENDORS' && !form.vendor_id) errors.vendor_id = 'Vendor is required when source is Vendors';

        if (phoneDigits) {
            const digitsOnly = phoneDigits.replace(/\D/g, '');
            if (digitsOnly.length !== 10) {
                errors.phone = 'Phone number must be exactly 10 digits';
            }
        }

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            toast.error('Please fix the highlighted errors');
            return;
        }
        setValidationErrors({});

        if (duplicateCandidate?.status === 'ONBOARDED') {
            toast.error(
                `Duplicate candidate found: ${formatCandidateFullName(duplicateCandidate.first_name, duplicateCandidate.last_name)} (${duplicateCandidate.email})`
            );
            return;
        }

        const fullPhone = phoneDigits ? `${countryCode}${phoneDigits.replace(/\D/g, '')}` : undefined;

        setSubmitting(true);
        try {
            const payload = { ...form, phone: fullPhone };
            const candidate = await candidatesApi.create(payload);

            if (resumeFile && candidate.id) {
                try {
                    await candidatesApi.uploadResume(candidate.id, resumeFile);
                    toast.success('Candidate and Resume added!');
                } catch {
                    toast.error('Candidate added, but resume upload failed.');
                }
            } else {
                toast.success(`${formatCandidateFullName(form.first_name, form.last_name)} added!`);
            }

            onCreated();
            setForm(emptyForm());
            setResumeFile(null);
            setPhoneDigits('');
            setCountryCode('+91');
            setDuplicateCandidate(null);
        } catch {
            // toast handled by client.ts
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-surface-active/30 p-4 rounded-xl border border-cta/10 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                    <Briefcase size={16} className="text-cta" />
                    <span className="text-sm font-bold text-text">Staffing Connection</span>
                </div>
                <select
                    id="c-request"
                    className="input-field border-cta/20 focus:border-cta"
                    value={form.request_id || ''}
                    onChange={(e) => set('request_id', e.target.value ? parseInt(e.target.value) : undefined)}
                    title="Select Request"
                >
                    <option value="">Global Talent Pool (No specific request)</option>
                    {requests
                        .filter((r) => r.status === 'OPEN')
                        .map((r) => {
                            const jp = jobProfiles.find((p) => p.id === r.job_profile_id);
                            return (
                                <option key={r.id} value={r.id}>
                                    {r.request_display_id} | Priority: {r.priority} | Role: {jp?.role_name || '—'}
                                </option>
                            );
                        })}
                </select>
                {form.request_id &&
                    (() => {
                        const selectedReq = requests.find((r) => r.id === form.request_id);
                        const linkedSow = selectedReq ? sows.find((s) => s.id === selectedReq.sow_id) : null;
                        const linkedJp = selectedReq ? jobProfiles.find((p) => p.id === selectedReq.job_profile_id) : null;
                        return (
                            <div className="p-3 bg-surface-hover/50 rounded-lg border border-border space-y-1.5">
                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Request Context</p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                                    <span className="text-text-muted">SOW:</span>
                                    <span className="text-text font-medium">
                                        {linkedSow ? `${linkedSow.sow_number} — ${linkedSow.client_name}` : '—'}
                                    </span>
                                    <span className="text-text-muted">Job Profile:</span>
                                    <span className="text-text font-medium">
                                        {linkedJp ? `${linkedJp.role_name} (${linkedJp.technology})` : '—'}
                                    </span>
                                    <span className="text-text-muted">Max Resources:</span>
                                    <span className="text-text font-medium">{linkedSow?.max_resources ?? '—'}</span>
                                </div>
                            </div>
                        );
                    })()}
                <p className="text-[10px] text-text-muted px-1">
                    Linking a candidate to a request helps track pipeline metrics more accurately.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-5">
                    <h4 className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                        <User size={14} className="text-text-muted" />
                        Personal Information
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-text-muted px-1" htmlFor="c-first">
                                First Name <span className="text-danger">*</span>
                            </label>
                            <input
                                id="c-first"
                                className={cn('input-field', validationErrors.first_name && 'border-danger')}
                                placeholder="e.g. Rahul"
                                required
                                value={form.first_name}
                                onChange={(e) => {
                                    set('first_name', e.target.value);
                                    setValidationErrors((p) => ({ ...p, first_name: '' }));
                                }}
                                onBlur={() => checkDuplicate(form.first_name, form.last_name, form.email, phoneDigits)}
                            />
                            {validationErrors.first_name && (
                                <p className="text-[10px] text-danger px-1">{validationErrors.first_name}</p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-text-muted px-1" htmlFor="c-last">
                                Last Name <span className="text-danger">*</span>
                            </label>
                            <input
                                id="c-last"
                                className={cn('input-field', validationErrors.last_name && 'border-danger')}
                                placeholder="e.g. Sharma"
                                required
                                value={form.last_name}
                                onChange={(e) => {
                                    set('last_name', e.target.value);
                                    setValidationErrors((p) => ({ ...p, last_name: '' }));
                                }}
                                onBlur={() => checkDuplicate(form.first_name, form.last_name, form.email, phoneDigits)}
                            />
                            {validationErrors.last_name && (
                                <p className="text-[10px] text-danger px-1">{validationErrors.last_name}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-text-muted px-1 flex items-center gap-1" htmlFor="c-email">
                            <Mail size={12} /> Email Address <span className="text-danger">*</span>
                        </label>
                        <input
                            id="c-email"
                            type="email"
                            className={cn('input-field', validationErrors.email && 'border-danger')}
                            placeholder="Personal email address"
                            required
                            value={form.email}
                            onChange={(e) => {
                                set('email', e.target.value);
                                setValidationErrors((p) => ({ ...p, email: '' }));
                            }}
                            onBlur={() => checkDuplicate(form.first_name, form.last_name, form.email, phoneDigits)}
                        />
                        {validationErrors.email && <p className="text-[10px] text-danger px-1">{validationErrors.email}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-text-muted px-1 flex items-center gap-1" htmlFor="c-phone">
                            <Phone size={12} /> Phone Number
                        </label>
                        <div className="flex gap-2">
                            <select
                                className="input-field w-28 shrink-0"
                                value={countryCode}
                                onChange={(e) => setCountryCode(e.target.value)}
                                title="Country Code"
                            >
                                {COUNTRY_CODES.map((cc) => (
                                    <option key={cc.code} value={cc.code}>
                                        {cc.label}
                                    </option>
                                ))}
                            </select>
                            <input
                                id="c-phone"
                                className={cn('input-field flex-1', (validationErrors.phone || phoneError) && 'border-danger')}
                                placeholder="10-digit number"
                                maxLength={10}
                                value={phoneDigits}
                                onChange={(e) => {
                                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                                    setPhoneDigits(digits);
                                    setPhoneError(digits && digits.length !== 10 ? 'Must be 10 digits' : '');
                                    setValidationErrors((p) => ({ ...p, phone: '' }));
                                }}
                                onBlur={() => checkDuplicate(form.first_name, form.last_name, form.email, phoneDigits)}
                            />
                        </div>
                        {(validationErrors.phone || phoneError) && (
                            <p className="text-[10px] text-danger px-1">{validationErrors.phone || phoneError}</p>
                        )}
                    </div>

                    {duplicateCandidate && (
                        <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg">
                            <p className="text-xs font-bold text-danger mb-1">Duplicate Candidate Found</p>
                            <p className="text-[11px] text-text">
                                {formatCandidateFullName(duplicateCandidate.first_name, duplicateCandidate.last_name)} —{' '}
                                {duplicateCandidate.email}
                                {duplicateCandidate.phone && ` — ${duplicateCandidate.phone}`}
                            </p>
                            <p className="text-[10px] text-text-muted mt-1">
                                Status: {STAGE_LABELS[duplicateCandidate.status as CandidateStatus] || duplicateCandidate.status}
                            </p>
                            <button
                                type="button"
                                className="mt-2 text-xs font-semibold text-cta hover:underline"
                                onClick={() => {
                                    onViewDuplicate(duplicateCandidate);
                                }}
                            >
                                View Existing Candidate Details →
                            </button>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-text-muted px-1 flex items-center gap-1" htmlFor="c-location">
                            <MapPin size={12} /> Current Location
                        </label>
                        <input
                            id="c-location"
                            className="input-field"
                            placeholder="e.g. Bengaluru, India"
                            value={form.current_location ?? ''}
                            onChange={(e) => set('current_location', e.target.value || undefined)}
                        />
                    </div>
                </div>

                <div className="space-y-5">
                    <h4 className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                        <Building2 size={14} className="text-text-muted" />
                        Professional Details
                    </h4>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-text-muted px-1 flex items-center gap-1" htmlFor="c-source">
                            <LinkIcon size={12} /> Source <span className="text-danger">*</span>
                        </label>
                        <select
                            id="c-source"
                            className={cn('input-field', validationErrors.source && 'border-danger')}
                            value={form.source || ''}
                            onChange={(e) => {
                                const val = e.target.value as CandidateSource | '';
                                set('source', val || undefined);
                                setValidationErrors((p) => ({ ...p, source: '', vendor_id: '' }));
                                if (val !== 'VENDORS') {
                                    set('vendor_id', undefined);
                                }
                            }}
                            required
                            title="Select Source"
                        >
                            <option value="">— Select Source —</option>
                            {(['PORTAL', 'JOB_BOARDS', 'NETWORK', 'VENDORS', 'LINKEDIN', 'INTERNAL'] as CandidateSource[]).map((s) => (
                                <option key={s} value={s}>
                                    {s.replace(/_/g, ' ')
                                        .toLowerCase()
                                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                                </option>
                            ))}
                        </select>
                        {validationErrors.source && <p className="text-[10px] text-danger px-1">{validationErrors.source}</p>}
                    </div>

                    {form.source === 'VENDORS' && (
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-text-muted px-1 flex items-center gap-1" htmlFor="c-vendor">
                                <Building2 size={12} /> Vendor
                            </label>
                            <select
                                id="c-vendor"
                                className="input-field"
                                value={form.vendor_id || ''}
                                onChange={(e) => set('vendor_id', e.target.value ? parseInt(e.target.value) : undefined)}
                                title="Select Vendor"
                            >
                                <option value="">— Select Vendor —</option>
                                {vendors
                                    .filter((v) => v.is_active)
                                    .map((v) => (
                                        <option key={v.id} value={v.id}>
                                            {v.name}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-text-muted px-1" htmlFor="c-company">
                            Current Organization
                        </label>
                        <input
                            id="c-company"
                            className="input-field"
                            placeholder="e.g. Tech Solutions Inc."
                            value={form.current_company ?? ''}
                            onChange={(e) => set('current_company', e.target.value || undefined)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-text-muted px-1" htmlFor="c-total-exp">
                                Total Exp (Yrs)
                            </label>
                            <input
                                id="c-total-exp"
                                type="number"
                                min={0}
                                step={0.5}
                                className="input-field"
                                value={form.total_experience ?? ''}
                                onChange={(e) => set('total_experience', e.target.value ? parseFloat(e.target.value) : undefined)}
                                title="Total Exp"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-text-muted px-1" htmlFor="c-rel-exp">
                                Relevant Exp
                            </label>
                            <input
                                id="c-rel-exp"
                                type="number"
                                min={0}
                                step={0.5}
                                className="input-field"
                                value={form.relevant_experience ?? ''}
                                onChange={(e) => set('relevant_experience', e.target.value ? parseFloat(e.target.value) : undefined)}
                                title="Rel Exp"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-text-muted px-1" htmlFor="c-notice">
                            Notice Period (Days)
                        </label>
                        <input
                            id="c-notice"
                            type="number"
                            min={0}
                            className="input-field"
                            placeholder="e.g. 30"
                            value={form.notice_period ?? ''}
                            onChange={(e) => set('notice_period', e.target.value ? parseInt(e.target.value) : undefined)}
                            title="Notice Period"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-text-muted px-1" htmlFor="c-skills">
                        Core Skillset (Comma separated)
                    </label>
                    <textarea
                        id="c-skills"
                        className="input-field resize-none min-h-[60px]"
                        rows={2}
                        placeholder="React, TypeScript, Node.js, AWS..."
                        value={form.skills ?? ''}
                        onChange={(e) => set('skills', e.target.value || undefined)}
                        title="Skills List"
                    />
                </div>

                <div className="bg-surface p-4 rounded-xl border border-border group hover:border-cta/30 transition-all">
                    <label className="text-[11px] font-semibold text-text-muted px-1 block mb-2" htmlFor="c-resume">
                        Resume Attachment (PDF/DOCX)
                    </label>
                    <input
                        id="c-resume"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-surface-hover file:text-cta hover:file:bg-cta/10 file:cursor-pointer transition-all"
                        title="Upload Resume File"
                        onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                    />
                </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-border">
                <button type="button" onClick={onCancel} className="btn btn-secondary flex-1 py-3" disabled={submitting}>
                    Cancel
                </button>
                <button type="submit" className="btn btn-cta flex-1 py-3 font-bold uppercase tracking-wider text-xs" disabled={submitting}>
                    {submitting ? <span className="spinner w-4 h-4" /> : 'Create Candidate Profile'}
                </button>
            </div>
        </form>
    );
}
