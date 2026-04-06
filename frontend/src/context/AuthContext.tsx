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
    login: (token: string, user: UserProfile) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function clearAuthStorage() {
    localStorage.removeItem('rms_access_token');
    localStorage.removeItem('rms_user_profile');
    localStorage.removeItem('rms_token_expiry');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('rms_access_token');
        const savedUser = localStorage.getItem('rms_user_profile');

        if (token) {
            const jwtExpMs = getAccessTokenExpiryMs(token);
            if (jwtExpMs != null) {
                localStorage.setItem('rms_token_expiry', String(jwtExpMs - EXPIRY_BUFFER_MS));
            }
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

    const login = (token: string, userData: UserProfile) => {
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

