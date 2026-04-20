import { useState, useEffect, useCallback } from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { AlertCircle, Download, RotateCcw } from 'lucide-react';
import { analyticsApi } from '../../api/analytics';
import type { ResourcesOverview, LabelValue, PipelineFunnel, PivotRow, DailyStatusMatrix } from '../../api/analytics';
import { useAnalyticsFilters } from '../../context/AnalyticsContext';
import { useAuth, isAdminRole } from '../../context/AuthContext';
import * as XLSX from 'xlsx';
import { cn } from '../../lib/utils';

// ─── Colours ─────────────────────────────────────────────────────────────────

const CHART_COLORS = [
    '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#06B6D4',
    '#10B981', '#F97316', '#6366F1', '#14B8A6', '#EF4444',
    '#A855F7', '#84CC16', '#22D3EE', '#FB923C', '#F43F5E',
];

const FUNNEL_PALETTE = [
    { bar: '#EF4444', bg: '#FEE2E2' },
    { bar: '#F97316', bg: '#FFEDD5' },
    { bar: '#EAB308', bg: '#FEF9C3' },
    { bar: '#818CF8', bg: '#EEF2FF' },
    { bar: '#3B82F6', bg: '#DBEAFE' },
    { bar: '#16A34A', bg: '#DCFCE7' },
    { bar: '#06B6D4', bg: '#CFFAFE' },
];

// ─── Shared micro-components ──────────────────────────────────────────────────

function SectionError() {
    return (
        <div className="flex flex-col items-center justify-center h-40 gap-2 text-text-muted">
            <AlertCircle size={18} className="opacity-40" />
            <span className="text-xs">Data unavailable</span>
        </div>
    );
}

