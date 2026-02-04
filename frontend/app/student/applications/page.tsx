'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { isLoggedIn, getUserRole, removeToken } from '@/lib/auth';
import JobDescriptionDrawer from '@/components/JobDescriptionDrawer';

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

export default function StudentApplicationsPage() {
    const router = useRouter();
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
    const [isPlaced, setIsPlaced] = useState(false);
    const [placementCompany, setPlacementCompany] = useState('');
    const [placedApplicationId, setPlacedApplicationId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSearch, setShowSearch] = useState(false);

    // Drawer state
    const [selectedJob, setSelectedJob] = useState<{ id: string; company_name: string; role: string; ctc?: string | null } | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

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
        fetchApplications();
    }, [router]);

    const fetchProfile = async () => {
        try {
            const response = await api.get<ProfileResponse>('/users/me/profile');
            setIsPlaced(response.is_placed);
        } catch {
            // Ignore
        }
    };

    const fetchApplications = async () => {
        try {
            const response = await api.get<ApplicationListResponse>('/applications');
            setApplications(response.applications);
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
        if (!confirm('Are you sure you want to withdraw this application?')) return;
        setWithdrawingId(applicationId);
        try {
            await api.patch(`/applications/${applicationId}/withdraw`, {});
            setApplications(prev => prev.map(app =>
                app.id === applicationId ? { ...app, status: 'REJECTED' as const } : app
            ));
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to withdraw');
        } finally {
            setWithdrawingId(null);
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

    const getStatusBadge = (app: Application) => {
        if (isPlaced && app.id === placedApplicationId && app.status === 'SHORTLISTED') {
            return (
                <span style={{
                    backgroundColor: '#059669',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '13px',
                    letterSpacing: '0.3px',
                }}>
                    PLACED
                </span>
            );
        }

        const styles: Record<string, { bg: string; color: string; label: string }> = {
            'APPLIED': { bg: '#fef3c7', color: '#92400e', label: 'PENDING' },
            'SHORTLISTED': { bg: '#dcfce7', color: '#166534', label: 'SHORTLISTED' },
            'REJECTED': { bg: '#fef2f2', color: '#991b1b', label: 'REJECTED' },
        };
        const style = styles[app.status] || { bg: '#f1f5f9', color: '#475569', label: app.status };
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

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: colors.background, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted }}>
                Loading applications...
            </div>
        );
    }

    // Stats
    const appliedCount = applications.filter(a => a.status === 'APPLIED').length;
    const shortlistedCount = applications.filter(a => a.status === 'SHORTLISTED').length;
    const rejectedCount = applications.filter(a => a.status === 'REJECTED').length;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: colors.background }}>
            {/* Header */}
            <header style={{ backgroundColor: colors.headerBg, padding: '16px 40px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{ color: '#fff', fontSize: '20px', margin: 0, fontWeight: 600 }}>TnP Portal</h1>
                    <nav style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                        <a href="/student" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px' }}>Home</a>
                        <a href="/student/dashboard" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px' }}>Browse Jobs</a>
                        <a href="/student/applications" style={{ color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>My Applications</a>
                        <a href="/student/profile" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px' }}>Profile</a>
                        <button onClick={handleLogout} style={{ backgroundColor: 'transparent', border: '1px solid #475569', color: '#94a3b8', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>Logout</button>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ margin: 0, fontSize: '24px', color: colors.text, fontWeight: 600 }}>My Applications</h2>
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
                            placeholder="Type to search..."
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
                                pointerEvents: showSearch ? 'auto' : 'none'
                            }}
                        />
                        {showSearch && searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    color: colors.textMuted,
                                    padding: '0 4px',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                ×
                            </button>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ backgroundColor: colors.card, borderRadius: '10px', padding: '16px', border: `1px solid ${colors.border}`, textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: colors.warning }}>{appliedCount}</div>
                        <div style={{ color: colors.textMuted, fontSize: '13px' }}>Pending</div>
                    </div>
                    <div style={{ backgroundColor: colors.card, borderRadius: '10px', padding: '16px', border: `1px solid ${colors.border}`, textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: colors.success }}>{shortlistedCount}</div>
                        <div style={{ color: colors.textMuted, fontSize: '13px' }}>Shortlisted</div>
                    </div>
                    <div style={{ backgroundColor: colors.card, borderRadius: '10px', padding: '16px', border: `1px solid ${colors.border}`, textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: colors.danger }}>{rejectedCount}</div>
                        <div style={{ color: colors.textMuted, fontSize: '13px' }}>Rejected</div>
                    </div>
                </div>

                {error && (
                    <div style={{ color: colors.danger, backgroundColor: '#fef2f2', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #fecaca' }}>
                        {error}
                    </div>
                )}

                {/* Applications Table */}
                <div style={{ backgroundColor: colors.card, borderRadius: '12px', border: `1px solid ${colors.border}`, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    {applications.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center' }}>
                            <p style={{ color: colors.textMuted, margin: 0 }}>You haven't applied to any jobs yet.</p>
                            <a href="/student/dashboard" style={{ color: colors.primary, marginTop: '8px', display: 'inline-block' }}>Browse Jobs →</a>
                        </div>
                    ) : (
                        (() => {
                            const filtered = applications.filter(app =>
                                app.job?.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                app.job?.role.toLowerCase().includes(searchTerm.toLowerCase())
                            );

                            if (filtered.length === 0) {
                                return (
                                    <div style={{ padding: '40px', textAlign: 'center' }}>
                                        <p style={{ color: colors.textMuted, margin: 0 }}>No applications matching "{searchTerm}"</p>
                                        <button
                                            onClick={() => setSearchTerm('')}
                                            style={{ background: 'none', border: 'none', color: colors.primary, cursor: 'pointer', marginTop: '8px', textDecoration: 'underline' }}
                                        >
                                            Clear Search
                                        </button>
                                    </div>
                                );
                            }

                            return (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f8fafc' }}>
                                            <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Company</th>
                                            <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Role</th>
                                            <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Applied On</th>
                                            <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Status</th>
                                            <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(applications.filter(app =>
                                            app.job?.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            app.job?.role.toLowerCase().includes(searchTerm.toLowerCase())
                                        )).map((app, idx) => {
                                            const isPlacedRow = isPlaced && app.id === placedApplicationId;
                                            return (
                                                <tr key={app.id} style={{ backgroundColor: isPlacedRow ? '#f0fdf4' : idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                                    <td style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
                                                        <button
                                                            onClick={() => { if (app.job) { setSelectedJob(app.job); setDrawerOpen(true); } }}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                color: colors.primary,
                                                                fontSize: '16px',
                                                                fontWeight: 500,
                                                                cursor: 'pointer',
                                                                textDecoration: 'underline',
                                                                padding: 0,
                                                            }}
                                                        >
                                                            {app.job?.company_name || 'Unknown'}
                                                        </button>
                                                    </td>
                                                    <td style={{ padding: '16px 20px', color: colors.text, fontSize: '16px', borderBottom: `1px solid ${colors.border}` }}>{app.job?.role || 'Unknown'}</td>
                                                    <td style={{ padding: '16px 20px', color: colors.textMuted, fontSize: '16px', borderBottom: `1px solid ${colors.border}` }}>{formatDate(app.applied_at)}</td>
                                                    <td style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>{getStatusBadge(app)}</td>
                                                    <td style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
                                                        {app.status === 'APPLIED' ? (
                                                            <button
                                                                onClick={() => handleWithdraw(app.id)}
                                                                disabled={withdrawingId === app.id}
                                                                style={{
                                                                    padding: '8px 16px',
                                                                    backgroundColor: withdrawingId === app.id ? '#f1f5f9' : '#fef2f2',
                                                                    color: withdrawingId === app.id ? '#94a3b8' : colors.danger,
                                                                    border: 'none',
                                                                    borderRadius: '6px',
                                                                    cursor: withdrawingId === app.id ? 'not-allowed' : 'pointer',
                                                                    fontSize: '14px',
                                                                    fontWeight: 500
                                                                }}
                                                            >
                                                                {withdrawingId === app.id ? '...' : 'Withdraw'}
                                                            </button>
                                                        ) : (
                                                            <span style={{ color: '#cbd5e1' }}>—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            );
                        })()
                    )}
                    <div style={{ padding: '16px', borderTop: `1px solid ${colors.border}`, color: colors.textMuted, fontSize: '14px' }}>
                        Total: {applications.length} application{applications.length !== 1 ? 's' : ''}
                    </div>
                </div>
            </main>

            {/* Job Description Drawer */}
            <JobDescriptionDrawer
                job={selectedJob}
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
            />
        </div>
    );
}
