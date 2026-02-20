import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';


interface UserProfile {
    id: string;
    email: string;
    role: 'admin' | 'manager' | 'recruiter';
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    // We can't use useNavigate here directly if AuthProvider is outside Router.
    // Assuming AuthProvider is wrapped by Router or handles redirection via window or separate effect.

    useEffect(() => {
        // Check for existing token and profile on mount
        const token = localStorage.getItem('rms_access_token');
        const savedUser = localStorage.getItem('rms_user_profile');

        if (token && savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (e) {
                console.error("Failed to parse user profile", e);
                localStorage.removeItem('rms_user_profile');
                localStorage.removeItem('rms_access_token');
            }
        }
        setIsLoading(false);
    }, []);

    const login = (token: string, userData: UserProfile) => {
        localStorage.setItem('rms_access_token', token);
        localStorage.setItem('rms_user_profile', JSON.stringify(userData));
        setUser(userData);
        toast.success(`Welcome back, ${userData.full_name}`);
    };

    const logout = () => {
        localStorage.removeItem('rms_access_token');
        localStorage.removeItem('rms_user_profile');
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
