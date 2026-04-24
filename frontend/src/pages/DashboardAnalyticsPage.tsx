import { DashboardAnalytics } from '../components/dashboard/DashboardAnalytics';

export function DashboardAnalyticsPage() {
    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
                <p className="text-sm text-text-muted">Pipeline and workforce analytics — active employees only</p>
                <div className="flex items-center gap-2 text-xs font-bold text-text-muted bg-surface-hover px-3 py-1.5 rounded-full border border-border">
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    LIVE SYSTEM DATA
                </div>
            </div>
            <DashboardAnalytics />
        </div>
    );
}
