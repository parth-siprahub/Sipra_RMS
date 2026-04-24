import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Skeleton, CardSkeleton } from '../components/ui/Skeleton';
import { OverviewTab } from '../components/dashboard/OverviewTab';
import type { DashboardMetrics } from '../components/dashboard/types';

export function DashboardOverviewPage() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get<DashboardMetrics>('/dashboard/metrics')
            .then(setMetrics)
            .catch(err => console.error('Failed to fetch dashboard metrics:', err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {[1, 2, 3, 4, 5].map(i => <CardSkeleton key={i} />)}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Skeleton className="h-96 w-full rounded-2xl" />
                    <Skeleton className="h-96 w-full rounded-2xl" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Skeleton className="h-72 w-full rounded-2xl" />
                    <Skeleton className="h-72 w-full rounded-2xl" />
                </div>
            </div>
        );
    }

    if (!metrics) return null;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <p className="text-sm text-text-muted">Real-time resource and candidate analytics</p>
                <div className="flex items-center gap-2 text-xs font-bold text-text-muted bg-surface-hover px-3 py-1.5 rounded-full border border-border">
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    LIVE SYSTEM DATA
                </div>
            </div>
            <OverviewTab metrics={metrics} />
        </div>
    );
}
