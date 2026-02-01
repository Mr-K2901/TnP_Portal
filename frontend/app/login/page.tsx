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
                router.push('/admin/jobs');
            } else if (payload.role === 'STUDENT') {
                router.push('/student/dashboard');
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
                    }}
                >
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>

            <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
                <p><strong>Test Accounts:</strong></p>
                <p>Student: student@test.com / password123</p>
                <p>Admin: admin@tnp.com / admin12345</p>
            </div>
        </div>
    );
}
