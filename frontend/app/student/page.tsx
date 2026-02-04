'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { isLoggedIn, getUserRole } from '@/lib/auth';
import { useTheme } from '@/context/ThemeContext';

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

export default function StudentHomePage() {
    const { colors } = useTheme();
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
        <div style={{ padding: '40px' }}>
            {/* Page Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ color: colors.text, fontSize: '28px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Dashboard</h1>
                <p style={{ color: colors.textMuted, margin: '4px 0 0 0', fontSize: '14px' }}>Welcome back to your placement portal</p>
            </div>

            {/* Main Content */}
            <div style={{ maxWidth: '100%' }}>
                {/* Welcome Banner */}
                <div style={{
                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryHover} 100%)`,
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
                        backgroundColor: 'rgba(220, 252, 231, 0.2)', // transparent green
                        borderRadius: '12px',
                        padding: '24px',
                        marginBottom: '32px',
                        border: `1px solid ${colors.success}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px'
                    }}>
                        <div style={{ fontSize: '40px' }}>🎉</div>
                        <div>
                            <h3 style={{ margin: 0, color: colors.success, fontSize: '18px' }}>Placement Confirmed</h3>
                            <p style={{ margin: '4px 0 0 0', color: colors.success, fontSize: '15px', opacity: 0.9 }}>
                                You have been placed at <strong>{placementCompany || 'your selected company'}</strong>
                            </p>
                        </div>
                    </div>
                ) : (
                    <div style={{
                        backgroundColor: 'rgba(254, 243, 199, 0.2)', // transparent amber
                        borderRadius: '12px',
                        padding: '24px',
                        marginBottom: '32px',
                        border: `1px solid ${colors.warning}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px'
                    }}>
                        <div style={{ fontSize: '40px' }}>🎯</div>
                        <div>
                            <h3 style={{ margin: 0, color: colors.warning, fontSize: '18px' }}>Actively Looking</h3>
                            <p style={{ margin: '4px 0 0 0', color: colors.warning, fontSize: '15px', opacity: 0.9 }}>
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
                                    backgroundColor: profile?.is_placed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                    color: profile?.is_placed ? colors.success : colors.warning
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
                            <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: 'rgba(79, 70, 229, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>💼</div>
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
                            <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📋</div>
                            <div>
                                <h4 style={{ margin: 0, color: colors.text, fontSize: '16px', fontWeight: 600 }}>My Applications</h4>
                                <p style={{ margin: '4px 0 0 0', color: colors.textMuted, fontSize: '14px' }}>Track your {appliedCount} application{appliedCount !== 1 ? 's' : ''}</p>
                            </div>
                        </div>
                    </a>
                </div>
            </div>
        </div>
    );
}
