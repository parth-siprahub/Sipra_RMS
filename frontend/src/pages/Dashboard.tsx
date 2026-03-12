import { useEffect, useState, useMemo } from 'react';
import { api } from '../api/client';
import {
    Briefcase,
    Users,
    FileText,
    CheckCircle,
    Clock,
    Activity,
    UserCheck,
    XCircle,
    Pause,
    BarChart3,
    Table2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Line, Area, AreaChart
} from 'recharts';
import { Skeleton, CardSkeleton } from '../components/ui/Skeleton';

// ─── Types ───────────────────────────────────────────────────────────────────

interface VendorStats {
    total: number;
    selected: number;
    onboarded: number;
    rejected: number;
    rejection_rate: number;
}

interface SOWUtilization {
    sow_number: string;
    max: number;
    current: number;
}

interface TimelineEntry {
    date: string;
    count: number;
}

interface SkillEntry {
    skill: string;
    count: number;
}

interface DashboardMetrics {
    total_requests: number;
    requests_by_status: Record<string, number>;
    requests_by_priority: Record<string, number>;
    total_candidates: number;
    candidates_by_status: Record<string, number>;
    backfill_count: number;
    vendor_performance: Record<string, VendorStats>;
    sow_utilization: SOWUtilization[];
    timeline: TimelineEntry[];
    candidates_by_skill: SkillEntry[];
}

// ─── Human-readable Labels ───────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
    NEW: 'New',
    SCREENING: 'Screening',
    SUBMITTED_TO_ADMIN: 'Submitted to Admin',
    WITH_ADMIN: 'With Admin',
    WITH_CLIENT: 'With Client',
    L1_SCHEDULED: 'L1 Scheduled',
    L1_COMPLETED: 'L1 Completed',
    L1_SHORTLIST: 'L1 Shortlist',
    L1_REJECT: 'L1 Reject',
    INTERVIEW_SCHEDULED: 'L2 / Interview',
    SELECTED: 'Selected',
    ONBOARDED: 'Onboarded',
    REJECTED_BY_ADMIN: 'Rejected (Admin)',
    REJECTED_BY_CLIENT: 'Rejected (Client)',
    ON_HOLD: 'On Hold',
    SCREEN_REJECT: 'Screen Reject',
    INTERVIEW_BACK_OUT: 'Interview Back-out',
    OFFER_BACK_OUT: 'Offer Back-out',
    EXIT: 'Exit',
};

// ─── Colors ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
    NEW: '#3B82F6',
    SCREENING: '#60A5FA',
    SUBMITTED_TO_ADMIN: '#8B5CF6',
    WITH_ADMIN: '#F59E0B',
    WITH_CLIENT: '#06B6D4',
    L1_SCHEDULED: '#A855F7',
    L1_COMPLETED: '#7C3AED',
    L1_SHORTLIST: '#2DD4BF',
    L1_REJECT: '#F43F5E',
    INTERVIEW_SCHEDULED: '#EC4899',
    SELECTED: '#22C55E',
    ONBOARDED: '#10B981',
    REJECTED_BY_ADMIN: '#EF4444',
    REJECTED_BY_CLIENT: '#EF4444',
    SCREEN_REJECT: '#DC2626',
    INTERVIEW_BACK_OUT: '#FB923C',
    OFFER_BACK_OUT: '#F97316',
    ON_HOLD: '#6B7280',
    EXIT: '#F97316',
    UNKNOWN: '#94A3B8',
};

const VENDOR_BAR_COLORS = [
    '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#06B6D4',
    '#10B981', '#F97316', '#6366F1', '#14B8A6', '#EF4444',
];

// ─── Funnel Config ───────────────────────────────────────────────────────────

const FUNNEL_COLORS = [
    { border: '#EF4444', fill: '#FEE2E2' },  // Total Submitted — Red
    { border: '#F97316', fill: '#FFEDD5' },  // Screened — Orange
    { border: '#EAB308', fill: '#FEF9C3' },  // L1 Interview — Yellow
    { border: '#818CF8', fill: '#EEF2FF' },  // L2 Interview — Lavender
    { border: '#3B82F6', fill: '#DBEAFE' },  // Selected — Blue
    { border: '#16A34A', fill: '#DCFCE7' },  // Onboarded — Green
];

