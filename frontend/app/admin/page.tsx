'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn, getUserRole, removeToken } from '@/lib/auth';

// Modern color palette
const colors = {
    primary: '#4f46e5',
    secondary: '#64748b',
    success: '#10b981',
    warning: '#f59e0b',
    info: '#0ea5e9',
    background: '#f8fafc',
    card: '#ffffff',
    border: '#e2e8f0',
    text: '#1e293b',
    textMuted: '#64748b',
    headerBg: '#1e293b',
};

export default function AdminHomePage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (!isLoggedIn()) {
            router.push('/login');
            return;
        }
        if (getUserRole() !== 'ADMIN') {
            router.push('/login');
            return;
        }
        setMounted(true);
    }, [router]);

    const handleLogout = () => {
        removeToken();
        router.push('/login');
    };

    if (!mounted) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: colors.background, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted }}>
                Loading...
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: colors.background }}>
            {/* Header */}
            <header style={{ backgroundColor: colors.headerBg, padding: '16px 40px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{ color: '#fff', fontSize: '20px', margin: 0, fontWeight: 600 }}>TnP Admin</h1>
                    <nav style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                        <a href="/admin" style={{ color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>Home</a>
                        <a href="/admin/students" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px' }}>Students</a>
                        <a href="/admin/jobs" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px' }}>Jobs</a>
                        <button onClick={handleLogout} style={{ backgroundColor: 'transparent', border: '1px solid #475569', color: '#94a3b8', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>Logout</button>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main style={{ padding: '48px 40px', maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                    <h2 style={{ color: colors.text, fontSize: '32px', fontWeight: 700, margin: 0 }}>Welcome to TnP Portal</h2>
                    <p style={{ color: colors.textMuted, margin: '8px 0 0 0', fontSize: '16px' }}>Manage students, jobs, and applications from one place</p>
                </div>

                {/* Dashboard Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', maxWidth: '700px', margin: '0 auto' }}>
                    <a href="/admin/students" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{
                            padding: '32px 24px',
                            backgroundColor: colors.card,
                            borderRadius: '16px',
                            textAlign: 'center',
                            border: `1px solid ${colors.border}`,
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                            transition: 'transform 0.2s, box-shadow 0.2s'
                        }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '12px', backgroundColor: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px' }}>👥</div>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600, color: colors.text }}>Students</h3>
                            <p style={{ margin: 0, color: colors.textMuted, fontSize: '14px' }}>View and filter all students</p>
                        </div>
                    </a>

                    <a href="/admin/jobs" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{
                            padding: '32px 24px',
                            backgroundColor: colors.card,
                            borderRadius: '16px',
                            textAlign: 'center',
                            border: `1px solid ${colors.border}`,
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                            transition: 'transform 0.2s, box-shadow 0.2s'
                        }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '12px', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px' }}>💼</div>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600, color: colors.text }}>Jobs</h3>
                            <p style={{ margin: 0, color: colors.textMuted, fontSize: '14px' }}>Manage job postings & applications</p>
                        </div>
                    </a>
                </div>
            </main>
        </div>
    );
}

