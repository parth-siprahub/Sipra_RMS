import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Skeleton, CardSkeleton } from '../components/ui/Skeleton';
import { DashboardTabs } from '../components/dashboard/DashboardTabs';
import type { DashboardTab } from '../components/dashboard/DashboardTabs';
import { OverviewTab } from '../components/dashboard/OverviewTab';
import type { DashboardMetrics } from '../components/dashboard/types';

// ─── Component ───────────────────────────────────────────────────────────────

export function Dashboard() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const data = await api.get<DashboardMetrics>('/dashboard/metrics');
                setMetrics(data);
            } catch (error) {
                console.error('Failed to fetch dashboard metrics:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchMetrics();
    }, []);

    // ── Loading skeleton ─────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-8 w-32 rounded-full" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
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

    // ── Tab content renderer ─────────────────────────────────────────────────

    function renderTabContent() {
        switch (activeTab) {
            case 'overview':
                return metrics ? <OverviewTab metrics={metrics} /> : null;
            case 'skills':
                return (
                    <div className="card">
                        <div className="flex items-center justify-center h-64 text-text-muted text-sm">
                            Skills analytics coming soon
                        </div>
                    </div>
                );
            case 'vendors':
                return (
                    <div className="card">
                        <div className="flex items-center justify-center h-64 text-text-muted text-sm">
                            Vendor analytics coming soon
                        </div>
                    </div>
                );
            case 'risk':
                return (
                    <div className="card">
                        <div className="flex items-center justify-center h-64 text-text-muted text-sm">
                            Risk analytics coming soon
                        </div>
                    </div>
                );
            default:
                return null;
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-text-muted">Real-time resource and candidate analytics</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-text-muted bg-surface-hover px-3 py-1.5 rounded-full border border-border">
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    LIVE SYSTEM DATA
                </div>
            </div>

            {/* Tab Navigation */}
            <DashboardTabs activeTab={activeTab} onChange={setActiveTab} />

            {/* Tab Content */}
            {renderTabContent()}
        </div>
    );
}
