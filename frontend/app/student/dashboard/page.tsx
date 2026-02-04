'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { isLoggedIn, getUserRole } from '@/lib/auth';
import JobDescriptionDrawer from '@/components/JobDescriptionDrawer';
import { useTheme } from '@/context/ThemeContext';

interface Job {
    id: string;
    company_name: string;
    role: string;
    ctc: string | null;
    min_cgpa: number;
    is_active: boolean;
    jd_link: string | null;
    description: string | null;
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
    const { colors } = useTheme();
    const router = useRouter();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [applicationStatus, setApplicationStatus] = useState<Map<string, string>>(new Map());
    const [applyingTo, setApplyingTo] = useState<string | null>(null);
    const [isPlaced, setIsPlaced] = useState(false);
    const [profileName, setProfileName] = useState('');
    const [studentCgpa, setStudentCgpa] = useState<number | null>(null);

    // Pagination
    const PAGE_SIZE_OPTIONS = [10, 25, 50];
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');

    // Drawer state
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
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
        } catch {
            // Ignore
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

    const isEligible = (job: Job): boolean => {
        if (studentCgpa === null) return false;
        return studentCgpa >= job.min_cgpa;
    };

    const getStatusBadge = (status: string) => {
        // We can make these depend on theme too, but for success/danger usually standard colors are fine.
        // Using rgba for transparency to blend with dark mode better.
        const styles: Record<string, { bg: string; color: string; label: string }> = {
            'APPLIED': { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', label: 'Applied' }, // blue-500
            'SHORTLISTED': { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', label: 'Shortlisted' }, // green-500
            'REJECTED': { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', label: 'Rejected' }, // red-500
        };
        const style = styles[status] || { bg: colors.secondary + '20', color: colors.textMuted, label: status };
        return (
            <span style={{
                padding: '8px 16px',
                borderRadius: '6px',
                backgroundColor: style.bg,
                color: style.color,
                fontWeight: 600,
                fontSize: '13px',
                letterSpacing: '0.3px',
                border: `1px solid ${style.color}40`, // Add light border for better contrast
            }}>
                {style.label}
            </span>
        );
    };

    const getActionCell = (job: Job) => {
        const status = applicationStatus.get(job.id);

        if (status) {
            return getStatusBadge(status);
        }

        if (!isEligible(job)) {
            return (
                <div>
                    <span style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: colors.danger,
                        fontSize: '13px',
                        fontWeight: 500,
                        border: `1px solid ${colors.danger}40`
                    }}>
                        Not Eligible
                    </span>
                </div>
            );
        }

        return (
            <button
                onClick={() => handleApply(job.id)}
                disabled={applyingTo === job.id}
                style={{
                    padding: '10px 24px',
                    backgroundColor: applyingTo === job.id ? colors.secondary : colors.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: applyingTo === job.id ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    minWidth: '110px',
                    opacity: applyingTo === job.id ? 0.7 : 1,
                }}
            >
                {applyingTo === job.id ? 'Applying...' : 'Apply'}
            </button>
        );
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: colors.background, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted }}>
                Loading jobs...
            </div>
        );
    }

    // Filter jobs
    const filteredJobs = jobs.filter(job =>
        job.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalRecords = filteredJobs.length;
    const totalPages = Math.ceil(totalRecords / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedJobs = filteredJobs.slice(startIndex, startIndex + pageSize);

    return (
        <div style={{ padding: '40px' }}>
            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ color: colors.text, fontSize: '28px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Browse Jobs</h1>
                    <p style={{ color: colors.textMuted, margin: '4px 0 0 0', fontSize: '14px' }}>Find and apply to active placement drives</p>
                </div>
                {studentCgpa !== null && (
                    <div style={{
                        backgroundColor: 'rgba(79, 70, 229, 0.1)',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontSize: '14px',
                        color: colors.primary,
                        fontWeight: 600,
                        border: `1px solid ${colors.primary}30`
                    }}>
                        Your CGPA: {studentCgpa.toFixed(2)}
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div style={{ maxWidth: '100%' }}>

                {studentCgpa === null && (
                    <div style={{
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        padding: '16px 20px',
                        borderRadius: '12px',
                        marginBottom: '24px',
                        fontSize: '14px',
                        borderLeft: `4px solid ${colors.warning}`,
                        color: colors.warning
                    }}>
                        ⚠️ Please complete your profile with CGPA to apply for jobs.
                    </div>
                )}

                {error && (
                    <div style={{ color: colors.danger, backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', border: `1px solid ${colors.danger}40` }}>
                        {error}
                    </div>
                )}

                <div style={{
                    backgroundColor: colors.card,
                    padding: '20px',
                    borderRadius: '12px',
                    marginBottom: '24px',
                    border: `1px solid ${colors.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    boxSizing: 'border-box',
                    width: '100%'
                }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                        <input
                            type="text"
                            placeholder="Search by company or role..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            style={{
                                width: '100%',
                                padding: '12px 16px 12px 40px',
                                borderRadius: '10px',
                                border: `1px solid ${colors.border}`,
                                fontSize: '15px',
                                outline: 'none',
                                transition: 'all 0.2s',
                                boxSizing: 'border-box',
                                backgroundColor: colors.inputBg,
                                color: colors.text
                            }}
                        />
                        <svg
                            style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: colors.textMuted }}
                            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        >
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                        </svg>
                    </div>
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: colors.primary,
                                fontSize: '14px',
                                fontWeight: 500,
                                cursor: 'pointer'
                            }}
                        >
                            Clear Search
                        </button>
                    )}
                </div>

                {/* Table Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '14px', color: colors.textMuted }}>
                        Showing {totalRecords > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + pageSize, totalRecords)} of {totalRecords} jobs
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '14px', color: colors.textMuted }}>Show:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => { setPageSize(parseInt(e.target.value)); setCurrentPage(1); }}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: `1px solid ${colors.border}`,
                                fontSize: '14px',
                                backgroundColor: colors.inputBg,
                                color: colors.text
                            }}
                        >
                            {PAGE_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size}</option>)}
                        </select>
                    </div>
                </div>

                {/* Jobs Table */}
                <div style={{ backgroundColor: colors.card, borderRadius: '12px', border: `1px solid ${colors.border}`, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    {filteredJobs.length === 0 ? (
                        <p style={{ padding: '40px', textAlign: 'center', color: colors.textMuted, margin: 0 }}>No jobs matching your search.</p>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: colors.tableHeaderBg }}>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Company</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Role</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>CTC</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Min CGPA</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedJobs.map((job, idx) => {
                                    const eligible = isEligible(job);
                                    const hasApplied = applicationStatus.has(job.id);
                                    return (
                                        <tr
                                            key={job.id}
                                            style={{
                                                backgroundColor: idx % 2 === 0 ? colors.card : colors.background, // Alternate stripes
                                                opacity: !eligible && !hasApplied ? 0.7 : 1
                                            }}
                                        >
                                            <td style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
                                                <button
                                                    onClick={() => { setSelectedJob(job); setDrawerOpen(true); }}
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
                                                    {job.company_name}
                                                </button>
                                            </td>
                                            <td style={{ padding: '16px 20px', color: colors.text, fontSize: '16px', borderBottom: `1px solid ${colors.border}` }}>{job.role}</td>
                                            <td style={{ padding: '16px 20px', color: colors.textMuted, fontSize: '16px', borderBottom: `1px solid ${colors.border}` }}>{job.ctc || '-'}</td>
                                            <td style={{
                                                padding: '16px 20px',
                                                fontSize: '16px',
                                                fontWeight: !eligible && !hasApplied ? 600 : 400,
                                                color: !eligible && !hasApplied ? colors.danger : colors.textMuted,
                                                borderBottom: `1px solid ${colors.border}`
                                            }}>
                                                {job.min_cgpa}
                                            </td>
                                            <td style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
                                                {getActionCell(job)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                    <div style={{ padding: '16px 20px', borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: colors.textMuted, fontSize: '14px' }}>
                            Page {currentPage} of {totalPages || 1}
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    border: `1px solid ${colors.border}`,
                                    backgroundColor: currentPage === 1 ? colors.background : colors.card,
                                    color: currentPage === 1 ? colors.textMuted : colors.text,
                                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                    fontSize: '14px'
                                }}
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage >= totalPages}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    border: `1px solid ${colors.border}`,
                                    backgroundColor: currentPage >= totalPages ? colors.background : colors.card,
                                    color: currentPage >= totalPages ? colors.textMuted : colors.text,
                                    cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                                    fontSize: '14px'
                                }}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Job Description Drawer */}
            <JobDescriptionDrawer
                job={selectedJob}
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
            />
        </div >
    );
}
