import { cn } from '../../lib/utils';
import { LayoutDashboard, Shield, Code2, Building2 } from 'lucide-react';

export type DashboardTab = 'overview' | 'skills' | 'vendors' | 'risk';

interface TabConfig {
    id: DashboardTab;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
}

const TABS: TabConfig[] = [
    { id: 'overview', label: 'OVERVIEW', icon: LayoutDashboard },
    { id: 'skills', label: 'SKILLS', icon: Code2 },
    { id: 'vendors', label: 'VENDORS', icon: Building2 },
    { id: 'risk', label: 'RISK', icon: Shield },
];

interface DashboardTabsProps {
    activeTab: DashboardTab;
    onChange: (tab: DashboardTab) => void;
}

export function DashboardTabs({ activeTab, onChange }: DashboardTabsProps) {
    return (
        <div className="flex gap-1 bg-surface border border-border rounded-xl p-1">
            {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer',
                            isActive
                                ? 'bg-[var(--brand-red,#CC1A24)] text-white shadow-sm'
                                : 'text-text-muted hover:text-text hover:bg-surface-hover'
                        )}
                    >
                        <Icon size={14} />
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}
