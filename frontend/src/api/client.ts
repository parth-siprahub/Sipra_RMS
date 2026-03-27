import toast from 'react-hot-toast';

const API_URL = (() => {
    const url = import.meta.env.VITE_API_URL;
    if (!url && import.meta.env.PROD) {
        throw new Error('VITE_API_URL environment variable is required in production');
    }
    return url || 'http://localhost:8000';
})();

interface RequestOptions extends RequestInit {
    params?: Record<string, string | number | undefined>;
}

class ApiClient {
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

    private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
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
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const config: RequestInit = {
            ...init,
            headers: {
                ...this.getJsonHeaders(),
                ...init.headers,
            },
            signal: controller.signal,
        };

        try {
            const response = await fetch(url, config);
            clearTimeout(timeoutId);

            // Handle 401 Unauthorized globally
            if (response.status === 401) {
                localStorage.removeItem('rms_access_token');
                localStorage.removeItem('rms_user_profile');
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
                    const msg = 'Request timed out (30s). The server might be busy.';
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
    async download(endpoint: string, filename: string): Promise<void> {
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

            if (response.status === 401) {
                localStorage.removeItem('rms_access_token');
                localStorage.removeItem('rms_user_profile');
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
                    if (Array.isArray(errorData.detail)) {
                        errorMessage = errorData.detail
                            .map((d: { msg?: string }) => d.msg || 'Validation error')
                            .join('; ');
                    } else {
                        errorMessage = errorData.detail || errorData.message || errorMessage;
                    }
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
            headers: this.getAuthHeaders(),  // Auth only, NO Content-Type
        });
    }
}

export const api = new ApiClient();
