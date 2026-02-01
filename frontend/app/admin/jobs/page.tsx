'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn, getUserRole } from '@/lib/auth';

export default function AdminJobsPage() {
    const router = useRouter();
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        if (!isLoggedIn()) {
            router.push('/login');
            return;
        }
        if (getUserRole() !== 'ADMIN') {
            router.push('/login');
            return;
        }
        setChecked(true);
    }, [router]);

    if (!checked) return null;

    return (
        <div style={{ padding: '40px' }}>
            <h1>Admin - Manage Jobs</h1>
            <p>Welcome! You are logged in as an ADMIN.</p>
            <p style={{ marginTop: '20px' }}>
                <a href="/login" onClick={() => localStorage.removeItem('token')}>
                    Logout
                </a>
            </p>
        </div>
    );
}
