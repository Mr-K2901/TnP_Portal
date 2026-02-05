'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isLoggedIn, getUserRole } from '@/lib/auth';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/lib/api';

interface DashboardStats {
    activeJobs: number;
    totalStudents: number;
    pendingApplications: number;
}

export default function AdminHomePage() {
    const { colors } = useTheme();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [stats, setStats] = useState<DashboardStats>({
        activeJobs: 0,
        totalStudents: 0,
        pendingApplications: 0
    });
    const [loading, setLoading] = useState(true);

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
        fetchStats();
    }, [router]);

    const fetchStats = async () => {
        try {
            // Use the new admin stats endpoint
            const statsRes = await api.get<{
                active_jobs: number;
                total_students: number;
                pending_applications: number;
            }>('/admin/stats');

            setStats({
                activeJobs: statsRes.active_jobs,
                totalStudents: statsRes.total_students,
                pendingApplications: statsRes.pending_applications
            });
        } catch (err) {
            console.error('Failed to fetch dashboard stats:', err);
        } finally {
            setLoading(false);
        }
    };


    if (!mounted) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: colors.background, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted }}>
                Loading...
            </div>
        );
    }

    const statCards = [
        { label: 'Active Jobs', value: loading ? '...' : stats.activeJobs.toString(), icon: '💼', bgColor: 'rgba(79, 70, 229, 0.1)', textColor: colors.primary, href: '/admin/jobs' },
        { label: 'Total Students', value: loading ? '...' : stats.totalStudents.toString(), icon: '👥', bgColor: 'rgba(22, 163, 74, 0.1)', textColor: colors.success, href: '/admin/students' },
        { label: 'Pending Applications', value: loading ? '...' : stats.pendingApplications.toString(), icon: '📝', bgColor: 'rgba(217, 119, 6, 0.1)', textColor: colors.warning, href: '/admin/applications' }
    ];

    return (
        <div style={{ padding: '40px' }}>
            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ color: colors.text, fontSize: '28px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Dashboard Overview</h1>
                    <p style={{ color: colors.textMuted, margin: '4px 0 0 0', fontSize: '14px' }}>Welcome back. Here is what is happening today.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={() => router.push('/admin/jobs')}
                        style={{
                            padding: '10px 18px',
                            backgroundColor: colors.primary,
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                    >
                        Create Job Posting
                    </button>
                </div>
            </div>

            {/* Content Body */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                {/* Stat Cards */}
                {statCards.map((stat, i) => (
                    <Link key={i} href={stat.href} style={{ textDecoration: 'none' }}>
                        <div style={{
                            padding: '24px',
                            backgroundColor: colors.card,
                            borderRadius: '12px',
                            border: `1px solid ${colors.border}`,
                            transition: 'all 0.2s',
                            cursor: 'pointer'
                        }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '8px',
                                backgroundColor: stat.bgColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '20px',
                                marginBottom: '16px',
                                color: stat.textColor
                            }}>
                                {stat.icon}
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {stat.label}
                            </div>
                            <div style={{ fontSize: '32px', fontWeight: 700, color: colors.text, marginTop: '4px' }}>
                                {stat.value}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            <div style={{ marginTop: '32px' }}>
                <div style={{
                    backgroundColor: colors.card,
                    borderRadius: '12px',
                    border: `1px solid ${colors.border}`,
                    padding: '24px'
                }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: colors.text }}>System Notices</h3>
                    <div style={{
                        padding: '16px',
                        backgroundColor: colors.background,
                        borderRadius: '8px',
                        borderLeft: `4px solid ${colors.primary}`,
                        color: colors.text
                    }}>
                        <p style={{ margin: 0, fontSize: '14px', color: colors.text }}>
                            <strong>V3.0 Update:</strong> Navigation has been moved to the sidebar for a more streamlined experience.
                            Settings can now be accessed via the sidebar items.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
