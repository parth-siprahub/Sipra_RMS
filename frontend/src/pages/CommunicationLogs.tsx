import React, { useState, useEffect } from 'react';
import { communicationLogApi } from '../api/communicationLogs';
import type { CommunicationLog } from '../api/communicationLogs';
import { LogModal } from '../components/logs/LogModal';
import {
    MessageSquare,
    Plus,
    Search,
    Mail,
    Phone,
    Users,
    Calendar,
    Clock,
    User
} from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import toast from 'react-hot-toast';

export function CommunicationLogs() {
    const [logs, setLogs] = useState<CommunicationLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const data = await communicationLogApi.list();
            setLogs(data || []);
        } catch (error) {
            console.error('Failed to fetch logs:', error);
            toast.error('Failed to load activity logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const filteredLogs = (logs || []).filter(log =>
        (log.message || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.external_contact_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const typeIcons = {
        EMAIL: <Mail size={16} className="text-cta" />,
        CALL: <Phone size={16} className="text-info" />,
        MEETING: <Users size={16} className="text-success" />,
        NOTE: <MessageSquare size={16} className="text-warning" />,
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text">Communication History</h1>
                    <p className="text-text-muted mt-1">Timeline of all candidate and client interactions</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn btn-primary flex items-center gap-2 shadow-lg shadow-cta/20"
                >
                    <Plus size={20} />
                    <span>Log Activity</span>
                </button>
            </div>

            {/* Filter Bar */}
            <div className="card flex flex-col md:flex-row items-center gap-4 py-3 px-4">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input
                        type="search"
                        placeholder="Search notes or contacts..."
                        className="input-field pl-10 h-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Timeline */}
            <div className="space-y-4">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4 card">
                        <div className="spinner w-8 h-8 border-cta"></div>
                        <p className="text-text-muted text-sm animate-pulse">Loading timeline...</p>
                    </div>
                ) : filteredLogs.length > 0 ? (
                    <div className="relative space-y-4 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-border before:via-cta/20 before:to-border">
                        {filteredLogs.map((log, index) => (
                            <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-white text-text-muted shadow md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                    {typeIcons[log.log_type as keyof typeof typeIcons] || <MessageSquare size={16} />}
                                </div>
                                <div
                                    className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] card p-4 hover:border-cta/50 transition-all cursor-default translate-y-2 opacity-0 animate-in fade-in slide-in-from-bottom-2 fill-mode-forwards"
                                    style={{ '--animation-delay': `${index * 50}ms` } as React.CSSProperties}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <time className="text-xs font-bold text-cta flex items-center gap-1">
                                            <Calendar size={12} />
                                            {new Date(log.log_date || '').toLocaleDateString()}
                                        </time>
                                        <span className="text-[10px] font-bold uppercase py-0.5 px-2 bg-surface-hover rounded text-text-muted">
                                            {log.log_type}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center text-text-muted border border-border">
                                            <User size={14} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-text leading-none">{log.external_contact_name}</p>
                                            <p className="text-[10px] text-text-muted mt-0.5">Contact Method: {log.log_type}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-text-muted leading-relaxed italic border-l-2 border-cta/20 pl-3">
                                        "{log.message}"
                                    </p>
                                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[10px] text-text-muted">
                                        <span className="flex items-center gap-1"><Clock size={10} /> {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        <span>Log ID: #{log.id}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="card">
                        <EmptyState
                            message={searchQuery ? "No matching activity found" : "No communication history yet"}
                            action={
                                <button
                                    onClick={searchQuery ? () => setSearchQuery('') : () => setIsModalOpen(true)}
                                    className="btn btn-secondary btn-sm"
                                >
                                    {searchQuery ? "Clear Search" : "Log Activity"}
                                </button>
                            }
                        />
                    </div>
                )}
            </div>

            <LogModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchLogs}
            />
        </div>
    );
}
