import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const TOKEN_EXPIRY_MINUTES = 55; // slightly less than backend's 60min to avoid boundary issues

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
        const expiry = localStorage.getItem('rms_token_expiry');

        // Token expiry check — force logout if token is expired
        if (expiry && Date.now() > parseInt(expiry)) {
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
        const expiresAt = Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000;
        localStorage.setItem('rms_access_token', token);
        localStorage.setItem('rms_user_profile', JSON.stringify(userData));
        localStorage.setItem('rms_token_expiry', expiresAt.toString());
        setUser(userData);
        toast.success(`Welcome back, ${userData.full_name}`);
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

