/**
 * API Fetch Wrapper
 * Centralized API calls with automatic token handling
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface FetchOptions extends RequestInit {
    requireAuth?: boolean;
}

/**
 * Get stored auth token
 */
function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
}

/**
 * Fetch wrapper with auth and error handling
 */
export async function apiFetch<T>(
    endpoint: string,
    options: FetchOptions = {}
): Promise<T> {
    const { requireAuth = true, ...fetchOptions } = options;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // Add auth token if required
    if (requireAuth) {
        const token = getToken();
        if (token) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
        }
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...fetchOptions,
        headers,
    });

    // Handle non-OK responses
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
        return null as T;
    }

    return response.json();
}

// Convenience methods
export const api = {
    get: <T>(endpoint: string, options?: FetchOptions) =>
        apiFetch<T>(endpoint, { ...options, method: 'GET' }),

    post: <T>(endpoint: string, body: unknown, options?: FetchOptions) =>
        apiFetch<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),

    patch: <T>(endpoint: string, body: unknown, options?: FetchOptions) =>
        apiFetch<T>(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }),

    put: <T>(endpoint: string, body: unknown, options?: FetchOptions) =>
        apiFetch<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),

    delete: <T>(endpoint: string, options?: FetchOptions) =>
        apiFetch<T>(endpoint, { ...options, method: 'DELETE' }),
};
