import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Skeleton, CardSkeleton } from '../components/ui/Skeleton';
import { OverviewTab } from '../components/dashboard/OverviewTab';
import { DashboardAnalytics } from '../components/dashboard/DashboardAnalytics';
import type { DashboardMetrics } from '../components/dashboard/types';

type DashboardTab = 'overview' | 'analytics';
const TAB_STORAGE_KEY = 'rms.dashboard.tab';

function readPersistedTab(): DashboardTab {
  try {
    const stored = localStorage.getItem(TAB_STORAGE_KEY);
    return stored === 'analytics' ? 'analytics' : 'overview';
  } catch {
    return 'overview';
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DashboardTab>(readPersistedTab);

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

  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab);
    try {
      localStorage.setItem(TAB_STORAGE_KEY, tab);
    } catch {
      /* storage disabled — ignore */
    }
  };

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

      {/* Tab toggle */}
      <div
        role="tablist"
        aria-label="Dashboard view"
        className="inline-flex items-center gap-1 p-1 rounded-lg border border-border bg-surface"
      >
        {(['overview', 'analytics'] as const).map(tab => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              aria-selected={isActive}
              onClick={() => handleTabChange(tab)}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                isActive
                  ? 'bg-cta text-white shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {tab === 'overview' ? 'Overview' : 'Analytics'}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && metrics ? <OverviewTab metrics={metrics} /> : null}
      {activeTab === 'analytics' ? <DashboardAnalytics /> : null}
    </div>
  );
}