// Statuses that indicate a candidate has "at least reached" each funnel stage
const L1_REACHED = [
    'L1_SCHEDULED', 'L1_COMPLETED', 'L1_SHORTLIST', 'L1_REJECT',
    'INTERVIEW_SCHEDULED', 'INTERVIEW_BACK_OUT',
    'WITH_ADMIN', 'SUBMITTED_TO_ADMIN', 'REJECTED_BY_ADMIN',
    'WITH_CLIENT', 'REJECTED_BY_CLIENT',
    'SELECTED', 'OFFER_BACK_OUT', 'ONBOARDED',
];

const L2_REACHED = [
    'INTERVIEW_SCHEDULED', 'INTERVIEW_BACK_OUT',
    'WITH_ADMIN', 'SUBMITTED_TO_ADMIN', 'REJECTED_BY_ADMIN',
    'WITH_CLIENT', 'REJECTED_BY_CLIENT',
    'SELECTED', 'OFFER_BACK_OUT', 'ONBOARDED',
];

const SELECTED_REACHED = ['SELECTED', 'OFFER_BACK_OUT', 'ONBOARDED'];
const ONBOARDED_REACHED = ['ONBOARDED'];

// ─── KPI Card Config ─────────────────────────────────────────────────────────

const KPI_ACCENT_COLORS = {
    red: '#CC1A24',
    green: '#16A34A',
    orange: '#EA580C',
    purple: '#7C3AED',
    blue: '#2563EB',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeRollingAvg(data: { date: string; count: number }[], window: number) {
    return data.map((entry, idx) => {
        const start = Math.max(0, idx - window + 1);
        const slice = data.slice(start, idx + 1);
        const avg = slice.reduce((s, e) => s + e.count, 0) / slice.length;
        return { ...entry, avg: Math.round(avg * 10) / 10 };
    });
}

function sumStatuses(byStatus: Record<string, number>, statuses: string[]): number {
    return statuses.reduce((sum, st) => sum + (byStatus[st] || 0), 0);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Dashboard() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusView, setStatusView] = useState<'chart' | 'table'>('chart');
    const [funnelView, setFunnelView] = useState<'chart' | 'timeline' | 'table'>('chart');

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

    // ── Derived data ─────────────────────────────────────────────────────────

    const candidateStatusData = useMemo(() => {
        if (!metrics) return [];
        return Object.entries(metrics.candidates_by_status)
            .map(([name, value]) => ({
                name: STATUS_LABELS[name] || name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                key: name,
                value,
            }))
            .sort((a, b) => b.value - a.value);
    }, [metrics]);

    const totalCandidates = metrics?.total_candidates || 0;

    const selectedOnboarded = useMemo(() => {
        if (!metrics) return 0;
        const s = metrics.candidates_by_status;
        return (s['SELECTED'] || 0) + (s['ONBOARDED'] || 0);
    }, [metrics]);

    const totalRejections = useMemo(() => {
        if (!metrics) return 0;
        const s = metrics.candidates_by_status;
        return (s['SCREEN_REJECT'] || 0) + (s['L1_REJECT'] || 0) +
            (s['REJECTED_BY_ADMIN'] || 0) + (s['REJECTED_BY_CLIENT'] || 0);
    }, [metrics]);

    const onHoldCount = metrics?.candidates_by_status?.['ON_HOLD'] || 0;

    // Funnel data — cumulative "at least reached this stage"
    const funnelData = useMemo(() => {
        if (!metrics) return [];
        const s = metrics.candidates_by_status;
        const total = metrics.total_candidates;
        return [
            { name: 'Total Submitted', value: total },
            { name: 'Screened', value: total - (s['NEW'] || 0) },
            { name: 'L1 Interview', value: sumStatuses(s, L1_REACHED) },
            { name: 'L2 Interview', value: sumStatuses(s, L2_REACHED) },
            { name: 'L2 Selected', value: sumStatuses(s, SELECTED_REACHED) },
            { name: 'Onboarded', value: sumStatuses(s, ONBOARDED_REACHED) },
        ];
    }, [metrics]);

    // Vendor data sorted by total (top 8)
    const vendorSubmissionData = useMemo(() => {
        if (!metrics) return [];
        return Object.entries(metrics.vendor_performance)
            .map(([name, stats]) => ({ name, total: stats.total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 8);
    }, [metrics]);

    const vendorRejectionData = useMemo(() => {
        if (!metrics) return [];
        return Object.entries(metrics.vendor_performance)
            .filter(([, stats]) => stats.total > 0)
            .map(([name, stats]) => ({ name, rejection_rate: stats.rejection_rate }))
            .sort((a, b) => b.rejection_rate - a.rejection_rate)
            .slice(0, 8);
    }, [metrics]);

    // Timeline with rolling avg
    const timelineData = useMemo(() => {
        if (!metrics?.timeline) return [];
        return computeRollingAvg(metrics.timeline, 7);
    }, [metrics]);

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

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text">Market Intelligence</h1>
                    <p className="text-sm text-text-muted mt-1">Real-time resource and candidate analytics</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-text-muted bg-surface-hover px-3 py-1.5 rounded-full border border-border">
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    LIVE SYSTEM DATA
                </div>
            </div>

            {/* ── Section A: Enhanced KPI Strip (5 cards) ─────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <KPICard
                    label="Total Candidates"
                    value={totalCandidates}
                    accent={KPI_ACCENT_COLORS.red}
                    sub="All vendors combined"
                    icon={Users}
                />
                <KPICard
                    label="Selected / Onboarded"
                    value={selectedOnboarded}
                    accent={KPI_ACCENT_COLORS.green}
                    sub="Cleared pipeline"
                    subColor="text-success"
                    icon={UserCheck}
                />
                <KPICard
                    label="Total Rejections"
                    value={totalRejections}
                    accent={KPI_ACCENT_COLORS.orange}
                    sub="Screen + L1 + L2"
                    icon={XCircle}
                />
                <KPICard
                    label="On Hold"
                    value={onHoldCount}
                    accent={KPI_ACCENT_COLORS.purple}
                    sub="Pending decisions"
                    icon={Pause}
                />
                <KPICard
                    label="Active Requests"
                    value={metrics?.total_requests || 0}
                    accent={KPI_ACCENT_COLORS.blue}
                    sub="Inflow active"
                    icon={Briefcase}
                />
            </div>

            {/* ── Row: Candidate Status Distribution + Hiring Funnel ────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* ── Candidate Status Distribution ───────────────────────── */}
                <div className="card">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-base font-bold flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-danger" />
                            Candidate Status Distribution
                        </h2>
                        <ViewToggle
                            active={statusView}
                            options={[
                                { id: 'chart', label: 'Chart', icon: <BarChart3 size={13} /> },
                                { id: 'table', label: 'Table', icon: <Table2 size={13} /> },
                            ]}
                            onChange={(v) => setStatusView(v as 'chart' | 'table')}
                        />
                    </div>

                    {statusView === 'chart' ? (
                        <div className="flex items-start gap-4">
                            {/* Donut */}
                            <div className="w-[200px] h-[200px] shrink-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={candidateStatusData}
                                            innerRadius={55}
                                            outerRadius={90}
                                            paddingAngle={1.5}
                                            dataKey="value"
                                            animationDuration={800}
                                            stroke="none"
                                        >
                                            {candidateStatusData.map((entry, i) => (
                                                <Cell
                                                    key={`sd-${i}`}
                                                    fill={STATUS_COLORS[entry.key] || '#CBD5E1'}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value: number, _name: string, props: { payload: { name: string } }) => [value, props.payload.name]}
                                            contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Legend */}
                            <div className="flex-1 max-h-[210px] overflow-y-auto custom-scrollbar pr-1 space-y-1.5">
                                {candidateStatusData.map((entry) => (
                                    <div key={entry.key} className="flex items-center gap-2.5">
                                        <span
                                            className="w-3 h-3 rounded-full shrink-0"
                                            style={{ backgroundColor: STATUS_COLORS[entry.key] || '#CBD5E1' }}
                                        />
                                        <span className="text-xs text-text flex-1 truncate">{entry.name}</span>
                                        <span className="text-sm font-bold text-text tabular-nums">{entry.value}</span>
                                        <span className="text-xs text-text-muted tabular-nums w-10 text-right">
                                            {totalCandidates > 0 ? Math.round((entry.value / totalCandidates) * 100) : 0}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Table view */
                        <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-surface z-10">
                                    <tr className="text-text-muted border-b border-border">
                                        <th className="text-left py-2 font-semibold text-xs">Status</th>
                                        <th className="text-right py-2 font-semibold text-xs">Count</th>
                                        <th className="text-right py-2 font-semibold text-xs">%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {candidateStatusData.map((entry) => (
                                        <tr key={entry.key} className="border-b border-border/40 hover:bg-surface-hover transition-colors">
                                            <td className="py-2 flex items-center gap-2">
                                                <span
                                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                                    style={{ backgroundColor: STATUS_COLORS[entry.key] || '#CBD5E1' }}
                                                />
                                                <span className="text-text">{entry.name}</span>
                                            </td>
                                            <td className="text-right font-bold text-text tabular-nums">{entry.value}</td>
                                            <td className="text-right text-text-muted tabular-nums">
                                                {totalCandidates > 0 ? Math.round((entry.value / totalCandidates) * 100) : 0}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* ── Hiring Funnel ────────────────────────────────────────── */}
                <div className="card">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-base font-bold flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-success" />
                            Hiring Funnel
                        </h2>
                        <ViewToggle
                            active={funnelView}
                            options={[
                                { id: 'chart', label: 'Chart', icon: <BarChart3 size={13} /> },
                                { id: 'timeline', label: 'Timeline', icon: <Activity size={13} /> },
                                { id: 'table', label: 'Table', icon: <Table2 size={13} /> },
                            ]}
                            onChange={(v) => setFunnelView(v as 'chart' | 'timeline' | 'table')}
                        />
                    </div>

                    {funnelView === 'chart' ? (
                        <div className="h-[310px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    layout="vertical"
                                    data={funnelData}
                                    margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
                                    barSize={28}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                                    <XAxis
                                        type="number"
                                        fontSize={11}
                                        tick={{ fill: '#64748B' }}
                                        axisLine={{ stroke: '#E2E8F0' }}
                                    />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={105}
                                        fontSize={12}
                                        fontWeight={500}
                                        tick={{ fill: '#334155' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        formatter={(value: number) => [value, 'Candidates']}
                                    />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} animationDuration={1000}>
                                        {funnelData.map((_, i) => (
                                            <Cell
                                                key={`fn-${i}`}
                                                fill={FUNNEL_COLORS[i].fill}
                                                stroke={FUNNEL_COLORS[i].border}
                                                strokeWidth={2}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : funnelView === 'timeline' ? (
                        /* Timeline view — reuses candidate submission timeline */
                        <div className="h-[310px]">
                            {timelineData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={timelineData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                                        <defs>
                                            <linearGradient id="funnelGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#16A34A" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis
                                            dataKey="date"
                                            fontSize={10}
                                            tick={{ fill: '#64748B' }}
                                            tickFormatter={(d: string) => {
                                                const dt = new Date(d);
                                                return `${dt.getDate()}/${dt.getMonth() + 1}`;
                                            }}
                                        />
                                        <YAxis fontSize={11} tick={{ fill: '#64748B' }} allowDecimals={false} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            labelFormatter={(d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="count"
                                            stroke="#16A34A"
                                            strokeWidth={2}
                                            fill="url(#funnelGrad)"
                                            dot={{ r: 3, fill: '#16A34A', stroke: '#fff', strokeWidth: 2 }}
                                            name="New Submissions"
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="avg"
                                            stroke="#3B82F6"
                                            strokeWidth={2}
                                            strokeDasharray="6 3"
                                            dot={false}
                                            name="7-Day Avg"
                                        />
                                        <Legend />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-text-muted text-sm">
                                    No submission data in the last 30 days
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Table view */
                        <div className="space-y-3">
                            {funnelData.map((stage, i) => {
                                const conversionPct = i === 0
                                    ? 100
                                    : funnelData[0].value > 0
                                        ? Math.round((stage.value / funnelData[0].value) * 100)
                                        : 0;
                                const dropoff = i === 0
                                    ? null
                                    : funnelData[i - 1].value > 0
                                        ? Math.round(((funnelData[i - 1].value - stage.value) / funnelData[i - 1].value) * 100)
                                        : 0;
                                return (
                                    <div
                                        key={stage.name}
                                        className="flex items-center gap-3 p-3 rounded-lg border"
                                        style={{ borderColor: FUNNEL_COLORS[i].border + '40', backgroundColor: FUNNEL_COLORS[i].fill + '60' }}
                                    >
                                        <span
                                            className="w-3 h-3 rounded-full shrink-0"
                                            style={{ backgroundColor: FUNNEL_COLORS[i].border }}
                                        />
                                        <span className="text-sm font-medium text-text flex-1">{stage.name}</span>
                                        <span className="text-lg font-bold text-text tabular-nums">{stage.value}</span>
                                        <div className="flex flex-col items-end w-16">
                                            <span className="text-xs font-semibold text-text-muted tabular-nums">{conversionPct}%</span>
                                            {dropoff !== null && dropoff > 0 && (
                                                <span className="text-[10px] text-danger tabular-nums">-{dropoff}% drop</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Section C: Vendor Charts (side-by-side) ─────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Submission Volume */}
                <div className="card">
                    <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-info" />
                        Vendor Submission Volume
                    </h2>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                layout="vertical"
                                data={vendorSubmissionData}
                                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                                <XAxis type="number" fontSize={11} tick={{ fill: '#64748B' }} />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={110}
                                    fontSize={11}
                                    tick={{ fill: '#64748B' }}
                                />
                                <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="total" radius={[0, 4, 4, 0]} animationDuration={1000}>
                                    {vendorSubmissionData.map((_, i) => (
                                        <Cell key={`vs-${i}`} fill={VENDOR_BAR_COLORS[i % VENDOR_BAR_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Rejection Rate */}
                <div className="card">
                    <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-danger" />
                        Vendor Rejection Rate (%)
                    </h2>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                layout="vertical"
                                data={vendorRejectionData}
                                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                                <XAxis type="number" domain={[0, 100]} fontSize={11} tick={{ fill: '#64748B' }} unit="%" />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={110}
                                    fontSize={11}
                                    tick={{ fill: '#64748B' }}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    formatter={(value: number) => [`${value}%`, 'Rejection Rate']}
                                />
                                <Bar dataKey="rejection_rate" radius={[0, 4, 4, 0]} animationDuration={1000}>
                                    {vendorRejectionData.map((entry, i) => (
                                        <Cell
                                            key={`vr-${i}`}
                                            fill={entry.rejection_rate > 60 ? '#EF4444' : entry.rejection_rate > 30 ? '#F59E0B' : '#22C55E'}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ── Section D: Candidate Timeline ───────────────────────────────── */}
            <div className="card">
                <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                    <Activity size={20} className="text-cta" />
                    Candidate Submissions — Last 30 Days
                </h2>
                {timelineData.length > 0 ? (
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timelineData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                                <defs>
                                    <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#CC1A24" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#CC1A24" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis
                                    dataKey="date"
                                    fontSize={10}
                                    tick={{ fill: '#64748B' }}
                                    tickFormatter={(d: string) => {
                                        const dt = new Date(d);
                                        return `${dt.getDate()}/${dt.getMonth() + 1}`;
                                    }}
                                />
                                <YAxis fontSize={11} tick={{ fill: '#64748B' }} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    labelFormatter={(d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#CC1A24"
                                    strokeWidth={2}
                                    fill="url(#fillGrad)"
                                    dot={{ r: 3, fill: '#CC1A24', stroke: '#fff', strokeWidth: 2 }}
                                    name="Submissions"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="avg"
                                    stroke="#3B82F6"
                                    strokeWidth={2}
                                    strokeDasharray="6 3"
                                    dot={false}
                                    name="7-Day Avg"
                                />
                                <Legend />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-40 flex items-center justify-center text-text-muted text-sm">
                        No submission data in the last 30 days
                    </div>
                )}
            </div>

            {/* ── Row: SOW Utilization + Quick Actions + Infra ─────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Section E: SOW Utilization */}
                <div className="card lg:col-span-2">
                    <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                        <FileText size={20} className="text-cta" />
                        SOW Utilization
                    </h2>
                    {metrics?.sow_utilization && metrics.sow_utilization.length > 0 ? (
                        <div className="space-y-4">
                            {metrics.sow_utilization.map((sow) => {
                                const pct = sow.max > 0 ? Math.round((sow.current / sow.max) * 100) : 0;
                                const barColor = pct >= 80 ? 'bg-danger' : pct >= 50 ? 'bg-warning' : 'bg-success';
                                return (
                                    <div key={sow.sow_number}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-sm font-semibold text-text">{sow.sow_number}</span>
                                            <span className="text-xs font-bold text-text-muted">
                                                {sow.current} / {sow.max} ({pct}%)
                                            </span>
                                        </div>
                                        <div className="w-full h-2.5 bg-surface-hover rounded-full overflow-hidden">
                                            <div
                                                className={cn('h-full rounded-full transition-all duration-700', barColor)}
                                                style={{ width: `${Math.min(pct, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="h-32 flex items-center justify-center text-text-muted text-sm">
                            No active SOWs
                        </div>
                    )}
                </div>

                {/* Quick Actions + Infrastructure Status */}
                <div className="space-y-6">
                    <div className="card">
                        <h2 className="text-base font-bold mb-4">Operational Shortcuts</h2>
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
                        <h2 className="text-base font-bold mb-4">Infrastructure Status</h2>
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
                                    <div className="w-3/4 h-full bg-success" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── View Toggle (Chart / Table / Timeline) ──────────────────────────────────

interface ViewToggleOption {
    id: string;
    label: string;
    icon: React.ReactNode;
}

function ViewToggle({
    active,
    options,
    onChange,
}: {
    active: string;
    options: ViewToggleOption[];
    onChange: (id: string) => void;
}) {
    return (
        <div className="flex rounded-lg overflow-hidden border border-border">
            {options.map((opt) => (
                <button
                    key={opt.id}
                    onClick={() => onChange(opt.id)}
                    className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors',
                        active === opt.id
                            ? 'bg-danger text-white'
                            : 'bg-surface text-text-muted hover:bg-surface-hover'
                    )}
                >
                    {opt.icon}
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

// ─── KPI Card with colored top-border accent ─────────────────────────────────

interface KPICardProps {
    label: string;
    value: number;
    accent: string;
    sub: string;
    subColor?: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
}

function KPICard({ label, value, accent, sub, subColor, icon: Icon }: KPICardProps) {
    return (
        <div
            className="bg-surface rounded-xl border border-border p-5 transition-all hover:-translate-y-0.5 cursor-default group"
            style={{ borderTopWidth: '3px', borderTopColor: accent }}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{label}</p>
                    <h3
                        className="text-3xl font-extrabold mt-1.5"
                        style={{ color: accent }}
                    >
                        {value}
                    </h3>
                </div>
                <div
                    className="p-2.5 rounded-xl transition-colors"
                    style={{ backgroundColor: `${accent}10` }}
                >
                    <Icon size={22} style={{ color: accent }} />
                </div>
            </div>
            <p className={cn('text-[10px] font-semibold mt-3 uppercase tracking-wider', subColor || 'text-text-muted')}>
                {sub}
            </p>
        </div>
    );
}
