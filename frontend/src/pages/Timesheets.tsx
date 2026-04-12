import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
import { UnmatchedRecordsModal } from '../components/timesheets/UnmatchedRecordsModal';

import {
    Upload,
    Download,
    AlertTriangle,
    CheckCircle,
    Calculator,
    Monitor,
    FileSpreadsheet,
    ArrowUpDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import { formatPersonName } from '../lib/personNames';
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

function normalizeEmail(value: string | null | undefined): string {
    return (value || '').trim().toLowerCase();
}

function nameFromEmail(email: string | null | undefined): string {
    const normalized = normalizeEmail(email);
    if (!normalized || !normalized.includes('@')) return '';
    const localPart = normalized.split('@')[0];
    const spaced = localPart.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
    return formatPersonName(spaced);
}

function sameText(a: string | null | undefined, b: string | null | undefined): boolean {
    return (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();
}

export function Timesheets() {
    const { user } = useAuth();
    const isAdmin = isAdminRole(user?.role);
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // URL-driven state: month and tab persist across navigation
    const defaultMonth = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }, []);
    const selectedMonth = searchParams.get('month') || defaultMonth;
    const activeTab: Tab = (searchParams.get('tab') as Tab) || 'jira';

    const setSelectedMonth = useCallback((m: string) => {
        setSearchParams(prev => {
            prev.set('month', m);
            return prev;
        }, { replace: true });
    }, [setSearchParams]);

    const setActiveTab = useCallback((t: Tab) => {
        setSearchParams(prev => {
            prev.set('tab', t);
            return prev;
        }, { replace: true });
    }, [setSearchParams]);

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
    const [unmatchedCounts, setUnmatchedCounts] = useState<{ jira: number; aws: number; total: number }>({ jira: 0, aws: 0, total: 0 });

    // Unmatched records modal state
    const [isUnmatchedModalOpen, setIsUnmatchedModalOpen] = useState(false);
    const [unmatchedModalSource, setUnmatchedModalSource] = useState<'JIRA' | 'AWS'>('JIRA');
    const [unmatchedDetails, setUnmatchedDetails] = useState<UnmatchedDetail[]>([]);

    const fetchAllData = async (month: string) => {
        setJiraLoading(true);
        setAwsLoading(true);
        try {
            const [jiraRaw, awsRaw, empData, counts] = await Promise.all([
                timesheetsApi.listJiraRaw(month),
                timesheetsApi.listAwsV2(month),
                employees.length ? Promise.resolve(employees) : employeesApi.list({ page_size: 1000 }),
                timesheetsApi.getUnmatchedCount(month),
            ]);
            setJiraEntries(jiraRaw || []);
            setAwsEntries(awsRaw || []);
            setUnmatchedCounts(counts);
            if (!employees.length) setEmployees(empData || []);
        } catch {
            toast.error('Failed to load dashboard data');
        } finally {
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
                const awsEmail = normalizeEmail(e.aws_email);
                const sipraEmail = normalizeEmail(e.siprahub_email);
                if (awsEmail) results.push([awsEmail, e]);
                if (sipraEmail) results.push([sipraEmail, e]);
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
                    {isAdmin && (
                        <button 
                            onClick={() => {
                                setUnmatchedModalSource(activeTab === 'jira' ? 'JIRA' : 'AWS');
                                setIsUnmatchedModalOpen(true);
                            }} 
                            className={cn(
                                "btn flex items-center gap-2 relative",
                                (activeTab === 'jira' ? unmatchedCounts.jira : unmatchedCounts.aws) > 0
                                    ? "btn-secondary text-amber-600 border-amber-200 bg-amber-50"
                                    : "btn-secondary opacity-60"
                            )}
                        >
                            <AlertTriangle size={18} />
                            Resolve Unmatched
                            {(activeTab === 'jira' ? unmatchedCounts.jira : unmatchedCounts.aws) > 0 && (
                                <span className="absolute -top-2 -right-2 bg-amber-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm">
                                    {activeTab === 'jira' ? unmatchedCounts.jira : unmatchedCounts.aws}
                                </span>
                            )}
                        </button>
                    )}
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
                <JiraTab
                    jiraEntries={jiraEntries}
                    jiraLoading={jiraLoading}
                    selectedMonth={selectedMonth}
                    setSelectedMonth={setSelectedMonth}
                    importResult={jiraImportResult}
                    isAdmin={isAdmin}
                    onImport={() => setIsJiraImportOpen(true)}
                    empMap={empMap}
                    jiraEmpMap={jiraEmpMap}
                    empMap={empMap}
                    navigateToDrillDown={(users, idx, month) => {
                        navigate('/timesheets/drill-down/jira', {
                            state: { users, currentIndex: idx, month },
                        });
                    }}
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
                    navigateToDrillDown={(entries, idx, empMap) => {
                        navigate('/timesheets/drill-down/aws', {
                            state: { entries, currentIndex: idx, empMap },
                        });
                    }}
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
    employee_id: number | null;
    rows: JiraRawEntry[];
    totalHours: number;
    oooHours: number;
    issueCount: number;
}

function JiraTab({
    jiraEntries, jiraLoading, selectedMonth, setSelectedMonth, importResult, isAdmin, onImport, empMap, jiraEmpMap,
    navigateToDrillDown, setUnmatchedModalOpen, setUnmatchedModalSource, setUnmatchedDetails
}: {
    jiraEntries: JiraRawEntry[];
    jiraLoading: boolean;
    selectedMonth: string;
    setSelectedMonth: (m: string) => void;
    importResult: JiraRawImportResult | null;
    isAdmin: boolean;
    onImport: () => void;
    empMap: Record<number, Employee>;
    jiraEmpMap: Record<string, Employee>;
    empMap: Record<number, Employee>;
    navigateToDrillDown: (users: UserSummary[], idx: number, month: string) => void;
    setUnmatchedModalOpen: (open: boolean) => void;
    setUnmatchedModalSource: (source: 'JIRA' | 'AWS') => void;
    setUnmatchedDetails: (details: UnmatchedDetail[]) => void;
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortDir, setSortDir] = useState<SortDir>('asc');

    // Build user summaries from raw entries
    const userSummaries = useMemo(() => {
        const groupMap = new Map<string, JiraRawEntry[]>();
        for (const entry of jiraEntries) {
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

            // Use employee_id from the first row that has it (set during import matching)
            const matchedEmpId = rows.find(r => r.employee_id)?.employee_id ?? null;

            summaries.push({
                user,
                employee_id: rows[0]?.employee_id ?? null,
                rows,
                totalHours: summaryRow?.logged ?? 0,
                oooHours: oooRow?.logged ?? 0,
                issueCount: issueRows.length,
            });
        }
        return summaries;
    }, [jiraEntries]);

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
                <div className="flex-1 max-w-xs">
                    <input
                        type="text"
                        placeholder="Search by name..."
                        className="input-field w-full text-sm"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                <span className="text-sm text-text-muted sm:ml-auto">
                    {filteredSummaries.length} of {userSummaries.length} users · {jiraEntries.length} rows
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
                {jiraLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <div className="spinner w-8 h-8 border-cta" />
                        <p className="text-text-muted text-sm animate-pulse">Loading timesheets...</p>
                    </div>
                ) : filteredSummaries.length > 0 ? (
                    <>
                        {/* Column header */}
                        <div className="grid grid-cols-[90px_1fr_200px_90px_70px_110px] items-center px-6 py-3 border-b border-border bg-surface-hover/30 text-xs font-semibold text-text-muted uppercase tracking-wide">
                            <span>SOW</span>
                            <button
                                onClick={() => toggleSort('name')}
                                className="flex items-center gap-1 cursor-pointer hover:text-text transition-colors text-left"
                            >
                                Employee
                                {sortField === 'name' && <ArrowUpDown size={12} className="text-cta" />}
                            </button>
                            <span>Job Profile</span>
                            <button
                                onClick={() => toggleSort('hours')}
                                className="flex items-center gap-1 cursor-pointer hover:text-text transition-colors justify-end"
                            >
                                Total JIRA Hours
                                {sortField === 'hours' && <ArrowUpDown size={12} className="text-cta" />}
                            </button>
                            <span className="text-center">OOO</span>
                            <span className="text-right">Total Billable Hours</span>
                        </div>

                        {/* Rows */}
                        <div className="divide-y divide-border/50 max-h-[65vh] overflow-y-auto">
                            {filteredSummaries.map((summary, idx) => {
                                const mappedEmployee = (summary.employee_id ? empMap[summary.employee_id] : null) ?? jiraEmpMap[summary.user];
                                const displayName = formatPersonName(mappedEmployee?.rms_name || '') || summary.user;
                                const showSecondary = Boolean(mappedEmployee && !sameText(summary.user, displayName));
                                const billableHours = Math.max(0, 176 - (summary.oooHours ?? 0));
                                return (
                                    <button
                                        key={summary.user}
                                        onClick={() => navigateToDrillDown(filteredSummaries, idx, selectedMonth)}
                                        className="grid grid-cols-[90px_1fr_200px_90px_70px_110px] items-center w-full px-6 py-3.5 text-left hover:bg-surface-hover/40 transition-colors cursor-pointer group"
                                    >
                                        {/* SOW */}
                                        <div>
                                            {mappedEmployee?.sow_number
                                                ? <span className="inline-block text-xs font-medium text-text-muted bg-surface-hover px-2 py-0.5 rounded-full">
                                                    {mappedEmployee.sow_number}
                                                  </span>
                                                : <span className="text-xs text-text-muted/30">—</span>
                                            }
                                        </div>

                                        {/* Employee */}
                                        <div className="min-w-0 pr-4">
                                            <p className="font-semibold text-sm text-text truncate group-hover:text-cta transition-colors">
                                                {displayName}
                                            </p>
                                            {showSecondary && (
                                                <p className="text-xs text-text-muted truncate mt-0.5">{summary.user}</p>
                                            )}
                                        </div>

                                        {/* Job Profile */}
                                        <div className="pr-4">
                                            {mappedEmployee?.job_profile_name
                                                ? <span className="text-xs text-text-muted truncate block">{mappedEmployee.job_profile_name}</span>
                                                : <span className="text-xs text-text-muted/30">—</span>
                                            }
                                        </div>

                                        {/* Total JIRA hours */}
                                        <div className="text-right">
                                            <span className="font-semibold text-sm text-text tabular-nums">
                                                {summary.totalHours}h
                                            </span>
                                        </div>

                                        {/* OOO */}
                                        <div className="flex justify-center">
                                            {summary.oooHours > 0 ? (
                                                <span className="px-2 py-0.5 rounded-full bg-warning/10 text-warning text-xs font-medium tabular-nums">
                                                    {summary.oooHours}h
                                                </span>
                                            ) : (
                                                <span className="text-xs text-text-muted/30">—</span>
                                            )}
                                        </div>

                                        {/* Billable hours */}
                                        <div className="text-right">
                                            <span className="font-semibold text-sm text-cta tabular-nums">
                                                {billableHours}h
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
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
    navigateToDrillDown, setUnmatchedModalOpen, setUnmatchedModalSource, setUnmatchedDetails
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
    navigateToDrillDown: (entries: AwsTimesheetV2Entry[], idx: number, empMap: Record<number, Employee>) => void;
    setUnmatchedModalOpen: (open: boolean) => void;
    setUnmatchedModalSource: (source: 'JIRA' | 'AWS') => void;
    setUnmatchedDetails: (details: UnmatchedDetail[]) => void;
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortDir, _setSortDir] = useState<SortDir>('asc');

    const filteredEntries = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        let result = entries;
        if (query) {
            result = entries.filter(e => {
                const normalizedAwsEmail = normalizeEmail(e.aws_email);
                const emp = (e.employee_id ? empMap[e.employee_id] : null) || awsEmpMap[normalizedAwsEmail];
                return (emp?.rms_name || '').toLowerCase().includes(query) ||
                       (e.aws_email || '').toLowerCase().includes(query);
            });
        }
        return [...result].sort((a, b) => {
            const dir = sortDir === 'asc' ? 1 : -1;
            const empA = (a.employee_id ? empMap[a.employee_id] : null) || awsEmpMap[normalizeEmail(a.aws_email)];
            const empB = (b.employee_id ? empMap[b.employee_id] : null) || awsEmpMap[normalizeEmail(b.aws_email)];
            const nameA = (formatPersonName(empA?.rms_name || '') || nameFromEmail(a.aws_email) || a.aws_email || '').toLowerCase();
            const nameB = (formatPersonName(empB?.rms_name || '') || nameFromEmail(b.aws_email) || b.aws_email || '').toLowerCase();
            return nameA.localeCompare(nameB) * dir;
        });
    }, [entries, searchQuery, sortDir, empMap, awsEmpMap]);

    return (
        <>
            <div className="card flex flex-col sm:flex-row items-start sm:items-center gap-3 py-3 px-4">
                <div className="flex items-center gap-3">
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
                </div>

                {/* Search */}
                <div className="flex-1 max-w-xs">
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        className="input-field w-full text-sm"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                <span className="text-sm text-text-muted sm:ml-auto">
                    {filteredEntries.length} of {entries.length} employees
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
                ) : filteredEntries.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-surface border-b border-border">
                                    <th className="sticky left-0 z-20 bg-surface px-4 py-3 text-xs font-bold text-text-muted min-w-[200px]">User / Email</th>
                                    {AWS_DISPLAY_COLS.map(col => (
                                        <th key={col.label} className="px-3 py-3 text-xs font-bold text-text-muted text-center min-w-[110px]">
                                            {col.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredEntries.map((entry, idx) => {
                                    const normalizedAwsEmail = normalizeEmail(entry.aws_email);
                                    const emp = (entry.employee_id ? empMap[entry.employee_id] : null) || awsEmpMap[normalizedAwsEmail];
                                    const displayName =
                                        formatPersonName(emp?.rms_name || '') ||
                                        nameFromEmail(entry.aws_email) ||
                                        entry.aws_email;
                                    return (
                                        <tr key={entry.id} className="hover:bg-surface-hover/30 transition-colors cursor-pointer" onClick={() => navigateToDrillDown(filteredEntries, idx, empMap)}>
                                            <td className="sticky left-0 z-10 bg-surface px-4 py-2.5 min-w-[200px]">
                                                <p className="font-medium text-text">{displayName}</p>
                                                {entry.aws_email && <p className="text-xs text-text-muted">{entry.aws_email}</p>}
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
                        message={searchQuery
                            ? `No users matching "${searchQuery}"`
                            : `No AWS ActiveTrack data for ${selectedMonth}`
                        }
                        action={!searchQuery && isAdmin ? (
                            <button onClick={onImport} className="btn btn-secondary btn-sm">
                                <Upload size={14} /> Import AWS CSV
                            </button>
                        ) : undefined}
                    />
                )}
            </div>
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
                    <p><Monitor size={12} className="inline text-cta mr-1" />Export from AWS ActiveTrack — single or multi-month CSV supported</p>
                    <p><CheckCircle size={12} className="inline text-success mr-1" />Only rows matching the selected billing month are imported</p>
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
