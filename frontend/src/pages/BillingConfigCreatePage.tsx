import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings2 } from 'lucide-react';
import { billingConfigApi, type BillingConfigCreate } from '../api/billingConfig';
import toast from 'react-hot-toast';
import { FormPageLayout } from '../components/layout/FormPageLayout';

/** Generate month options from Jan 2025 to 3 months ahead of today (aligned with Billing Config list) */
function getMonthOptions(): { value: string; label: string }[] {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    const endYear = now.getFullYear();
    const endMonth = now.getMonth() + 4;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let y = 2025; y <= endYear + 1; y++) {
        for (let m = 1; m <= 12; m++) {
            if (y === endYear && m > endMonth) break;
            if (y > endYear) break;
            const value = `${y}-${String(m).padStart(2, '0')}`;
            options.push({ value, label: `${months[m - 1]} ${y}` });
        }
    }
    return options.reverse();
}

export function BillingConfigCreatePage() {
    const navigate = useNavigate();
    const monthOptions = useMemo(() => getMonthOptions(), []);
    const [form, setForm] = useState<BillingConfigCreate>({
        client_name: 'DCLI',
        billing_month: monthOptions[0]?.value ?? '',
        billable_hours: 176,
        working_days: 22,
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.billing_month) {
            toast.error('Select a billing month');
            return;
        }
        if (form.billable_hours <= 0) {
            toast.error('Billable hours must be > 0');
            return;
        }
        if (form.working_days <= 0) {
            toast.error('Working days must be > 0');
            return;
        }
        setSubmitting(true);
        try {
            await billingConfigApi.upsert({
                client_name: form.client_name || 'DCLI',
                billing_month: form.billing_month,
                billable_hours: Number(form.billable_hours),
                working_days: Number(form.working_days),
            });
            toast.success('Billing config saved');
            navigate('/billing-config');
        } catch {
            toast.error('Failed to save billing config');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <FormPageLayout
            backHref="/billing-config"
            backLabel="Back to Billing Config"
            title="Add Billing Config"
            description="Set monthly billable hours and working days per client."
            icon={Settings2}
            contentWidth="compact"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="input-label" htmlFor="bc-create-client">
                        Client Name *
                    </label>
                    <input
                        id="bc-create-client"
                        className="input-field"
                        placeholder="e.g. DCLI"
                        required
                        maxLength={100}
                        value={form.client_name}
                        onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
                    />
                </div>
                <div>
                    <label className="input-label" htmlFor="bc-create-month">
                        Billing Month *
                    </label>
                    <select
                        id="bc-create-month"
                        className="input-field"
                        required
                        value={form.billing_month}
                        onChange={(e) => setForm((f) => ({ ...f, billing_month: e.target.value }))}
                    >
                        <option value="">Select month…</option>
                        {monthOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="input-label" htmlFor="bc-create-hours">
                            Billable Hours *
                        </label>
                        <input
                            id="bc-create-hours"
                            type="number"
                            className="input-field"
                            min={1}
                            step={0.5}
                            required
                            placeholder="e.g. 176"
                            value={form.billable_hours || ''}
                            onChange={(e) =>
                                setForm((f) => ({ ...f, billable_hours: parseFloat(e.target.value) || 0 }))
                            }
                        />
                    </div>
                    <div>
                        <label className="input-label" htmlFor="bc-create-days">
                            Working Days *
                        </label>
                        <input
                            id="bc-create-days"
                            type="number"
                            className="input-field"
                            min={1}
                            step={1}
                            required
                            placeholder="e.g. 22"
                            value={form.working_days || ''}
                            onChange={(e) =>
                                setForm((f) => ({ ...f, working_days: parseInt(e.target.value, 10) || 0 }))
                            }
                        />
                    </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-border sm:justify-end">
                    <button
                        type="button"
                        onClick={() => navigate('/billing-config')}
                        className="btn btn-secondary w-full sm:w-auto min-h-[44px] min-w-[10rem]"
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-cta w-full sm:w-auto min-h-[44px] min-w-[10rem]" disabled={submitting}>
                        {submitting ? <span className="spinner w-4 h-4" /> : 'Save Config'}
                    </button>
                </div>
            </form>
        </FormPageLayout>
    );
}
