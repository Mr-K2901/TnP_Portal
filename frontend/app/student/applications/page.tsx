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

export default function StudentApplicationsPage() {
    const router = useRouter();
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

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

        // Fetch applications
        fetchApplications();
    }, [router]);

    const fetchApplications = async () => {
        try {
            const response = await api.get<ApplicationListResponse>('/applications');
            setApplications(response.applications);
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPLIED':
                return '#666';
            case 'SHORTLISTED':
                return 'green';
            case 'REJECTED':
                return 'red';
            default:
                return '#666';
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
                        {applications.map(app => (
                            <tr key={app.id} style={{ borderBottom: '1px solid #eee' }}>
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
                                    <span style={{
                                        color: getStatusColor(app.status),
                                        fontWeight: 'bold'
                                    }}>
                                        {app.status}
                                    </span>
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
                        ))}
                    </tbody>
                </table>
            )}

            <p style={{ marginTop: '20px', color: '#666' }}>
                Total applications: {applications.length}
            </p>
        </div>
    );
}
