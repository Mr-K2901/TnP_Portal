'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { isLoggedIn, getUserRole, removeToken } from '@/lib/auth';

interface Student {
    user_id: string;
    full_name: string;
    email: string;
    branch: string;
    department: string | null;
    cgpa: number | null;
    is_placed: boolean;
    applications_count: number;
    placed_company: string | null;
}

interface StudentListResponse {
    students: Student[];
    total: number;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 75, 100];

// Modern color palette
const colors = {
    primary: '#4f46e5',
    primaryHover: '#4338ca',
    secondary: '#64748b',
    success: '#10b981',
    danger: '#ef4444',
    info: '#0ea5e9',
    background: '#f8fafc',
    card: '#ffffff',
    border: '#e2e8f0',
    text: '#1e293b',
    textMuted: '#64748b',
    headerBg: '#1e293b',
};

export default function AdminStudentsPage() {
    const router = useRouter();
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [courseFilter, setCourseFilter] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [minCgpa, setMinCgpa] = useState('');
    const [maxCgpa, setMaxCgpa] = useState('');
    const [placedFilter, setPlacedFilter] = useState<'all' | 'placed' | 'not_placed'>('all');
    const [nameSearch, setNameSearch] = useState('');
    const [showSearch, setShowSearch] = useState(false);

    // Options
    const [courses, setCourses] = useState<string[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Import state
    const [importing, setImporting] = useState(false);
    const [importSummary, setImportSummary] = useState<{ success_count: number; failure_count: number; errors: string[] } | null>(null);
    const [showImportModal, setShowImportModal] = useState(false);

    useEffect(() => {
        if (!isLoggedIn()) {
            router.push('/login');
            return;
        }
        if (getUserRole() !== 'ADMIN') {
            router.push('/login');
            return;
        }
        fetchStudents();
    }, [router]);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const response = await api.get<StudentListResponse>('/admin/students');
            setAllStudents(response.students);
            const uniqueCourses = [...new Set(response.students.map(s => s.branch))].sort();
            const uniqueDepts = [...new Set(response.students.map(s => s.department).filter(Boolean))] as string[];
            setCourses(uniqueCourses);
            setDepartments(uniqueDepts.sort());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch students');
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = allStudents.filter(student => {
        if (nameSearch && !student.full_name.toLowerCase().includes(nameSearch.toLowerCase())) return false;
        if (courseFilter && student.branch !== courseFilter) return false;
        if (departmentFilter && student.department !== departmentFilter) return false;
        if (minCgpa && (student.cgpa === null || student.cgpa < parseFloat(minCgpa))) return false;
        if (maxCgpa && (student.cgpa === null || student.cgpa > parseFloat(maxCgpa))) return false;
        if (placedFilter === 'placed' && !student.is_placed) return false;
        if (placedFilter === 'not_placed' && student.is_placed) return false;
        return true;
    });

    const totalRecords = filteredStudents.length;
    const totalPages = Math.ceil(totalRecords / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalRecords);
    const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

    const handleFilterChange = () => setCurrentPage(1);

    const handleClearFilters = () => {
        setCourseFilter('');
        setDepartmentFilter('');
        setMinCgpa('');
        setMaxCgpa('');
        setPlacedFilter('all');
        setNameSearch('');
        setCurrentPage(1);
    };

    const handleLogout = () => {
        removeToken();
        router.push('/login');
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

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setImportSummary(null);
        setError('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post<{ success_count: number; failure_count: number; errors: string[] }>(
                '/admin/students/import',
                formData
            );
            setImportSummary(response);
            if (response.success_count > 0) {
                fetchStudents(); // Refresh the list
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to import students');
        } finally {
            setImporting(false);
            // Reset file input
            e.target.value = '';
        }
    };

    const handleExport = () => {
        if (filteredStudents.length === 0) {
            alert('No data to export with current filters.');
            return;
        }

        const fileName = prompt('Enter filename for export:', 'student_directory_export');
        if (!fileName) return;

        // CSV Headers
        const headers = ['Full Name', 'Email', 'Department', 'Course', 'CGPA', 'Status', 'Jobs Applied'];

        // CSV Rows
        const rows = filteredStudents.map(s => [
            s.full_name,
            s.email,
            s.department || '-',
            s.branch,
            s.cgpa ?? '-',
            s.is_placed ? 'Placed' : 'Active',
            s.applications_count
        ]);

        // Combine into CSV string
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${fileName.replace(/\.[^/.]+$/, "")}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: colors.background, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted }}>
                Loading students...
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: colors.background }}>
            {/* Header */}
            <header style={{ backgroundColor: colors.headerBg, padding: '16px 40px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{ color: '#fff', fontSize: '20px', margin: 0, fontWeight: 600 }}>TnP Admin</h1>
                    <nav style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                        <a href="/admin" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px' }}>Home</a>
                        <a href="/admin/students" style={{ color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>Students</a>
                        <a href="/admin/jobs" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px' }}>Jobs</a>
                        <button onClick={handleLogout} style={{ backgroundColor: 'transparent', border: '1px solid #475569', color: '#94a3b8', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>Logout</button>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main style={{ padding: '32px 40px', maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2 style={{ color: colors.text, fontSize: '28px', fontWeight: 600, margin: 0 }}>Student Directory</h2>
                        <p style={{ color: colors.textMuted, margin: '4px 0 0 0' }}>View and filter all registered students</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={handleExport}
                            style={{
                                backgroundColor: '#fff',
                                color: colors.text,
                                border: `1px solid ${colors.border}`,
                                padding: '10px 18px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                        >
                            <span>📊</span> Export Data
                        </button>
                        <button
                            onClick={() => setShowImportModal(true)}
                            style={{
                                backgroundColor: colors.primary,
                                color: 'white',
                                border: 'none',
                                padding: '10px 18px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)'
                            }}
                        >
                            <span></span> Import Students
                        </button>
                    </div>
                </div>

                {error && (
                    <div style={{ color: colors.danger, backgroundColor: '#fef2f2', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #fecaca' }}>
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
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 500, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Department</label>
                        <select value={departmentFilter} onChange={(e) => { setDepartmentFilter(e.target.value); handleFilterChange(); }} style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${colors.border}`, minWidth: '150px', fontSize: '14px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                            <option value="">All Departments</option>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 500, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Course</label>
                        <select value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); handleFilterChange(); }} style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${colors.border}`, minWidth: '150px', fontSize: '14px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                            <option value="">All Courses</option>
                            {courses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 500, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Min CGPA</label>
                        <input type="number" step="0.1" min="0" max="10" value={minCgpa} onChange={(e) => { setMinCgpa(e.target.value); handleFilterChange(); }} placeholder="0" style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${colors.border}`, width: '80px', fontSize: '14px', boxSizing: 'border-box' }} />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 500, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Max CGPA</label>
                        <input type="number" step="0.1" min="0" max="10" value={maxCgpa} onChange={(e) => { setMaxCgpa(e.target.value); handleFilterChange(); }} placeholder="10" style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${colors.border}`, width: '80px', fontSize: '14px', boxSizing: 'border-box' }} />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 500, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Placement</label>
                        <select value={placedFilter} onChange={(e) => { setPlacedFilter(e.target.value as 'all' | 'placed' | 'not_placed'); handleFilterChange(); }} style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${colors.border}`, minWidth: '120px', fontSize: '14px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                            <option value="all">All</option>
                            <option value="placed">Placed</option>
                            <option value="not_placed">Not Placed</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div>
                            {/* Empty label to maintain alignment with labeled filters */}
                            <div style={{ height: '18px', marginBottom: '6px' }}></div>
                            <button
                                onClick={handleClearFilters}
                                style={{
                                    padding: '10px 16px',
                                    height: '40px',
                                    backgroundColor: colors.secondary,
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    transition: 'all 0.2s'
                                }}
                            >
                                Clear Filters
                            </button>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: 700, color: colors.primary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Search Name</label>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                backgroundColor: '#fff',
                                border: `1px solid ${showSearch ? colors.primary : colors.border}`,
                                borderRadius: '8px',
                                padding: '0 12px',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                width: showSearch ? '280px' : '40px',
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
                                    placeholder="Type student name..."
                                    value={nameSearch}
                                    onChange={(e) => { setNameSearch(e.target.value); handleFilterChange(); }}
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
                                {showSearch && nameSearch && (
                                    <button
                                        onClick={() => { setNameSearch(''); handleFilterChange(); }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '18px',
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
                    </div>
                </div>

                {/* Table Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '14px', color: colors.textMuted }}>
                        Showing {totalRecords > 0 ? startIndex + 1 : 0} - {endIndex} of {totalRecords} students
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '14px', color: colors.textMuted }}>Show:</span>
                        <select value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value)); setCurrentPage(1); }} style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${colors.border}`, fontSize: '14px' }}>
                            {PAGE_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size}</option>)}
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div style={{ backgroundColor: colors.card, borderRadius: '12px', border: `1px solid ${colors.border}`, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    {paginatedStudents.length === 0 ? (
                        <p style={{ padding: '40px', textAlign: 'center', color: colors.textMuted, margin: 0 }}>No students found.</p>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8fafc' }}>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Name</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Email</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Department</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Course</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>CGPA</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Status</th>
                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${colors.border}` }}>Jobs Applied</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedStudents.map((student, idx) => (
                                    <tr key={student.user_id} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                        <td style={{ padding: '16px 20px', color: colors.text, fontSize: '15px', fontWeight: 500, borderBottom: `1px solid ${colors.border}` }}>{student.full_name}</td>
                                        <td style={{ padding: '16px 20px', color: colors.textMuted, fontSize: '15px', borderBottom: `1px solid ${colors.border}` }}>{student.email}</td>
                                        <td style={{ padding: '16px 20px', color: colors.textMuted, fontSize: '15px', borderBottom: `1px solid ${colors.border}` }}>{student.department || '-'}</td>
                                        <td style={{ padding: '16px 20px', color: colors.text, fontSize: '15px', borderBottom: `1px solid ${colors.border}` }}>{student.branch}</td>
                                        <td style={{ padding: '16px 20px', color: colors.text, fontSize: '15px', fontWeight: 500, borderBottom: `1px solid ${colors.border}` }}>{student.cgpa ?? '-'}</td>
                                        <td style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
                                            <span style={{
                                                padding: '6px 14px',
                                                borderRadius: '20px',
                                                fontSize: '14px',
                                                fontWeight: 500,
                                                backgroundColor: student.is_placed ? '#dcfce7' : '#f1f5f9',
                                                color: student.is_placed ? '#166534' : colors.textMuted
                                            }}>
                                                {student.is_placed ? (student.placed_company ? `Placed (${student.placed_company})` : 'Placed') : 'Active'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 20px', color: colors.text, fontSize: '15px', fontWeight: 500, borderBottom: `1px solid ${colors.border}` }}>{student.applications_count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '24px', flexWrap: 'wrap' }}>
                        <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} style={{ padding: '8px 14px', border: `1px solid ${colors.border}`, borderRadius: '8px', backgroundColor: currentPage === 1 ? '#f8fafc' : colors.card, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: currentPage === 1 ? '#cbd5e1' : colors.text, fontSize: '14px' }}>First</button>
                        <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} style={{ padding: '8px 14px', border: `1px solid ${colors.border}`, borderRadius: '8px', backgroundColor: currentPage === 1 ? '#f8fafc' : colors.card, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: currentPage === 1 ? '#cbd5e1' : colors.text, fontSize: '14px' }}>Prev</button>

                        {getPageNumbers().map((page, idx) => (
                            typeof page === 'number' ? (
                                <button key={idx} onClick={() => setCurrentPage(page)} style={{ padding: '8px 14px', border: currentPage === page ? 'none' : `1px solid ${colors.border}`, borderRadius: '8px', backgroundColor: currentPage === page ? colors.primary : colors.card, color: currentPage === page ? '#fff' : colors.text, cursor: 'pointer', fontWeight: currentPage === page ? 600 : 400, fontSize: '14px' }}>{page}</button>
                            ) : (
                                <span key={idx} style={{ padding: '8px', color: colors.textMuted }}>...</span>
                            )
                        ))}

                        <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} style={{ padding: '8px 14px', border: `1px solid ${colors.border}`, borderRadius: '8px', backgroundColor: currentPage === totalPages ? '#f8fafc' : colors.card, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: currentPage === totalPages ? '#cbd5e1' : colors.text, fontSize: '14px' }}>Next</button>
                        <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} style={{ padding: '8px 14px', border: `1px solid ${colors.border}`, borderRadius: '8px', backgroundColor: currentPage === totalPages ? '#f8fafc' : colors.card, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: currentPage === totalPages ? '#cbd5e1' : colors.text, fontSize: '14px' }}>Last</button>
                    </div>
                )}

                <p style={{ marginTop: '16px', color: colors.textMuted, textAlign: 'center', fontSize: '14px' }}>
                    Page {currentPage} of {totalPages || 1}
                </p>
            </main>

            {/* Import Modal */}
            {showImportModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '24px'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '32px',
                        borderRadius: '20px',
                        width: '100%',
                        maxWidth: '550px',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                        position: 'relative'
                    }}>
                        <button
                            onClick={() => { setShowImportModal(false); setImportSummary(null); }}
                            style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', fontSize: '24px', color: colors.textMuted, cursor: 'pointer' }}
                        >
                            ×
                        </button>

                        <h3 style={{ margin: '0 0 16px 0', fontSize: '24px', fontWeight: 700, color: colors.text }}>Import Students</h3>
                        <p style={{ color: colors.textMuted, fontSize: '15px', marginBottom: '24px', lineHeight: 1.5 }}>
                            Upload a <strong>CSV or Excel</strong> file with student details. Required columns: <strong>full_name, email, branch</strong>. Optional: <strong>department, cgpa, password</strong>.
                        </p>

                        {!importSummary ? (
                            <div style={{
                                border: `2px dashed ${colors.border}`,
                                borderRadius: '12px',
                                padding: '40px 20px',
                                textAlign: 'center',
                                backgroundColor: '#f8fafc',
                                transition: 'all 0.2s'
                            }}>
                                <input
                                    type="file"
                                    accept=".csv, .xlsx, .xls"
                                    onChange={handleImportFile}
                                    id="csv-upload"
                                    style={{ display: 'none' }}
                                />
                                <label
                                    htmlFor="csv-upload"
                                    style={{
                                        cursor: importing ? 'not-allowed' : 'pointer',
                                        display: 'inline-flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '12px'
                                    }}
                                >
                                    <span style={{ fontSize: '40px' }}>📄</span>
                                    <span style={{ fontWeight: 600, color: colors.primary }}>{importing ? 'Processing...' : 'Click to select CSV/Excel file'}</span>
                                    <span style={{ fontSize: '13px', color: colors.textMuted }}>Supported: .csv, .xlsx, .xls</span>
                                </label>
                            </div>
                        ) : (
                            <div>
                                <div style={{
                                    padding: '16px',
                                    borderRadius: '12px',
                                    backgroundColor: importSummary.failure_count === 0 ? '#f0fdf4' : '#fff7ed',
                                    border: `1px solid ${importSummary.failure_count === 0 ? '#bbf7d0' : '#ffedd5'}`,
                                    marginBottom: '20px'
                                }}>
                                    <p style={{ fontWeight: 600, color: importSummary.failure_count === 0 ? '#166534' : '#9a3412', margin: '0 0 8px 0' }}>
                                        Import Summary
                                    </p>
                                    <div style={{ display: 'flex', gap: '20px', fontSize: '14px' }}>
                                        <span style={{ color: '#166534' }}>✅ Success: <strong>{importSummary.success_count}</strong></span>
                                        <span style={{ color: '#9a3412' }}>❌ Failed: <strong>{importSummary.failure_count}</strong></span>
                                    </div>
                                </div>

                                {importSummary.errors.length > 0 && (
                                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '12px' }}>
                                        <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: colors.danger }}>Errors:</p>
                                        <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: '13px', color: colors.textMuted }}>
                                            {importSummary.errors.map((err, i) => <li key={i} style={{ marginBottom: '4px' }}>{err}</li>)}
                                        </ul>
                                    </div>
                                )}

                                <button
                                    onClick={() => { setShowImportModal(false); setImportSummary(null); }}
                                    style={{
                                        marginTop: '24px',
                                        width: '100%',
                                        padding: '12px',
                                        backgroundColor: colors.primary,
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Close
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
