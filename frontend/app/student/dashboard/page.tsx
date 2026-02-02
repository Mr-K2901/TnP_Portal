'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { isLoggedIn, getUserRole, removeToken } from '@/lib/auth';

interface Job {
    id: string;
    company_name: string;
    role: string;
    ctc: string | null;
    min_cgpa: number;
    is_active: boolean;
    jd_link: string | null;
    created_at: string;
}

interface JobListResponse {
    jobs: Job[];
    total: number;
    page: number;
    limit: number;
}

interface Application {
    job_id: string;
    status: 'APPLIED' | 'SHORTLISTED' | 'REJECTED';
    job: {
        company_name: string;
        role: string;
    } | null;
}

interface ProfileResponse {
    user_id: string;
    full_name: string;
    cgpa: number | null;
    branch: string;
    resume_url: string | null;
    is_placed: boolean;
}

// Modern color palette
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

export default function StudentDashboardPage() {
    const router = useRouter();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [applicationStatus, setApplicationStatus] = useState<Map<string, string>>(new Map());
    const [applyingTo, setApplyingTo] = useState<string | null>(null);
    const [isPlaced, setIsPlaced] = useState(false);
    const [profileName, setProfileName] = useState('');
    const [studentCgpa, setStudentCgpa] = useState<number | null>(null);

    useEffect(() => {
        if (!isLoggedIn()) {
            router.push('/login');
            return;
        }
        if (getUserRole() !== 'STUDENT') {
            router.push('/login');
            return;
        }
        fetchProfile();
        fetchJobs();
        fetchMyApplications();
    }, [router]);

    const fetchProfile = async () => {
        try {
            const response = await api.get<ProfileResponse>('/users/me/profile');
            setIsPlaced(response.is_placed);
            setProfileName(response.full_name);
            setStudentCgpa(response.cgpa);
        } catch {
            setStudentCgpa(null);
        }
    };

    const fetchJobs = async () => {
        try {
            const response = await api.get<JobListResponse>('/jobs');
            setJobs(response.jobs);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
        } finally {
            setLoading(false);
        }
    };

    const fetchMyApplications = async () => {
        try {
            const response = await api.get<{ applications: Application[] }>('/applications');
            const statusMap = new Map<string, string>();
            response.applications.forEach(app => {
                statusMap.set(app.job_id, app.status);
            });
            setApplicationStatus(statusMap);
        } catch {
            // Ignore
        }
    };

    const handleApply = async (jobId: string) => {
        setApplyingTo(jobId);
        try {
            await api.post('/applications', { job_id: jobId });
            setApplicationStatus(prev => new Map(prev).set(jobId, 'APPLIED'));
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to apply');
        } finally {
            setApplyingTo(null);
        }
    };

    const handleLogout = () => {
        removeToken();
        router.push('/login');
    };

    const isEligible = (job: Job): boolean => {
        if (studentCgpa === null) return false;
        return studentCgpa >= job.min_cgpa;
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, { bg: string; color: string; label: string }> = {
            'APPLIED': { bg: '#dbeafe', color: '#1e40af', label: 'Applied' },
            'SHORTLISTED': { bg: '#dcfce7', color: '#166534', label: 'Shortlisted' },
            'REJECTED': { bg: '#fef2f2', color: '#991b1b', label: 'Rejected' },
        };
        const style = styles[status] || { bg: '#f1f5f9', color: '#475569', label: status };
        return (
            <span style={{
                padding: '8px 16px',
                borderRadius: '6px',
                backgroundColor: style.bg,
                color: style.color,
                fontWeight: 600,
                fontSize: '13px',
                letterSpacing: '0.3px',
            }}>
                {style.label}
            </span>
        );
    };

    const getActionCell = (job: Job) => {
        const status = applicationStatus.get(job.id);

        if (status) {
            return getStatusBadge(status);
        }

        if (!isEligible(job)) {
            return (
                <div>
                    <span style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        fontSize: '13px',
                        fontWeight: 500,
                    }}>
                        Not Eligible
                    </span>
                </div>
            );
        }

        return (
            <button
                onClick={() => handleApply(job.id)}
                disabled={applyingTo === job.id}
                style={{
                    padding: '10px 24px',
                    backgroundColor: applyingTo === job.id ? '#e2e8f0' : colors.primary,
                    color: applyingTo === job.id ? colors.textMuted : 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: applyingTo === job.id ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    minWidth: '110px',
                }}
            >
                {applyingTo === job.id ? 'Applying...' : 'Apply'}
            </button>
        );
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: colors.background, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted }}>
                Loading jobs...
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
                        <a href="/student" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px' }}>Home</a>
                        <a href="/student/dashboard" style={{ color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>Browse Jobs</a>
                        <a href="/student/applications" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px' }}>My Applications</a>
                        <button onClick={handleLogout} style={{ backgroundColor: 'transparent', border: '1px solid #475569', color: '#94a3b8', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>Logout</button>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ margin: 0, fontSize: '24px', color: colors.text, fontWeight: 600 }}>Browse Jobs</h2>
                    {studentCgpa !== null && (
                        <div style={{
                            backgroundColor: '#eef2ff',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            fontSize: '14px',
                            color: colors.primary,
                            fontWeight: 500
                        }}>
                            Your CGPA: {studentCgpa.toFixed(2)}
                        </div>
                    )}
                </div>

                {studentCgpa === null && (
                    <div style={{
                        backgroundColor: '#fef3c7',
                        padding: '16px 20px',
                        borderRadius: '12px',
                        marginBottom: '24px',
                        fontSize: '14px',
                        borderLeft: `4px solid ${colors.warning}`,
                        color: '#92400e'
                    }}>
                        ⚠️ Please complete your profile with CGPA to apply for jobs.
                    </div>
                )}

                {error && (
                    <div style={{ color: colors.danger, backgroundColor: '#fef2f2', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #fecaca' }}>
                        {error}
                    </div>
                )}

                {/* Jobs Table */}
                <div style={{ backgroundColor: colors.card, borderRadius: '12px', border: `1px solid ${colors.border}`, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    {jobs.length === 0 ? (
                        <p style={{ padding: '40px', textAlign: 'center', color: colors.textMuted, margin: 0 }}>No jobs available at the moment.</p>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8fafc' }}>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Company</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Role</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>CTC</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Min CGPA</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {jobs.map((job, idx) => {
                                    const eligible = isEligible(job);
                                    const hasApplied = applicationStatus.has(job.id);
                                    return (
                                        <tr
                                            key={job.id}
                                            style={{
                                                backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa',
                                                opacity: !eligible && !hasApplied ? 0.7 : 1
                                            }}
                                        >
                                            <td style={{ padding: '16px 20px', color: colors.text, fontSize: '16px', fontWeight: 500, borderBottom: `1px solid ${colors.border}` }}>{job.company_name}</td>
                                            <td style={{ padding: '16px 20px', color: colors.text, fontSize: '16px', borderBottom: `1px solid ${colors.border}` }}>{job.role}</td>
                                            <td style={{ padding: '16px 20px', color: colors.textMuted, fontSize: '16px', borderBottom: `1px solid ${colors.border}` }}>{job.ctc || '-'}</td>
                                            <td style={{
                                                padding: '16px 20px',
                                                fontSize: '16px',
                                                fontWeight: !eligible && !hasApplied ? 600 : 400,
                                                color: !eligible && !hasApplied ? colors.danger : colors.textMuted,
                                                borderBottom: `1px solid ${colors.border}`
                                            }}>
                                                {job.min_cgpa}
                                            </td>
                                            <td style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
                                                {getActionCell(job)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                    <div style={{ padding: '16px', borderTop: `1px solid ${colors.border}`, color: colors.textMuted, fontSize: '14px' }}>
                        Showing {jobs.length} job{jobs.length !== 1 ? 's' : ''}
                    </div>
                </div>
            </main>
        </div>
    );
}
