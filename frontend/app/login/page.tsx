'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { setToken, parseToken } from '@/lib/auth';
import { useTheme } from '@/context/ThemeContext';

interface LoginResponse {
    access_token: string;
    token_type: string;
}

export default function LoginPage() {
    const { colors, theme } = useTheme();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post<LoginResponse>(
                '/auth/login',
                { email, password },
                { requireAuth: false }
            );
            setToken(response.access_token);
            const payload = parseToken(response.access_token);
            router.push(payload.role === 'ADMIN' ? '/admin' : '/student');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleQuickLogin = async (role: 'ADMIN' | 'STUDENT') => {
        setLoading(true);
        const credentials = role === 'ADMIN'
            ? { email: 'admin1@tnp.com', password: 'admin1234' }
            : { email: 'student3@test.com', password: 'password123' };

        try {
            const response = await api.post<LoginResponse>('/auth/login', credentials, { requireAuth: false });
            setToken(response.access_token);
            const payload = parseToken(response.access_token);
            router.push(payload.role === 'ADMIN' ? '/admin' : '/student');
        } catch (err) {
            setError(`${role} login failed. Please check if the backend is running and the database is seeded.`);
        } finally { setLoading(false); }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.background,
            fontFamily: 'sans-serif',
            transition: 'background-color 0.3s'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '400px',
                backgroundColor: colors.card,
                borderRadius: '16px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                padding: '40px',
                border: `1px solid ${colors.border}`,
                transition: 'background-color 0.3s, border-color 0.3s'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        backgroundColor: colors.primary,
                        borderRadius: '12px',
                        margin: '0 auto 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px'
                    }}>
                        🎓
                    </div>
                    <h1 style={{ margin: '0 0 8px', color: colors.text, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em' }}>Welcome Back</h1>
                    <p style={{ margin: 0, color: colors.textMuted, fontSize: '14px' }}>Sign in to the TnP Portal</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label htmlFor="email" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: colors.textMuted }}>Email Address</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="you@college.edu"
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                fontSize: '14px',
                                border: `1px solid ${colors.border}`,
                                borderRadius: '8px',
                                outline: 'none',
                                boxSizing: 'border-box',
                                transition: 'border-color 0.2s',
                                backgroundColor: colors.inputBg,
                                color: colors.text
                            }}
                        />
                    </div>

                    <div>
                        <label htmlFor="password" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: colors.textMuted }}>Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                fontSize: '14px',
                                border: `1px solid ${colors.border}`,
                                borderRadius: '8px',
                                outline: 'none',
                                boxSizing: 'border-box',
                                transition: 'border-color 0.2s',
                                backgroundColor: colors.inputBg,
                                color: colors.text
                            }}
                        />
                    </div>

                    {error && (
                        <div style={{
                            padding: '12px',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            color: colors.danger,
                            borderRadius: '8px',
                            fontSize: '14px',
                            border: `1px solid ${colors.danger}40`
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '12px',
                            backgroundColor: loading ? colors.secondary : colors.primary,
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '15px',
                            fontWeight: 600,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            marginTop: '8px',
                            transition: 'background-color 0.2s'
                        }}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div style={{ margin: '32px 0', borderTop: `1px solid ${colors.border}`, position: 'relative' }}>
                    <span style={{
                        position: 'absolute',
                        top: '-10px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: colors.card,
                        padding: '0 12px',
                        color: colors.textMuted,
                        fontSize: '12px',
                        fontWeight: 500
                    }}>
                        DEV ACCESS
                    </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <button
                        onClick={() => handleQuickLogin('ADMIN')}
                        disabled={loading}
                        style={{
                            padding: '10px',
                            backgroundColor: colors.background,
                            border: `1px solid ${colors.border}`,
                            borderRadius: '8px',
                            color: colors.textMuted,
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        }}
                    >
                        <span>⚡</span> Admin
                    </button>
                    <button
                        onClick={() => handleQuickLogin('STUDENT')}
                        disabled={loading}
                        style={{
                            padding: '10px',
                            backgroundColor: colors.background,
                            border: `1px solid ${colors.border}`,
                            borderRadius: '8px',
                            color: colors.textMuted,
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        }}
                    >
                        <span>🎓</span> Student
                    </button>
                </div>
            </div>
        </div>
    );
}
