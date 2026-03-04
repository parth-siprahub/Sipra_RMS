import { useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const ROUTE_LABELS: Record<string, string> = {
    '/': 'Dashboard',
    '/resource-requests': 'Resource Requests',
    '/candidates': 'Candidates',
    '/job-profiles': 'Job Profiles',
    '/sows': 'SOWs',
    '/communication-logs': 'Communication Logs',
    '/vendors': 'Vendors',
};

export function Header() {
    const { theme, setTheme } = useTheme();
    const location = useLocation();

    const pageTitle = ROUTE_LABELS[location.pathname] ?? 'Page';
    const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

    return (
        <header
            className="sticky top-0 z-[50] flex items-center justify-between px-6 transition-colors"
            style={{
                height: 'var(--header-height)',
                backgroundColor: 'var(--color-surface)',
                borderBottom: '1px solid var(--color-border)',
            }}
        >
            {/* Page title */}
            <h1
                className="text-base font-semibold"
                style={{ color: 'var(--color-text)', letterSpacing: '-0.01em', margin: 0 }}
            >
                {pageTitle}
            </h1>

            {/* Actions — theme toggle only; user is in sidebar */}
            <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="flex items-center justify-center w-8 h-8 rounded-lg transition-all cursor-pointer"
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-surface-active)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--color-cta)';
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)';
                }}
            >
                {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
        </header>
    );
}
