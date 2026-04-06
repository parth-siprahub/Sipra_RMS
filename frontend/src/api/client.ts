import toast from 'react-hot-toast';
import { getAccessTokenExpiryMs } from '../lib/jwt';

const API_URL = (() => {
    const url = import.meta.env.VITE_API_URL;
    if (!url && import.meta.env.PROD) {
        throw new Error('VITE_API_URL environment variable is required in production');
    }
    return url || 'http://localhost:8000';
})();

interface RequestOptions extends RequestInit {
    params?: Record<string, string | number | boolean | undefined>;
}

/** Align with AuthContext: log out slightly before JWT exp */
const EXPIRY_BUFFER_MS = 3 * 60 * 1000;

class ApiClient {
    /** Supabase refresh: get new access token without full-page login */
    private async tryRefreshSession(): Promise<boolean> {
        const rt = localStorage.getItem('rms_refresh_token');
        if (!rt) return false;
        try {
            const response = await fetch(`${API_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: rt }),
            });
            if (!response.ok) return false;
            const data = (await response.json()) as { access_token: string; refresh_token?: string };
            if (!data.access_token) return false;
            localStorage.setItem('rms_access_token', data.access_token);
            if (data.refresh_token) {
                localStorage.setItem('rms_refresh_token', data.refresh_token);
            }
            const jwtExpMs = getAccessTokenExpiryMs(data.access_token);
            if (jwtExpMs != null) {
                localStorage.setItem('rms_token_expiry', String(jwtExpMs - EXPIRY_BUFFER_MS));
            }
            return true;
        } catch {
            return false;
        }
    }

    private getAuthHeaders(): HeadersInit {
        const headers: HeadersInit = {};
        const token = localStorage.getItem('rms_access_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    private getJsonHeaders(): HeadersInit {
        return {
            ...this.getAuthHeaders(),
            'Content-Type': 'application/json',
        };
    }

    private async request<T>(endpoint: string, options: RequestOptions = {}, isAfterRefresh = false): Promise<T> {
        const { params, ...init } = options;

        let url = `${API_URL}${endpoint}`;

        if (params) {
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    searchParams.append(key, String(value));
                }
            });
            const queryString = searchParams.toString();
            if (queryString) {
                url += `?${queryString}`;
            }
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000);

        // For FormData uploads, do NOT set Content-Type — let the browser
        // auto-set multipart/form-data with the correct boundary.
        const isFormData = init.body instanceof FormData;
        // Put auth headers last so retries after refresh always send the new Bearer token
        const config: RequestInit = {
            ...init,
            headers: {
                ...(init.headers as Record<string, string> | undefined),
                ...(isFormData ? this.getAuthHeaders() : this.getJsonHeaders()),
            },
            signal: controller.signal,
        };

        try {
            const response = await fetch(url, config);
            clearTimeout(timeoutId);

            // 401: refresh Supabase session once, then retry (fixes expiry on heavy pages e.g. Timesheets)
            if (response.status === 401 && !isAfterRefresh) {
                const refreshed = await this.tryRefreshSession();
                if (refreshed) {
                    return this.request<T>(endpoint, options, true);
                }
            }

            if (response.status === 401) {
                localStorage.removeItem('rms_access_token');
                localStorage.removeItem('rms_user_profile');
                localStorage.removeItem('rms_token_expiry');
                localStorage.removeItem('rms_refresh_token');
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                    toast.error('Session expired. Please login again.');
                }
                throw new Error('Unauthorized');
            }

            if (!response.ok) {
                let errorMessage = 'An error occurred';
                try {
                    const errorData = await response.json();
                    if (Array.isArray(errorData.detail)) {
                        errorMessage = errorData.detail
                            .map((d: { msg?: string }) => d.msg || 'Validation error')
                            .join('; ');
                    } else {
                        errorMessage = errorData.detail || errorData.message || errorMessage;
                    }
                } catch (e) {
                    // Ignore JSON parse error on non-JSON error responses
                }
                throw new Error(errorMessage);
            }

            // Check if response has content
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }

            return {} as T;

        } catch (error) {
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    const msg = 'Request timed out (300s). The server might be busy.';
                    toast.error(msg);
                    throw new Error(msg);
                }
                if (error.message !== 'Unauthorized') {
                    toast.error(error.message);
                }
            }
            throw error;
        }
    }

    get<T>(endpoint: string, params?: RequestOptions['params']) {
        return this.request<T>(endpoint, { method: 'GET', params });
    }

    post<T>(endpoint: string, body: unknown) {
        return this.request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) });
    }

    patch<T>(endpoint: string, body: unknown) {
        return this.request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) });
    }

    put<T>(endpoint: string, body: unknown) {
        return this.request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) });
    }

    delete<T>(endpoint: string) {
        return this.request<T>(endpoint, { method: 'DELETE' });
    }

    /**
     * Download a file from the API as a blob and trigger a browser download.
     * Uses the same Bearer token auth as get().
     */
    async download(endpoint: string, filename: string, isAfterRefresh = false): Promise<void> {
        const url = `${API_URL}${endpoint}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getAuthHeaders(),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (response.status === 401 && !isAfterRefresh) {
                const refreshed = await this.tryRefreshSession();
                if (refreshed) {
                    return this.download(endpoint, filename, true);
                }
            }

            if (response.status === 401) {
                localStorage.removeItem('rms_access_token');
                localStorage.removeItem('rms_user_profile');
                localStorage.removeItem('rms_token_expiry');
                localStorage.removeItem('rms_refresh_token');
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                    toast.error('Session expired. Please login again.');
                }
                throw new Error('Unauthorized');
            }

            if (!response.ok) {
                let errorMessage = 'Download failed';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.detail || errorData.message || errorMessage;
                } catch {
                    // non-JSON error response
                }
                throw new Error(errorMessage);
            }

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(objectUrl);
        } catch (error) {
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    const msg = 'Download timed out (60s). The server might be busy.';
                    toast.error(msg);
                    throw new Error(msg);
                }
                if (error.message !== 'Unauthorized') {
                    toast.error(error.message);
                }
            }
            throw error;
        }
    }

    /**
     * Upload a file (FormData) — does NOT set Content-Type header
     * so the browser auto-sets multipart/form-data with boundary.
     * C1 fix: Previously, upload went through post() which JSON.stringify'd the FormData.
     */
    upload<T>(endpoint: string, formData: FormData): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: formData,
            headers: this.getAuthHeaders(), // Auth only, NO Content-Type
        });
    }
}

export const api = new ApiClient();
