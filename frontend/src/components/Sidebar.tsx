import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Briefcase,
    FileText,
    ScrollText,
    MessageSquare,
    Building2,
    ChevronLeft,
    ChevronRight,
    LogOut,
    UserCheck,
    Clock,
    Landmark,
} from 'lucide-react';

import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
}

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { to: '/sows', icon: ScrollText, label: 'SOWs' },
    { to: '/job-profiles', icon: FileText, label: 'Job Profiles' },
    { to: '/resource-requests', icon: Briefcase, label: 'Resource Requests' },
    { to: '/candidates', icon: Users, label: 'Candidates' },
    { to: '/employees', icon: UserCheck, label: 'Employees' },
    { to: '/timesheets', icon: Clock, label: 'Timesheets' },
    { to: '/clients', icon: Landmark, label: 'Clients' },
    { to: '/communication-logs', icon: MessageSquare, label: 'Comm. Logs' },
    { to: '/vendors', icon: Building2, label: 'Vendors' },
];

function getInitials(name: string) {
    return name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function getRoleBadge(role: string) {
    const map: Record<string, { label: string; color: string }> = {
        SUPER_ADMIN: { label: 'Super Admin', color: '#EF4444' },
        ADMIN: { label: 'Admin', color: '#22C55E' },
        MANAGER: { label: 'Manager', color: '#A855F7' },
        RECRUITER: { label: 'Recruiter', color: '#38BDF8' },
        VENDOR: { label: 'Vendor', color: '#F59E0B' },
    };
    return map[role] ?? { label: role, color: '#94A3B8' };
}

export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
    const { logout, user } = useAuth();
    const location = useLocation();

    const isActive = (to: string, exact?: boolean) => {
        if (exact) return location.pathname === to;
        return location.pathname.startsWith(to);
    };

    const roleBadge = user ? getRoleBadge(user.role) : null;

    return (
        <aside
            style={{ backgroundColor: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}
            className={cn(
                'h-screen sticky top-0 flex flex-col transition-all duration-300 select-none',
                collapsed ? 'w-[68px]' : 'w-[256px]'
            )}
        >
            {/* ── Logo ──────────────────────── */}
            <div
                className="flex items-center px-4 flex-shrink-0"
                style={{ height: 'var(--header-height)', borderBottom: '1px solid var(--sidebar-border)' }}
            >
                <div className="flex items-center gap-3 overflow-hidden min-w-0">
                    {/* Icon badge */}
                    <div
                        className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-sm text-white"
                        style={{
                            background: 'linear-gradient(135deg, #16A34A 0%, #0F9C42 100%)',
                            boxShadow: '0 2px 8px rgba(22, 163, 74, 0.4)',
                        }}
                    >
                        R
                    </div>

                    {/* Wordmark */}
                    <div
                        className={cn(
                            'min-w-0 transition-all duration-200',
                            collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                        )}
                    >
                        <div className="text-white font-bold text-base tracking-tight leading-none">
                            SipraHub
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--sidebar-text)', letterSpacing: '0.08em' }}>
                            RMS Platform
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Navigation ─────────────────── */}
            <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                {/* Section label */}
                {!collapsed && (
                    <div
                        className="px-3 pb-2 text-xs font-semibold uppercase tracking-widest"
                        style={{ color: 'rgba(100, 116, 139, 0.7)', letterSpacing: '0.1em' }}
                    >
                        Navigation
                    </div>
                )}
                {navItems.map((item) => {
                    const active = isActive(item.to, item.exact);
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            title={collapsed ? item.label : undefined}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 group relative',
                                collapsed ? 'justify-center' : ''
                            )}
                            style={{
                                backgroundColor: active
                                    ? 'var(--sidebar-item-active)'
                                    : 'transparent',
                                color: active
                                    ? 'var(--sidebar-text-active)'
                                    : 'var(--sidebar-text)',
                            }}
                            onMouseEnter={(e) => {
                                if (!active) {
                                    (e.currentTarget as HTMLElement).style.backgroundColor =
                                        'var(--sidebar-item-hover)';
                                    (e.currentTarget as HTMLElement).style.color =
                                        'var(--sidebar-text-active)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!active) {
                                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                                    (e.currentTarget as HTMLElement).style.color =
                                        'var(--sidebar-text)';
                                }
                            }}
                        >
                            {/* Active left border accent */}
                            {active && (
                                <span
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                                    style={{ backgroundColor: 'var(--sidebar-accent)' }}
                                />
                            )}

                            <item.icon
                                size={18}
                                className="flex-shrink-0"
                                style={{ color: active ? 'var(--sidebar-accent)' : undefined }}
                            />

                            <span
                                className={cn(
                                    'text-sm font-medium whitespace-nowrap transition-all duration-200',
                                    collapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'
                                )}
                            >
                                {item.label}
                            </span>
                        </NavLink>
                    );
                })}
            </nav>

            {/* ── User Panel ─────────────────── */}
            {!collapsed && user && (
                <div
                    className="px-3 py-3 mx-2 mb-2 rounded-lg"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--sidebar-border)' }}
                >
                    <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div
                            className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                            style={{ background: 'linear-gradient(135deg, #0369A1, #0EA5E9)' }}
                        >
                            {getInitials(user.full_name)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-white truncate leading-tight">
                                {user.full_name}
                            </div>
                            <div
                                className="text-xs mt-0.5 font-medium"
                                style={{ color: roleBadge?.color ?? '#94A3B8' }}
                            >
                                {roleBadge?.label}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Footer Actions ─────────────── */}
            <div className="p-2 space-y-0.5" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
                {/* Collapse Toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 text-sm',
                        collapsed ? 'justify-center' : ''
                    )}
                    style={{ color: 'var(--sidebar-text)' }}
                    onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--sidebar-item-hover)';
                        (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-text-active)';
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                        (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-text)';
                    }}
                    title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                >
                    {collapsed ? (
                        <ChevronRight size={16} className="mx-auto" />
                    ) : (
                        <>
                            <ChevronLeft size={16} />
                            <span>Collapse</span>
                        </>
                    )}
                </button>

                {/* Logout */}
                <button
                    onClick={logout}
                    className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 text-sm',
                        collapsed ? 'justify-center' : ''
                    )}
                    style={{ color: '#F87171' }}
                    onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                    }}
                    title={collapsed ? 'Logout' : undefined}
                >
                    <LogOut size={16} className="flex-shrink-0" />
                    <span
                        className={cn(
                            'whitespace-nowrap transition-all duration-150',
                            collapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'
                        )}
                    >
                        Logout
                    </span>
                </button>
            </div>
        </aside>
    );
}
