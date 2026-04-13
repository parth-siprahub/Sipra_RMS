import { useState, useEffect } from 'react';
import { vendorsApi, type Vendor, type CreateVendorPayload } from '../../api/vendors';
import toast from 'react-hot-toast';

export interface VendorFormProps {
    vendor?: Vendor;
    onSaved: () => void;
    onCancel: () => void;
}

export function VendorForm({ vendor, onSaved, onCancel }: VendorFormProps) {
    const [form, setForm] = useState<CreateVendorPayload>({
        name: '',
        contact_person: '',
        contact_email: '',
        contact_phone: '',
        is_active: true,
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (vendor) {
            setForm({
                name: vendor.name,
                contact_person: vendor.contact_person || '',
                contact_email: vendor.contact_email || '',
                contact_phone: vendor.contact_phone || '',
                is_active: vendor.is_active,
            });
        } else {
            setForm({ name: '', contact_person: '', contact_email: '', contact_phone: '', is_active: true });
        }
    }, [vendor]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (vendor) {
                await vendorsApi.update(vendor.id, form);
                toast.success('Vendor updated');
            } else {
                await vendorsApi.create(form);
                toast.success('Vendor created');
            }
            onSaved();
        } catch {
            // handled by client
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="input-label" htmlFor="v-name">
                    Vendor Name <span className="text-danger">*</span>
                </label>
                <input
                    id="v-name"
                    className="input-field"
                    placeholder="e.g. WRS Global"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
            </div>
            <div>
                <label className="input-label" htmlFor="v-contact">
                    Contact Person <span className="text-danger">*</span>
                </label>
                <input
                    id="v-contact"
                    className="input-field"
                    placeholder="John Doe"
                    required
                    value={form.contact_person || ''}
                    onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))}
                />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="input-label" htmlFor="v-email">
                        Email <span className="text-danger">*</span>
                    </label>
                    <input
                        id="v-email"
                        type="email"
                        className="input-field"
                        placeholder="vendor@example.com"
                        required
                        value={form.contact_email || ''}
                        onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
                    />
                </div>
                <div>
                    <label className="input-label" htmlFor="v-phone">
                        Phone <span className="text-danger">*</span>
                    </label>
                    <input
                        id="v-phone"
                        className="input-field"
                        placeholder="+91 98765 43210"
                        required
                        value={form.contact_phone || ''}
                        onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
                    />
                </div>
            </div>
            <div className="flex items-center gap-3">
                <input
                    id="v-active"
                    type="checkbox"
                    className="w-4 h-4 accent-cta"
                    checked={form.is_active}
                    onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                />
                <label htmlFor="v-active" className="text-sm text-text">
                    Active Vendor
                </label>
            </div>
            <div className="flex gap-3 pt-2">
                <button type="button" onClick={onCancel} className="btn btn-secondary flex-1" disabled={submitting}>
                    Cancel
                </button>
                <button type="submit" className="btn btn-cta flex-1" disabled={submitting}>
                    {submitting ? <span className="spinner w-4 h-4" /> : vendor ? 'Update' : 'Add Vendor'}
                </button>
            </div>
        </form>
    );
}
