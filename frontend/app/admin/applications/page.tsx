'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { isLoggedIn, getUserRole, removeToken } from '@/lib/auth';

interface Job {
    id: string;
    company_name: string;
    role: string;
    ctc: string | null;
}

interface JobListResponse {
    jobs: Job[];
    total: number;
}

interface Application {
    id: string;
    job_id: string;
    student_id: string;
    status: 'APPLIED' | 'SHORTLISTED' | 'REJECTED';
    applied_at: string;
    student: {
        id: string;
        email: string;
    } | null;
    is_placed?: boolean;  // Will be fetched from student data
}

interface ApplicationListResponse {
    applications: Application[];
    total: number;
    page: number;
    limit: number;
}

// Modern color palette
const colors = {
    primary: '#4f46e5',
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

export default function AdminApplicationsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const preselectedJobId = searchParams.get('job');

    const [jobs, setJobs] = useState<Job[]>([]);
    const [selectedJobId, setSelectedJobId] = useState<string>(preselectedJobId || '');
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingApps, setLoadingApps] = useState(false);
    const [error, setError] = useState('');
    const [actionInProgress, setActionInProgress] = useState<string | null>(null);
    const [placedStudents, setPlacedStudents] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [showSearch, setShowSearch] = useState(false);

    useEffect(() => {
        if (!isLoggedIn()) {
            router.push('/login');
            return;
        }
        if (getUserRole() !== 'ADMIN') {
            router.push('/login');
            return;
        }
        fetchJobs();
    }, [router]);

    useEffect(() => {
        if (selectedJobId) {
            fetchApplications(selectedJobId);
        } else {
            setApplications([]);
        }
    }, [selectedJobId]);

    const fetchJobs = async () => {
        try {
            const response = await api.get<JobListResponse>('/jobs?active_only=false');
            setJobs(response.jobs);
            if (!preselectedJobId && response.jobs.length > 0) {
                setSelectedJobId(response.jobs[0].id);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
        } finally {
            setLoading(false);
        }
    };

    const fetchApplications = async (jobId: string) => {
        setLoadingApps(true);
        try {
            const response = await api.get<ApplicationListResponse>(`/applications/job/${jobId}`);
            setApplications(response.applications);

            // Fetch placement status for all students in this list
            // We'll track locally which ones are placed
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch applications');
        } finally {
            setLoadingApps(false);
        }
    };

    // Mark Placed
    const handleMarkPlaced = async (studentId: string, studentEmail: string) => {
        if (!confirm(`Mark ${studentEmail} as PLACED?`)) return;

        setActionInProgress(studentId);
        try {
            await api.patch(`/users/${studentId}/mark-placed`, {});
            setPlacedStudents(prev => new Set([...prev, studentId]));
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to mark as placed');
        } finally {
            setActionInProgress(null);
        }
    };

    // Revoke Placement
    const handleRevokePlacement = async (studentId: string, studentEmail: string) => {
        if (!confirm(`Revoke placement for ${studentEmail}?`)) return;

        setActionInProgress(studentId);
        try {
            // Call API to unmark placed (set is_placed = false)
            await api.patch(`/users/${studentId}/mark-placed`, { is_placed: false });
            setPlacedStudents(prev => {
                const newSet = new Set(prev);
                newSet.delete(studentId);
                return newSet;
            });
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to revoke placement');
        } finally {
            setActionInProgress(null);
        }
    };

    const handleLogout = () => {
        removeToken();
        router.push('/login');
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, { bg: string; color: string }> = {
            'APPLIED': { bg: '#fef3c7', color: '#92400e' },
            'SHORTLISTED': { bg: '#dcfce7', color: '#166534' },
            'REJECTED': { bg: '#fef2f2', color: '#991b1b' },
        };
        const style = styles[status] || { bg: '#f1f5f9', color: '#475569' };

        return (
            <span style={{
                padding: '6px 14px',
                borderRadius: '20px',
                backgroundColor: style.bg,
                color: style.color,
                fontWeight: 500,
                fontSize: '14px',
            }}>
                {status}
            </span>
        );
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: colors.background, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted }}>
                Loading...
            </div>
        );
    }

    const selectedJob = jobs.find(j => j.id === selectedJobId);

    return (
        <div style={{ minHeight: '100vh', backgroundColor: colors.background }}>
            {/* Header */}
            <header style={{ backgroundColor: colors.headerBg, padding: '16px 40px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{ color: '#fff', fontSize: '28px', margin: 0, fontWeight: 700, letterSpacing: '-0.02em' }}>TnP Admin</h1>
                    <nav style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                        <a href="/admin" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px' }}>Home</a>
                        <a href="/admin/students" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px' }}>Students</a>
                        <a href="/admin/jobs" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px' }}>Jobs</a>
                        <button onClick={handleLogout} style={{ backgroundColor: 'transparent', border: '1px solid #475569', color: '#94a3b8', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>Logout</button>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main style={{ padding: '32px 40px', maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ marginBottom: '24px' }}>
                    <h2 style={{ color: colors.text, fontSize: '28px', fontWeight: 600, margin: 0 }}>Manage Applications</h2>
                    <p style={{ color: colors.textMuted, margin: '4px 0 0 0' }}>Review applications and manage student placements</p>
                </div>

                {error && (
                    <div style={{ color: colors.danger, backgroundColor: '#fef2f2', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #fecaca' }}>
                        {error}
                    </div>
                )}

                {/* Controls Bar */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    backgroundColor: colors.card,
                    padding: '16px 20px',
                    borderRadius: '12px',
                    marginBottom: '20px',
                    border: `1px solid ${colors.border}`,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    gap: '20px',
                    flexWrap: 'wrap'
                }}>
                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 500, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Select Job</label>
                        <select
                            value={selectedJobId}
                            onChange={(e) => setSelectedJobId(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                fontSize: '14px',
                                border: `1px solid ${colors.border}`,
                                borderRadius: '8px',
                                backgroundColor: '#fff',
                                boxSizing: 'border-box'
                            }}
                        >
                            <option value="">-- Select a job --</option>
                            {jobs.map(job => (
                                <option key={job.id} value={job.id}>
                                    {job.company_name} - {job.role}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ minWidth: '40px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: colors.primary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Search Name</label>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            backgroundColor: '#fff',
                            border: `1px solid ${showSearch ? colors.primary : colors.border}`,
                            borderRadius: '8px',
                            padding: '0 12px',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            width: showSearch ? '240px' : '40px',
                            height: '40px',
                            overflow: 'hidden',
                            position: 'relative',
                            boxShadow: showSearch ? '0 4px 12px rgba(79, 70, 229, 0.08)' : 'none'
                        }}>
                            <button
                                onClick={() => setShowSearch(!showSearch)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: showSearch ? colors.primary : colors.textMuted,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 0,
                                    zIndex: 2,
                                    minWidth: '18px'
                                }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                                </svg>
                            </button>
                            <input
                                autoFocus={showSearch}
                                type="text"
                                placeholder="Search student email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    border: 'none',
                                    background: 'none',
                                    outline: 'none',
                                    marginLeft: '12px',
                                    fontSize: '14px',
                                    width: '100%',
                                    color: colors.text,
                                    opacity: showSearch ? 1 : 0,
                                    transition: 'opacity 0.2s ease',
                                    pointerEvents: showSearch ? 'auto' : 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Selected Job Info */}
                {selectedJob && (
                    <div style={{
                        padding: '16px 20px',
                        backgroundColor: '#eef2ff',
                        borderRadius: '12px',
                        marginBottom: '20px',
                        borderLeft: `4px solid ${colors.primary}`
                    }}>
                        <strong style={{ color: colors.text }}>{selectedJob.company_name}</strong>
                        <span style={{ color: colors.textMuted }}> - {selectedJob.role}</span>
                        {selectedJob.ctc && <span style={{ color: colors.textMuted }}> | CTC: {selectedJob.ctc}</span>}
                    </div>
                )}

                {/* Applications Table */}
                {!selectedJobId ? (
                    <div style={{ backgroundColor: colors.card, borderRadius: '12px', padding: '40px', textAlign: 'center', color: colors.textMuted, border: `1px solid ${colors.border}` }}>
                        Please select a job to view applications.
                    </div>
                ) : loadingApps ? (
                    <div style={{ backgroundColor: colors.card, borderRadius: '12px', padding: '40px', textAlign: 'center', color: colors.textMuted, border: `1px solid ${colors.border}` }}>
                        Loading applications...
                    </div>
                ) : applications.length === 0 ? (
                    <div style={{ backgroundColor: colors.card, borderRadius: '12px', padding: '40px', textAlign: 'center', color: colors.textMuted, border: `1px solid ${colors.border}` }}>
                        No applications for this job yet.
                    </div>
                ) : (
                    <div style={{ backgroundColor: colors.card, borderRadius: '12px', border: `1px solid ${colors.border}`, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8fafc' }}>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Student</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Applied On</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Status</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {applications
                                    .filter(app => app.student?.email.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map((app, idx) => {
                                        const isPlaced = placedStudents.has(app.student_id);
                                        const isProcessing = actionInProgress === app.student_id;

                                        return (
                                            <tr key={app.id} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                                <td style={{ padding: '16px 20px', color: colors.text, fontSize: '15px', fontWeight: 500, borderBottom: `1px solid ${colors.border}` }}>
                                                    {app.student?.email || 'Unknown'}
                                                </td>
                                                <td style={{ padding: '16px 20px', color: colors.textMuted, fontSize: '15px', borderBottom: `1px solid ${colors.border}` }}>
                                                    {formatDate(app.applied_at)}
                                                </td>
                                                <td style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
                                                    {getStatusBadge(app.status)}
                                                </td>
                                                <td style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
                                                    {isPlaced ? (
                                                        <button
                                                            onClick={() => app.student && handleRevokePlacement(app.student_id, app.student.email)}
                                                            disabled={isProcessing || !app.student}
                                                            style={{
                                                                padding: '10px 20px',
                                                                minWidth: '120px',
                                                                backgroundColor: isProcessing ? '#f1f5f9' : '#fef2f2',
                                                                color: isProcessing ? '#94a3b8' : colors.danger,
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                cursor: isProcessing ? 'not-allowed' : 'pointer',
                                                                fontSize: '15px',
                                                                fontWeight: 500
                                                            }}
                                                        >
                                                            {isProcessing ? '...' : 'Revoke'}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => app.student && handleMarkPlaced(app.student_id, app.student.email)}
                                                            disabled={isProcessing || !app.student}
                                                            style={{
                                                                padding: '10px 20px',
                                                                minWidth: '120px',
                                                                backgroundColor: isProcessing ? '#f1f5f9' : '#dcfce7',
                                                                color: isProcessing ? '#94a3b8' : '#166534',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                cursor: isProcessing ? 'not-allowed' : 'pointer',
                                                                fontSize: '15px',
                                                                fontWeight: 500
                                                            }}
                                                        >
                                                            {isProcessing ? '...' : 'Mark Placed'}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>

                        <div style={{ padding: '16px', borderTop: `1px solid ${colors.border}`, color: colors.textMuted, fontSize: '14px' }}>
                            Total applications: {applications.length}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
