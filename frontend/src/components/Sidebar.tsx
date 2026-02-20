import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Briefcase,
    FileText,
    ScrollText,
    MessageSquare,
    ChevronLeft,
    ChevronRight,
    LogOut
} from 'lucide-react';

import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
    const { logout } = useAuth();

    const navItems = [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/resource-requests', icon: Briefcase, label: 'Resource Requests' },
        { to: '/candidates', icon: Users, label: 'Candidates' },
        { to: '/job-profiles', icon: FileText, label: 'Job Profiles' },
        { to: '/sows', icon: ScrollText, label: 'SOWs' },
        { to: '/communication-logs', icon: MessageSquare, label: 'Logs' },
    ];

    return (
        <aside
            className={cn(
                "bg-surface border-r border-border h-screen sticky top-0 flex flex-col transition-all duration-300 z-sidebar",
                collapsed ? "w-[72px]" : "w-[260px]"
            )}
        >
            {/* Logo / Header */}
            <div className="h-header flex items-center px-4 border-b border-border">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-lg bg-cta flex-shrink-0 flex items-center justify-center text-white font-bold text-xl">
                        R
                    </div>
                    <div className={cn("font-heading font-bold text-xl tracking-tight transition-opacity duration-200", collapsed && "opacity-0 w-0")}>
                        SipraHub
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) => cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors group",
                            isActive
                                ? "bg-primary/5 text-primary font-medium"
                                : "text-text-muted hover:bg-surface-hover hover:text-text",
                            collapsed && "justify-center px-2"
                        )}
                        title={collapsed ? item.label : undefined}
                    >
                        <item.icon size={20} className={cn("flex-shrink-0 transition-colors", collapsed ? "mx-auto" : "")} />
                        <span className={cn("whitespace-nowrap transition-all duration-200 origin-left", collapsed ? "w-0 opacity-0 scale-0" : "w-auto opacity-100 scale-100")}>
                            {item.label}
                        </span>
                        {!collapsed && (
                            /* Active Indicator Dot could go here */
                            null
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Footer Actions */}
            <div className="p-3 border-t border-border space-y-1">
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-text-muted hover:bg-surface-hover hover:text-text transition-colors"
                    title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    {collapsed ? <ChevronRight size={20} className="mx-auto" /> : <ChevronLeft size={20} />}
                    <span className={cn("whitespace-nowrap transition-all duration-200", collapsed && "w-0 opacity-0 hidden")}>
                        Collapse
                    </span>
                </button>

                <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-danger hover:bg-danger/10 transition-colors mt-2"
                    title={collapsed ? "Logout" : undefined}
                >
                    <LogOut size={20} className={cn("flex-shrink-0", collapsed ? "mx-auto" : "")} />
                    <span className={cn("whitespace-nowrap transition-all duration-200", collapsed && "w-0 opacity-0 hidden")}>
                        Logout
                    </span>
                </button>
            </div>
        </aside>
    );
}