function SectionSpinner() {
    return (
        <div className="flex items-center justify-center h-40">
            <div className="w-5 h-5 border-2 border-cta border-t-transparent rounded-full animate-spin" />
        </div>
    );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

function FilterBar({ onRefresh }: { onRefresh: () => void }) {
    const { filters, setStartDate, setEndDate, setRecruiterId, resetFilters } = useAnalyticsFilters();
    const hasFilters = !!(filters.startDate || filters.endDate || filters.recruiterId);
    const { user } = useAuth();
    const isAdmin = isAdminRole(user?.role);
    const [recruiters, setRecruiters] = useState<Array<{ id: string; full_name: string }>>([]);

    useEffect(() => {
        if (!isAdmin) return;
        let cancelled = false;
        analyticsApi.listRecruiters()
            .then(list => { if (!cancelled) setRecruiters(list); })
            .catch(err => console.error('Failed to load recruiters:', err));
        return () => { cancelled = true; };
    }, [isAdmin]);

    return (
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-surface-hover border border-border">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Filters</span>
            <div className="flex items-center gap-1.5">
                <label className="input-label text-xs">From</label>
                <input
                    type="date"
                    value={filters.startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="input-field h-7 text-xs px-2 py-1 w-36"
                />
            </div>
            <div className="flex items-center gap-1.5">
                <label className="input-label text-xs">To</label>
                <input
                    type="date"
                    value={filters.endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="input-field h-7 text-xs px-2 py-1 w-36"
                />
            </div>
            {isAdmin && (
                <div className="flex items-center gap-1.5">
                    <label className="input-label text-xs" htmlFor="recruiter-select">Recruiter</label>
                    <select
                        id="recruiter-select"
                        aria-label="Recruiter"
                        value={filters.recruiterId}
                        onChange={e => setRecruiterId(e.target.value)}
                        className="input-field h-7 text-xs px-2 py-1 w-44"
                    >
                        <option value="">All Recruiters</option>
                        {recruiters.map(r => (
                            <option key={r.id} value={r.id}>{r.full_name}</option>
                        ))}
                    </select>
                </div>
            )}
            <div className="flex items-center gap-2 ml-auto">
                {hasFilters && (
                    <button onClick={resetFilters} className="text-xs text-text-muted hover:text-text flex items-center gap-1 transition-colors">
                        <RotateCcw size={12} /> Reset
                    </button>
                )}
                <button
                    onClick={onRefresh}
                    className="btn text-xs h-7 px-3 py-0"
                >
                    Apply
                </button>
            </div>
        </div>
    );
}

// ─── Skill Distribution ───────────────────────────────────────────────────────

function SkillDistribution({ params }: { params: Record<string, string> }) {
    const [data, setData] = useState<ResourcesOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(false);
        analyticsApi.getResourcesSkills(params)
            .then(d => { if (!cancelled) setData(d); })
            .catch(() => { if (!cancelled) setError(true); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [params]);

    const chartData = data?.skills?.slice(0, 12) ?? [];

    return (
        <div className="card">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-info" />
                    Skill Distribution
                </h3>
                {data && (
                    <span className="text-xs text-text-muted font-medium">
                        {data.total_resources} candidates
                    </span>
                )}
            </div>
            {loading ? <SectionSpinner /> : error || !chartData.length ? (
                <SectionError />
            ) : (
                <div className="flex items-start gap-4">
                    <div className="w-[160px] h-[160px] shrink-0">
                        <PieChart width={160} height={160}>
                            <Pie data={chartData} dataKey="value" nameKey="label"
                                innerRadius={40} outerRadius={72} paddingAngle={1.5}
                                animationDuration={600} stroke="none">
                                {chartData.map((_, i) => (
                                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                                formatter={(v: number, _n: string, p: { payload?: { label?: string } }) => [v, p?.payload?.label ?? '']}
                            />
                        </PieChart>
                    </div>
                    <div className="flex-1 max-h-[170px] overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                        {chartData.map((entry, i) => (
                            <div key={entry.label} className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                <span className="text-xs text-text flex-1 truncate">{entry.label}</span>
                                <span className="text-xs font-bold text-text tabular-nums">{entry.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Employment Type ──────────────────────────────────────────────────────────

function EmploymentType({ params }: { params: Record<string, string> }) {
    const [data, setData] = useState<LabelValue[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(false);
        analyticsApi.getEmploymentType(params)
            .then(d => { if (!cancelled) setData(d); })
            .catch(() => { if (!cancelled) setError(true); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [params]);

    const total = data?.reduce((s, d) => s + d.value, 0) ?? 0;

    return (
        <div className="card">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success" />
                Employment Type
            </h3>
            {loading ? <SectionSpinner /> : error || !data?.length ? (
                <SectionError />
            ) : (
                <div className="flex items-center gap-6 justify-center h-40">
                    <div className="w-[140px] h-[140px] shrink-0">
                        <PieChart width={140} height={140}>
                            <Pie data={data} dataKey="value" nameKey="label"
                                innerRadius={35} outerRadius={62} paddingAngle={3}
                                animationDuration={600} stroke="none">
                                {data.map((_, i) => (
                                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                                formatter={(v: number, _n: string, p: { payload?: { label?: string } }) => [v, p?.payload?.label ?? '']}
                            />
                        </PieChart>
                    </div>
                    <div className="space-y-3">
                        {data.map((entry, i) => (
                            <div key={entry.label} className="flex items-center gap-2.5">
                                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                <div>
                                    <div className="text-xs font-semibold text-text">{entry.label}</div>
                                    <div className="text-xs text-text-muted">
                                        {entry.value} · {total > 0 ? Math.round((entry.value / total) * 100) : 0}%
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Payroll Segregation ──────────────────────────────────────────────────────

function PayrollSegregation({ params }: { params: Record<string, string> }) {
    const [data, setData] = useState<LabelValue[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(false);
        analyticsApi.getPayrollSegregation(params)
            .then(d => { if (!cancelled) setData(d); })
            .catch(() => { if (!cancelled) setError(true); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [params]);

    const total = data?.reduce((s, d) => s + d.value, 0) ?? 0;

    return (
        <div className="card">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success" />
                Payroll Segregation
                <span className="text-xs text-text-muted font-normal ml-1">(by payroll source)</span>
            </h3>
            {loading ? <SectionSpinner /> : error || !data?.length ? (
                <SectionError />
            ) : (
                <div className="flex items-center gap-6 justify-center h-40">
                    <div className="w-[140px] h-[140px] shrink-0">
                        <PieChart width={140} height={140}>
                            <Pie data={data} dataKey="value" nameKey="label"
                                innerRadius={35} outerRadius={62} paddingAngle={3}
                                animationDuration={600} stroke="none">
                                {data.map((_, i) => (
                                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                                formatter={(v: number, _n: string, p: { payload?: { label?: string } }) => [v, p?.payload?.label ?? '']}
                            />
                        </PieChart>
                    </div>
                    <div className="space-y-3">
                        {data.map((entry, i) => (
                            <div key={entry.label} className="flex items-center gap-2.5">
                                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                <div>
                                    <div className="text-xs font-semibold text-text">{entry.label}</div>
                                    <div className="text-xs text-text-muted">
                                        {entry.value} · {total > 0 ? Math.round((entry.value / total) * 100) : 0}%
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Hiring Type Split ────────────────────────────────────────────────────────

function HiringTypeSplit({ params }: { params: Record<string, string> }) {
    const [data, setData] = useState<LabelValue[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(false);
        analyticsApi.getHiringTypeSplit(params)
            .then(d => { if (!cancelled) setData(d); })
            .catch(() => { if (!cancelled) setError(true); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [params]);

    const total = data?.reduce((s, d) => s + d.value, 0) ?? 0;
    const NEW_COLOR = '#3B82F6';
    const BACKFILL_COLOR = '#F59E0B';
    const colors = [NEW_COLOR, BACKFILL_COLOR];

    return (
        <div className="card">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cta" />
                Hiring Type
                <span className="text-xs text-text-muted font-normal ml-1">(New vs Backfill)</span>
            </h3>
            {loading ? <SectionSpinner /> : error || !data?.length ? (
                <SectionError />
            ) : (
                <div className="flex items-center gap-6 justify-center h-40">
                    <div className="w-[140px] h-[140px] shrink-0">
                        <PieChart width={140} height={140}>
                            <Pie data={data} dataKey="value" nameKey="label"
                                innerRadius={35} outerRadius={62} paddingAngle={3}
                                animationDuration={600} stroke="none">
                                {data.map((_, i) => (
                                    <Cell key={i} fill={colors[i % colors.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                                formatter={(v: number, _n: string, p: { payload?: { label?: string } }) => [v, p?.payload?.label ?? '']}
                            />
                        </PieChart>
                    </div>
                    <div className="space-y-3">
                        {data.map((entry, i) => (
                            <div key={entry.label} className="flex items-center gap-2.5">
                                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                                <div>
                                    <div className="text-xs font-semibold text-text">{entry.label}</div>
                                    <div className="text-xs text-text-muted">
                                        {entry.value} · {total > 0 ? Math.round((entry.value / total) * 100) : 0}%
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Hiring Source ────────────────────────────────────────────────────────────

function HiringSource({ params }: { params: Record<string, string> }) {
    const [data, setData] = useState<LabelValue[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(false);
        analyticsApi.getHiringType(params)
            .then(d => { if (!cancelled) setData(d); })
            .catch(() => { if (!cancelled) setError(true); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [params]);

    return (
        <div className="card">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-warning" />
                Source Channel
            </h3>
            {loading ? <SectionSpinner /> : error || !data?.length ? (
                <SectionError />
            ) : (
                <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%" debounce={50}>
                        <BarChart layout="vertical" data={data} margin={{ top: 4, right: 24, left: 8, bottom: 4 }} barSize={18}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                            <XAxis type="number" fontSize={10} tick={{ fill: '#64748B' }} />
                            <YAxis dataKey="label" type="category" width={100} fontSize={11} tick={{ fill: '#334155' }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }} formatter={(v: number) => [v, 'Candidates']} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} animationDuration={600}>
                                {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}

// ─── Client Demand ────────────────────────────────────────────────────────────

function ClientDemand({ params }: { params: Record<string, string> }) {
    const [data, setData] = useState<LabelValue[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(false);
        analyticsApi.getClientDemand(params)
            .then(d => { if (!cancelled) setData(d); })
            .catch(() => { if (!cancelled) setError(true); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [params]);

    const top8 = data?.slice(0, 8) ?? [];

    return (
        <div className="card">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                Client Demand (Requests)
            </h3>
            {loading ? <SectionSpinner /> : error || !top8.length ? (
                <SectionError />
            ) : (
                <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%" debounce={50}>
                        <BarChart layout="vertical" data={top8} margin={{ top: 4, right: 24, left: 8, bottom: 4 }} barSize={18}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                            <XAxis type="number" fontSize={10} tick={{ fill: '#64748B' }} />
                            <YAxis dataKey="label" type="category" width={100} fontSize={11} tick={{ fill: '#334155' }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }} formatter={(v: number) => [v, 'Requests']} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} animationDuration={600}>
                                {top8.map((_, i) => <Cell key={i} fill={CHART_COLORS[(i + 4) % CHART_COLORS.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}

// ─── Requirement Tracker ──────────────────────────────────────────────────────

const TRACKER_COLORS: Record<string, string> = {
    NEW: '#6366F1',
    SCREENING: '#3B82F6',
    L1: '#06B6D4',
    L2: '#10B981',
    WITH_CLIENT: '#F59E0B',
    CLOSING: '#EF4444',
};

function RequirementTrackerSection({ params }: { params: Record<string, string> }) {
    const [data, setData] = useState<Array<{ stage: string; label: string; open_count: number }>>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(false);
        analyticsApi.getRequirementTracker(params)
            .then(r => { if (!cancelled) setData(r.stages); })
            .catch(() => { if (!cancelled) setError(true); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [params]);

    return (
        <div className="card">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-info" />
                Requirement Tracker
                <span className="text-xs text-text-muted font-normal ml-1">(open requests by stage)</span>
            </h3>
            {loading ? <SectionSpinner /> : error ? <SectionError /> : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {data.map(s => (
                        <div
                            key={s.stage}
                            className="flex flex-col gap-1 p-3 rounded-xl border border-border bg-surface-hover"
                        >
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: TRACKER_COLORS[s.stage] ?? '#94A3B8' }}
                            />
                            <div className="text-2xl font-bold text-text tabular-nums">{s.open_count}</div>
                            <div className="text-xs text-text-muted leading-tight">{s.label}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Pipeline Funnel ──────────────────────────────────────────────────────────

function AnalyticsFunnel({ params }: { params: Record<string, string> }) {
    const [data, setData] = useState<PipelineFunnel | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(false);
        analyticsApi.getPipelineFunnel(params)
            .then(d => { if (!cancelled) setData(d); })
            .catch(() => { if (!cancelled) setError(true); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [params]);

    const stages = data?.stages ?? [];
    const maxCount = stages.reduce((m, s) => Math.max(m, s.count), 1);

    return (
        <div className="card">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cta" />
                Pipeline Funnel
                <span className="text-xs text-text-muted font-normal ml-1">(with drop-off)</span>
            </h3>
            {loading ? <SectionSpinner /> : error || !stages.length ? (
                <SectionError />
            ) : (
                <div className="space-y-2.5">
                    {stages.map((stage, i) => {
                        const palette = FUNNEL_PALETTE[i % FUNNEL_PALETTE.length];
                        const widthPct = maxCount > 0 ? Math.round((stage.count / maxCount) * 100) : 0;
                        return (
                            <div key={stage.stage} className="flex items-center gap-3">
                                <div className="text-xs font-medium text-text w-36 shrink-0 truncate">{stage.stage}</div>
                                <div className="flex-1 h-6 bg-surface-hover rounded-full overflow-hidden relative">
                                    <div
                                        className="h-full rounded-full transition-all duration-700"
                                        style={{ width: `${widthPct}%`, backgroundColor: palette.bar, opacity: 0.85 }}
                                    />
                                </div>
                                <div className="w-14 text-right shrink-0">
                                    <span className="text-sm font-bold text-text tabular-nums">{stage.count}</span>
                                </div>
                                <div className="w-16 text-right shrink-0">
                                    {stage.drop_off_pct !== null && stage.drop_off_pct > 0 ? (
                                        <span className="text-xs text-danger font-semibold tabular-nums">
                                            -{stage.drop_off_pct.toFixed(0)}%
                                        </span>
                                    ) : (
                                        <span className="text-xs text-text-muted">—</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    <div className="flex items-center gap-3 pt-1 border-t border-border/40">
                        <div className="text-xs text-text-muted w-36 shrink-0">Stage</div>
                        <div className="flex-1" />
                        <div className="w-14 text-right text-xs text-text-muted shrink-0">Count</div>
                        <div className="w-16 text-right text-xs text-text-muted shrink-0">Drop-off</div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Daily Status Matrix ───────────────────────────────────────────────────────

function DailyStatusMatrixSection({ params }: { params: Record<string, string> }) {
    const [data, setData] = useState<DailyStatusMatrix | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(false);
        analyticsApi.getDailyStatusMatrix(params)
            .then(d => { if (!cancelled) setData(d); })
            .catch(() => { if (!cancelled) setError(true); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [params]);

    const stages = data?.stage_names ?? ['Open', 'Screening', 'L1', 'L2', 'Selected'];

    return (
        <div className="card">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cta" />
                Daily Status Matrix
                <span className="text-xs text-text-muted font-normal ml-1">(job profiles × pipeline)</span>
            </h3>
            {loading ? <SectionSpinner /> : error ? <SectionError /> : !data?.rows.length ? (
                <div className="flex items-center justify-center h-24 text-text-muted text-xs">
                    No data for selected filters
                </div>
            ) : (
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-xs min-w-[500px]">
                        <thead className="sticky top-0 bg-surface z-10">
                            <tr className="border-b border-border text-text-muted">
                                <th className="text-left py-2 pr-4 font-semibold whitespace-nowrap">Job Profile</th>
                                <th className="text-right py-2 pr-4 font-semibold">Total Req</th>
                                {stages.map(s => (
                                    <th key={s} className="text-right py-2 pr-4 font-semibold whitespace-nowrap">{s}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.rows.map(row => (
                                <tr key={row.job_profile_id} className="border-b border-border/40 hover:bg-surface-hover transition-colors">
                                    <td className="py-1.5 pr-4 font-medium text-text truncate max-w-[200px]">
                                        {row.job_profile_name}
                                    </td>
                                    <td className="py-1.5 pr-4 text-right font-bold text-text tabular-nums">
                                        {row.total_requirements}
                                    </td>
                                    {stages.map(s => (
                                        <td key={s} className="py-1.5 pr-4 text-right tabular-nums text-text-muted">
                                            {row.by_stage[s] ?? 0}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── Pivot Export ─────────────────────────────────────────────────────────────

function PivotExport({ params }: { params: Record<string, string> }) {
    const [rows, setRows] = useState<PivotRow[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(false);
        analyticsApi.getPivotData(params)
            .then(d => { if (!cancelled) setRows(d); })
            .catch(() => { if (!cancelled) setError(true); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [params]);

    const handleExport = useCallback(() => {
        if (!rows?.length) return;
        setExporting(true);
        try {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(rows.map(r => ({
                'Candidate ID': r.candidate_id,
                'Name': r.name,
                'Status': r.status,
                'Source': r.source ?? '',
                'Skills': r.skills ?? '',
                'Vendor': r.vendor ?? '',
                'Client': r.client_name ?? '',
                'Priority': r.request_priority ?? '',
                'Created At': r.created_at ?? '',
            })));
            XLSX.utils.book_append_sheet(wb, ws, 'Analytics');
            XLSX.writeFile(wb, `rms_analytics_${new Date().toISOString().slice(0, 10)}.xlsx`);
        } finally {
            setExporting(false);
        }
    }, [rows]);

    const preview = rows?.slice(0, 8) ?? [];
    const COLS: { key: keyof PivotRow; label: string }[] = [
        { key: 'name', label: 'Name' },
        { key: 'status', label: 'Status' },
        { key: 'source', label: 'Source' },
        { key: 'skills', label: 'Skills' },
        { key: 'vendor', label: 'Vendor' },
        { key: 'client_name', label: 'Client' },
        { key: 'request_priority', label: 'Priority' },
    ];

    return (
        <div className="card">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-400" />
                    Data Export
                    {rows && (
                        <span className="text-xs text-text-muted font-normal ml-1">
                            ({rows.length} records)
                        </span>
                    )}
                </h3>
                <button
                    onClick={handleExport}
                    disabled={exporting || !rows?.length}
                    className={cn(
                        'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all',
                        rows?.length
                            ? 'bg-success/10 text-success hover:bg-success/20 border border-success/20'
                            : 'opacity-40 cursor-not-allowed bg-surface-hover text-text-muted border border-border'
                    )}
                >
                    <Download size={13} />
                    {exporting ? 'Exporting…' : 'Export XLSX'}
                </button>
            </div>
            {loading ? <SectionSpinner /> : error ? (
                <SectionError />
            ) : !preview.length ? (
                <div className="flex flex-col items-center justify-center h-24 text-text-muted text-xs gap-1">
                    <AlertCircle size={16} className="opacity-40" />
                    No data available for the selected filters
                </div>
            ) : (
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-xs min-w-[640px]">
                        <thead>
                            <tr className="border-b border-border text-text-muted">
                                {COLS.map(c => (
                                    <th key={c.key} className="text-left py-2 pr-4 font-semibold whitespace-nowrap">{c.label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {preview.map(row => (
                                <tr key={row.candidate_id} className="border-b border-border/40 hover:bg-surface-hover transition-colors">
                                    {COLS.map(c => (
                                        <td key={c.key} className="py-1.5 pr-4 text-text truncate max-w-[160px]">
                                            {(row[c.key] as string | null | undefined) ?? '—'}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {rows && rows.length > 8 && (
                        <p className="text-xs text-text-muted mt-2">
                            Showing 8 of {rows.length}. Export to view all.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Root export ─────────────────────────────────────────────────────────────

export function DashboardAnalytics() {
    const { queryParams } = useAnalyticsFilters();
    const [appliedParams, setAppliedParams] = useState<Record<string, string>>(queryParams);

    const handleApply = useCallback(() => {
        setAppliedParams({ ...queryParams });
    }, [queryParams]);

    return (
        <div className="space-y-4 pt-2">
            {/* Section divider */}
            <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted px-1">Analytics Intelligence</h2>
                <div className="h-px flex-1 bg-border" />
            </div>

            <div className="sticky top-0 z-10 py-2" style={{ backgroundColor: 'var(--background, var(--surface))', backdropFilter: 'blur(8px)' }}>
                <FilterBar onRefresh={handleApply} />
            </div>

            {/* Row 1: Skill Distribution + Employment Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SkillDistribution params={appliedParams} />
                <EmploymentType params={appliedParams} />
            </div>

            {/* Row: Hiring Type + Payroll Segregation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <HiringTypeSplit params={appliedParams} />
                <PayrollSegregation params={appliedParams} />
            </div>

            {/* Row 2: Hiring Source + Client Demand */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <HiringSource params={appliedParams} />
                <ClientDemand params={appliedParams} />
            </div>

            {/* Row N: Requirement Tracker */}
            <RequirementTrackerSection params={appliedParams} />

            {/* Row 3: Pipeline Funnel */}
            <AnalyticsFunnel params={appliedParams} />

            {/* Row: Daily Status Matrix */}
            <DailyStatusMatrixSection params={appliedParams} />

            {/* Row 4: Data Export */}
            <PivotExport params={appliedParams} />
        </div>
    );
}
