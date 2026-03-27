import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
    Lock,
    Mail,
    Eye,
    EyeOff,
    AlertCircle,
    BarChart3,
    Users,
    FileCheck,
    ArrowRight,
} from 'lucide-react';

const FEATURES = [
    { icon: Users, text: 'Manage full candidate lifecycle' },
    { icon: BarChart3, text: 'Real-time pipeline dashboards' },
    { icon: FileCheck, text: 'SOW & vendor tracking' },
];

export function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || '/';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '')}/auth/login`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                }
            );

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Invalid email or password');
            }

            const data = await response.json();
            const userData = {
                id: data.user_id,
                email,
                role: data.role.toUpperCase() as 'ADMIN' | 'RECRUITER',
                full_name: data.full_name || email.split('@')[0],
            };

            login(data.access_token, userData);
            toast.success('Welcome back!');
            navigate(from, { replace: true });
        } catch (err: unknown) {
            console.error(err);
            const message = err instanceof Error ? err.message : 'An unexpected error occurred';
            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* ── Left — Dark Branding Panel ─────────────────── */}
            <div
                className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden w-[42%] flex-shrink-0"
                style={{ backgroundColor: '#0B1120' }}
            >
                {/* Subtle grid texture */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage:
                            'radial-gradient(rgba(22,163,74,0.08) 1px, transparent 1px)',
                        backgroundSize: '32px 32px',
                    }}
                />
                {/* Green glow blob */}
                <div
                    className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full pointer-events-none"
                    style={{
                        background: 'radial-gradient(circle, rgba(22,163,74,0.18) 0%, transparent 70%)',
                    }}
                />
                <div
                    className="absolute top-0 right-0 w-64 h-64 pointer-events-none"
                    style={{
                        background: 'radial-gradient(circle, rgba(3,105,161,0.12) 0%, transparent 70%)',
                    }}
                />

                {/* Logo */}
                <div className="relative z-10 flex items-center gap-3">
                    <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                        style={{
                            background: 'linear-gradient(135deg, #16A34A 0%, #0F9C42 100%)',
                            boxShadow: '0 0 20px rgba(22,163,74,0.4)',
                        }}
                    >
                        R
                    </div>
                    <span className="text-white font-bold text-lg tracking-tight">SipraHub RMS</span>
                </div>

                {/* Hero content */}
                <div className="relative z-10 space-y-8">
                    <div className="space-y-4">
                        <div
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border"
                            style={{
                                backgroundColor: 'rgba(22,163,74,0.12)',
                                borderColor: 'rgba(22,163,74,0.25)',
                                color: '#4ADE80',
                            }}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            Platform Active
                        </div>
                        <h1
                            className="text-4xl font-bold leading-tight"
                            style={{ color: '#F0F6FF', letterSpacing: '-0.03em' }}
                        >
                            Resource Pipeline,
                            <br />
                            <span style={{ color: '#4ADE80' }}>Simplified.</span>
                        </h1>
                        <p className="text-base leading-relaxed" style={{ color: 'rgba(148,163,184,0.9)' }}>
                            End-to-end management of candidates, SOWs, vendors,
                            and resource requests — all in one place.
                        </p>
                    </div>

                    {/* Feature list */}
                    <div className="space-y-3">
                        {FEATURES.map(({ icon: Icon, text }) => (
                            <div key={text} className="flex items-center gap-3">
                                <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ backgroundColor: 'rgba(22,163,74,0.15)' }}
                                >
                                    <Icon size={15} style={{ color: '#4ADE80' }} />
                                </div>
                                <span className="text-sm" style={{ color: 'rgba(203,213,225,0.85)' }}>
                                    {text}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="relative z-10">
                    <p className="text-xs" style={{ color: 'rgba(100,116,139,0.7)' }}>
                        © 2026 SipraHub · Internal Use Only
                    </p>
                </div>
            </div>

            {/* ── Right — Login Form ──────────────────────────── */}
            <div
                className="flex-1 flex flex-col justify-center items-center p-8 lg:p-14"
                style={{ backgroundColor: 'var(--color-background)' }}
            >
                <div className="w-full max-w-[400px]">
                    {/* Mobile logo (shown on small screens) */}
                    <div className="lg:hidden flex items-center gap-2 mb-10">
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm"
                            style={{ background: 'linear-gradient(135deg, #16A34A, #0F9C42)' }}
                        >
                            R
                        </div>
                        <span className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>
                            SipraHub RMS
                        </span>
                    </div>

                    {/* Heading */}
                    <div className="mb-8">
                        <h2
                            className="text-2xl font-bold"
                            style={{ color: 'var(--color-text)', letterSpacing: '-0.025em' }}
                        >
                            Sign in to your account
                        </h2>
                        <p className="mt-1.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            Use your SipraHub credentials to continue.
                        </p>
                    </div>

                    {/* Error alert */}
                    {error && (
                        <div
                            className="flex items-start gap-3 p-3.5 rounded-xl mb-6 text-sm font-medium"
                            style={{
                                backgroundColor: 'var(--color-danger-bg)',
                                color: 'var(--color-danger-text)',
                                border: '1px solid rgba(239,68,68,0.2)',
                            }}
                        >
                            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div className="space-y-1.5">
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium"
                                style={{ color: 'var(--color-text)' }}
                            >
                                Email address
                            </label>
                            <div className="relative">
                                <Mail
                                    size={16}
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                                    style={{ color: 'var(--color-text-muted)' }}
                                />
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@siprahub.com"
                                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl transition-all"
                                    style={{
                                        backgroundColor: 'var(--color-surface)',
                                        border: '1px solid var(--color-border)',
                                        color: 'var(--color-text)',
                                        outline: 'none',
                                        boxShadow: 'var(--shadow-xs)',
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = 'var(--color-cta)';
                                        e.target.style.boxShadow = '0 0 0 3px var(--color-cta-glow)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = 'var(--color-border)';
                                        e.target.style.boxShadow = 'var(--shadow-xs)';
                                    }}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium"
                                style={{ color: 'var(--color-text)' }}
                            >
                                Password
                            </label>
                            <div className="relative">
                                <Lock
                                    size={16}
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                                    style={{ color: 'var(--color-text-muted)' }}
                                />
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-11 py-2.5 text-sm rounded-xl transition-all"
                                    style={{
                                        backgroundColor: 'var(--color-surface)',
                                        border: '1px solid var(--color-border)',
                                        color: 'var(--color-text)',
                                        outline: 'none',
                                        boxShadow: 'var(--shadow-xs)',
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = 'var(--color-cta)';
                                        e.target.style.boxShadow = '0 0 0 3px var(--color-cta-glow)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = 'var(--color-border)';
                                        e.target.style.boxShadow = 'var(--shadow-xs)';
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors"
                                    style={{ color: 'var(--color-text-muted)' }}
                                    onMouseEnter={(e) =>
                                    ((e.currentTarget as HTMLElement).style.color =
                                        'var(--color-text)')
                                    }
                                    onMouseLeave={(e) =>
                                    ((e.currentTarget as HTMLElement).style.color =
                                        'var(--color-text-muted)')
                                    }
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Remember + Forgot */}
                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 cursor-pointer" style={{ color: 'var(--color-text-muted)' }}>
                                <input
                                    type="checkbox"
                                    id="remember-me"
                                    className="w-3.5 h-3.5 rounded accent-green-600 cursor-pointer"
                                />
                                Remember me
                            </label>
                            <a
                                href="#"
                                className="font-medium transition-colors"
                                style={{ color: 'var(--color-cta)' }}
                                onMouseEnter={(e) =>
                                ((e.currentTarget as HTMLElement).style.color =
                                    'var(--color-cta-hover)')
                                }
                                onMouseLeave={(e) =>
                                ((e.currentTarget as HTMLElement).style.color =
                                    'var(--color-cta)')
                                }
                            >
                                Forgot password?
                            </a>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition-all mt-2"
                            style={{
                                background: loading
                                    ? 'var(--color-cta)'
                                    : 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                                boxShadow: '0 4px 14px var(--color-cta-glow)',
                                opacity: loading ? 0.75 : 1,
                                cursor: loading ? 'not-allowed' : 'pointer',
                            }}
                            onMouseEnter={(e) => {
                                if (!loading)
                                    (e.currentTarget as HTMLElement).style.boxShadow =
                                        '0 6px 20px rgba(22,163,74,0.35)';
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.boxShadow =
                                    '0 4px 14px var(--color-cta-glow)';
                            }}
                        >
                            {loading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Signing in…
                                </>
                            ) : (
                                <>
                                    Sign in
                                    <ArrowRight size={15} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <p className="mt-8 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        No account?{' '}
                        <a
                            href="#"
                            className="font-medium"
                            style={{ color: 'var(--color-cta)' }}
                        >
                            Contact your admin
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
