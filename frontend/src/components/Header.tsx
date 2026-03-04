import { useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Bell } from 'lucide-react';

const ROUTE_LABELS: Record<string, string> = {
    '/': 'Dashboard Overview',
    '/resource-requests': 'Staffing Requests',
    '/candidates': 'Candidate Pipeline',
    '/job-profiles': 'Job Profiles',
    '/sows': 'Statement of Work',
    '/communication-logs': 'Interaction History',
    '/vendors': 'Partner Vendors',
};

export function Header() {
    const { theme, setTheme } = useTheme();
    const location = useLocation();

    const pageTitle = ROUTE_LABELS[location.pathname] ?? 'Management Console';
    const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

    return (
        <header
            className="sticky top-0 z-[50] flex items-center justify-between px-6 backdrop-blur-md transition-all duration-200"
            style={{
                height: 'var(--header-height)',
                backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                borderBottom: '1px solid var(--color-border)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
            }}
        >
            {/* Page title */}
            <div className="flex flex-col">
                <h1
                    className="text-lg font-bold tracking-tight"
                    style={{ color: 'var(--color-text)', margin: 0 }}
                >
                    {pageTitle}
                </h1>
            </div>

            <div className="flex items-center gap-3">
                {/* Notification Icon */}
                <button
                    className="relative p-2 rounded-xl text-text-muted hover:text-cta hover:bg-surface-hover transition-all cursor-pointer group"
                    title="Notifications"
                >
                    <Bell size={19} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-cta rounded-full border-2 border-surface animate-pulse" />
                </button>

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    aria-label="Toggle theme"
                    title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    className="flex items-center justify-center p-2 rounded-xl text-text-muted hover:text-cta hover:bg-surface-hover transition-all cursor-pointer"
                >
                    {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
                </button>
            </div>
        </header>
    );
}
