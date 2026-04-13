import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { formatPersonName } from '../lib/personNames';
import { getAccessTokenExpiryMs } from '../lib/jwt';

/** If JWT has no exp (should not happen with Supabase), cap client session hint — override via VITE_SESSION_FALLBACK_MINUTES */
const FALLBACK_SESSION_MINUTES = Number(import.meta.env.VITE_SESSION_FALLBACK_MINUTES) || 480;

/** Log out slightly before the real JWT exp to avoid 401s mid-request */
const EXPIRY_BUFFER_MS = 3 * 60 * 1000;

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'RECRUITER' | 'VENDOR' | 'MANAGEMENT';

/** Helper: checks if the given role has admin-level privileges */
export function isAdminRole(role?: string): boolean {
    return role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'MANAGER' || role === 'MANAGEMENT';
}

interface UserProfile {
    id: string;
    email: string;
    role: UserRole;
    full_name: string;
}

interface AuthContextType {
    user: UserProfile | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (token: string, user: UserProfile, refreshToken?: string | null) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function clearAuthStorage() {
    localStorage.removeItem('rms_access_token');
    localStorage.removeItem('rms_user_profile');
    localStorage.removeItem('rms_token_expiry');
    localStorage.removeItem('rms_refresh_token');
}

function persistAccessTokenExpiry(accessToken: string) {
    const jwtExpMs = getAccessTokenExpiryMs(accessToken);
    if (jwtExpMs != null) {
        localStorage.setItem('rms_token_expiry', String(jwtExpMs - EXPIRY_BUFFER_MS));
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('rms_access_token');
        const savedUser = localStorage.getItem('rms_user_profile');

        if (token) {
            persistAccessTokenExpiry(token);
        }

        const expiry = localStorage.getItem('rms_token_expiry');
        if (expiry && Date.now() > parseInt(expiry, 10)) {
            clearAuthStorage();
            setIsLoading(false);
            return;
        }

        if (token && savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch {
                clearAuthStorage();
            }
        }
        setIsLoading(false);
    }, []);

    // Proactively refresh Supabase JWT before parallel API bursts (e.g. Timesheets) hit an expired access token
    useEffect(() => {
        const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000/api' : '');
        const tick = async () => {
            const token = localStorage.getItem('rms_access_token');
            const rt = localStorage.getItem('rms_refresh_token');
            if (!token || !rt || !API_URL) return;
            const exp = getAccessTokenExpiryMs(token);
            if (exp == null) return;
            const msLeft = exp - Date.now();
            if (msLeft > 120_000 || msLeft < -120_000) return;
            try {
                const res = await fetch(`${API_URL}/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token: rt }),
                });
                if (!res.ok) return;
                const data = (await res.json()) as { access_token: string; refresh_token?: string };
                if (!data.access_token) return;
                localStorage.setItem('rms_access_token', data.access_token);
                if (data.refresh_token) localStorage.setItem('rms_refresh_token', data.refresh_token);
                persistAccessTokenExpiry(data.access_token);
            } catch {
                /* ignore — next API call will try client.ts refresh */
            }
        };
        const id = window.setInterval(tick, 45_000);
        void tick();
        return () => window.clearInterval(id);
    }, []);

    const login = (token: string, userData: UserProfile, refreshToken?: string | null) => {
        const jwtExpMs = getAccessTokenExpiryMs(token);
        const expiresAt =
            jwtExpMs != null
                ? Math.max(Date.now(), jwtExpMs - EXPIRY_BUFFER_MS)
                : Date.now() + FALLBACK_SESSION_MINUTES * 60 * 1000;
        const displayName = formatPersonName(userData.full_name) || userData.full_name;
        const normalized: UserProfile = { ...userData, full_name: displayName };
        localStorage.setItem('rms_access_token', token);
        localStorage.setItem('rms_user_profile', JSON.stringify(normalized));
        localStorage.setItem('rms_token_expiry', expiresAt.toString());
        if (refreshToken) {
            localStorage.setItem('rms_refresh_token', refreshToken);
        } else {
            localStorage.removeItem('rms_refresh_token');
        }
        setUser(normalized);
        toast.success(`Welcome back, ${displayName}`);
    };

    const logout = () => {
        clearAuthStorage();
        setUser(null);
        toast.success('Logged out successfully');
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

