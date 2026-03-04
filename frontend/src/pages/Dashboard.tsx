import { useEffect, useState } from 'react';
import { api } from '../api/client';
import {
    Briefcase,
    Users,
    FileText,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    Clock,
    Activity
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

interface DashboardMetrics {
    total_requests: number;
    requests_by_status: Record<string, number>;
    requests_by_priority: Record<string, number>;
    total_candidates: number;
    candidates_by_status: Record<string, number>;
    backfill_count: number;
}

const PRIORITY_COLORS: Record<string, string> = {
    HIGH: '#EF4444',
    MEDIUM: '#F59E0B',
    LOW: '#10B981',
    CRITICAL: '#7C3AED',
    UNKNOWN: '#6B7280'
};

const STATUS_COLORS: Record<string, string> = {
    NEW: '#3B82F6',
    SUBMITTED_TO_ADMIN: '#8B5CF6',
    WITH_ADMIN: '#F59E0B',
    WITH_CLIENT: '#06B6D4',
    INTERVIEW_SCHEDULED: '#EC4899',
    SELECTED: '#22C55E',
    ONBOARDED: '#10B981',
    UNKNOWN: '#6B7280'
};

export function Dashboard() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const data = await api.get<DashboardMetrics>('/dashboard/metrics/');
                setMetrics(data);
            } catch (error) {
                console.error('Failed to fetch dashboard metrics:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, []);

    const priorityData = metrics ? Object.entries(metrics.requests_by_priority).map(([name, value]) => ({
        name, value
    })) : [];

    const pipelineData = metrics ? Object.entries(metrics.candidates_by_status).map(([name, value]) => ({
        name: name.replace(/_/g, ' '), value
    })) : [];

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <div className="spinner w-8 h-8 border-cta"></div>
                <p className="text-text-muted text-sm animate-pulse">Gathering intelligence...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text">Market Intelligence</h1>
                    <p className="text-sm text-text-muted mt-1">Real-time resource and candidate analytics</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-text-muted bg-surface-hover px-3 py-1.5 rounded-full border border-border">
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                    LIVE SYSTEM DATA
                </div>
            </div>

            {/* Top Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Requests"
                    value={metrics?.total_requests || 0}
                    icon={Briefcase}
                    trend="+12% this month"
                    trendColor="text-success"
                />
                <MetricCard
                    title="Active Candidates"
                    value={metrics?.total_candidates || 0}
                    icon={Users}
                    trend="Ready for review"
                    trendColor="text-info"
                />
                <MetricCard
                    title="Critical Backfills"
                    value={metrics?.backfill_count || 0}
                    icon={AlertCircle}
                    trend="Immediate action"
                    trendColor="text-danger"
                />
                <MetricCard
                    title="Total Activity"
                    value={(metrics?.total_requests || 0) + (metrics?.total_candidates || 0)}
                    icon={Activity}
                    trend="System throughput"
                    trendColor="text-cta"
                />
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Charts Area */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="card h-full min-h-[400px] flex flex-col">
                        <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <TrendingUp size={20} className="text-cta" />
                            Candidate Pipeline Distribution
                        </h2>
                        <div className="flex-1 w-full min-h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={pipelineData} margin={{ top: 20, right: 30, left: 10, bottom: 80 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis
                                        dataKey="name"
                                        angle={-45}
                                        textAnchor="end"
                                        interval={0}
                                        height={80}
                                        fontSize={11}
                                        fontWeight={500}
                                        tick={{ fill: '#475569' }}
                                    />
                                    <YAxis
                                        fontSize={11}
                                        fontWeight={500}
                                        tick={{ fill: '#475569' }}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]} animationDuration={1500}>
                                        {pipelineData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={STATUS_COLORS[entry.name.replace(/ /g, '_')] || '#CBD5E1'}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="card">
                            <h2 className="text-lg font-bold mb-4">Request Priorities</h2>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={priorityData}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                            animationDuration={1000}
                                        >
                                            {priorityData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name] || '#CBD5E1'} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="card flex flex-col justify-center">
                            <h2 className="text-lg font-bold mb-4">Quick Insights</h2>
                            <div className="space-y-4">
                                <div className="p-3 bg-surface-hover rounded-xl border border-border">
                                    <p className="text-xs text-text-muted uppercase font-bold tracking-wider">Top Priority</p>
                                    <p className="text-lg font-bold text-text mt-1">
                                        {Object.entries(metrics?.requests_by_priority || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || 'NONE'}
                                    </p>
                                </div>
                                <div className="p-3 bg-surface-hover rounded-xl border border-border">
                                    <p className="text-xs text-text-muted uppercase font-bold tracking-wider">Most Active Stage</p>
                                    <p className="text-lg font-bold text-text mt-1">
                                        {Object.entries(metrics?.candidates_by_status || {}).sort((a, b) => b[1] - a[1])[0]?.[0].replace(/_/g, ' ') || 'NONE'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions & Status */}
                <div className="space-y-6">
                    <div className="card">
                        <h2 className="text-lg font-bold mb-4">Operational Shortcuts</h2>
                        <div className="grid grid-cols-1 gap-2">
                            <Link to="/resource-requests" className="flex items-center gap-3 p-3 bg-cta/5 hover:bg-cta/10 text-cta rounded-xl transition-all font-medium border border-cta/10">
                                <Briefcase size={20} />
                                <span>Create Resource Request</span>
                            </Link>
                            <Link to="/candidates" className="flex items-center gap-3 p-3 bg-info/5 hover:bg-info/10 text-info rounded-xl transition-all font-medium border border-info/10">
                                <Users size={20} />
                                <span>Add New Candidate</span>
                            </Link>
                            <Link to="/sows" className="flex items-center gap-3 p-3 bg-success/5 hover:bg-success/10 text-success rounded-xl transition-all font-medium border border-success/10">
                                <FileText size={20} />
                                <span>Configure SOW</span>
                            </Link>
                        </div>
                    </div>

                    <div className="card">
                        <h2 className="text-lg font-bold mb-4">Infrastructure Status</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2"><CheckCircle size={16} className="text-success" /> Gateway Status</span>
                                <span className="text-success font-bold uppercase text-[10px]">Operational</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2"><Clock size={16} className="text-info" /> Latency</span>
                                <span className="text-text-muted font-bold">14ms</span>
                            </div>
                            <div className="pt-4 border-t border-border">
                                <div className="flex items-center justify-between text-[10px] font-bold text-text-muted uppercase">
                                    <span>Database Shard</span>
                                    <span>Replica-01</span>
                                </div>
                                <div className="w-full h-1.5 bg-surface-hover rounded-full mt-2 overflow-hidden">
                                    <div className="w-3/4 h-full bg-success"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-gradient-to-br from-cta to-info rounded-3xl text-white shadow-xl shadow-cta/20 relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="font-bold text-xl">SipraHub Enterprise</h3>
                            <p className="text-xs opacity-80 mt-1 uppercase tracking-widest font-bold">v1.2.4-PRO</p>
                            <div className="mt-8 flex items-center justify-between">
                                <div className="text-center">
                                    <p className="text-[10px] uppercase opacity-70">Uptime</p>
                                    <p className="text-lg font-bold">99.9%</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] uppercase opacity-70">Region</p>
                                    <p className="text-lg font-bold">APAC-1</p>
                                </div>
                            </div>
                        </div>
                        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                        <div className="absolute -left-10 -top-10 w-40 h-40 bg-cta-hover/20 rounded-full blur-3xl"></div>
                    </div>
                </div>

            </div>
        </div>
    );
}

function MetricCard({ title, value, icon: Icon, trend, trendColor }: { title: string, value: string | number, icon: any, trend?: string, trendColor?: string }) {
    return (
        <div className="card p-5 hover:border-cta/50 transition-all hover:-translate-y-1 cursor-default group">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-bold text-text-muted uppercase tracking-wider">{title}</p>
                    <h3 className="text-3xl font-black mt-2 text-text group-hover:text-cta transition-colors">{value}</h3>
                </div>
                <div className="p-3 bg-surface-hover rounded-2xl group-hover:bg-cta/10 transition-colors">
                    <Icon size={24} className="text-text group-hover:text-cta transition-colors" />
                </div>
            </div>
            {trend && (
                <div className={cn("mt-4 text-[10px] font-bold flex items-center gap-1 uppercase tracking-widest", trendColor)}>
                    <Activity size={12} />
                    {trend}
                </div>
            )}
        </div>
    );
}
