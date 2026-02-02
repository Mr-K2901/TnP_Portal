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

const PAGE_SIZE_OPTIONS = [10, 25, 50, 75, 100];

// Modern color palette
const colors = {
    primary: '#4f46e5',      // Indigo
    primaryHover: '#4338ca',
    secondary: '#64748b',    // Slate
    success: '#10b981',      // Emerald
    danger: '#ef4444',       // Red
    info: '#0ea5e9',         // Sky
    background: '#f8fafc',   // Slate-50
    card: '#ffffff',
    border: '#e2e8f0',       // Slate-200
    text: '#1e293b',         // Slate-800
    textMuted: '#64748b',    // Slate-500
    headerBg: '#1e293b',     // Slate-800
};

export default function AdminJobsPage() {
    const router = useRouter();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [togglingId, setTogglingId] = useState<string | null>(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        company_name: '',
        role: '',
        ctc: '',
        min_cgpa: '0',
        jd_link: '',
    });
    const [creating, setCreating] = useState(false);

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

    const fetchJobs = async () => {
        try {
            const response = await api.get<JobListResponse>('/jobs?active_only=false');
            setJobs(response.jobs);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (job: Job) => {
        setTogglingId(job.id);
        try {
            await api.put(`/jobs/${job.id}`, { is_active: !job.is_active });
            setJobs(prev => prev.map(j =>
                j.id === job.id ? { ...j, is_active: !j.is_active } : j
            ));
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to update job');
        } finally {
            setTogglingId(null);
        }
    };

    const handleCreateJob = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const newJob = await api.post<Job>('/jobs', {
                company_name: formData.company_name,
                role: formData.role,
                ctc: formData.ctc || null,
                min_cgpa: parseFloat(formData.min_cgpa) || 0,
                jd_link: formData.jd_link || null,
            });
            setJobs(prev => [newJob, ...prev]);
            setShowForm(false);
            setFormData({ company_name: '', role: '', ctc: '', min_cgpa: '0', jd_link: '' });
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to create job');
        } finally {
            setCreating(false);
        }
    };

    const handleLogout = () => {
        removeToken();
        router.push('/login');
    };

    // Filter jobs client-side
    const filteredJobs = jobs.filter(job => {
        if (statusFilter === 'active' && !job.is_active) return false;
        if (statusFilter === 'inactive' && job.is_active) return false;
        return true;
    });

    // Pagination
    const totalRecords = filteredJobs.length;
    const totalPages = Math.ceil(totalRecords / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalRecords);
    const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

    const handleFilterChange = () => setCurrentPage(1);

    const handleClearFilters = () => {
        setStatusFilter('all');
        setCurrentPage(1);
    };

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('...');
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                pages.push(i);
            }
            if (currentPage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                backgroundColor: colors.background,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.textMuted
            }}>
                Loading jobs...
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: colors.background }}>
            {/* Header */}
            <header style={{
                backgroundColor: colors.headerBg,
                padding: '16px 40px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{ color: '#fff', fontSize: '20px', margin: 0, fontWeight: 600 }}>TnP Admin</h1>
                    <nav style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                        <a href="/admin" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px' }}>Home</a>
                        <a href="/admin/students" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px' }}>Students</a>
                        <a href="/admin/jobs" style={{ color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>Jobs</a>
                        <button
                            onClick={handleLogout}
                            style={{
                                backgroundColor: 'transparent',
                                border: '1px solid #475569',
                                color: '#94a3b8',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            Logout
                        </button>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main style={{ padding: '32px 40px', maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ marginBottom: '24px' }}>
                    <h2 style={{ color: colors.text, fontSize: '28px', fontWeight: 600, margin: 0 }}>Manage Jobs</h2>
                    <p style={{ color: colors.textMuted, margin: '4px 0 0 0' }}>Create and manage job postings for students</p>
                </div>

                {error && (
                    <div style={{
                        color: colors.danger,
                        backgroundColor: '#fef2f2',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        border: '1px solid #fecaca'
                    }}>
                        {error}
                    </div>
                )}

                {/* Filters */}
                <div style={{
                    backgroundColor: colors.card,
                    padding: '16px 20px',
                    borderRadius: '12px',
                    marginBottom: '20px',
                    border: `1px solid ${colors.border}`,
                    display: 'flex',
                    gap: '16px',
                    flexWrap: 'wrap',
                    alignItems: 'flex-end',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 500, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value as 'all' | 'active' | 'inactive'); handleFilterChange(); }}
                            style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${colors.border}`, minWidth: '140px', fontSize: '14px', backgroundColor: '#fff' }}
                        >
                            <option value="all">All Jobs</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    <button
                        onClick={handleClearFilters}
                        style={{
                            padding: '10px 16px',
                            backgroundColor: colors.secondary,
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 500
                        }}
                    >
                        Clear
                    </button>

                    <div style={{ marginLeft: 'auto' }}>
                        <button
                            onClick={() => setShowForm(!showForm)}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: showForm ? colors.secondary : colors.primary,
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            {showForm ? '✕ Cancel' : '+ Create Job'}
                        </button>
                    </div>
                </div>

                {/* Create Job Form */}
                {showForm && (
                    <form onSubmit={handleCreateJob} style={{
                        backgroundColor: colors.card,
                        padding: '24px',
                        marginBottom: '20px',
                        borderRadius: '12px',
                        border: `1px solid ${colors.border}`,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}>
                        <h3 style={{ margin: '0 0 20px 0', color: colors.text, fontWeight: 600, fontSize: '18px' }}>New Job Posting</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 500, color: colors.textMuted, textTransform: 'uppercase' }}>Company Name *</label>
                                <input
                                    type="text"
                                    value={formData.company_name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                                    required
                                    style={{ width: '100%', padding: '10px 14px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '14px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 500, color: colors.textMuted, textTransform: 'uppercase' }}>Role *</label>
                                <input
                                    type="text"
                                    value={formData.role}
                                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                                    required
                                    style={{ width: '100%', padding: '10px 14px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '14px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 500, color: colors.textMuted, textTransform: 'uppercase' }}>CTC</label>
                                <input
                                    type="text"
                                    value={formData.ctc}
                                    onChange={(e) => setFormData(prev => ({ ...prev, ctc: e.target.value }))}
                                    placeholder="e.g., 12-15 LPA"
                                    style={{ width: '100%', padding: '10px 14px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '14px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 500, color: colors.textMuted, textTransform: 'uppercase' }}>Min CGPA</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="10"
                                    value={formData.min_cgpa}
                                    onChange={(e) => setFormData(prev => ({ ...prev, min_cgpa: e.target.value }))}
                                    style={{ width: '100%', padding: '10px 14px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '14px' }}
                                />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 500, color: colors.textMuted, textTransform: 'uppercase' }}>JD Link</label>
                                <input
                                    type="url"
                                    value={formData.jd_link}
                                    onChange={(e) => setFormData(prev => ({ ...prev, jd_link: e.target.value }))}
                                    placeholder="https://..."
                                    style={{ width: '100%', padding: '10px 14px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '14px' }}
                                />
                            </div>
                        </div>
                        <div style={{ marginTop: '20px' }}>
                            <button
                                type="submit"
                                disabled={creating}
                                style={{
                                    padding: '10px 24px',
                                    backgroundColor: creating ? colors.secondary : colors.success,
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: creating ? 'not-allowed' : 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 500
                                }}
                            >
                                {creating ? 'Creating...' : 'Create Job'}
                            </button>
                        </div>
                    </form>
                )}

                {/* Table Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '14px', color: colors.textMuted }}>
                        Showing {totalRecords > 0 ? startIndex + 1 : 0} - {endIndex} of {totalRecords} jobs
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '14px', color: colors.textMuted }}>Show:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => { setPageSize(parseInt(e.target.value)); setCurrentPage(1); }}
                            style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${colors.border}`, fontSize: '14px' }}
                        >
                            {PAGE_SIZE_OPTIONS.map(size => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div style={{
                    backgroundColor: colors.card,
                    borderRadius: '12px',
                    border: `1px solid ${colors.border}`,
                    overflow: 'hidden',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                    {paginatedJobs.length === 0 ? (
                        <p style={{ padding: '40px', textAlign: 'center', color: colors.textMuted, margin: 0 }}>No jobs found.</p>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8fafc' }}>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Company</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Role</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>CTC</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Min CGPA</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Status</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedJobs.map((job, idx) => (
                                    <tr key={job.id} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                        <td style={{ padding: '16px 20px', color: colors.text, fontSize: '15px', fontWeight: 500, borderBottom: `1px solid ${colors.border}` }}>{job.company_name}</td>
                                        <td style={{ padding: '16px 20px', color: colors.text, fontSize: '15px', borderBottom: `1px solid ${colors.border}` }}>{job.role}</td>
                                        <td style={{ padding: '16px 20px', color: colors.textMuted, fontSize: '15px', borderBottom: `1px solid ${colors.border}` }}>{job.ctc || '-'}</td>
                                        <td style={{ padding: '16px 20px', color: colors.textMuted, fontSize: '15px', borderBottom: `1px solid ${colors.border}` }}>{job.min_cgpa}</td>
                                        <td style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
                                            <span style={{
                                                padding: '6px 14px',
                                                borderRadius: '20px',
                                                fontSize: '14px',
                                                fontWeight: 500,
                                                backgroundColor: job.is_active ? '#dcfce7' : '#f1f5f9',
                                                color: job.is_active ? '#166534' : colors.textMuted
                                            }}>
                                                {job.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 16px', borderBottom: `1px solid ${colors.border}` }}>
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                <button
                                                    onClick={() => handleToggleActive(job)}
                                                    disabled={togglingId === job.id}
                                                    style={{
                                                        padding: '8px 16px',
                                                        minWidth: '100px',
                                                        backgroundColor: job.is_active ? '#fef2f2' : '#dcfce7',
                                                        color: job.is_active ? colors.danger : '#166534',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        cursor: togglingId === job.id ? 'not-allowed' : 'pointer',
                                                        fontSize: '14px',
                                                        fontWeight: 500,
                                                        textAlign: 'center'
                                                    }}
                                                >
                                                    {togglingId === job.id ? '...' : job.is_active ? 'Deactivate' : 'Activate'}
                                                </button>
                                                <a
                                                    href={`/admin/applications?job=${job.id}`}
                                                    style={{
                                                        padding: '8px 16px',
                                                        minWidth: '100px',
                                                        backgroundColor: '#e0f2fe',
                                                        color: '#0369a1',
                                                        borderRadius: '6px',
                                                        textDecoration: 'none',
                                                        fontSize: '14px',
                                                        fontWeight: 500,
                                                        textAlign: 'center',
                                                        display: 'inline-block'
                                                    }}
                                                >
                                                    View Apps
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '24px', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            style={{
                                padding: '8px 14px',
                                border: `1px solid ${colors.border}`,
                                borderRadius: '8px',
                                backgroundColor: currentPage === 1 ? '#f8fafc' : colors.card,
                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                color: currentPage === 1 ? '#cbd5e1' : colors.text,
                                fontSize: '14px'
                            }}
                        >
                            First
                        </button>
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            style={{
                                padding: '8px 14px',
                                border: `1px solid ${colors.border}`,
                                borderRadius: '8px',
                                backgroundColor: currentPage === 1 ? '#f8fafc' : colors.card,
                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                color: currentPage === 1 ? '#cbd5e1' : colors.text,
                                fontSize: '14px'
                            }}
                        >
                            Prev
                        </button>

                        {getPageNumbers().map((page, idx) => (
                            typeof page === 'number' ? (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentPage(page)}
                                    style={{
                                        padding: '8px 14px',
                                        border: currentPage === page ? 'none' : `1px solid ${colors.border}`,
                                        borderRadius: '8px',
                                        backgroundColor: currentPage === page ? colors.primary : colors.card,
                                        color: currentPage === page ? '#fff' : colors.text,
                                        cursor: 'pointer',
                                        fontWeight: currentPage === page ? 600 : 400,
                                        fontSize: '14px'
                                    }}
                                >
                                    {page}
                                </button>
                            ) : (
                                <span key={idx} style={{ padding: '8px', color: colors.textMuted }}>...</span>
                            )
                        ))}

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            style={{
                                padding: '8px 14px',
                                border: `1px solid ${colors.border}`,
                                borderRadius: '8px',
                                backgroundColor: currentPage === totalPages ? '#f8fafc' : colors.card,
                                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                color: currentPage === totalPages ? '#cbd5e1' : colors.text,
                                fontSize: '14px'
                            }}
                        >
                            Next
                        </button>
                        <button
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                            style={{
                                padding: '8px 14px',
                                border: `1px solid ${colors.border}`,
                                borderRadius: '8px',
                                backgroundColor: currentPage === totalPages ? '#f8fafc' : colors.card,
                                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                color: currentPage === totalPages ? '#cbd5e1' : colors.text,
                                fontSize: '14px'
                            }}
                        >
                            Last
                        </button>
                    </div>
                )}

                <p style={{ marginTop: '16px', color: colors.textMuted, textAlign: 'center', fontSize: '14px' }}>
                    Page {currentPage} of {totalPages || 1}
                </p>
            </main>
        </div>
    );
}
