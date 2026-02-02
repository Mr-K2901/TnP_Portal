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
    const [studentCgpa, setStudentCgpa] = useState<number | null>(null);

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
            setStudentCgpa(response.cgpa);
        } catch {
            // Profile may not exist - CGPA stays null
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

    const isEligible = (job: Job): boolean => {
        if (studentCgpa === null) return false;
        return studentCgpa >= job.min_cgpa;
    };

    const getActionCell = (job: Job) => {
        const status = applicationStatus.get(job.id);

        // Already applied - show status
        if (status) {
            switch (status) {
                case 'APPLIED':
                    return <span style={{ color: 'green' }}>✓ Applied</span>;
                case 'SHORTLISTED':
                    return (
                        <span style={{
                            background: 'linear-gradient(90deg, #28a745, #20c997)',
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontWeight: 'bold',
                            fontSize: '13px',
                        }}>
                            ⭐ Shortlisted
                        </span>
                    );
                case 'REJECTED':
                    return <span style={{ color: 'red' }}>✗ Rejected</span>;
                default:
                    return <span style={{ color: '#666' }}>{status}</span>;
            }
        }

        // Not applied yet - check eligibility
        if (!isEligible(job)) {
            return (
                <div>
                    <button
                        disabled
                        style={{
                            padding: '5px 12px',
                            backgroundColor: '#e9ecef',
                            color: '#6c757d',
                            border: '1px solid #ced4da',
                            borderRadius: '4px',
                            cursor: 'not-allowed',
                            fontSize: '16px',
                        }}
                    >
                        Not Eligible
                    </button>
                    <div style={{
                        fontSize: '15px',
                        color: '#dc3545',
                        marginTop: '4px'
                    }}>
                        Requires CGPA ≥ {job.min_cgpa}
                    </div>
                </div>
            );
        }

        // Eligible - show Apply button
        return (
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
        );
    };

    if (loading) {
        return <div style={{ padding: '40px' }}>Loading jobs...</div>;
    }

    return (
        <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>

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

            {/* CGPA Info Banner */}
            {studentCgpa !== null && (
                <div style={{
                    backgroundColor: '#e7f3ff',
                    padding: '10px 15px',
                    borderRadius: '6px',
                    marginBottom: '20px',
                    fontSize: '14px',
                    borderLeft: '4px solid #0070f3'
                }}>
                    Your CGPA: <strong>{studentCgpa.toFixed(2)}</strong>
                </div>
            )}

            {studentCgpa === null && (
                <div style={{
                    backgroundColor: '#fff3cd',
                    padding: '10px 15px',
                    borderRadius: '6px',
                    marginBottom: '20px',
                    fontSize: '14px',
                    borderLeft: '4px solid #ffc107'
                }}>
                    ⚠️ Please complete your profile with CGPA to apply for jobs.
                </div>
            )}

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
                        {jobs.map(job => {
                            const eligible = isEligible(job);
                            const hasApplied = applicationStatus.has(job.id);

                            return (
                                <tr
                                    key={job.id}
                                    style={{
                                        borderBottom: '1px solid #eee',
                                        backgroundColor: !eligible && !hasApplied ? '#fafafa' : 'transparent',
                                    }}
                                >
                                    <td style={{ padding: '10px' }}>{job.company_name}</td>
                                    <td style={{ padding: '10px' }}>{job.role}</td>
                                    <td style={{ padding: '10px' }}>{job.ctc || '-'}</td>
                                    <td style={{
                                        padding: '10px',
                                        color: !eligible && !hasApplied ? '#dc3545' : 'inherit',
                                        fontWeight: !eligible && !hasApplied ? 'bold' : 'normal'
                                    }}>
                                        {job.min_cgpa}
                                    </td>
                                    <td style={{ padding: '10px' }}>
                                        {getActionCell(job)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
}
