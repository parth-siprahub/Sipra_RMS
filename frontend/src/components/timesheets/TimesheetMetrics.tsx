import { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie,
    Legend
} from 'recharts';
import { Clock, Coffee, Monitor, Users, TrendingUp, Activity } from 'lucide-react';
import type { JiraRawEntry, AwsTimesheetV2Entry } from '../../api/timesheets';
import { cn } from '../../lib/utils';

interface TimesheetMetricsProps {
    jiraEntries: JiraRawEntry[];
    awsEntries: AwsTimesheetV2Entry[];
    loading?: boolean;
    className?: string;
}

const COLORS = {
    primary: '#CC1A24', // SipraHub Red
    productive: '#10B981', // green-500
    unproductive: '#F59E0B', // amber-500
    undefined: '#64748B', // slate-500
    ooo: '#F43F5E', // rose-500
    chart: ['#CC1A24', '#EF4444', '#F87171', '#FCA5A5', '#FECACA']
};

export function TimesheetMetrics({ jiraEntries, awsEntries, loading, className }: TimesheetMetricsProps) {
    
    // 1. KPI Calculations
    const stats = useMemo(() => {
        const totalJiraHours = jiraEntries
            .filter(e => e.is_summary_row)
            .reduce((sum, e) => sum + (e.logged || 0), 0);
            
        const oooHours = jiraEntries
            .filter(e => e.is_ooo)
            .reduce((sum, e) => sum + (e.logged || 0), 0);
            
        const totalAwsSecs = awsEntries.reduce((sum, e) => sum + (e.work_time_secs || 0), 0);
        const totalAwsHours = Math.round(totalAwsSecs / 3600);
        
        const jiraUsers = new Set(jiraEntries.map(e => e.jira_user)).size;
        const awsUsers = new Set(awsEntries.map(e => e.aws_email)).size;
        const uniqueEmployees = Math.max(jiraUsers, awsUsers);

        return {
            totalJiraHours: Math.round(totalJiraHours),
            oooHours: Math.round(oooHours),
            totalAwsHours,
            employeeCount: uniqueEmployees
        };
    }, [jiraEntries, awsEntries]);

    // 2. Chart Data: Top 5 Jira Contributors
    const topContributorsData = useMemo(() => {
        const userMap = new Map<string, number>();
        jiraEntries.forEach(e => {
            if (e.is_summary_row) {
                userMap.set(e.jira_user, (userMap.get(e.jira_user) || 0) + (e.logged || 0));
            }
        });

        return Array.from(userMap.entries())
            .map(([name, hours]) => ({ name, hours: Math.round(hours) }))
            .sort((a, b) => b.hours - a.hours)
            .slice(0, 5);
    }, [jiraEntries]);

    // 3. Chart Data: AWS Activity Mix
    const activityMixData = useMemo(() => {
        let productive = 0, unproductive = 0, undef = 0;
        
        awsEntries.forEach(e => {
            productive += (e.productive_secs || 0);
            unproductive += (e.unproductive_secs || 0);
            undef += (e.undefined_secs || 0);
        });

        const total = productive + unproductive + undef;
        if (total === 0) return [];

        return [
            { name: 'Productive', value: Math.round(productive / 3600), color: COLORS.productive },
            { name: 'Unproductive', value: Math.round(unproductive / 3600), color: COLORS.unproductive },
            { name: 'Undefined', value: Math.round(undef / 3600), color: COLORS.undefined },
        ].filter(d => d.value > 0);
    }, [awsEntries]);

    if (loading) {
        return (
            <div className={cn("space-y-6 animate-pulse", className)}>
                {/* KPI Skeletons */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-surface-hover/50 h-32 rounded-2xl border border-border/50" />
                    ))}
                </div>
                {/* Chart Skeletons */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-surface-hover/50 h-[400px] rounded-2xl border border-border/50" />
                    <div className="bg-surface-hover/50 h-[400px] rounded-2xl border border-border/50" />
                </div>
            </div>
        );
    }

    return (
        <div className={cn("space-y-6", className)}>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard 
                    title="Total Jira Hours" 
                    value={stats.totalJiraHours} 
                    unit="h"
                    icon={<Clock className="text-cta" size={24} />}
                    description="Total time logged in Jira tasks"
                />
                <MetricCard 
                    title="OOO Time" 
                    value={stats.oooHours} 
                    unit="h"
                    icon={<Coffee className="text-rose-500" size={24} />}
                    description="Out of office/Leaves recorded"
                    color="rose"
                />
                <MetricCard 
                    title="AWS Active Track" 
                    value={stats.totalAwsHours} 
                    unit="h"
                    icon={<Activity className="text-emerald-500" size={24} />}
                    description="System activity monitored"
                    color="emerald"
                />
                <MetricCard 
                    title="Team Size" 
                    value={stats.employeeCount} 
                    unit="Users"
                    icon={<Users className="text-blue-500" size={24} />}
                    description="Active contributors this month"
                    color="blue"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Contributors Bar Chart */}
                <div className="card p-6 min-h-[400px] flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-text">Top Contributors</h3>
                            <p className="text-sm text-text-muted">High performance by Jira hours</p>
                        </div>
                        <div className="p-2 bg-cta/10 rounded-lg">
                            <TrendingUp className="text-cta" size={20} />
                        </div>
                    </div>
                    <div className="flex-1 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topContributorsData} layout="vertical" margin={{ left: 60, right: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    width={120}
                                    style={{ fontSize: '12px', fontWeight: 500 }}
                                />
                                <Tooltip 
                                    cursor={{ fill: 'rgba(204, 26, 36, 0.05)' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="hours" radius={[0, 4, 4, 0]} barSize={24}>
                                    {topContributorsData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS.chart[index % COLORS.chart.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* AWS Productivity Mix Donut Chart */}
                <div className="card p-6 min-h-[400px] flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-text">Productivity Mix</h3>
                            <p className="text-sm text-text-muted">AWS ActiveTrack distribution</p>
                        </div>
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <Monitor className="text-emerald-500" size={20} />
                        </div>
                    </div>
                    <div className="flex-1 w-full relative">
                        <ResponsiveContainer width="100%" height="80%">
                            <PieChart>
                                <Pie
                                    data={activityMixData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {activityMixData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Value */}
                        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                            <p className="text-2xl font-bold text-text tabular-nums">{stats.totalAwsHours}h</p>
                            <p className="text-xs text-text-muted uppercase tracking-wider">Tracked</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ 
    title, value, unit, icon, description, color = 'cta' 
}: { 
    title: string; 
    value: number | string; 
    unit: string; 
    icon: React.ReactNode; 
    description: string;
    trend?: string;
    color?: string;
}) {
    const colorClasses = {
        cta: "border-cta",
        rose: "border-rose-500",
        emerald: "border-emerald-500",
        blue: "border-blue-500",
    }[color] || "border-cta";

    return (
        <div className={cn(
            "card relative overflow-hidden group hover:scale-[1.02] transition-all duration-300",
            `border-t-4 ${colorClasses}`
        )}>
            <div className="p-5 relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider">{title}</span>
                    <div className={cn(
                        "p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110",
                        color === 'cta' ? "bg-cta/10 text-cta" :
                        color === 'rose' ? "bg-rose-500/10 text-rose-500" :
                        color === 'emerald' ? "bg-emerald-500/10 text-emerald-500" :
                        "bg-blue-500/10 text-blue-500"
                    )}>
                        {icon}
                    </div>
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                    <h2 className="text-3xl font-black text-text tabular-nums">{value}</h2>
                    <span className="text-sm font-medium text-text-muted">{unit}</span>
                </div>
                <p className="text-xs text-text-muted">{description}</p>
            </div>
            
            {/* Subtle background decoration */}
            <div className={cn(
                "absolute -right-6 -bottom-6 opacity-[0.05] group-hover:opacity-[0.1] transition-all duration-500 group-hover:rotate-12",
                color === 'cta' ? "text-cta" :
                color === 'rose' ? "text-rose-500" :
                color === 'emerald' ? "text-emerald-500" :
                "text-blue-500"
            )}>
                {/* Larger cloned icon for background depth */}
                {typeof icon === 'object' && icon !== null && 'type' in icon ? (
                    //@ts-ignore - cloning icon with larger size
                    <icon.type {...icon.props} size={120} />
                ) : icon}
            </div>
            
            {/* Gradient Overlay */}
            <div className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none",
                color === 'cta' ? "bg-gradient-to-br from-cta/5 to-transparent" :
                color === 'rose' ? "bg-gradient-to-br from-rose-500/5 to-transparent" :
                color === 'emerald' ? "bg-gradient-to-br from-emerald-500/5 to-transparent" :
                "bg-gradient-to-br from-blue-500/5 to-transparent"
            )} />
        </div>
    );
}
