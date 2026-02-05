'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { isLoggedIn, getUserRole } from '@/lib/auth';
import JobDescriptionDrawer from '@/components/JobDescriptionDrawer';
import { useTheme } from '@/context/ThemeContext';
import { ApplicationStatus, getStatusStyle, TERMINAL_STATES } from '@/lib/applicationStatus';

interface Application {
    id: string;
    job_id: string;
    student_id: string;
    status: ApplicationStatus;
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
    const { colors } = useTheme();
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
            const placedApp = response.applications.find(app => app.status === 'PLACED' || app.status === 'OFFER_RELEASED');
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
                app.id === applicationId ? { ...app, status: 'WITHDRAWN' as ApplicationStatus } : app
            ));
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to withdraw');
        } finally {
            setWithdrawingId(null);
        }
    };

    const handleOfferAction = async (applicationId: string, action: 'accept' | 'decline') => {
        const actionLabel = action === 'accept' ? 'ACCEPT' : 'DECLINE';
        if (!confirm(`Are you sure you want to ${actionLabel} this offer? This action is final.`)) return;

        setWithdrawingId(applicationId); // Reuse loading state
        try {
            const endpoint = action === 'accept' ? 'accept-offer' : 'decline-offer';
            const response = await api.post<Application>(`/applications/${applicationId}/actions/${endpoint}`, {});

            setApplications(prev => prev.map(app =>
                app.id === applicationId ? { ...app, status: response.status } : app
            ));

            if (action === 'accept') {
                alert('Congratulations! Offer accepted successfully. 🎉');
                // Refresh to update placement banner
                fetchApplications();
            }
        } catch (err) {
            alert(err instanceof Error ? err.message : `Failed to ${action} offer`);
        } finally {
            setWithdrawingId(null);
        }
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
                    backgroundColor: colors.success,
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

        const style = getStatusStyle(app.status, colors);
        return (
            <span style={{
                padding: '8px 16px',
                borderRadius: '6px',
                backgroundColor: style.bg,
                color: style.color,
                fontWeight: 600,
                fontSize: '13px',
                letterSpacing: '0.3px',
                border: `1px solid ${style.color}40`,
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

    // Stats - categorized by progress
    const inProgressCount = applications.filter(a =>
        ['APPLIED', 'SELECTED', 'IN_PROCESS', 'INTERVIEW_SCHEDULED', 'SHORTLISTED', 'OFFER_RELEASED'].includes(a.status)
    ).length;
    const placedCount = applications.filter(a => a.status === 'PLACED').length;
    const closedCount = applications.filter(a =>
        ['REJECTED', 'WITHDRAWN', 'OFFER_DECLINED'].includes(a.status)
    ).length;

    return (
        <div style={{ padding: '40px' }}>
            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ color: colors.text, fontSize: '28px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>My Applications</h1>
                    <p style={{ color: colors.textMuted, margin: '4px 0 0 0', fontSize: '14px' }}>Track your job application status</p>
                </div>
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
                            pointerEvents: showSearch ? 'auto' : 'none',
                            boxSizing: 'border-box'
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

            {/* Main Content */}
            <div style={{ maxWidth: '100%' }}>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ backgroundColor: colors.card, borderRadius: '10px', padding: '16px', border: `1px solid ${colors.border}`, textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: colors.warning }}>{inProgressCount}</div>
                        <div style={{ color: colors.textMuted, fontSize: '13px' }}>In Progress</div>
                    </div>
                    <div style={{ backgroundColor: colors.card, borderRadius: '10px', padding: '16px', border: `1px solid ${colors.border}`, textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: colors.success }}>{placedCount}</div>
                        <div style={{ color: colors.textMuted, fontSize: '13px' }}>Placed</div>
                    </div>
                    <div style={{ backgroundColor: colors.card, borderRadius: '10px', padding: '16px', border: `1px solid ${colors.border}`, textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: colors.danger }}>{closedCount}</div>
                        <div style={{ color: colors.textMuted, fontSize: '13px' }}>Closed</div>
                    </div>
                </div>

                {error && (
                    <div style={{ color: colors.danger, backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', border: `1px solid ${colors.danger}40` }}>
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
                                        <tr style={{ backgroundColor: colors.tableHeaderBg }}>
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
                                                <tr key={app.id} style={{ backgroundColor: isPlacedRow ? 'rgba(34, 197, 94, 0.1)' : (idx % 2 === 0 ? colors.card : colors.background) }}>
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
                                                                    backgroundColor: 'transparent',
                                                                    border: `1px solid ${colors.danger}`,
                                                                    borderRadius: '6px',
                                                                    color: colors.danger,
                                                                    cursor: withdrawingId === app.id ? 'not-allowed' : 'pointer',
                                                                    fontSize: '13px',
                                                                    fontWeight: 600,
                                                                    transition: 'all 0.2s ease',
                                                                    opacity: withdrawingId === app.id ? 0.7 : 1
                                                                }}
                                                            >
                                                                {withdrawingId === app.id ? 'Withdrawing...' : 'Withdraw'}
                                                            </button>
                                                        ) : app.status === 'OFFER_RELEASED' ? (
                                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                                <button
                                                                    onClick={() => handleOfferAction(app.id, 'accept')}
                                                                    disabled={withdrawingId === app.id}
                                                                    style={{
                                                                        padding: '8px 16px',
                                                                        backgroundColor: colors.success,
                                                                        border: 'none',
                                                                        borderRadius: '6px',
                                                                        color: '#fff',
                                                                        cursor: withdrawingId === app.id ? 'not-allowed' : 'pointer',
                                                                        fontSize: '13px',
                                                                        fontWeight: 600,
                                                                        opacity: withdrawingId === app.id ? 0.7 : 1
                                                                    }}
                                                                >
                                                                    Accept Offer
                                                                </button>
                                                                <button
                                                                    onClick={() => handleOfferAction(app.id, 'decline')}
                                                                    disabled={withdrawingId === app.id}
                                                                    style={{
                                                                        padding: '8px 16px',
                                                                        backgroundColor: 'transparent',
                                                                        border: `1px solid ${colors.danger}`,
                                                                        borderRadius: '6px',
                                                                        color: colors.danger,
                                                                        cursor: withdrawingId === app.id ? 'not-allowed' : 'pointer',
                                                                        fontSize: '13px',
                                                                        fontWeight: 600,
                                                                        opacity: withdrawingId === app.id ? 0.7 : 1
                                                                    }}
                                                                >
                                                                    Decline
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span style={{ fontSize: '13px', color: colors.textMuted }}>
                                                                {TERMINAL_STATES.includes(app.status)
                                                                    ? (app.status === 'PLACED' ? 'Offer Accepted ✅' : 'Application Closed')
                                                                    : 'In Progress'}
                                                            </span>
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
            </div>

            {/* Job Description Drawer */}
            <JobDescriptionDrawer
                job={selectedJob}
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
            />
        </div>
    );
}
