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

const PAGE_SIZE_OPTIONS = [10, 25, 50, 75, 100];

export default function AdminJobsPage() {
    const { colors, theme } = useTheme();
    const router = useRouter();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [togglingId, setTogglingId] = useState<string | null>(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [companySearch, setCompanySearch] = useState('');
    const [showSearch, setShowSearch] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        company_name: '',
        role: '',
        ctc: '',
        min_cgpa: '0',
        jd_link: '',
        description: '',
        is_active: true,
    });
    const [creating, setCreating] = useState(false);

    // Drawer state
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Edit state
    const [editingJob, setEditingJob] = useState<Job | null>(null);
    const [editFormData, setEditFormData] = useState({
        company_name: '',
        role: '',
        ctc: '',
        min_cgpa: '0',
        jd_link: '',
        description: '', // JD Summary Text
        is_active: true,
    });
    const [saving, setSaving] = useState(false);

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
            const newStatus = !job.is_active;
            await api.put(`/jobs/${job.id}`, { is_active: newStatus });
            setJobs(prev => prev.map(j =>
                j.id === job.id ? { ...j, is_active: newStatus } : j
            ));

            // If we are currently editing this job, update the modal state too
            if (editingJob && editingJob.id === job.id) {
                setEditFormData(prev => ({ ...prev, is_active: newStatus }));
            }
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
                description: formData.description || null,
            });

            setJobs(prev => [newJob, ...prev]);
            setShowForm(false);
            setFormData({ company_name: '', role: '', ctc: '', min_cgpa: '0', jd_link: '', description: '', is_active: true });
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to create job');
        } finally {
            setCreating(false);
        }
    };

    const openEditModal = (job: Job) => {
        setEditingJob(job);
        setEditFormData({
            company_name: job.company_name,
            role: job.role,
            ctc: job.ctc || '',
            min_cgpa: String(job.min_cgpa),
            jd_link: job.jd_link || '',
            description: job.description || '',
            is_active: job.is_active,
        });
    };

    const handleEditJob = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingJob) return;
        setSaving(true);
        try {
            const updated = await api.put<Job>(`/jobs/${editingJob.id}`, {
                company_name: editFormData.company_name,
                role: editFormData.role,
                ctc: editFormData.ctc || null,
                min_cgpa: parseFloat(editFormData.min_cgpa) || 0,
                jd_link: editFormData.jd_link || null,
                description: editFormData.description || null,
                is_active: editFormData.is_active,
            });

            setJobs(prev => prev.map(j => j.id === editingJob.id ? updated : j));
            setEditingJob(null);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to update job');
        } finally {
            setSaving(false);
        }
    };

    // Filter jobs client-side
    const filteredJobs = jobs.filter(job => {
        if (companySearch && !job.company_name.toLowerCase().includes(companySearch.toLowerCase())) return false;
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
        setCompanySearch('');
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
        <div style={{ padding: '40px' }}>
            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ color: colors.text, fontSize: '28px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Manage Jobs</h1>
                    <p style={{ color: colors.textMuted, margin: '4px 0 0 0', fontSize: '14px' }}>Create and manage job postings for students</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={() => setShowForm(true)}
                        style={{
                            padding: '10px 18px',
                            backgroundColor: colors.primary,
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                    >
                        + Create Job Drive
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div style={{ maxWidth: '100%' }}>
                {error && (
                    <div style={{
                        color: colors.danger,
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        border: `1px solid ${colors.danger}40`
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
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: colors.primary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value as 'all' | 'active' | 'inactive'); handleFilterChange(); }}
                            style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${colors.border}`, minWidth: '140px', fontSize: '14px', backgroundColor: colors.inputBg, color: colors.text }}
                        >
                            <option value="all">All Jobs</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: colors.primary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Search Company</label>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            backgroundColor: colors.inputBg,
                            border: `1px solid ${showSearch ? colors.primary : colors.border}`,
                            borderRadius: '8px',
                            padding: '0 12px',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            width: showSearch ? '280px' : '40px',
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
                                placeholder="Type company name..."
                                value={companySearch}
                                onChange={(e) => { setCompanySearch(e.target.value); handleFilterChange(); }}
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
                            {showSearch && companySearch && (
                                <button
                                    onClick={() => { setCompanySearch(''); handleFilterChange(); }}
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
                {
                    showForm && (
                        <form onSubmit={handleCreateJob} style={{
                            backgroundColor: colors.card,
                            padding: '32px',
                            marginBottom: '32px',
                            borderRadius: '16px',
                            border: `1px solid ${colors.border}`,
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)'
                        }}>
                            <h3 style={{ margin: '0 0 24px 0', color: colors.text, fontWeight: 600, fontSize: '20px', borderBottom: `1px solid ${colors.border}`, paddingBottom: '16px' }}>New Job Posting</h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                {/* Section: Basic Info */}
                                <section>
                                    <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', color: colors.primary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Basic Information</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>Company Name *</label>
                                            <input
                                                type="text"
                                                value={formData.company_name}
                                                onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                                                required
                                                placeholder="e.g. Google"
                                                style={{ width: '100%', padding: '12px 16px', border: `1px solid ${colors.border}`, borderRadius: '10px', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s', backgroundColor: colors.inputBg, color: colors.text }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>Role *</label>
                                            <input
                                                type="text"
                                                value={formData.role}
                                                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                                                required
                                                placeholder="e.g. Software Engineer"
                                                style={{ width: '100%', padding: '12px 16px', border: `1px solid ${colors.border}`, borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', backgroundColor: colors.inputBg, color: colors.text }}
                                            />
                                        </div>
                                    </div>
                                </section>

                                {/* Section: Compensation & Criteria */}
                                <section>
                                    <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', color: colors.primary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Compensation & Criteria</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>CTC / Salary</label>
                                            <input
                                                type="text"
                                                value={formData.ctc}
                                                onChange={(e) => setFormData(prev => ({ ...prev, ctc: e.target.value }))}
                                                placeholder="e.g. 12-15 LPA"
                                                style={{ width: '100%', padding: '12px 16px', border: `1px solid ${colors.border}`, borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', backgroundColor: colors.inputBg, color: colors.text }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>Min CGPA Eligibility</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                max="10"
                                                value={formData.min_cgpa}
                                                onChange={(e) => setFormData(prev => ({ ...prev, min_cgpa: e.target.value }))}
                                                style={{ width: '100%', padding: '12px 16px', border: `1px solid ${colors.border}`, borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', backgroundColor: colors.inputBg, color: colors.text }}
                                            />
                                        </div>
                                    </div>
                                </section>

                                {/* Section: Description */}
                                <section>
                                    <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', color: colors.primary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Job Description</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>External JD Link (URL)</label>
                                            <input
                                                type="url"
                                                value={formData.jd_link}
                                                onChange={(e) => setFormData(prev => ({ ...prev, jd_link: e.target.value }))}
                                                placeholder="https://company.com/career/job-details"
                                                style={{ width: '100%', padding: '12px 16px', border: `1px solid ${colors.border}`, borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', backgroundColor: colors.inputBg, color: colors.text }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>JD Summary Text</label>
                                            <textarea
                                                value={formData.description}
                                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                                placeholder="Briefly describe the key responsibilities and benefits..."
                                                rows={4}
                                                style={{ width: '100%', padding: '12px 16px', border: `1px solid ${colors.border}`, borderRadius: '10px', fontSize: '14px', resize: 'vertical', outline: 'none', boxSizing: 'border-box', backgroundColor: colors.inputBg, color: colors.text }}
                                            />
                                        </div>
                                    </div>
                                </section>
                            </div>

                            <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    style={{
                                        padding: '12px 32px',
                                        backgroundColor: creating ? colors.secondary : colors.success,
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        cursor: creating ? 'not-allowed' : 'pointer',
                                        fontSize: '15px',
                                        fontWeight: 600,
                                        transition: 'transform 0.1s grayscale 0.2s',
                                        boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)'
                                    }}
                                >
                                    {creating ? 'Creating...' : 'Publish Job Posting'}
                                </button>
                            </div>
                        </form>
                    )
                }

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
                            style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${colors.border}`, fontSize: '14px', backgroundColor: colors.inputBg, color: colors.text }}
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
                                <tr style={{ backgroundColor: colors.tableHeaderBg }}>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Company</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Role</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>CTC</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Min CGPA</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Status</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedJobs.map((job, idx) => (
                                    <tr key={job.id} style={{ backgroundColor: idx % 2 === 0 ? colors.card : colors.background }}>
                                        <td style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
                                            <button
                                                onClick={() => { setSelectedJob(job); setDrawerOpen(true); }}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: colors.primary,
                                                    fontSize: '15px',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    textDecoration: 'underline',
                                                    padding: 0,
                                                    textAlign: 'left'
                                                }}
                                            >
                                                {job.company_name}
                                            </button>
                                        </td>
                                        <td style={{ padding: '16px 20px', color: colors.text, fontSize: '15px', borderBottom: `1px solid ${colors.border}` }}>{job.role}</td>
                                        <td style={{ padding: '16px 20px', color: colors.textMuted, fontSize: '15px', borderBottom: `1px solid ${colors.border}` }}>{job.ctc || '-'}</td>
                                        <td style={{ padding: '16px 20px', color: colors.textMuted, fontSize: '15px', borderBottom: `1px solid ${colors.border}` }}>{job.min_cgpa}</td>
                                        <td style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
                                            <span style={{
                                                padding: '6px 14px',
                                                borderRadius: '20px',
                                                fontSize: '14px',
                                                fontWeight: 500,
                                                backgroundColor: job.is_active ? 'rgba(22, 163, 74, 0.1)' : colors.secondary + '20',
                                                color: job.is_active ? colors.success : colors.textMuted,
                                                border: `1px solid ${job.is_active ? colors.success + '40' : colors.textMuted + '40'}`
                                            }}>
                                                {job.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 16px', borderBottom: `1px solid ${colors.border}` }}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                                                {/* Removed Activate/Deactivate button here */}
                                                <a
                                                    href={`/admin/applications?job=${job.id}`}
                                                    style={{
                                                        padding: '7px 12px',
                                                        minWidth: '90px',
                                                        backgroundColor: colors.background,
                                                        color: colors.text,
                                                        border: `1px solid ${colors.border}`,
                                                        borderRadius: '6px',
                                                        textDecoration: 'none',
                                                        fontSize: '13px',
                                                        fontWeight: 600,
                                                        textAlign: 'center',
                                                        display: 'inline-block'
                                                    }}
                                                >
                                                    View Applicants
                                                </a>
                                                <button
                                                    onClick={() => openEditModal(job)}
                                                    style={{
                                                        padding: '7px 12px',
                                                        minWidth: '60px',
                                                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                                        color: colors.warning,
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        fontSize: '13px',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {
                    totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '24px', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                                style={{
                                    padding: '8px 14px',
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: '8px',
                                    backgroundColor: currentPage === 1 ? colors.background : colors.card,
                                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                    color: currentPage === 1 ? colors.textMuted : colors.text,
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
                                    backgroundColor: currentPage === 1 ? colors.background : colors.card,
                                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                    color: currentPage === 1 ? colors.textMuted : colors.text,
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
                                    backgroundColor: currentPage === totalPages ? colors.background : colors.card,
                                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                    color: currentPage === totalPages ? colors.textMuted : colors.text,
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
                                    backgroundColor: currentPage === totalPages ? colors.background : colors.card,
                                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                    color: currentPage === totalPages ? colors.textMuted : colors.text,
                                    fontSize: '14px'
                                }}
                            >
                                Last
                            </button>
                        </div>
                    )
                }

                <p style={{ marginTop: '16px', color: colors.textMuted, textAlign: 'center', fontSize: '14px' }}>
                    Page {currentPage} of {totalPages || 1}
                </p>
            </div >

            {/* Edit Job Modal */}
            {
                editingJob && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '24px'
                    }}>
                        <div style={{
                            backgroundColor: colors.card,
                            padding: '32px',
                            borderRadius: '20px',
                            width: '100%',
                            maxWidth: '680px',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            position: 'relative',
                            border: `1px solid ${colors.border}`
                        }}>
                            <button
                                onClick={() => setEditingJob(null)}
                                style={{
                                    position: 'absolute',
                                    top: '24px',
                                    right: '24px',
                                    background: colors.secondary + '20',
                                    border: 'none',
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '20px',
                                    color: colors.textMuted,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                ×
                            </button>

                            <div style={{ marginBottom: '24px', borderBottom: `1px solid ${colors.border}`, paddingBottom: '16px' }}>
                                <h2 style={{ margin: 0, color: colors.text, fontWeight: 700, fontSize: '24px' }}>
                                    Edit Job Posting
                                </h2>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                                    <p style={{ margin: 0, color: colors.textMuted, fontSize: '13px' }}>ID: {editingJob.id.slice(0, 8)}...</p>
                                    <div style={{ width: '1px', height: '14px', backgroundColor: colors.border }}></div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Job Status:</span>
                                        <button
                                            type="button"
                                            onClick={() => handleToggleActive(editingJob)}
                                            disabled={togglingId === editingJob.id}
                                            style={{
                                                padding: '4px 12px',
                                                borderRadius: '20px',
                                                backgroundColor: editingJob.is_active ? 'rgba(22, 163, 74, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                color: editingJob.is_active ? colors.success : colors.danger,
                                                border: `1px solid ${editingJob.is_active ? colors.success + '40' : colors.danger + '40'}`,
                                                fontWeight: 700,
                                                fontSize: '11px',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                                cursor: togglingId === editingJob.id ? 'not-allowed' : 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                transition: 'all 0.2s',
                                                outline: 'none'
                                            }}
                                            title="Click to change job visibility"
                                        >
                                            {togglingId === editingJob.id ? '...' : editingJob.is_active ? 'Active' : 'Inactive'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleEditJob}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                    {/* Section: Basic Info */}
                                    <section>
                                        <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', color: colors.primary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Basic Information</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>Company Name</label>
                                                <input
                                                    type="text"
                                                    value={editFormData.company_name}
                                                    onChange={(e) => setEditFormData(prev => ({ ...prev, company_name: e.target.value }))}
                                                    required
                                                    style={{ width: '100%', padding: '12px 16px', border: `1px solid ${colors.border}`, borderRadius: '10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box', backgroundColor: colors.inputBg, color: colors.text }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>Role</label>
                                                <input
                                                    type="text"
                                                    value={editFormData.role}
                                                    onChange={(e) => setEditFormData(prev => ({ ...prev, role: e.target.value }))}
                                                    required
                                                    style={{ width: '100%', padding: '12px 16px', border: `1px solid ${colors.border}`, borderRadius: '10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box', backgroundColor: colors.inputBg, color: colors.text }}
                                                />
                                            </div>
                                            <div style={{ gridColumn: 'span 2' }}>
                                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>Visibility Toggle</label>
                                                <div style={{ display: 'flex', gap: '12px' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditFormData(prev => ({ ...prev, is_active: true }))}
                                                        style={{
                                                            flex: 1,
                                                            padding: '12px',
                                                            borderRadius: '10px',
                                                            border: `1px solid ${editFormData.is_active ? colors.success : colors.border}`,
                                                            backgroundColor: editFormData.is_active ? 'rgba(22, 163, 74, 0.1)' : colors.card,
                                                            color: editFormData.is_active ? colors.success : colors.textMuted,
                                                            fontSize: '14px',
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        ACTIVE (Visible)
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditFormData(prev => ({ ...prev, is_active: false }))}
                                                        style={{
                                                            flex: 1,
                                                            padding: '12px',
                                                            borderRadius: '10px',
                                                            border: `1px solid ${!editFormData.is_active ? colors.danger : colors.border}`,
                                                            backgroundColor: !editFormData.is_active ? 'rgba(239, 68, 68, 0.1)' : colors.card,
                                                            color: !editFormData.is_active ? colors.danger : colors.textMuted,
                                                            fontSize: '14px',
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        INACTIVE (Hidden)
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Section: Compensation & Criteria */}
                                    <section>
                                        <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', color: colors.primary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Compensation & Criteria</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>CTC / Salary</label>
                                                <input
                                                    type="text"
                                                    value={editFormData.ctc}
                                                    onChange={(e) => setEditFormData(prev => ({ ...prev, ctc: e.target.value }))}
                                                    style={{ width: '100%', padding: '12px 16px', border: `1px solid ${colors.border}`, borderRadius: '10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box', backgroundColor: colors.inputBg, color: colors.text }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>Min CGPA</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    min="0"
                                                    max="10"
                                                    value={editFormData.min_cgpa}
                                                    onChange={(e) => setEditFormData(prev => ({ ...prev, min_cgpa: e.target.value }))}
                                                    style={{ width: '100%', padding: '12px 16px', border: `1px solid ${colors.border}`, borderRadius: '10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box', backgroundColor: colors.inputBg, color: colors.text }}
                                                />
                                            </div>
                                        </div>
                                    </section>

                                    {/* Section: Links/Files */}
                                    <section>
                                        <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', color: colors.primary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description & Links</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>External JD Link (URL)</label>
                                                <input
                                                    type="url"
                                                    value={editFormData.jd_link}
                                                    onChange={(e) => setEditFormData(prev => ({ ...prev, jd_link: e.target.value }))}
                                                    placeholder="https://..."
                                                    style={{ width: '100%', padding: '12px 16px', border: `1px solid ${colors.border}`, borderRadius: '10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box', backgroundColor: colors.inputBg, color: colors.text }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>JD Summary Text</label>
                                                <textarea
                                                    value={editFormData.description}
                                                    onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                                                    placeholder="Briefly describe the key responsibilities and benefits..."
                                                    rows={4}
                                                    style={{ width: '100%', padding: '12px 16px', border: `1px solid ${colors.border}`, borderRadius: '10px', fontSize: '15px', resize: 'vertical', outline: 'none', boxSizing: 'border-box', backgroundColor: colors.inputBg, color: colors.text }}
                                                />
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: `1px solid ${colors.border}`, display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                                    <button
                                        type="button"
                                        onClick={() => setEditingJob(null)}
                                        style={{
                                            padding: '12px 24px',
                                            backgroundColor: colors.secondary,
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            fontSize: '15px',
                                            fontWeight: 600,
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        style={{
                                            padding: '12px 32px',
                                            backgroundColor: colors.primary,
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '10px',
                                            cursor: saving ? 'not-allowed' : 'pointer',
                                            fontSize: '15px',
                                            fontWeight: 600,
                                            minWidth: '160px',
                                            boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
            <JobDescriptionDrawer
                job={selectedJob}
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
            />
        </div >
    );
}
