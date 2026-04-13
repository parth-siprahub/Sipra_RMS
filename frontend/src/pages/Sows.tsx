import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { sowApi } from '../api/sows';
import { type SOW } from '../api/sows';
import { SowModal } from '../components/sows/SowModal';
import {
    Plus,
    Edit2,
    Download,
    ChevronDown
} from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import { resourceRequestsApi } from '../api/resourceRequests';
import { candidatesApi } from '../api/candidates';
import { jobProfileApi, type JobProfile } from '../api/jobProfiles';
import { useAuth, isAdminRole } from '../context/AuthContext';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export function Sows() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdmin = isAdminRole(user?.role);
    const [sows, setSows] = useState<SOW[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSow, setSelectedSow] = useState<SOW | undefined>();
    const [onboardedCounts, setOnboardedCounts] = useState<Record<number, number>>({});
    const [jobProfiles, setJobProfiles] = useState<JobProfile[]>([]);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const exportRef = useRef<HTMLDivElement>(null);

    const fetchSows = async () => {
        try {
            setLoading(true);
            const [sowsResult, reqsResult, candidatesResult, profilesResult] = await Promise.allSettled([
                sowApi.list(),
                resourceRequestsApi.list(),
                candidatesApi.list(),
                jobProfileApi.list()
            ]);

            const sowsRes = sowsResult.status === 'fulfilled' ? (sowsResult.value || []) : [];
            const reqsRes = reqsResult.status === 'fulfilled' ? (reqsResult.value || []) : [];
            const candidatesRes = candidatesResult.status === 'fulfilled' ? (candidatesResult.value || []) : [];
            const profilesRes = profilesResult.status === 'fulfilled' ? (profilesResult.value || []) : [];

            setSows(sowsRes);
            setJobProfiles(profilesRes);

            const counts: Record<number, number> = {};
            const onboardedCandidates = candidatesRes.filter(c => c.status === 'ONBOARDED');

            onboardedCandidates.forEach(c => {
                const request = reqsRes.find(r => r.id === c.request_id);
                if (request && request.sow_id) {
                    counts[request.sow_id] = (counts[request.sow_id] || 0) + 1;
                }
            });

            setOnboardedCounts(counts);
            if (sowsResult.status === 'rejected') {
                throw sowsResult.reason;
            }
        } catch (error) {
            console.error('Failed to fetch SOW data Bundle:', error);
            toast.error('Failed to load SOW data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSows();
    }, []);

    // Click outside to close export dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
                setIsExportOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredSows = (sows || []).filter(sow => {
        const matchesSearch = (sow.sow_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (sow.client_name || '').toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'ALL' ||
            (statusFilter === 'ACTIVE' && sow.is_active !== false) ||
            (statusFilter === 'INACTIVE' && sow.is_active === false);

        return matchesSearch && matchesStatus;
    });

    const handleExport = (formatType: 'xlsx' | 'csv') => {
        const activeSows = sows.filter(s => s.is_active !== false);
        
        if (activeSows.length === 0) {
            toast.error('No active SOWs to export');
            return;
        }

        const data = activeSows.map(s => ({
            'SOW Number': s.sow_number,
            'Client': s.client_name,
            'Job Profile': jobProfiles.find(p => p.id === s.job_profile_id)?.role_name || 'N/A',
            'Start Date': s.start_date || 'N/A',
            'Target Date': s.target_date || 'N/A',
            'Max Resources': s.max_resources || 0,
            'Resources Onboarded': onboardedCounts[s.id] || 0,
            'Status': s.is_active !== false ? 'Active' : 'Inactive'
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Active SOWs');

        const fileName = `Active_SOWs_${format(new Date(), 'yyyyMMdd')}`;
        
        if (formatType === 'xlsx') {
            XLSX.writeFile(wb, `${fileName}.xlsx`);
        } else {
            XLSX.writeFile(wb, `${fileName}.csv`, { bookType: 'csv' });
        }
        
        setIsExportOpen(false);
        toast.success(`Exported ${activeSows.length} SOWs as ${formatType.toUpperCase()}`);
    };

    const handleEdit = (sow: SOW) => {
        navigate(`/sows/${sow.id}/edit`);
    };

    const handleCreate = () => {
        setSelectedSow(undefined);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <p className="text-text-muted">Manage client contracts and resource allocations</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative" ref={exportRef}>
                        <button
                            onClick={() => setIsExportOpen(!isExportOpen)}
                            className="btn btn-secondary flex items-center gap-2 bg-surface backdrop-blur-md border border-border group"
                        >
                            <Download size={18} className="text-text-muted group-hover:text-cta transition-colors" />
                            <span>Export</span>
                            <ChevronDown size={16} className={cn("transition-transform duration-200", isExportOpen && "rotate-180")} />
                        </button>

                        {isExportOpen && (
                            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-surface border border-border shadow-2xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <button
                                    onClick={() => handleExport('xlsx')}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-surface-hover hover:text-cta transition-colors flex items-center gap-2"
                                >
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    Download as Excel (.xlsx)
                                </button>
                                <button
                                    onClick={() => handleExport('csv')}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-surface-hover hover:text-cta transition-colors flex items-center gap-2"
                                >
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    Download as CSV (.csv)
                                </button>
                            </div>
                        )}
                    </div>

                    {isAdmin && (
                        <button
                            onClick={handleCreate}
                            className="btn btn-primary flex items-center gap-2 shadow-lg shadow-cta/20"
                        >
                            <Plus size={20} />
                            <span>New SOW</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Bar */}
            <div className="card flex flex-col md:flex-row items-center gap-4 py-3 px-4">
                <div className="flex-1 w-full">
                    <input
                        type="search"
                        placeholder="Search SOWs..."
                        className="input-field h-10 w-full"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
                    {(['ACTIVE', 'INACTIVE', 'ALL'] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={cn(
                                'px-4 py-2 text-sm font-medium transition-colors',
                                statusFilter === s
                                    ? 'bg-primary text-text-inverse'
                                    : 'bg-surface text-text-muted hover:bg-surface-hover'
                            )}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table Container */}
            <div className="card overflow-hidden">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <div className="spinner w-8 h-8 border-cta"></div>
                        <p className="text-text-muted text-sm animate-pulse">Loading SOWs...</p>
                    </div>
                ) : filteredSows.length > 0 ? (
                    <div className="overflow-auto max-h-[70vh] custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-surface border-b border-border">
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">SOW Details</th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Job Profile</th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider whitespace-nowrap" style={{ minWidth: '220px' }}>Duration</th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-center">Resources</th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredSows.map((sow) => (
                                    <tr key={sow.id} className="hover:bg-surface-hover/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-text">{sow.sow_number}</p>
                                                        {sow.is_active === false && (
                                                            <span className="badge badge-neutral text-[10px] py-0 px-1.5">Inactive</span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-text-muted">{sow.client_name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {sow.job_profile_id ? (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-sm font-medium text-text">
                                                        {jobProfiles.find(p => p.id === sow.job_profile_id)?.role_name || 'Unknown Profile'}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-text-muted italic">No profile linked</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-text-muted">
                                                <span>{sow.start_date || 'N/A'}</span>
                                                <span>→</span>
                                                <span className={cn(
                                                    (() => {
                                                        if (!sow.target_date) return '';
                                                        const target = new Date(sow.target_date);
                                                        const now = new Date();
                                                        const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                                        if (diffDays < 0) return 'text-red-500 font-semibold';
                                                        if (diffDays <= 7) return 'text-amber-500 font-semibold';
                                                        return 'text-emerald-500';
                                                    })()
                                                )}>
                                                    {sow.target_date || 'N/A'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5 min-w-[120px]">
                                                <div className="flex justify-between text-xs font-medium">
                                                    <span className="text-text-muted">Utilization</span>
                                                    <span className={cn(
                                                        (onboardedCounts[sow.id] || 0) >= (sow.max_resources || 0)
                                                            ? "text-success"
                                                            : "text-cta"
                                                    )}>
                                                        {onboardedCounts[sow.id] || 0} / {sow.max_resources || 0}
                                                    </span>
                                                </div>
                                                <div className="h-1.5 w-full bg-surface-hover rounded-full overflow-hidden border border-border">
                                                    <div
                                                        className={cn(
                                                            "h-full transition-all duration-500",
                                                            (onboardedCounts[sow.id] || 0) >= (sow.max_resources || 0) ? "bg-success" : "bg-cta"
                                                        )}
                                                        style={{
                                                            width: `${Math.min(100, ((onboardedCounts[sow.id] || 0) / (sow.max_resources || 1)) * 100)}%`
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleEdit(sow)}
                                                className="p-2 hover:bg-surface-hover rounded-lg transition-colors text-text-muted hover:text-cta"
                                                title="Edit SOW"
                                                aria-label="Edit SOW"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <EmptyState
                        message={searchQuery ? "No statements of work match your search" : "Start by creating your first Statement of Work"}
                        action={
                            <button
                                onClick={searchQuery ? () => setSearchQuery('') : handleCreate}
                                className="btn btn-secondary btn-sm"
                            >
                                {searchQuery ? "Clear Search" : "New SOW"}
                            </button>
                        }
                    />
                )}
            </div>

            {isModalOpen && (
                <SowModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedSow(undefined);
                    }}
                    onSuccess={(updatedIsActive?: boolean) => {
                        fetchSows();
                        if (updatedIsActive === false) {
                            setStatusFilter('INACTIVE');
                        } else if (updatedIsActive === true && statusFilter === 'INACTIVE') {
                            setStatusFilter('ACTIVE');
                        }
                    }}
                    sow={selectedSow}
                />
            )}
        </div>
    );
}
