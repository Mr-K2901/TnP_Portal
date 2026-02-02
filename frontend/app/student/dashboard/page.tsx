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

export default function StudentDashboardPage() {
    const router = useRouter();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [applicationStatus, setApplicationStatus] = useState<Map<string, string>>(new Map());
    const [applyingTo, setApplyingTo] = useState<string | null>(null);
    const [isPlaced, setIsPlaced] = useState(false);
    const [profileName, setProfileName] = useState('');
    const [placementCompany, setPlacementCompany] = useState('');

    useEffect(() => {
        // Auth check
        if (!isLoggedIn()) {
            router.push('/login');
            return;
        }
        if (getUserRole() !== 'STUDENT') {
            router.push('/login');
            return;
        }

        // Fetch data
        fetchProfile();
        fetchJobs();
        fetchMyApplications();
    }, [router]);

    const fetchProfile = async () => {
        try {
            const response = await api.get<ProfileResponse>('/users/me/profile');
            setIsPlaced(response.is_placed);
            setProfileName(response.full_name);
        } catch {
            // Ignore - profile may not exist
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

            // Find the SHORTLISTED application to get placement company
            const placedApp = response.applications.find(app => app.status === 'SHORTLISTED');
            if (placedApp && placedApp.job) {
                setPlacementCompany(placedApp.job.company_name);
            }
        } catch {
            // Ignore - user may not have any applications
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

    const getStatusDisplay = (jobId: string) => {
        const status = applicationStatus.get(jobId);
        if (!status) return null;

        switch (status) {
            case 'APPLIED':
                return <span style={{ color: 'green' }}>✓ Applied</span>;
            case 'SHORTLISTED':
                return <span style={{ color: '#0070f3', fontWeight: 'bold' }}>Shortlisted</span>;
            case 'REJECTED':
                return <span style={{ color: 'red' }}>✗ Rejected</span>;
            default:
                return <span style={{ color: '#666' }}>{status}</span>;
        }
    };

    if (loading) {
        return <div style={{ padding: '40px' }}>Loading jobs...</div>;
    }

    return (
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
            {/* Placed Banner with Company Name */}
            {isPlaced && (
                <div style={{
                    backgroundColor: '#d4edda',
                    color: '#155724',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    border: '1px solid #c3e6cb',
                    textAlign: 'center'
                }}>
                    <span style={{ fontSize: '32px' }}>🎉</span>
                    <h2 style={{ margin: '10px 0 5px 0' }}>
                        Congratulations{profileName ? `, ${profileName}` : ''}!
                    </h2>
                    <p style={{ margin: 0, fontSize: '18px' }}>
                        You have been placed in <strong>{placementCompany || 'a company'}</strong>
                    </p>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1>Available Jobs</h1>
                <div>
                    <a href="/student/applications" style={{ marginRight: '20px' }}>
                        My Applications
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

            {jobs.length === 0 ? (
                <p>No jobs available at the moment.</p>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                            <th style={{ padding: '10px' }}>Company</th>
                            <th style={{ padding: '10px' }}>Role</th>
                            <th style={{ padding: '10px' }}>CTC</th>
                            <th style={{ padding: '10px' }}>Min CGPA</th>
                            <th style={{ padding: '10px' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {jobs.map(job => (
                            <tr key={job.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '10px' }}>{job.company_name}</td>
                                <td style={{ padding: '10px' }}>{job.role}</td>
                                <td style={{ padding: '10px' }}>{job.ctc || '-'}</td>
                                <td style={{ padding: '10px' }}>{job.min_cgpa}</td>
                                <td style={{ padding: '10px' }}>
                                    {applicationStatus.has(job.id) ? (
                                        getStatusDisplay(job.id)
                                    ) : (
                                        <button
                                            onClick={() => handleApply(job.id)}
                                            disabled={applyingTo === job.id}
                                            style={{
                                                padding: '5px 15px',
                                                backgroundColor: applyingTo === job.id ? '#ccc' : '#0070f3',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: applyingTo === job.id ? 'not-allowed' : 'pointer',
                                            }}
                                        >
                                            {applyingTo === job.id ? 'Applying...' : 'Apply'}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
