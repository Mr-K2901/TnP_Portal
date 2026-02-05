'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { isLoggedIn, getUserRole } from '@/lib/auth';
import { useTheme } from '@/context/ThemeContext';
import { ApplicationStatus, getStatusStyle, ADMIN_ACTIONS, ACTION_ENDPOINTS } from '@/lib/applicationStatus';

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
    status: ApplicationStatus;
    applied_at: string;
    student: {
        id: string;
        email: string;
        profile?: {
            full_name: string;
            cgpa: number | null;
            branch: string;
        } | null;
    } | null;
    is_placed?: boolean;
}

interface ApplicationListResponse {
    applications: Application[];
    total: number;
    page: number;
    limit: number;
}

export default function AdminApplicationsPage() {
    const { colors, theme } = useTheme();
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

    // Handle Status Action (State Machine Transition)
    const handleStatusAction = async (applicationId: string, action: string, studentName: string) => {
        const actionLabels: Record<string, string> = {
            'select': 'Select',
            'start-process': 'Start Process',
            'schedule-interview': 'Schedule Interview',
            'shortlist': 'Shortlist',
            'release-offer': 'Release Offer',
            'reject': 'Reject'
        };

        if (!confirm(`${actionLabels[action] || action} ${studentName}?`)) return;

        setActionInProgress(applicationId);
        try {
            const response = await api.post<Application>(`/applications/${applicationId}/actions/${action}`, {});
            // Update local state with new status
            setApplications(prev => prev.map(app =>
                app.id === applicationId ? { ...app, status: response.status } : app
            ));
        } catch (err) {
            alert(err instanceof Error ? err.message : `Failed to ${action}`);
        } finally {
            setActionInProgress(null);
        }
    };


    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getStatusBadge = (status: string) => {
        const style = getStatusStyle(status as ApplicationStatus, colors);

        return (
            <span style={{
                padding: '6px 14px',
                borderRadius: '20px',
                backgroundColor: style.bg,
                color: style.color,
                border: `1px solid ${style.color}40`,
                fontWeight: 500,
                fontSize: '14px',
            }}>
                {style.label}
            </span>
        );
    };

    // Get available actions for current status
    const getAvailableActions = (status: ApplicationStatus): { action: string; label: string; color: string }[] => {
        const actionMap: Record<string, { action: string; label: string; color: string }[]> = {
            'APPLIED': [
                { action: 'select', label: 'Select', color: colors.primary },
                { action: 'reject', label: 'Reject', color: colors.danger }
            ],
            'SELECTED': [
                { action: 'start-process', label: 'Start Process', color: colors.primary },
                { action: 'reject', label: 'Reject', color: colors.danger }
            ],
            'IN_PROCESS': [
                { action: 'schedule-interview', label: 'Schedule Interview', color: colors.warning },
                { action: 'reject', label: 'Reject', color: colors.danger }
            ],
            'INTERVIEW_SCHEDULED': [
                { action: 'shortlist', label: 'Shortlist', color: colors.success },
                { action: 'reject', label: 'Reject', color: colors.danger }
            ],
            'SHORTLISTED': [
                { action: 'release-offer', label: 'Release Offer', color: colors.success },
                { action: 'reject', label: 'Reject', color: colors.danger }
            ],
            'OFFER_RELEASED': [
                { action: 'reject', label: 'Revoke Offer', color: colors.danger }
            ],
        };
        return actionMap[status] || [];
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
        <div style={{ padding: '40px' }}>
            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ color: colors.text, fontSize: '28px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Manage Applicants</h1>
                    <p style={{ color: colors.textMuted, margin: '4px 0 0 0', fontSize: '14px' }}>Review applicants and manage student placements</p>
                </div>
            </div>

            {/* Content Area */}
            <div style={{ maxWidth: '100%' }}>
                {error && (
                    <div style={{ color: colors.danger, backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', border: `1px solid ${colors.danger}40` }}>
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
                                backgroundColor: colors.inputBg,
                                color: colors.text,
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
                            backgroundColor: colors.inputBg,
                            border: `1px solid ${showSearch ? colors.primary : colors.border}`,
                            borderRadius: '8px',
                            padding: '0 12px',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            width: showSearch ? '240px' : '40px',
                            height: '40px',
                            overflow: 'hidden',
                            position: 'relative',
                            boxShadow: showSearch ? `0 4px 12px ${colors.primary}20` : 'none'
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
                        backgroundColor: theme === 'dark' ? 'rgba(79, 70, 229, 0.1)' : '#eef2ff',
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
                                <tr style={{ backgroundColor: colors.tableHeaderBg }}>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Applicant</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Applied On</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Status</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {applications
                                    .filter(app => {
                                        if (!searchTerm) return true;
                                        const name = app.student?.profile?.full_name || app.student?.email || '';
                                        return name.toLowerCase().includes(searchTerm.toLowerCase());
                                    })
                                    .map((app, idx) => {
                                        const isPlaced = placedStudents.has(app.student_id);
                                        const isProcessing = actionInProgress === app.student_id;

                                        return (
                                            <tr key={app.id} style={{ backgroundColor: idx % 2 === 0 ? colors.card : colors.background }}>
                                                <td style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
                                                    <a
                                                        href={`/admin/students?id=${app.student_id}`}
                                                        style={{
                                                            color: colors.primary,
                                                            textDecoration: 'none',
                                                            fontSize: '15px',
                                                            fontWeight: 500,
                                                            cursor: 'pointer'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                                    >
                                                        {app.student?.profile?.full_name || app.student?.email || 'Unknown'}
                                                    </a>
                                                    {app.student?.profile && (
                                                        <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '2px' }}>
                                                            {app.student.profile.branch} • CGPA: {app.student.profile.cgpa?.toFixed(2) || 'N/A'}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '16px 20px', color: colors.textMuted, fontSize: '15px', borderBottom: `1px solid ${colors.border}` }}>
                                                    {formatDate(app.applied_at)}
                                                </td>
                                                <td style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
                                                    {getStatusBadge(app.status)}
                                                </td>
                                                <td style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
                                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                        {getAvailableActions(app.status).map((action) => (
                                                            <button
                                                                key={action.action}
                                                                onClick={() => app.student && handleStatusAction(app.id, action.action, app.student?.profile?.full_name || app.student.email)}
                                                                disabled={isProcessing}
                                                                style={{
                                                                    padding: '6px 12px',
                                                                    backgroundColor: action.color + '20', // 20% opacity bg
                                                                    color: action.color,
                                                                    border: `1px solid ${action.color}`,
                                                                    borderRadius: '6px',
                                                                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                                                                    fontSize: '13px',
                                                                    fontWeight: 500,
                                                                    whiteSpace: 'nowrap',
                                                                    opacity: isProcessing ? 0.7 : 1
                                                                }}
                                                            >
                                                                {action.label}
                                                            </button>
                                                        ))}
                                                        {(!getAvailableActions(app.status).length) && (
                                                            <span style={{ fontSize: '13px', color: colors.textMuted }}>No actions</span>
                                                        )}

                                                        {/* Legacy Manual Override (Optional - Keep for now) */}
                                                        {/* {isPlaced ? (...) : (...)} */}
                                                    </div>
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
            </div>
        </div>
    );
}
