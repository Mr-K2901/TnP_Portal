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
}

interface ApplicationListResponse {
    applications: Application[];
    total: number;
    page: number;
    limit: number;
}

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
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch applications');
        } finally {
            setLoadingApps(false);
        }
    };

    // Shortlist: APPLIED → SHORTLISTED
    const handleShortlist = async (applicationId: string) => {
        setActionInProgress(applicationId);
        try {
            await api.patch(`/applications/${applicationId}/status`, { status: 'SHORTLISTED' });
            setApplications(prev => prev.map(app =>
                app.id === applicationId ? { ...app, status: 'SHORTLISTED' as const } : app
            ));
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to shortlist');
        } finally {
            setActionInProgress(null);
        }
    };

    // Reject: Any status → REJECTED
    const handleReject = async (applicationId: string) => {
        if (!confirm('Reject this application?')) return;
        setActionInProgress(applicationId);
        try {
            await api.patch(`/applications/${applicationId}/status`, { status: 'REJECTED' });
            setApplications(prev => prev.map(app =>
                app.id === applicationId ? { ...app, status: 'REJECTED' as const } : app
            ));
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to reject');
        } finally {
            setActionInProgress(null);
        }
    };

    // Mark Placed: Only for SHORTLISTED
    const handleMarkPlaced = async (studentId: string, studentEmail: string) => {
        if (!confirm(`Mark ${studentEmail} as PLACED? This action cannot be undone.`)) {
            return;
        }

        setActionInProgress(studentId);
        try {
            await api.patch(`/users/${studentId}/mark-placed`, {});
            setPlacedStudents(prev => new Set([...prev, studentId]));
            alert(`${studentEmail} has been marked as placed!`);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to mark as placed');
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
            'APPLIED': { bg: '#fff3cd', color: '#856404' },
            'SHORTLISTED': { bg: '#d4edda', color: '#155724' },
            'REJECTED': { bg: '#f8d7da', color: '#721c24' },
        };
        const style = styles[status] || { bg: '#e2e3e5', color: '#383d41' };

        return (
            <span style={{
                padding: '4px 10px',
                borderRadius: '12px',
                backgroundColor: style.bg,
                color: style.color,
                fontWeight: 'bold',
                fontSize: '12px',
            }}>
                {status}
            </span>
        );
    };

    if (loading) {
        return <div style={{ padding: '40px' }}>Loading...</div>;
    }

    const selectedJob = jobs.find(j => j.id === selectedJobId);

    return (
        <div style={{ padding: '40px', maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1>Manage Applications</h1>
                <div>
                    <a href="/admin/jobs" style={{ marginRight: '20px' }}>
                        Jobs
                    </a>
                    <button onClick={handleLogout} style={{ cursor: 'pointer' }}>
                        Logout
                    </button>
                </div>
            </div>

            {/* Workflow Legend */}
            <div style={{
                backgroundColor: '#f8f9fa',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '14px'
            }}>
                <strong>Workflow:</strong> APPLIED → <em>Shortlist</em> → SHORTLISTED → <em>Mark Placed</em> → PLACED
                <br />
                <span style={{ color: '#666' }}>You can reject at any stage.</span>
            </div>

            {error && (
                <div style={{ color: 'red', marginBottom: '20px', padding: '10px', backgroundColor: '#ffe6e6' }}>
                    {error}
                </div>
            )}

            {/* Job Selector */}
            <div style={{ marginBottom: '20px' }}>
                <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Select Job:</label>
                <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    style={{
                        padding: '10px',
                        fontSize: '16px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        minWidth: '300px',
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

            {/* Selected Job Info */}
            {selectedJob && (
                <div style={{
                    padding: '15px',
                    backgroundColor: '#e7f3ff',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    borderLeft: '4px solid #0070f3'
                }}>
                    <strong>{selectedJob.company_name}</strong> - {selectedJob.role}
                    {selectedJob.ctc && <span> | CTC: {selectedJob.ctc}</span>}
                </div>
            )}

            {/* Applications Table */}
            {!selectedJobId ? (
                <p>Please select a job to view applications.</p>
            ) : loadingApps ? (
                <p>Loading applications...</p>
            ) : applications.length === 0 ? (
                <p>No applications for this job yet.</p>
            ) : (
                <>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                                <th style={{ padding: '10px' }}>Student Email</th>
                                <th style={{ padding: '10px' }}>Applied On</th>
                                <th style={{ padding: '10px' }}>Status</th>
                                <th style={{ padding: '10px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {applications.map(app => {
                                const isPlaced = placedStudents.has(app.student_id);
                                const isProcessing = actionInProgress === app.id || actionInProgress === app.student_id;

                                return (
                                    <tr key={app.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '10px' }}>
                                            {app.student?.email || 'Unknown'}
                                            {isPlaced && (
                                                <span style={{
                                                    marginLeft: '8px',
                                                    padding: '2px 8px',
                                                    backgroundColor: '#28a745',
                                                    color: 'white',
                                                    borderRadius: '10px',
                                                    fontSize: '11px',
                                                }}>
                                                    PLACED
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                            {formatDate(app.applied_at)}
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                            {getStatusBadge(app.status)}
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                {/* APPLIED → Shortlist button */}
                                                {app.status === 'APPLIED' && !isPlaced && (
                                                    <button
                                                        onClick={() => handleShortlist(app.id)}
                                                        disabled={isProcessing}
                                                        style={{
                                                            padding: '5px 12px',
                                                            backgroundColor: isProcessing ? '#ccc' : '#0070f3',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            cursor: isProcessing ? 'not-allowed' : 'pointer',
                                                        }}
                                                    >
                                                        {isProcessing ? '...' : 'Shortlist'}
                                                    </button>
                                                )}

                                                {/* SHORTLISTED → Mark Placed button */}
                                                {app.status === 'SHORTLISTED' && !isPlaced && (
                                                    <button
                                                        onClick={() => app.student && handleMarkPlaced(app.student_id, app.student.email)}
                                                        disabled={isProcessing || !app.student}
                                                        style={{
                                                            padding: '5px 12px',
                                                            backgroundColor: isProcessing ? '#ccc' : '#28a745',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            cursor: isProcessing ? 'not-allowed' : 'pointer',
                                                        }}
                                                    >
                                                        {isProcessing ? '...' : 'Mark Placed'}
                                                    </button>
                                                )}

                                                {/* Reject button (for APPLIED or SHORTLISTED) */}
                                                {(app.status === 'APPLIED' || app.status === 'SHORTLISTED') && !isPlaced && (
                                                    <button
                                                        onClick={() => handleReject(app.id)}
                                                        disabled={isProcessing}
                                                        style={{
                                                            padding: '5px 12px',
                                                            backgroundColor: isProcessing ? '#ccc' : '#dc3545',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            cursor: isProcessing ? 'not-allowed' : 'pointer',
                                                        }}
                                                    >
                                                        {isProcessing ? '...' : 'Reject'}
                                                    </button>
                                                )}

                                                {/* Already placed */}
                                                {isPlaced && (
                                                    <span style={{ color: '#28a745', fontWeight: 'bold' }}>
                                                        ✓ Placed
                                                    </span>
                                                )}

                                                {/* Rejected - no actions */}
                                                {app.status === 'REJECTED' && !isPlaced && (
                                                    <span style={{ color: '#999' }}>-</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    <p style={{ marginTop: '20px', color: '#666' }}>
                        Total applications: {applications.length}
                    </p>
                </>
            )}
        </div>
    );
}
