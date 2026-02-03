'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { setToken, parseToken } from '@/lib/auth';

interface LoginResponse {
    access_token: string;
    token_type: string;
}

export default function LoginPage() {
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
            // Call login API
            const response = await api.post<LoginResponse>(
                '/auth/login',
                { email, password },
                { requireAuth: false }
            );

            // Store token
            setToken(response.access_token);

            // Decode role and redirect
            const payload = parseToken(response.access_token);

            if (payload.role === 'ADMIN') {
                router.push('/admin');
            } else if (payload.role === 'STUDENT') {
                router.push('/student');
            } else {
                router.push('/');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px' }}>
            <h1>TnP Portal - Login</h1>

            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '15px' }}>
                    <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{
                            width: '100%',
                            padding: '10px',
                            fontSize: '16px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                        }}
                    />
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label htmlFor="password" style={{ display: 'block', marginBottom: '5px' }}>
                        Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{
                            width: '100%',
                            padding: '10px',
                            fontSize: '16px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                        }}
                    />
                </div>

                {error && (
                    <div style={{
                        color: 'red',
                        marginBottom: '15px',
                        padding: '10px',
                        backgroundColor: '#ffe6e6',
                        borderRadius: '4px'
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
                        fontSize: '16px',
                        backgroundColor: loading ? '#ccc' : '#0070f3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        marginBottom: '10px'
                    }}
                >
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                    onClick={() => {
                        setEmail('admin@tnp.com');
                        setPassword('admin12345');
                        // Small delay to ensure state update before triggering submit if we wanted to auto-submit
                        // But let's just create a helper logic or just set values and let user click? 
                        // User said "get directly loged in", so I'll create a dedicated function.
                    }}
                    type="button"
                    style={{
                        flex: 1,
                        padding: '8px',
                        fontSize: '12px',
                        backgroundColor: '#1e293b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Fill Admin
                </button>
                <button
                    onClick={() => {
                        setEmail('student@test.com');
                        setPassword('password123');
                    }}
                    type="button"
                    style={{
                        flex: 1,
                        padding: '8px',
                        fontSize: '12px',
                        backgroundColor: '#64748b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Fill Student
                </button>
            </div>

            <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                <p style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>Quick Login (Dev Only):</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                        onClick={async () => {
                            setLoading(true);
                            try {
                                const response = await api.post<LoginResponse>('/auth/login', { email: 'admin@tnp.com', password: 'admin12345' }, { requireAuth: false });
                                setToken(response.access_token);
                                const payload = parseToken(response.access_token);
                                router.push(payload.role === 'ADMIN' ? '/admin' : '/');
                            } catch (err) {
                                setError('Admin login failed');
                            } finally { setLoading(false); }
                        }}
                        disabled={loading}
                        style={{
                            padding: '10px',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontSize: '13px'
                        }}
                    >
                        ⚡ <strong>Login as Admin</strong> (admin@tnp.com)
                    </button>
                    <button
                        onClick={async () => {
                            setLoading(true);
                            try {
                                const response = await api.post<LoginResponse>('/auth/login', { email: 'student@test.com', password: 'password123' }, { requireAuth: false });
                                setToken(response.access_token);
                                const payload = parseToken(response.access_token);
                                router.push(payload.role === 'STUDENT' ? '/student' : '/');
                            } catch (err) {
                                setError('Student login failed');
                            } finally { setLoading(false); }
                        }}
                        disabled={loading}
                        style={{
                            padding: '10px',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontSize: '13px'
                        }}
                    >
                        ⚡ <strong>Login as Student</strong> (student@test.com)
                    </button>
                </div>
            </div>

            <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
                <p><strong>Test Accounts:</strong></p>
                <p>Student: student@test.com / password123</p>
                <p>Admin: admin@tnp.com / admin12345</p>
            </div>
        </div>
    );
}
