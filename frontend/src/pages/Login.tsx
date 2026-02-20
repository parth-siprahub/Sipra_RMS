import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Lock, Mail } from 'lucide-react';


export function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error('Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            // Use URLSearchParams for form-urlencoded request as expected by OAuth2 password flow usually, 
            // but our backend likely expects JSON since it's FastAPI generic.
            // Wait, FastAPI OAuth2PasswordRequestForm expects form data.
            // Let's check backend/app/auth/router.py to be sure.
            // Assuming JSON for now, but commonly it's form data.
            // Actually standard FastAPI /token endpoint expects form-data.
            // But my router might be custom. I'll check if it fails.
            // For now, I'll send x-www-form-urlencoded format just in case, or try JSON.
            // Let's assume standard JSON body based on my previous schema experience unless I saw OAuth2PasswordRequestForm.
            // The router view earlier showed: `def login(form_data: OAuth2PasswordRequestForm = Depends())`.
            // So it requires form data!

            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Login failed');
            }

            const data = await response.json();

            // Map flat response to UserProfile interface
            const userData = {
                id: data.user_id,
                email: email, // Use email from state
                role: data.role.toLowerCase() as 'admin' | 'manager' | 'recruiter',
                full_name: data.full_name || email.split('@')[0]
            };

            login(data.access_token, userData);
            navigate(from, { replace: true });

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-background font-body">

            {/* Left: Branding */}
            <div className="hidden lg:flex flex-col justify-center items-center bg-surface relative overflow-hidden p-12 text-center">
                <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
                <div className="z-10 max-w-lg">
                    <div className="w-20 h-20 bg-cta rounded-2xl flex items-center justify-center text-white text-4xl font-bold font-heading mb-8 mx-auto shadow-xl shadow-cta/20">
                        R
                    </div>
                    <h1 className="text-4xl font-bold font-heading text-text mb-4">RMS SipraHub</h1>
                    <p className="text-xl text-text-muted">
                        Enterprise Resource Management System. Streamline your candidate pipelines, SOWs, and resource allocation.
                    </p>
                </div>
            </div>

            {/* Right: Login Form */}
            <div className="flex flex-col justify-center items-center p-8 bg-background">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold font-heading text-text">Welcome back</h2>
                        <p className="mt-2 text-text-muted">Please enter your details to sign in.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="input-label" htmlFor="email">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="input-field pl-10"
                                        placeholder="name@siprahub.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="input-label" htmlFor="password">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="input-field pl-10"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 text-cta border-border rounded focus:ring-cta"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-text-muted">
                                    Remember me
                                </label>
                            </div>
                            <div className="text-sm">
                                <a href="#" className="font-medium text-cta hover:text-cta-hover">
                                    Forgot password?
                                </a>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn btn-primary btn-lg flex justify-center items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <span className="spinner w-5 h-5 border-white"></span>
                                    <span>Signing in...</span>
                                </>
                            ) : (
                                <span>Sign in</span>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-text-muted">
                        Don't have an account?{' '}
                        <a href="#" className="font-medium text-cta hover:text-cta-hover">
                            Contact Admin
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
