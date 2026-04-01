import { useState, useEffect, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { timesheetsApi, type UnmatchedDetail, type UnmatchedSuggestion } from '../../api/timesheets';
import { employeesApi, type Employee } from '../../api/employees';
import { Search, Link2, CheckCircle, AlertTriangle, User } from 'lucide-react';
import toast from 'react-hot-toast';

interface UnmatchedRecordsModalProps {
    isOpen: boolean;
    onClose: () => void;
    billingMonth: string;
    sourceType: 'JIRA' | 'AWS';
    /** Initial unmatched details from import result (avoids extra fetch) */
    initialUnmatched?: UnmatchedDetail[];
    /** Called after a successful link so parent can refresh data */
    onLinked: () => void;
}

interface RowState {
    selectedEmployeeId: number | null;
    searchQuery: string;
    searchResults: Employee[];
    searching: boolean;
    linking: boolean;
    linked: boolean;
    showDropdown: boolean;
}

export function UnmatchedRecordsModal({
    isOpen,
    onClose,
    billingMonth,
    sourceType,
    initialUnmatched,
    onLinked,
}: UnmatchedRecordsModalProps) {
    const [unmatchedRecords, setUnmatchedRecords] = useState<UnmatchedDetail[]>([]);
    const [loading, setLoading] = useState(false);
    const [rowStates, setRowStates] = useState<Record<string, RowState>>({});

    // Load unmatched records
    useEffect(() => {
        if (!isOpen) return;

        if (initialUnmatched && initialUnmatched.length > 0) {
            setUnmatchedRecords(initialUnmatched);
            initRowStates(initialUnmatched);
        } else {
            fetchUnmatched();
        }
    }, [isOpen, billingMonth, sourceType]);

    const fetchUnmatched = async () => {
        setLoading(true);
        try {
            const res = await timesheetsApi.getUnmatched(billingMonth, sourceType);
            const records = res.unmatched || [];
            setUnmatchedRecords(records);
            initRowStates(records);
        } catch {
            toast.error('Failed to load unmatched records');
        } finally {
            setLoading(false);
        }
    };

    const initRowStates = (records: UnmatchedDetail[]) => {
        const states: Record<string, RowState> = {};
        for (const r of records) {
            states[r.source_name] = {
                selectedEmployeeId: null,
                searchQuery: '',
                searchResults: [],
                searching: false,
                linking: false,
                linked: false,
                showDropdown: false,
            };
        }
        setRowStates(states);
    };

    const updateRow = (sourceName: string, updates: Partial<RowState>) => {
        setRowStates(prev => ({
            ...prev,
            [sourceName]: { ...prev[sourceName], ...updates },
        }));
    };

    // Debounced employee search
    const searchEmployees = useCallback(async (sourceName: string, query: string) => {
        if (query.length < 2) {
            updateRow(sourceName, { searchResults: [], searching: false });
            return;
        }
        updateRow(sourceName, { searching: true });
        try {
            const results = await employeesApi.list({ search: query, page_size: 10 });
            updateRow(sourceName, { searchResults: results || [], searching: false, showDropdown: true });
        } catch {
            updateRow(sourceName, { searchResults: [], searching: false });
        }
    }, []);

    // Search with debounce
    useEffect(() => {
        const timers: Record<string, NodeJS.Timeout> = {};
        for (const [sourceName, state] of Object.entries(rowStates)) {
            if (state.searchQuery.length >= 2) {
                timers[sourceName] = setTimeout(() => {
                    searchEmployees(sourceName, state.searchQuery);
                }, 300);
            }
        }
        return () => {
            Object.values(timers).forEach(clearTimeout);
        };
    }, [Object.entries(rowStates).map(([k, v]) => `${k}:${v.searchQuery}`).join(',')]);

    const handleSelectEmployee = (sourceName: string, employeeId: number) => {
        updateRow(sourceName, {
            selectedEmployeeId: employeeId,
            showDropdown: false,
        });
    };

    const handleSelectSuggestion = (sourceName: string, suggestion: UnmatchedSuggestion) => {
        updateRow(sourceName, {
            selectedEmployeeId: suggestion.employee_id,
            showDropdown: false,
            searchQuery: suggestion.rms_name,
        });
    };

    const handleLink = async (sourceName: string) => {
        const state = rowStates[sourceName];
        if (!state?.selectedEmployeeId) {
            toast.error('Please select an employee first');
            return;
        }

        updateRow(sourceName, { linking: true });
        try {
            await timesheetsApi.linkBulk(
                sourceType,
                sourceName,
                state.selectedEmployeeId,
                billingMonth,
            );
            updateRow(sourceName, { linking: false, linked: true });
            toast.success(`Linked "${sourceName}" successfully`);
            onLinked();
        } catch {
            updateRow(sourceName, { linking: false });
            toast.error(`Failed to link "${sourceName}"`);
        }
    };

    const handleLinkAll = async () => {
        const linkable = unmatchedRecords.filter(r => {
            const state = rowStates[r.source_name];
            return state?.selectedEmployeeId && !state.linked;
        });
        if (linkable.length === 0) {
            toast.error('No records ready to link. Select employees first.');
            return;
        }
        for (const r of linkable) {
            await handleLink(r.source_name);
        }
    };

    const pendingCount = unmatchedRecords.filter(r => !rowStates[r.source_name]?.linked).length;
    const linkedCount = unmatchedRecords.filter(r => rowStates[r.source_name]?.linked).length;
    const readyToLinkCount = unmatchedRecords.filter(r => {
        const state = rowStates[r.source_name];
        return state?.selectedEmployeeId && !state.linked;
    }).length;

    const getEmployeeName = (employeeId: number, sourceName: string): string => {
        const state = rowStates[sourceName];
        if (!state) return '';
        const fromSearch = state.searchResults.find(e => e.id === employeeId);
        if (fromSearch) return fromSearch.rms_name;
        // Check suggestions
        const record = unmatchedRecords.find(r => r.source_name === sourceName);
        const fromSuggestion = record?.suggestions?.find(s => s.employee_id === employeeId);
        if (fromSuggestion) return fromSuggestion.rms_name;
        return `Employee #${employeeId}`;
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Resolve Unmatched ${sourceType} Records`}
            maxWidth="max-w-4xl"
            footer={
                <div className="flex items-center justify-between w-full">
                    <span className="text-xs text-text-muted">
                        {linkedCount} linked / {pendingCount} pending
                    </span>
                    <div className="flex gap-2">
                        <button className="btn btn-ghost text-sm" onClick={onClose}>
                            Close
                        </button>
                        {readyToLinkCount > 0 && (
                            <button className="btn btn-primary text-sm" onClick={handleLinkAll}>
                                <Link2 size={14} />
                                Link All Selected ({readyToLinkCount})
                            </button>
                        )}
                    </div>
                </div>
            }
        >
            {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                    <div className="spinner w-6 h-6 border-cta" />
                    <p className="text-text-muted text-sm">Loading unmatched records...</p>
                </div>
            ) : unmatchedRecords.length === 0 ? (
                <div className="py-12 text-center">
                    <CheckCircle size={40} className="mx-auto text-success mb-3" />
                    <p className="text-text font-medium">All records matched!</p>
                    <p className="text-text-muted text-sm mt-1">No unmatched records for {billingMonth}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-text-muted bg-surface-hover/50 rounded-lg px-3 py-2">
                        <AlertTriangle size={14} className="text-warning shrink-0" />
                        <span>
                            {unmatchedRecords.length} identifier{unmatchedRecords.length > 1 ? 's' : ''} could not be
                            auto-matched. Select the correct employee for each, then click Link.
                            Future imports will auto-match these.
                        </span>
                    </div>

                    {unmatchedRecords.map(record => {
                        const state = rowStates[record.source_name];
                        if (!state) return null;

                        return (
                            <div
                                key={record.source_name}
                                className={`card p-3 transition-all ${
                                    state.linked
                                        ? 'bg-success/5 border-success/20'
                                        : state.selectedEmployeeId
                                        ? 'bg-info/5 border-info/20'
                                        : ''
                                }`}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    {/* Source identifier */}
                                    <div className="flex items-center gap-2 min-w-0 sm:w-48 shrink-0">
                                        <User size={14} className="text-text-muted shrink-0" />
                                        <span className="font-mono text-sm font-medium text-text truncate" title={record.source_name}>
                                            {record.source_name}
                                        </span>
                                    </div>

                                    {/* Arrow / status */}
                                    <div className="hidden sm:flex items-center text-text-muted">
                                        {state.linked ? (
                                            <CheckCircle size={16} className="text-success" />
                                        ) : (
                                            <span className="text-xs">→</span>
                                        )}
                                    </div>

                                    {/* Employee selection area */}
                                    <div className="flex-1 min-w-0">
                                        {state.linked ? (
                                            <div className="flex items-center gap-2 text-sm text-success">
                                                <CheckCircle size={14} />
                                                Linked to {getEmployeeName(state.selectedEmployeeId!, record.source_name)}
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {/* Fuzzy suggestions */}
                                                {record.suggestions && record.suggestions.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        <span className="text-xs text-text-muted">Suggestions:</span>
                                                        {record.suggestions.map(s => (
                                                            <button
                                                                key={s.employee_id}
                                                                onClick={() => handleSelectSuggestion(record.source_name, s)}
                                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all cursor-pointer ${
                                                                    state.selectedEmployeeId === s.employee_id
                                                                        ? 'bg-cta text-white'
                                                                        : 'bg-surface-hover text-text hover:bg-surface-active'
                                                                }`}
                                                            >
                                                                {s.rms_name}
                                                                <span className="opacity-60">
                                                                    ({Math.round(s.score * 100)}%)
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Search input */}
                                                <div className="relative">
                                                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search employee by name..."
                                                        value={state.searchQuery}
                                                        onChange={e => {
                                                            updateRow(record.source_name, {
                                                                searchQuery: e.target.value,
                                                                showDropdown: true,
                                                            });
                                                        }}
                                                        onFocus={() => {
                                                            if (state.searchResults.length > 0) {
                                                                updateRow(record.source_name, { showDropdown: true });
                                                            }
                                                        }}
                                                        className="input-field w-full pl-8 pr-3 py-1.5 text-sm"
                                                    />
                                                    {state.searching && (
                                                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                                                            <div className="spinner w-3.5 h-3.5 border-cta" />
                                                        </div>
                                                    )}

                                                    {/* Search dropdown */}
                                                    {state.showDropdown && state.searchResults.length > 0 && (
                                                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-xl max-h-40 overflow-y-auto custom-scrollbar">
                                                            {state.searchResults.map(emp => (
                                                                <button
                                                                    key={emp.id}
                                                                    onClick={() => handleSelectEmployee(record.source_name, emp.id)}
                                                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-hover transition-colors cursor-pointer flex items-center justify-between ${
                                                                        state.selectedEmployeeId === emp.id ? 'bg-cta/10 text-cta' : 'text-text'
                                                                    }`}
                                                                >
                                                                    <div>
                                                                        <span className="font-medium">{emp.rms_name}</span>
                                                                        {emp.jira_username && (
                                                                            <span className="text-text-muted text-xs ml-2">
                                                                                ({emp.jira_username})
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {emp.status && (
                                                                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                                                                            emp.status === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-surface-hover text-text-muted'
                                                                        }`}>
                                                                            {emp.status}
                                                                        </span>
                                                                    )}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Selected employee display */}
                                                {state.selectedEmployeeId && !state.showDropdown && (
                                                    <div className="flex items-center gap-2 text-xs text-info">
                                                        <CheckCircle size={12} />
                                                        Selected: {getEmployeeName(state.selectedEmployeeId, record.source_name)}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Link button */}
                                    {!state.linked && (
                                        <button
                                            onClick={() => handleLink(record.source_name)}
                                            disabled={!state.selectedEmployeeId || state.linking}
                                            className="btn btn-primary text-xs px-3 py-1.5 shrink-0 disabled:opacity-40"
                                        >
                                            {state.linking ? (
                                                <div className="spinner w-3 h-3 border-white" />
                                            ) : (
                                                <>
                                                    <Link2 size={12} />
                                                    Link
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </Modal>
    );
}
