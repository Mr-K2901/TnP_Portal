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
    const [updatingId, setUpdatingId] = useState<string | null>(null);

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
            // Auto-select first job if none preselected
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

    const handleStatusChange = async (applicationId: string, newStatus: string) => {
        setUpdatingId(applicationId);
        try {
            await api.patch(`/applications/${applicationId}/status`, { status: newStatus });
            setApplications(prev => prev.map(app =>
                app.id === applicationId ? { ...app, status: newStatus as Application['status'] } : app
            ));
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to update status');
        } finally {
            setUpdatingId(null);
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPLIED': return '#666';
            case 'SHORTLISTED': return 'green';
            case 'REJECTED': return 'red';
            default: return '#666';
        }
    };

    if (loading) {
        return <div style={{ padding: '40px' }}>Loading...</div>;
    }

    const selectedJob = jobs.find(j => j.id === selectedJobId);

    return (
        <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
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
                    backgroundColor: '#f0f0f0',
                    borderRadius: '8px',
                    marginBottom: '20px'
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
                                <th style={{ padding: '10px' }}>Update Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {applications.map(app => (
                                <tr key={app.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '10px' }}>
                                        {app.student?.email || 'Unknown'}
                                    </td>
                                    <td style={{ padding: '10px' }}>
                                        {formatDate(app.applied_at)}
                                    </td>
                                    <td style={{ padding: '10px' }}>
                                        <span style={{
                                            color: getStatusColor(app.status),
                                            fontWeight: 'bold'
                                        }}>
                                            {app.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px' }}>
                                        <select
                                            value={app.status}
                                            onChange={(e) => handleStatusChange(app.id, e.target.value)}
                                            disabled={updatingId === app.id}
                                            style={{
                                                padding: '5px 10px',
                                                border: '1px solid #ccc',
                                                borderRadius: '4px',
                                                cursor: updatingId === app.id ? 'not-allowed' : 'pointer',
                                            }}
                                        >
                                            <option value="APPLIED">APPLIED</option>
                                            <option value="SHORTLISTED">SHORTLISTED</option>
                                            <option value="REJECTED">REJECTED</option>
                                        </select>
                                        {updatingId === app.id && <span style={{ marginLeft: '10px' }}>Updating...</span>}
                                    </td>
                                </tr>
                            ))}
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
