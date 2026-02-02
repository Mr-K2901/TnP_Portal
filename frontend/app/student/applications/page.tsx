'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { isLoggedIn, getUserRole, removeToken } from '@/lib/auth';

interface Application {
    id: string;
    job_id: string;
    student_id: string;
    status: 'APPLIED' | 'SHORTLISTED' | 'REJECTED';
    applied_at: string;
    job: {
        id: string;
        company_name: string;
        role: string;
        ctc: string | null;
    } | null;
}

interface ApplicationListResponse {
    applications: Application[];
    total: number;
    page: number;
    limit: number;
}

interface ProfileResponse {
    user_id: string;
    full_name: string;
    cgpa: number | null;
    branch: string;
    resume_url: string | null;
    is_placed: boolean;
}

export default function StudentApplicationsPage() {
    const router = useRouter();
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
    const [isPlaced, setIsPlaced] = useState(false);
    const [profileName, setProfileName] = useState('');
    const [placementCompany, setPlacementCompany] = useState('');
    const [placedApplicationId, setPlacedApplicationId] = useState<string | null>(null);

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
        fetchApplications();
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

    const fetchApplications = async () => {
        try {
            const response = await api.get<ApplicationListResponse>('/applications');
            setApplications(response.applications);

            // Find the SHORTLISTED application (the one that led to placement)
            const placedApp = response.applications.find(app => app.status === 'SHORTLISTED');
            if (placedApp && placedApp.job) {
                setPlacementCompany(placedApp.job.company_name);
                setPlacedApplicationId(placedApp.id);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch applications');
        } finally {
            setLoading(false);
        }
    };

    const handleWithdraw = async (applicationId: string) => {
        if (!confirm('Are you sure you want to withdraw this application? This action cannot be undone.')) {
            return;
        }

        setWithdrawingId(applicationId);
        try {
            await api.patch(`/applications/${applicationId}/withdraw`, {});
            // Update local state
            setApplications(prev => prev.map(app =>
                app.id === applicationId ? { ...app, status: 'REJECTED' as const } : app
            ));
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to withdraw application');
        } finally {
            setWithdrawingId(null);
        }
    };

    const handleLogout = () => {
        removeToken();
        router.push('/login');
    };

    const getStatusDisplay = (app: Application) => {
        // Special display for the application that led to placement
        if (isPlaced && app.id === placedApplicationId && app.status === 'SHORTLISTED') {
            return (
                <span style={{
                    background: 'linear-gradient(90deg, #28a745, #20c997)',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    fontSize: '18px',
                }}>
                    Placed
                </span>
            );
        }

        // Regular status display
        switch (app.status) {
            case 'APPLIED':
                return <span style={{ color: '#666', fontWeight: 'bold' }}>APPLIED</span>;
            case 'SHORTLISTED':
                return <span style={{ color: 'green', fontWeight: 'bold' }}>SHORTLISTED</span>;
            case 'REJECTED':
                return <span style={{ color: 'red', fontWeight: 'bold' }}>REJECTED</span>;
            default:
                return <span style={{ color: '#666' }}>{app.status}</span>;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    if (loading) {
        return <div style={{ padding: '40px' }}>Loading applications...</div>;
    }

    return (
        <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
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
                <h1>My Applications</h1>
                <div>
                    <a href="/student/dashboard" style={{ marginRight: '20px' }}>
                        Browse Jobs
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

            {applications.length === 0 ? (
                <p>You haven't applied to any jobs yet. <a href="/student/dashboard">Browse jobs</a></p>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                            <th style={{ padding: '10px' }}>Company</th>
                            <th style={{ padding: '10px' }}>Role</th>
                            <th style={{ padding: '10px' }}>Applied On</th>
                            <th style={{ padding: '10px' }}>Status</th>
                            <th style={{ padding: '10px' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {applications.map(app => {
                            const isPlacedRow = isPlaced && app.id === placedApplicationId;

                            return (
                                <tr
                                    key={app.id}
                                    style={{
                                        borderBottom: '1px solid #eee',
                                        backgroundColor: isPlacedRow ? '#f0fff4' : 'transparent'
                                    }}
                                >
                                    <td style={{ padding: '10px' }}>
                                        {app.job?.company_name || 'Unknown'}
                                    </td>
                                    <td style={{ padding: '10px' }}>
                                        {app.job?.role || 'Unknown'}
                                    </td>
                                    <td style={{ padding: '10px' }}>
                                        {formatDate(app.applied_at)}
                                    </td>
                                    <td style={{ padding: '10px' }}>
                                        {getStatusDisplay(app)}
                                    </td>
                                    <td style={{ padding: '10px' }}>
                                        {app.status === 'APPLIED' ? (
                                            <button
                                                onClick={() => handleWithdraw(app.id)}
                                                disabled={withdrawingId === app.id}
                                                style={{
                                                    padding: '5px 10px',
                                                    backgroundColor: withdrawingId === app.id ? '#ccc' : '#dc3545',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: withdrawingId === app.id ? 'not-allowed' : 'pointer',
                                                }}
                                            >
                                                {withdrawingId === app.id ? 'Withdrawing...' : 'Withdraw'}
                                            </button>
                                        ) : (
                                            <span style={{ color: '#999' }}>-</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}

            <p style={{ marginTop: '20px', color: '#666' }}>
                Total applications: {applications.length}
            </p>
        </div>
    );
}
