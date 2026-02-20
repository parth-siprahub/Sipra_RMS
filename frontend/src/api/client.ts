import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface RequestOptions extends RequestInit {
    params?: Record<string, string | number | undefined>;
}

class ApiClient {
    private getHeaders(): HeadersInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        // Auto-inject token if available
        const token = localStorage.getItem('rms_access_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
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

        const config: RequestInit = {
            ...init,
            headers: {
                ...this.getHeaders(),
                ...init.headers,
            },
        };

        try {
            const response = await fetch(url, config);

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
                    errorMessage = errorData.detail || errorData.message || errorMessage;
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
            if (error instanceof Error && error.message !== 'Unauthorized') {
                toast.error(error.message);
            }
            throw error;
        }
    }

    get<T>(endpoint: string, params?: RequestOptions['params']) {
        return this.request<T>(endpoint, { method: 'GET', params });
    }

    post<T>(endpoint: string, body: any) {
        return this.request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) });
    }

    patch<T>(endpoint: string, body: any) {
        return this.request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) });
    }

    put<T>(endpoint: string, body: any) {
        return this.request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) });
    }

    delete<T>(endpoint: string) {
        return this.request<T>(endpoint, { method: 'DELETE' });
    }
}

export const api = new ApiClient();
