'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUserRole, isLoggedIn } from '@/lib/auth';
import Sidebar from './Sidebar';
import { useTheme } from '@/context/ThemeContext';

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
    const { colors } = useTheme();
    const router = useRouter();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [role, setRole] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (!isLoggedIn()) {
            router.push('/login');
            return;
        }
        setRole(getUserRole());
        setIsReady(true);
    }, [router]);

    if (!isReady) return null;

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: colors.background }}>
            <Sidebar
                isCollapsed={isCollapsed}
                toggleSidebar={() => setIsCollapsed(!isCollapsed)}
                role={role}
            />

            {/* Main Content */}
            <main style={{
                flex: 1,
                marginLeft: isCollapsed ? '80px' : '260px',
                transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                minHeight: '100vh',
                position: 'relative'
            }}>
                {children}
            </main>
        </div>
    );
}
