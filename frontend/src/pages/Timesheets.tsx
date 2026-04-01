import { useState, useEffect, useMemo } from 'react';
import {
    timesheetsApi,
    type JiraRawEntry,
    type JiraRawImportResult,
    type AwsTimesheetV2Entry,
    type AwsImportV2Result,
    type UnmatchedDetail,
} from '../api/timesheets';
import { employeesApi, type Employee } from '../api/employees';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth, isAdminRole } from '../context/AuthContext';
import { JiraTimesheetDrillDown } from '../components/timesheets/JiraTimesheetDrillDown';
import { AwsTimesheetDrillDown } from '../components/timesheets/AwsTimesheetDrillDown';
import { UnmatchedRecordsModal } from '../components/timesheets/UnmatchedRecordsModal';

import {
    Upload,
    Download,
    Clock,
    AlertTriangle,
    CheckCircle,
    Calculator,
    Monitor,
    FileSpreadsheet,
    Search,
    Coffee,
    FileText,
    ExternalLink,
    ArrowUpDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import { exportTimesheets } from '../api/exports';
import { billingApi } from '../api/billing';

type Tab = 'jira' | 'aws';

function exportAwsCsv(entries: AwsTimesheetV2Entry[], month: string) {
    if (!entries.length) return;
    const headers = ['Employee Email', 'Work Time', 'Productive', 'Unproductive', 'Undefined', 'Active', 'Passive', 'Screen Time', 'Offline Meetings'];
    const csvRows = [headers.join(',')];
    for (const e of entries) {
        csvRows.push([
            e.aws_email || '',
            e.work_time_hms || '0:00:00',
            e.productive_hms || '0:00:00',
            e.unproductive_hms || '0:00:00',
            e.undefined_hms || '0:00:00',
            e.active_hms || '0:00:00',
            e.passive_hms || '0:00:00',
            e.screen_time_hms || '0:00:00',
            e.offline_meetings_hms || '0:00:00',
        ].join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aws_activetrack_${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

/** Generate month options from Jan 2025 to 3 months ahead of today */
function getMonthOptions(): { value: string; label: string }[] {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    const endYear = now.getFullYear();
    const endMonth = now.getMonth() + 4; // 3 months ahead
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let y = 2025; y <= endYear + 1; y++) {
        for (let m = 1; m <= 12; m++) {
            if (y === 2025 && m < 1) continue;
            if (y === endYear && m > endMonth) break;
            if (y > endYear) break;
            const value = `${y}-${String(m).padStart(2, '0')}`;
            options.push({ value, label: `${months[m - 1]} ${y}` });
        }
    }
    return options.reverse(); // newest first
}

const MONTH_OPTIONS = getMonthOptions();

export function Timesheets() {
    const { user } = useAuth();
    const isAdmin = isAdminRole(user?.role);
    const [activeTab, setActiveTab] = useState<Tab>('jira');

    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    // Jira raw state
    const [jiraEntries, setJiraEntries] = useState<JiraRawEntry[]>([]);
    const [jiraLoading, setJiraLoading] = useState(true);
    const [isJiraImportOpen, setIsJiraImportOpen] = useState(false);
    const [jiraImportResult, setJiraImportResult] = useState<JiraRawImportResult | null>(null);

    // AWS v2 state
    const [awsEntries, setAwsEntries] = useState<AwsTimesheetV2Entry[]>([]);
    const [awsLoading, setAwsLoading] = useState(false);
    const [isAwsImportOpen, setIsAwsImportOpen] = useState(false);
    const [awsImportResult, setAwsImportResult] = useState<AwsImportV2Result | null>(null);

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [calculating, setCalculating] = useState(false);

    // Unmatched records modal state
    const [isUnmatchedModalOpen, setIsUnmatchedModalOpen] = useState(false);
    const [unmatchedModalSource, setUnmatchedModalSource] = useState<'JIRA' | 'AWS'>('JIRA');
    const [unmatchedDetails, setUnmatchedDetails] = useState<UnmatchedDetail[]>([]);

    const fetchAllData = async (month: string) => {
        setCombinedLoading(true);
        setJiraLoading(true);
        setAwsLoading(true);
        try {
            const [jiraRaw, awsRaw, empData] = await Promise.all([
                timesheetsApi.listJiraRaw(month),
                timesheetsApi.listAwsV2(month),
                employees.length ? Promise.resolve(employees) : employeesApi.list({ page_size: 200 }),
            ]);
            setJiraEntries(jiraRaw || []);
            setAwsEntries(awsRaw || []);
            if (!employees.length) setEmployees(empData || []);
        } catch {
            toast.error('Failed to load dashboard data');
        } finally {
            setCombinedLoading(false);
            setJiraLoading(false);
            setAwsLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData(selectedMonth);
    }, [selectedMonth]);

    const empMap = useMemo(
        () => Object.fromEntries(employees.map(e => [e.id, e])),
        [employees],
    );

    const jiraEmpMap = useMemo(
        () => Object.fromEntries(employees.filter(e => e.jira_username).map(e => [e.jira_username!, e])),
        [employees],
    );

    const awsEmpMap = useMemo(
        () => Object.fromEntries(
            employees.flatMap(e => {
                const results = [];
                if (e.aws_email) results.push([e.aws_email.toLowerCase(), e]);
                if (e.siprahub_email) results.push([e.siprahub_email.toLowerCase(), e]);
                return results;
            })
        ),
        [employees],
    );

    const handleCalculate = async () => {
        setCalculating(true);
        try {
            const results = await billingApi.calculate(selectedMonth);
            toast.success(`Billing calculated for ${results.length} employees`);
        } catch {
            // handled
        } finally {
            setCalculating(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <p className="text-text-muted">Import Jira/Tempo reports, AWS ActiveTrack data, and manage billing</p>
                </div>
                <div className="flex gap-3">
                    {isAdmin && activeTab === 'jira' && (
                        <>
                            <button onClick={() => exportTimesheets(selectedMonth)} className="btn btn-secondary flex items-center gap-2">
                                <Upload size={18} />
                                Export CSV
                            </button>
                            <button onClick={handleCalculate} className="btn btn-secondary flex items-center gap-2" disabled={calculating}>
                                <Calculator size={18} />
                                {calculating ? 'Calculating...' : 'Calculate Billing'}
                            </button>
                            <button onClick={() => setIsJiraImportOpen(true)} className="btn btn-primary flex items-center gap-2">
                                <Download size={18} />
                                Import XLS
                            </button>
                        </>
                    )}
                    {isAdmin && activeTab === 'aws' && (
                        <>
                            <button onClick={() => exportAwsCsv(awsEntries, selectedMonth)} className="btn btn-secondary flex items-center gap-2">
                                <Upload size={18} />
                                Export CSV
                            </button>
                            <button onClick={() => setIsAwsImportOpen(true)} className="btn btn-primary flex items-center gap-2">
                                <Download size={18} />
                                Import AWS CSV
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border">
                <button
                    onClick={() => setActiveTab('jira')}
                    className={cn(
                        "px-4 py-2.5 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors",
                        activeTab === 'jira'
                            ? "border-cta text-cta"
                            : "border-transparent text-text-muted hover:text-text"
                    )}
                >
                    <FileSpreadsheet size={16} />
                    Jira Timesheets
                </button>
                <button
                    onClick={() => setActiveTab('aws')}
                    className={cn(
                        "px-4 py-2.5 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors",
                        activeTab === 'aws'
                            ? "border-cta text-cta"
                            : "border-transparent text-text-muted hover:text-text"
                    )}
                >
                    <Monitor size={16} />
                    AWS ActiveTrack
                </button>
            </div>

            {activeTab === 'jira' ? (
                <JiraRawTab
                    entries={jiraEntries}
                    jiraEmpMap={jiraEmpMap}
                    loading={jiraLoading}
                    selectedMonth={selectedMonth}
                    setSelectedMonth={setSelectedMonth}
                    importResult={jiraImportResult}
                    isAdmin={isAdmin}
                    onImport={() => setIsJiraImportOpen(true)}
                    setUnmatchedModalOpen={setIsUnmatchedModalOpen}
                    setUnmatchedModalSource={setUnmatchedModalSource}
                    setUnmatchedDetails={setUnmatchedDetails}
                />
            ) : (
                <AwsV2Tab
                    entries={awsEntries}
                    empMap={empMap}
                    awsEmpMap={awsEmpMap}
                    loading={awsLoading}
                    selectedMonth={selectedMonth}
                    setSelectedMonth={setSelectedMonth}
                    importResult={awsImportResult}
                    isAdmin={isAdmin}
                    onImport={() => setIsAwsImportOpen(true)}
                    setUnmatchedModalOpen={setIsUnmatchedModalOpen}
                    setUnmatchedModalSource={setUnmatchedModalSource}
                    setUnmatchedDetails={setUnmatchedDetails}
                />
            )}

            {/* Unmatched Records Resolution Modal */}
            <UnmatchedRecordsModal
                isOpen={isUnmatchedModalOpen}
                onClose={() => setIsUnmatchedModalOpen(false)}
                billingMonth={selectedMonth}
                sourceType={unmatchedModalSource}
                initialUnmatched={unmatchedDetails}
                onLinked={() => {
                    fetchAllData(selectedMonth);
                }}
            />

            {isJiraImportOpen && (
                <JiraRawImportModal
                    isOpen={isJiraImportOpen}
                    onClose={() => setIsJiraImportOpen(false)}
                    onSuccess={(result) => {
                        setJiraImportResult(result);
                        setSelectedMonth(result.month);
                        fetchAllData(result.month);
                    }}
                    defaultMonth={selectedMonth}
                />
            )}

            {isAwsImportOpen && (
                <AwsV2ImportModal
                    isOpen={isAwsImportOpen}
                    onClose={() => setIsAwsImportOpen(false)}
                    onSuccess={(result) => {
                        setAwsImportResult(result);
                        setSelectedMonth(result.month);
                        fetchAllData(result.month);
                    }}
                    defaultMonth={selectedMonth}
                />
            )}
        </div>
    );
}

// ──────────────────────────────────────────────
// Jira Raw Tab — Summary cards + drill-down modal
// ──────────────────────────────────────────────

type SortField = 'name' | 'hours' | 'issues';
type SortDir = 'asc' | 'desc';

interface UserSummary {
    user: string;
    rows: JiraRawEntry[];
    totalHours: number;
    oooHours: number;
    issueCount: number;
}

function JiraRawTab({
    entries, jiraEmpMap, loading, selectedMonth, setSelectedMonth, importResult, isAdmin, onImport,
    setUnmatchedModalOpen, setUnmatchedModalSource, setUnmatchedDetails
}: {
    entries: JiraRawEntry[];
    jiraEmpMap: Record<string, Employee>;
    loading: boolean;
    selectedMonth: string;
    setSelectedMonth: (m: string) => void;
    importResult: JiraRawImportResult | null;
    isAdmin: boolean;
    onImport: () => void;
    setUnmatchedModalOpen: (open: boolean) => void;
    setUnmatchedModalSource: (source: 'JIRA' | 'AWS') => void;
    setUnmatchedDetails: (details: UnmatchedDetail[]) => void;
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [drillDownIndex, setDrillDownIndex] = useState<number | null>(null);

    // Build user summaries from raw entries
    const userSummaries = useMemo(() => {
        const groupMap = new Map<string, JiraRawEntry[]>();
        for (const entry of entries) {
            const existing = groupMap.get(entry.jira_user);
            if (existing) {
                existing.push(entry);
            } else {
                groupMap.set(entry.jira_user, [entry]);
            }
        }

        const summaries: UserSummary[] = [];
        for (const [user, rows] of groupMap) {
            const summaryRow = rows.find(r => r.is_summary_row);
            const oooRow = rows.find(r => r.is_ooo);
            const issueRows = rows.filter(r => !r.is_summary_row && !r.is_ooo);

            summaries.push({
                user,
                rows,
                totalHours: summaryRow?.logged ?? 0,
                oooHours: oooRow?.logged ?? 0,
                issueCount: issueRows.length,
            });
        }
        return summaries;
    }, [entries]);

    // Filter and sort
    const filteredSummaries = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        const filtered = query
            ? userSummaries.filter(s => s.user.toLowerCase().includes(query))
            : userSummaries;

        return [...filtered].sort((a, b) => {
            const dir = sortDir === 'asc' ? 1 : -1;
            if (sortField === 'name') return a.user.localeCompare(b.user) * dir;
            if (sortField === 'hours') return (a.totalHours - b.totalHours) * dir;
            return (a.issueCount - b.issueCount) * dir;
        });
    }, [userSummaries, searchQuery, sortField, sortDir]);

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir(field === 'name' ? 'asc' : 'desc');
        }
    };

    return (
        <>
            {/* Controls bar */}
            <div className="card flex flex-col sm:flex-row items-start sm:items-center gap-3 py-3 px-4">
                <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-text-muted" htmlFor="jira-month-select">Month</label>
                    <select
                        id="jira-month-select"
                        className="input-field w-48"
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(e.target.value)}
                    >
                        {MONTH_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                {/* Search */}
                <div className="relative flex-1 max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search by name..."
                        className="input-field pl-9 w-full text-sm"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                <span className="text-sm text-text-muted sm:ml-auto">
                    {filteredSummaries.length} of {userSummaries.length} users · {entries.length} rows
                </span>
            </div>

            {/* Import result banner */}
            {importResult && (
                <div className="card bg-info/5 border-info/20">
                    <h3 className="font-bold text-text mb-2">Last Import Result</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div><span className="text-text-muted">Month:</span> <span className="font-medium">{importResult.month}</span></div>
                        <div><span className="text-text-muted">Rows:</span> <span className="font-medium">{importResult.total_rows_processed}</span></div>
                        <div><span className="text-text-muted">Matched:</span> <span className="font-medium text-success">{importResult.employees_matched}</span></div>
                        <div><span className="text-text-muted">Inserted:</span> <span className="font-medium">{importResult.entries_inserted}</span></div>
                    </div>
                    {importResult.employees_unmatched.length > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                            <AlertTriangle size={14} className="text-warning shrink-0" />
                            <span className="text-xs text-warning">
                                {importResult.employees_unmatched.length} unmatched
                            </span>
                            <button
                                onClick={() => {
                                    setUnmatchedModalSource('JIRA');
                                    setUnmatchedDetails(importResult.unmatched_details || []);
                                    setUnmatchedModalOpen(true);
                                }}
                                className="btn btn-ghost text-xs px-2 py-1 text-warning hover:text-text"
                            >
                                Resolve Unmatched →
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Summary list */}
            <div className="card overflow-hidden">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <div className="spinner w-8 h-8 border-cta" />
                        <p className="text-text-muted text-sm animate-pulse">Loading timesheets...</p>
                    </div>
                ) : filteredSummaries.length > 0 ? (
                    <>
                        {/* Column header */}
                        <div className="grid grid-cols-[1fr_90px_80px_80px_44px] sm:grid-cols-[1fr_100px_90px_90px_48px] items-center px-4 py-2.5 border-b border-border bg-surface-hover/30 text-xs font-bold text-text-muted uppercase">
                            <button
                                onClick={() => toggleSort('name')}
                                className="flex items-center gap-1 cursor-pointer hover:text-text transition-colors text-left"
                            >
                                Employee
                                {sortField === 'name' && <ArrowUpDown size={12} className="text-cta" />}
                            </button>
                            <button
                                onClick={() => toggleSort('hours')}
                                className="flex items-center gap-1 cursor-pointer hover:text-text transition-colors justify-end"
                            >
                                Hours
                                {sortField === 'hours' && <ArrowUpDown size={12} className="text-cta" />}
                            </button>
                            <span className="text-center">OOO</span>
                            <button
                                onClick={() => toggleSort('issues')}
                                className="flex items-center gap-1 cursor-pointer hover:text-text transition-colors justify-center"
                            >
                                Issues
                                {sortField === 'issues' && <ArrowUpDown size={12} className="text-cta" />}
                            </button>
                            <span />
                        </div>

                        {/* Rows */}
                        <div className="divide-y divide-border/50 max-h-[65vh] overflow-y-auto">
                            {filteredSummaries.map((summary, idx) => (
                                <button
                                    key={summary.user}
                                    onClick={() => setDrillDownIndex(idx)}
                                    className="grid grid-cols-[1fr_90px_80px_80px_44px] sm:grid-cols-[1fr_100px_90px_90px_48px] items-center w-full px-4 py-3 text-left hover:bg-surface-hover/40 transition-colors cursor-pointer group"
                                >
                                    {/* Name */}
                                    <div className="min-w-0">
                                        <p className="font-semibold text-sm text-text truncate group-hover:text-cta transition-colors">
                                            {jiraEmpMap[summary.user]?.rms_name || summary.user}
                                        </p>
                                        {jiraEmpMap[summary.user] && (
                                            <p className="text-xs text-text-muted truncate">{summary.user}</p>
                                        )}
                                    </div>

                                    {/* Total hours */}
                                    <div className="flex items-center justify-end gap-1.5">
                                        <Clock size={13} className="text-cta shrink-0" />
                                        <span className="font-bold text-sm text-text tabular-nums">
                                            {summary.totalHours}h
                                        </span>
                                    </div>

                                    {/* OOO */}
                                    <div className="flex items-center justify-center">
                                        {summary.oooHours > 0 ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-warning/10 text-warning text-xs font-medium">
                                                <Coffee size={11} />
                                                {summary.oooHours}h
                                            </span>
                                        ) : (
                                            <span className="text-xs text-text-muted/40">—</span>
                                        )}
                                    </div>

                                    {/* Issues count */}
                                    <div className="flex items-center justify-center gap-1">
                                        <FileText size={13} className="text-text-muted shrink-0" />
                                        <span className="text-sm text-text-muted tabular-nums">{summary.issueCount}</span>
                                    </div>

                                    {/* Expand icon */}
                                    <div className="flex items-center justify-center">
                                        <ExternalLink
                                            size={15}
                                            className="text-text-muted/40 group-hover:text-cta transition-colors"
                                        />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <EmptyState
                        message={searchQuery
                            ? `No users matching "${searchQuery}"`
                            : `No Jira timesheet data for ${selectedMonth}`
                        }
                        action={!searchQuery && isAdmin ? (
                            <button onClick={onImport} className="btn btn-secondary btn-sm">
                                <Upload size={14} /> Import XLS
                            </button>
                        ) : undefined}
                    />
                )}
            </div>

            {/* Drill-down modal */}
            {drillDownIndex !== null && (
                <JiraTimesheetDrillDown
                    users={filteredSummaries}
                    currentIndex={drillDownIndex}
                    month={selectedMonth}
                    onClose={() => setDrillDownIndex(null)}
                    onNavigate={(idx) => setDrillDownIndex(idx)}
                />
            )}
        </>
    );
}

// ──────────────────────────────────────────────
// AWS v2 Tab — mirrors CSV monthly per-employee
// ──────────────────────────────────────────────

const AWS_DISPLAY_COLS: { label: string; hmsKey: keyof AwsTimesheetV2Entry; secsKey: keyof AwsTimesheetV2Entry }[] = [
    { label: 'Work Time', hmsKey: 'work_time_hms', secsKey: 'work_time_secs' },
    { label: 'Productive', hmsKey: 'productive_hms', secsKey: 'productive_secs' },
    { label: 'Unproductive', hmsKey: 'unproductive_hms', secsKey: 'unproductive_secs' },
    { label: 'Undefined', hmsKey: 'undefined_hms', secsKey: 'undefined_secs' },
    { label: 'Active', hmsKey: 'active_hms', secsKey: 'active_secs' },
    { label: 'Passive', hmsKey: 'passive_hms', secsKey: 'passive_secs' },
    { label: 'Screen Time', hmsKey: 'screen_time_hms', secsKey: 'screen_time_secs' },
    { label: 'Offline Meetings', hmsKey: 'offline_meetings_hms', secsKey: 'offline_meetings_secs' },
];

function AwsV2Tab({
    entries, empMap, awsEmpMap, loading, selectedMonth, setSelectedMonth, importResult, isAdmin, onImport,
    setUnmatchedModalOpen, setUnmatchedModalSource, setUnmatchedDetails
}: {
    entries: AwsTimesheetV2Entry[];
    empMap: Record<number, Employee>;
    awsEmpMap: Record<string, Employee>;
    loading: boolean;
    selectedMonth: string;
    setSelectedMonth: (m: string) => void;
    importResult: AwsImportV2Result | null;
    isAdmin: boolean;
    onImport: () => void;
    setUnmatchedModalOpen: (open: boolean) => void;
    setUnmatchedModalSource: (source: 'JIRA' | 'AWS') => void;
    setUnmatchedDetails: (details: UnmatchedDetail[]) => void;
}) {
    const [awsDrillDownIndex, setAwsDrillDownIndex] = useState<number | null>(null);

    return (
        <>
            <div className="card flex items-center gap-4 py-3 px-4">
                <label className="text-sm font-medium text-text-muted" htmlFor="aws-month-select">Month</label>
                <select
                    id="aws-month-select"
                    className="input-field w-48"
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                >
                    {MONTH_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <span className="text-sm text-text-muted ml-auto">
                    {entries.length} employees
                </span>
            </div>

            {importResult && (
                <div className="card bg-info/5 border-info/20">
                    <h3 className="font-bold text-text mb-2">Last AWS Import Result</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div><span className="text-text-muted">Month:</span> <span className="font-medium">{importResult.month}</span></div>
                        <div><span className="text-text-muted">Total Rows:</span> <span className="font-medium">{importResult.total_rows}</span></div>
                        <div><span className="text-text-muted">Matched:</span> <span className="font-medium text-success">{importResult.employees_matched}</span></div>
                        <div><span className="text-text-muted">Inserted:</span> <span className="font-medium">{importResult.entries_inserted}</span></div>
                    </div>
                    {importResult.unmatched_emails.length > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                            <AlertTriangle size={14} className="text-warning shrink-0" />
                            <span className="text-xs text-warning">
                                {importResult.unmatched_emails.length} unmatched
                            </span>
                            <button
                                onClick={() => {
                                    setUnmatchedModalSource('AWS');
                                    setUnmatchedDetails(importResult.unmatched_details || []);
                                    setUnmatchedModalOpen(true);
                                }}
                                className="btn btn-ghost text-xs px-2 py-1 text-warning hover:text-text"
                            >
                                Resolve Unmatched →
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div className="card overflow-hidden">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <div className="spinner w-8 h-8 border-cta" />
                        <p className="text-text-muted text-sm animate-pulse">Loading AWS data...</p>
                    </div>
                ) : entries.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="bg-surface-hover/50 border-b border-border">
                                    <th className="sticky left-0 z-10 bg-surface-hover/50 px-4 py-3 text-xs font-bold text-text-muted uppercase min-w-[200px]">User / Email</th>
                                    {AWS_DISPLAY_COLS.map(col => (
                                        <th key={col.label} className="px-3 py-3 text-xs font-bold text-text-muted uppercase text-center min-w-[110px]">
                                            {col.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {entries.map(entry => {
                                    const emp = entry.employee_id ? empMap[entry.employee_id] : null;
                                    return (
                                        <tr key={entry.id} className="hover:bg-surface-hover/30 transition-colors cursor-pointer" onClick={() => setAwsDrillDownIndex(entries.indexOf(entry))}>
                                            <td className="sticky left-0 z-10 bg-surface px-4 py-2.5 min-w-[200px]">
                                                <p className="font-medium text-text">{emp?.rms_name || entry.aws_email}</p>
                                                {emp && <p className="text-xs text-text-muted">{entry.aws_email}</p>}
                                                {!emp && awsEmpMap[entry.aws_email?.toLowerCase() || ''] && (
                                                    <p className="text-xs text-info italic">Matchable: {awsEmpMap[entry.aws_email?.toLowerCase() || '']?.rms_name}</p>
                                                )}
                                                {!emp && !awsEmpMap[entry.aws_email?.toLowerCase() || ''] && <p className="text-xs text-warning font-medium">Unlinked</p>}
                                            </td>
                                            {AWS_DISPLAY_COLS.map(col => {
                                                const hms = entry[col.hmsKey] as string | null;
                                                const secs = entry[col.secsKey] as number;
                                                const hrs = (secs / 3600).toFixed(1);
                                                return (
                                                    <td key={col.label} className="px-3 py-2.5 text-center" title={`${hrs} hours (${secs}s)`}>
                                                        <span className="font-medium text-text">{hms || '0:00:00'}</span>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <EmptyState
                        message={`No AWS ActiveTrack data for ${selectedMonth}`}
                        action={isAdmin ? (
                            <button onClick={onImport} className="btn btn-secondary btn-sm">
                                <Upload size={14} /> Import AWS CSV
                            </button>
                        ) : undefined}
                    />
                )}
            </div>

            {awsDrillDownIndex !== null && (
                <AwsTimesheetDrillDown
                    entries={entries}
                    currentIndex={awsDrillDownIndex}
                    onClose={() => setAwsDrillDownIndex(null)}
                    onNavigate={(idx) => setAwsDrillDownIndex(idx)}
                    empMap={empMap}
                />
            )}

        </>
    );
}

// ──────────────────────────────────────────────
// Import Modals
// ──────────────────────────────────────────────

function JiraRawImportModal({
    isOpen, onClose, onSuccess, defaultMonth,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (result: JiraRawImportResult) => void;
    defaultMonth: string;
}) {
    const [file, setFile] = useState<File | null>(null);
    const [month, setMonth] = useState(defaultMonth);
    const [uploading, setUploading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) { toast.error('Select a file'); return; }
        setUploading(true);
        try {
            const result = await timesheetsApi.importJiraRaw(file, month);
            toast.success(`Imported ${result.entries_inserted} Jira entries`);
            onSuccess(result);
            onClose();
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Import failed';
            // If it's a timeout, the backend likely completed processing.
            // Auto-close and refresh so data becomes visible.
            if (msg.includes('timed out') || msg.includes('300s')) {
                toast.success('Upload sent — processing may still be running. Refreshing data...', { duration: 5000 });
                onClose();
                setTimeout(() => onSuccess({ month, total_rows_processed: 0, employees_matched: 0, employees_unmatched: [], entries_inserted: 0 }), 3000);
            } else {
                toast.error(msg);
            }
        } finally {
            setUploading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Import Jira/Tempo Timesheet">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="input-label">Timesheet File (.xls / .xlsx)</label>
                    <input
                        type="file"
                        accept=".xls,.xlsx"
                        className="input-field"
                        onChange={e => setFile(e.target.files?.[0] || null)}
                    />
                </div>
                <div>
                    <label className="input-label" htmlFor="jira-import-month">Import Month</label>
                    <input 
                        id="jira-import-month"
                        type="month" 
                        className="input-field" 
                        value={month} 
                        onChange={e => setMonth(e.target.value)} 
                        title="Import Month"
                        placeholder="YYYY-MM"
                    />
                </div>
                <div className="text-xs text-text-muted space-y-1">
                    <p><CheckCircle size={12} className="inline text-success mr-1" />Stores raw per-issue data exactly as in Excel</p>
                    <p><AlertTriangle size={12} className="inline text-warning mr-1" />JIRA-1 key = Out of Office (OOO)</p>
                    <p><CheckCircle size={12} className="inline text-info mr-1" />Re-uploading same month replaces previous data</p>
                </div>
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="btn btn-secondary flex-1" disabled={uploading}>Cancel</button>
                    <button type="submit" className="btn btn-cta flex-1" disabled={uploading || !file}>
                        {uploading ? <span className="spinner w-4 h-4" /> : 'Upload & Import'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function AwsV2ImportModal({
    isOpen, onClose, onSuccess, defaultMonth,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (result: AwsImportV2Result) => void;
    defaultMonth: string;
}) {
    const [file, setFile] = useState<File | null>(null);
    const [month, setMonth] = useState(defaultMonth);
    const [uploading, setUploading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) { toast.error('Select a CSV file'); return; }
        setUploading(true);
        try {
            const result = await timesheetsApi.importAwsV2(file, month);
            toast.success(`Imported ${result.entries_inserted} AWS entries`);
            onSuccess(result);
            onClose();
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'AWS import failed';
            if (msg.includes('timed out') || msg.includes('300s')) {
                toast.success('Upload sent — processing may still be running. Refreshing data...', { duration: 5000 });
                onClose();
                setTimeout(() => onSuccess({ month, total_rows: 0, employees_matched: 0, employees_unmatched: 0, entries_inserted: 0, unmatched_emails: [] }), 3000);
            } else {
                toast.error(msg);
            }
        } finally {
            setUploading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Import AWS ActiveTrack Data">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="input-label">CSV File</label>
                    <input
                        type="file"
                        accept=".csv"
                        className="input-field"
                        onChange={e => setFile(e.target.files?.[0] || null)}
                    />
                </div>
                <div>
                    <label className="input-label" htmlFor="aws-import-month">Billing Month</label>
                    <input 
                        id="aws-import-month"
                        type="month" 
                        className="input-field" 
                        value={month} 
                        onChange={e => setMonth(e.target.value)} 
                        title="Billing Month"
                        placeholder="YYYY-MM"
                    />
                </div>
                <div className="text-xs text-text-muted space-y-1">
                    <p><Monitor size={12} className="inline text-cta mr-1" />Monthly export from AWS ActiveTrack</p>
                    <p><CheckCircle size={12} className="inline text-success mr-1" />All h:mm:ss and seconds values stored as-is</p>
                    <p><CheckCircle size={12} className="inline text-info mr-1" />Re-uploading same month replaces previous data</p>
                </div>
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="btn btn-secondary flex-1" disabled={uploading}>Cancel</button>
                    <button type="submit" className="btn btn-cta flex-1" disabled={uploading || !file}>
                        {uploading ? <span className="spinner w-4 h-4" /> : 'Upload & Import'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
