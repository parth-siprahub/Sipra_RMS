import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Briefcase,
    FileText,
    ScrollText,
    Building2,
    ChevronLeft,
    ChevronRight,
    LogOut,
    UserPlus,
    Clock,
    Landmark,
    BarChart3,
    Settings2,
} from 'lucide-react';

import { cn } from '../lib/utils';
import { formatPersonName } from '../lib/personNames';
import { useAuth } from '../context/AuthContext';
import { BILLING_CONFIG_EMAILS } from '../lib/accessControl';

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
    { to: '/employees', icon: UserPlus, label: 'Employees' },
    { to: '/timesheets', icon: Clock, label: 'Timesheets' },
    { to: '/reports', icon: BarChart3, label: 'Reports' },
    { to: '/clients', icon: Landmark, label: 'Clients' },
    { to: '/vendors', icon: Building2, label: 'Vendors' },
    { to: '/billing-config', icon: Settings2, label: 'Billing Config', emailOnly: true },
];

function getInitials(name: string) {
    if (!name?.trim()) return '?';
    return name
        .trim()
        .split(/\s+/)
        .filter(n => n.length > 0)
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function getRoleBadge(role: string) {
    const map: Record<string, { label: string; color: string }> = {
        SUPER_ADMIN: { label: 'Super Admin', color: 'var(--color-danger)' },
        ADMIN: { label: 'Admin', color: 'var(--color-success)' },
        MANAGER: { label: 'Manager', color: 'var(--brand-purple)' },
        RECRUITER: { label: 'Recruiter', color: 'var(--color-info)' },
        VENDOR: { label: 'Vendor', color: 'var(--color-warning)' },
    };
    return map[role] ?? { label: role, color: 'var(--color-text-muted)' };
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
                {navItems
                    .filter(item => {
                        if (!user) return false;
                        if (user.role === 'SUPER_ADMIN') {
                            return item.to === '/employees';
                        }
                        // Billing Config: only visible to authorized emails
                        if ((item as { emailOnly?: boolean }).emailOnly) {
                            return BILLING_CONFIG_EMAILS.has((user.email ?? '').toLowerCase());
                        }
                        return true;
                    })
                    .map((item) => {
                        const label = (user?.role === 'SUPER_ADMIN' && item.to === '/employees') ? 'Create User' : item.label;
                        const active = isActive(item.to, item.exact);
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            title={collapsed ? label : undefined}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 group relative',
                                collapsed ? 'justify-center' : '',
                                active
                                    ? ''
                                    : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--sidebar-text-active)]'
                            )}
                            style={active ? {
                                backgroundColor: 'var(--sidebar-item-active)',
                                color: 'var(--sidebar-text-active)',
                            } : undefined}
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
                                {label}
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
                            {getInitials(formatPersonName(user.full_name))}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-white truncate leading-tight">
                                {formatPersonName(user.full_name)}
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
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 text-sm text-[var(--sidebar-text)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--sidebar-text-active)]',
                        collapsed ? 'justify-center' : ''
                    )}
                    title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                    aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
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
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 text-sm text-[var(--color-danger)] hover:bg-[rgba(239,68,68,0.1)]',
                        collapsed ? 'justify-center' : ''
                    )}
                    title={collapsed ? 'Logout' : undefined}
                    aria-label="Logout"
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
