'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { isLoggedIn, getUserRole, removeToken } from '@/lib/auth';

interface ProfileResponse {
    user_id: string;
    full_name: string;
    cgpa: number | null;
    branch: string;
    resume_url: string | null;
    is_placed: boolean;
}

interface Job {
    id: string;
    company_name: string;
    role: string;
}

interface JobListResponse {
    jobs: Job[];
    total: number;
}

interface Application {
    job_id: string;
    status: 'APPLIED' | 'SHORTLISTED' | 'REJECTED';
    job: {
        company_name: string;
        role: string;
    } | null;
}

// Modern color palette (matching admin)
const colors = {
    primary: '#4f46e5',
    primaryHover: '#4338ca',
    secondary: '#64748b',
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
    info: '#0ea5e9',
    background: '#f8fafc',
    card: '#ffffff',
    border: '#e2e8f0',
    text: '#1e293b',
    textMuted: '#64748b',
    headerBg: '#1e293b',
};

export default function StudentHomePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<ProfileResponse | null>(null);
    const [applications, setApplications] = useState<Application[]>([]);
    const [totalJobs, setTotalJobs] = useState(0);
    const [placementCompany, setPlacementCompany] = useState('');

    useEffect(() => {
        if (!isLoggedIn()) {
            router.push('/login');
            return;
        }
        if (getUserRole() !== 'STUDENT') {
            router.push('/login');
            return;
        }
        fetchData();
    }, [router]);

    const fetchData = async () => {
        try {
            // Fetch profile
            const profileRes = await api.get<ProfileResponse>('/users/me/profile');
            setProfile(profileRes);

            // Fetch jobs count
            const jobsRes = await api.get<JobListResponse>('/jobs');
            setTotalJobs(jobsRes.jobs.length);

            // Fetch applications
            const appsRes = await api.get<{ applications: Application[] }>('/applications');
            setApplications(appsRes.applications);

            // Find placement company
            const placedApp = appsRes.applications.find(app => app.status === 'SHORTLISTED' && app.job);
            if (placedApp && placedApp.job) {
                setPlacementCompany(placedApp.job.company_name);
            }
        } catch {
            // Ignore errors - profile may not exist
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        removeToken();
        router.push('/login');
    };

    // Stats derived from applications
    const appliedCount = applications.length;
    const shortlistedCount = applications.filter(a => a.status === 'SHORTLISTED').length;
    const rejectedCount = applications.filter(a => a.status === 'REJECTED').length;
    const pendingCount = applications.filter(a => a.status === 'APPLIED').length;

    if (loading) {
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
                    <h1 style={{ color: '#fff', fontSize: '20px', margin: 0, fontWeight: 600 }}>TnP Portal</h1>
                    <nav style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                        <a href="/student" style={{ color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>Home</a>
                        <a href="/student/dashboard" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px' }}>Browse Jobs</a>
                        <a href="/student/applications" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px' }}>My Applications</a>
                        <button onClick={handleLogout} style={{ backgroundColor: 'transparent', border: '1px solid #475569', color: '#94a3b8', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>Logout</button>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
                {/* Welcome Banner */}
                <div style={{
                    background: `linear-gradient(135deg, ${colors.primary} 0%, #6366f1 100%)`,
                    borderRadius: '16px',
                    padding: '32px 40px',
                    marginBottom: '32px',
                    color: '#fff',
                    boxShadow: '0 4px 6px rgba(79, 70, 229, 0.25)'
                }}>
                    <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 600 }}>
                        Welcome, {profile?.full_name || 'Student'}! 👋
                    </h2>
                    <p style={{ margin: '8px 0 0 0', opacity: 0.9, fontSize: '16px' }}>
                        {profile?.is_placed
                            ? `Congratulations! You've been placed at ${placementCompany || 'a company'}.`
                            : 'Your placement journey starts here. Explore opportunities and apply!'}
                    </p>
                </div>

                {/* Status Card */}
                {profile?.is_placed ? (
                    <div style={{
                        backgroundColor: '#dcfce7',
                        borderRadius: '12px',
                        padding: '24px',
                        marginBottom: '32px',
                        border: '1px solid #86efac',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px'
                    }}>
                        <div style={{ fontSize: '40px' }}>🎉</div>
                        <div>
                            <h3 style={{ margin: 0, color: '#166534', fontSize: '18px' }}>Placement Confirmed</h3>
                            <p style={{ margin: '4px 0 0 0', color: '#15803d', fontSize: '15px' }}>
                                You have been placed at <strong>{placementCompany || 'Company'}</strong>
                            </p>
                        </div>
                    </div>
                ) : (
                    <div style={{
                        backgroundColor: '#fef3c7',
                        borderRadius: '12px',
                        padding: '24px',
                        marginBottom: '32px',
                        border: '1px solid #fcd34d',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px'
                    }}>
                        <div style={{ fontSize: '40px' }}>🎯</div>
                        <div>
                            <h3 style={{ margin: 0, color: '#92400e', fontSize: '18px' }}>Actively Looking</h3>
                            <p style={{ margin: '4px 0 0 0', color: '#a16207', fontSize: '15px' }}>
                                Keep applying! Your next opportunity is around the corner.
                            </p>
                        </div>
                    </div>
                )}

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
                    <div style={{
                        backgroundColor: colors.card,
                        borderRadius: '12px',
                        padding: '24px',
                        border: `1px solid ${colors.border}`,
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '32px', fontWeight: 700, color: colors.primary }}>{totalJobs}</div>
                        <div style={{ color: colors.textMuted, fontSize: '14px', marginTop: '4px' }}>Active Openings</div>
                    </div>
                    <div style={{
                        backgroundColor: colors.card,
                        borderRadius: '12px',
                        padding: '24px',
                        border: `1px solid ${colors.border}`,
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '32px', fontWeight: 700, color: colors.info }}>{appliedCount}</div>
                        <div style={{ color: colors.textMuted, fontSize: '14px', marginTop: '4px' }}>Jobs Applied</div>
                    </div>
                    <div style={{
                        backgroundColor: colors.card,
                        borderRadius: '12px',
                        padding: '24px',
                        border: `1px solid ${colors.border}`,
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '32px', fontWeight: 700, color: colors.warning }}>{pendingCount}</div>
                        <div style={{ color: colors.textMuted, fontSize: '14px', marginTop: '4px' }}>Pending</div>
                    </div>
                    <div style={{
                        backgroundColor: colors.card,
                        borderRadius: '12px',
                        padding: '24px',
                        border: `1px solid ${colors.border}`,
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '32px', fontWeight: 700, color: colors.success }}>{shortlistedCount}</div>
                        <div style={{ color: colors.textMuted, fontSize: '14px', marginTop: '4px' }}>Shortlisted</div>
                    </div>
                </div>

                {/* Profile Info */}
                <div style={{
                    backgroundColor: colors.card,
                    borderRadius: '12px',
                    padding: '24px',
                    border: `1px solid ${colors.border}`,
                    marginBottom: '32px'
                }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: colors.text, fontWeight: 600 }}>Your Profile</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                        <div>
                            <div style={{ fontSize: '13px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Branch</div>
                            <div style={{ fontSize: '16px', color: colors.text, marginTop: '4px', fontWeight: 500 }}>{profile?.branch || '-'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '13px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>CGPA</div>
                            <div style={{ fontSize: '16px', color: colors.text, marginTop: '4px', fontWeight: 500 }}>{profile?.cgpa?.toFixed(2) || '-'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '13px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</div>
                            <div style={{ marginTop: '4px' }}>
                                <span style={{
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    backgroundColor: profile?.is_placed ? '#dcfce7' : '#fef3c7',
                                    color: profile?.is_placed ? '#166534' : '#92400e'
                                }}>
                                    {profile?.is_placed ? 'Placed' : 'Active'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                    <a href="/student/dashboard" style={{ textDecoration: 'none' }}>
                        <div style={{
                            backgroundColor: colors.card,
                            borderRadius: '12px',
                            padding: '24px',
                            border: `1px solid ${colors.border}`,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px'
                        }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>💼</div>
                            <div>
                                <h4 style={{ margin: 0, color: colors.text, fontSize: '16px', fontWeight: 600 }}>Browse Jobs</h4>
                                <p style={{ margin: '4px 0 0 0', color: colors.textMuted, fontSize: '14px' }}>Explore {totalJobs} active openings</p>
                            </div>
                        </div>
                    </a>
                    <a href="/student/applications" style={{ textDecoration: 'none' }}>
                        <div style={{
                            backgroundColor: colors.card,
                            borderRadius: '12px',
                            padding: '24px',
                            border: `1px solid ${colors.border}`,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px'
                        }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📋</div>
                            <div>
                                <h4 style={{ margin: 0, color: colors.text, fontSize: '16px', fontWeight: 600 }}>My Applications</h4>
                                <p style={{ margin: '4px 0 0 0', color: colors.textMuted, fontSize: '14px' }}>Track your {appliedCount} application{appliedCount !== 1 ? 's' : ''}</p>
                            </div>
                        </div>
                    </a>
                </div>
            </main>
        </div>
    );
}
