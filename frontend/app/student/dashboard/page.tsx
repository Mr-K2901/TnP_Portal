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

export default function StudentDashboardPage() {
    const router = useRouter();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());
    const [applyingTo, setApplyingTo] = useState<string | null>(null);

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

        // Fetch jobs
        fetchJobs();
        // Fetch existing applications to know which jobs are already applied
        fetchMyApplications();
    }, [router]);

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
            const response = await api.get<{ applications: { job_id: string }[] }>('/applications');
            const appliedIds = new Set(response.applications.map(app => app.job_id));
            setAppliedJobs(appliedIds);
        } catch {
            // Ignore - user may not have any applications
        }
    };

    const handleApply = async (jobId: string) => {
        setApplyingTo(jobId);
        try {
            await api.post('/applications', { job_id: jobId });
            setAppliedJobs(prev => new Set([...prev, jobId]));
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

    if (loading) {
        return <div style={{ padding: '40px' }}>Loading jobs...</div>;
    }

    return (
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
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
                            <th style={{ padding: '10px' }}>Action</th>
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
                                    {appliedJobs.has(job.id) ? (
                                        <span style={{ color: 'green' }}>✓ Applied</span>
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
