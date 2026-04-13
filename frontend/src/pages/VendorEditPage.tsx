import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { vendorsApi, type Vendor } from '../api/vendors';
import { VendorForm } from '../components/vendors/VendorForm';
import toast from 'react-hot-toast';

export function VendorEditPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [vendor, setVendor] = useState<Vendor | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const n = id ? parseInt(id, 10) : NaN;
        if (Number.isNaN(n)) {
            toast.error('Invalid vendor');
            navigate('/vendors', { replace: true });
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const data = await vendorsApi.get(n);
                if (!cancelled) setVendor(data);
            } catch {
                if (!cancelled) {
                    toast.error('Vendor not found');
                    navigate('/vendors', { replace: true });
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [id, navigate]);

    if (loading) {
        return (
            <div className="card w-full py-20 flex flex-col items-center justify-center gap-4">
                <div className="spinner w-8 h-8 border-cta" />
                <p className="text-text-muted text-sm">Loading vendor…</p>
            </div>
        );
    }

    if (!vendor) return null;

    return (
        <div className="space-y-6 animate-fade-in w-full">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <Link to="/vendors" className="text-sm text-cta hover:underline">
                    ← Back to Vendors
                </Link>
            </div>
            <div className="card p-6 md:p-8 w-full">
                <h1 className="text-xl md:text-2xl font-bold text-text mb-6">Edit Vendor — {vendor.name}</h1>
                <VendorForm vendor={vendor} onSaved={() => navigate('/vendors')} onCancel={() => navigate('/vendors')} />
            </div>
        </div>
    );
}
