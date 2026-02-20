import { useEffect, useState } from 'react';
import { api } from '../api/client';
import {
    Briefcase,
    Users,
    FileText,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    Clock
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

interface DashboardMetrics {
    total_requests: number;
    requests_by_status: Record<string, number>;
    requests_by_priority: Record<string, number>;
    total_candidates: number;
    candidates_by_status: Record<string, number>;
    candidates_backfill: number;
}

export function Dashboard() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);

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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="spinner w-8 h-8 border-cta"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-text">Dashboard Overview</h1>
                <div className="text-sm text-text-muted">
                    Last updated: {new Date().toLocaleTimeString()}
                </div>
            </div>

            {/* Top Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Requests"
                    value={metrics?.total_requests || 0}
                    icon={Briefcase}
                    trend="+5% from last week"
                    trendColor="text-success"
                />
                <MetricCard
                    title="Active Candidates"
                    value={metrics?.total_candidates || 0}
                    icon={Users}
                    trend="2 new today"
                    trendColor="text-info"
                />
                <MetricCard
                    title="Pending SOWs"
                    value={metrics?.requests_by_status['DRAFT'] || 0}
                    icon={FileText}
                    trend="Action required"
                    trendColor="text-warning"
                />
                <MetricCard
                    title="Backfills"
                    value={metrics?.candidates_backfill || 0}
                    icon={AlertCircle}
                    trend="Critical"
                    trendColor="text-danger"
                />
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Recent Activity / Pipeline */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="card">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <TrendingUp size={20} className="text-cta" />
                            Pipeline Overview
                        </h2>
                        <div className="h-64 flex items-center justify-center bg-surface-hover/50 rounded-lg border border-dashed border-border">
                            <p className="text-text-muted">Charts coming in implementation phase</p>
                        </div>
                    </div>

                    <div className="card">
                        <h2 className="text-lg font-bold mb-4">Recent Resource Requests</h2>
                        <div className="text-center py-8 text-text-muted">
                            No recent requests found. <Link to="/resource-requests" className="text-cta hover:underline">Create one?</Link>
                        </div>
                    </div>
                </div>

                {/* Quick Actions & Status */}
                <div className="space-y-6">
                    <div className="card">
                        <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
                        <div className="space-y-2">
                            <Link to="/resource-requests?new=true" className="w-full btn btn-primary justify-start">
                                <Briefcase size={18} /> New Resource Request
                            </Link>
                            <Link to="/candidates?new=true" className="w-full btn btn-secondary justify-start">
                                <Users size={18} /> Add Candidate
                            </Link>
                            <Link to="/sows?new=true" className="w-full btn btn-secondary justify-start">
                                <FileText size={18} /> Create SOW
                            </Link>
                        </div>
                    </div>

                    <div className="card">
                        <h2 className="text-lg font-bold mb-4">System Status</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2"><CheckCircle size={16} className="text-success" /> API Status</span>
                                <span className="text-success font-medium">Online</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2"><Clock size={16} className="text-info" /> DB Latency</span>
                                <span className="text-text-muted">24ms</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

function MetricCard({ title, value, icon: Icon, trend, trendColor }: { title: string, value: string | number, icon: any, trend?: string, trendColor?: string }) {
    return (
        <div className="card p-5 hover:border-cta/50 transition-colors">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-text-muted">{title}</p>
                    <h3 className="text-2xl font-bold mt-1">{value}</h3>
                </div>
                <div className="p-2 bg-surface-hover rounded-lg">
                    <Icon size={20} className="text-text" />
                </div>
            </div>
            {trend && (
                <div className={cn("mt-4 text-xs font-medium flex items-center gap-1", trendColor)}>
                    {trend}
                </div>
            )}
        </div>
    );
}
