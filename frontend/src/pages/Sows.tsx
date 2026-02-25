import { useState, useEffect } from 'react';
import { sowApi } from '../api/sows';
import { type SOW } from '../api/sows';
import { SowModal } from '../components/sows/SowModal';
import {
    FileText,
    Plus,
    Search,
    Edit2,
    Calendar
} from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import { resourceRequestsApi } from '../api/resourceRequests';
import { candidatesApi } from '../api/candidates';

export function Sows() {
    const [sows, setSows] = useState<SOW[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSow, setSelectedSow] = useState<SOW | undefined>();
    const [onboardedCounts, setOnboardedCounts] = useState<Record<number, number>>({});

    const fetchSows = async () => {
        try {
            setLoading(true);
            const [sowsRes, reqsRes, candidatesRes] = await Promise.all([
                sowApi.list(),
                resourceRequestsApi.list(),
                candidatesApi.list()
            ]);

            setSows(sowsRes || []);

            const counts: Record<number, number> = {};
            const onboardedCandidates = (candidatesRes || []).filter(c => c.status === 'ONBOARDED');

            onboardedCandidates.forEach(c => {
                const request = (reqsRes || []).find(r => r.id === c.request_id);
                if (request && request.sow_id) {
                    counts[request.sow_id] = (counts[request.sow_id] || 0) + 1;
                }
            });

            setOnboardedCounts(counts);
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

    const filteredSows = (sows || []).filter(sow => {
        const matchesSearch = (sow.sow_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (sow.client_name || '').toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'ALL' ||
            (statusFilter === 'ACTIVE' && sow.is_active !== false) ||
            (statusFilter === 'INACTIVE' && sow.is_active === false);

        return matchesSearch && matchesStatus;
    });

    const handleEdit = (sow: SOW) => {
        setSelectedSow(sow);
        setIsModalOpen(true);
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
                    <h1 className="text-2xl font-bold text-text">Statements of Work</h1>
                    <p className="text-text-muted mt-1">Manage client contracts and resource allocations</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="btn btn-primary flex items-center gap-2 shadow-lg shadow-cta/20"
                >
                    <Plus size={20} />
                    <span>New SOW</span>
                </button>
            </div>

            {/* Filter Bar */}
            <div className="card flex flex-col md:flex-row items-center gap-4 py-3 px-4">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input
                        type="search"
                        placeholder="Search SOWs..."
                        className="input-field pl-10 h-10"
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
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-surface-hover/50 border-b border-border">
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">SOW Details</th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Duration</th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-center">Resources</th>
                                    <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredSows.map((sow) => (
                                    <tr key={sow.id} className="hover:bg-surface-hover/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-cta/10 text-cta rounded-lg">
                                                    <FileText size={20} />
                                                </div>
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
                                        <td className="px-6 py-4 text-sm">
                                            <div className="flex items-center gap-2 text-text-muted">
                                                <Calendar size={14} />
                                                <span>{sow.start_date || 'N/A'}</span>
                                                <span>→</span>
                                                <span>{sow.end_date || 'N/A'}</span>
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
                    onSuccess={fetchSows}
                    sow={selectedSow}
                />
            )}
        </div>
    );
}
