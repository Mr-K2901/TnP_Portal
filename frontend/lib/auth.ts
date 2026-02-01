/**
 * Auth Helpers
 * Token management and user state
 */

export interface User {
    id: string;
    email: string;
    role: 'STUDENT' | 'ADMIN';
    profile?: {
        full_name: string;
        cgpa: number | null;
        branch: string;
        resume_url: string | null;
        is_placed: boolean;
    };
}

export interface TokenPayload {
    sub: string;
    role: 'STUDENT' | 'ADMIN';
    exp: number;
}

/**
 * Store token in localStorage
 */
export function setToken(token: string): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
    }
}

/**
 * Get token from localStorage
 */
export function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
}

/**
 * Remove token (logout)
 */
export function removeToken(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
    }
}

/**
 * Check if user is logged in
 */
export function isLoggedIn(): boolean {
    const token = getToken();
    if (!token) return false;

    // Check if token is expired
    try {
        const payload = parseToken(token);
        return payload.exp * 1000 > Date.now();
    } catch {
        return false;
    }
}

/**
 * Parse JWT token payload (without verification)
 */
export function parseToken(token: string): TokenPayload {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
        atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
    );
    return JSON.parse(jsonPayload);
}

/**
 * Get current user role from token
 */
export function getUserRole(): 'STUDENT' | 'ADMIN' | null {
    const token = getToken();
    if (!token) return null;

    try {
        const payload = parseToken(token);
        return payload.role;
    } catch {
        return null;
    }
}

/**
 * Get current user ID from token
 */
export function getUserId(): string | null {
    const token = getToken();
    if (!token) return null;

    try {
        const payload = parseToken(token);
        return payload.sub;
    } catch {
        return null;
    }
}
