import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Sun, Moon, Bell, Search, User } from 'lucide-react';


export function Header() {
    const { theme, setTheme } = useTheme();
    const { user } = useAuth();

    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    return (
        <header className="h-header bg-surface/80 backdrop-blur-md border-b border-border sticky top-0 z-header px-6 flex items-center justify-between transition-colors">

            {/* Left: Page Title / Breadcrumbs (Placeholder) */}
            <div className="flex items-center gap-4">
                {/* We can add dynamic breadcrumbs later */}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-4">

                {/* Search Bar */}
                <div className="hidden md:flex items-center relative">
                    <Search size={16} className="absolute left-3 text-text-muted top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="pl-9 pr-4 py-1.5 rounded-full bg-background border border-border text-sm focus:outline-none focus:border-cta transition-all w-64 placeholder:text-text-muted text-text"
                    />
                </div>

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full hover:bg-surface-active text-text-muted hover:text-cta transition-colors"
                    title="Toggle Theme"
                >
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                {/* Notifications */}
                <button className="p-2 rounded-full hover:bg-surface-active text-text-muted hover:text-cta transition-colors relative">
                    <Bell size={20} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full border-2 border-surface"></span>
                </button>

                {/* User Profile */}
                <div className="flex items-center gap-3 pl-2 border-l border-border/50">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-medium text-text leading-tight">{user?.full_name || 'User'}</p>
                        <p className="text-xs text-text-muted capitalize">{user?.role || 'Guest'}</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-border">
                        {user?.full_name ? user.full_name.charAt(0).toUpperCase() : <User size={18} />}
                    </div>
                </div>

            </div>
        </header>
    );
}
