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

    // Options
    const [courses, setCourses] = useState<string[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

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
                <div style={{ marginBottom: '24px' }}>
                    <h2 style={{ color: colors.text, fontSize: '28px', fontWeight: 600, margin: 0 }}>Student Directory</h2>
                    <p style={{ color: colors.textMuted, margin: '4px 0 0 0' }}>View and filter all registered students</p>
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
                        <select value={departmentFilter} onChange={(e) => { setDepartmentFilter(e.target.value); handleFilterChange(); }} style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${colors.border}`, minWidth: '150px', fontSize: '14px', backgroundColor: '#fff' }}>
                            <option value="">All Departments</option>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 500, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Course</label>
                        <select value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); handleFilterChange(); }} style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${colors.border}`, minWidth: '150px', fontSize: '14px', backgroundColor: '#fff' }}>
                            <option value="">All Courses</option>
                            {courses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 500, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Min CGPA</label>
                        <input type="number" step="0.1" min="0" max="10" value={minCgpa} onChange={(e) => { setMinCgpa(e.target.value); handleFilterChange(); }} placeholder="0" style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${colors.border}`, width: '80px', fontSize: '14px' }} />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 500, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Max CGPA</label>
                        <input type="number" step="0.1" min="0" max="10" value={maxCgpa} onChange={(e) => { setMaxCgpa(e.target.value); handleFilterChange(); }} placeholder="10" style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${colors.border}`, width: '80px', fontSize: '14px' }} />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 500, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Placement</label>
                        <select value={placedFilter} onChange={(e) => { setPlacedFilter(e.target.value as 'all' | 'placed' | 'not_placed'); handleFilterChange(); }} style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${colors.border}`, minWidth: '120px', fontSize: '14px', backgroundColor: '#fff' }}>
                            <option value="all">All</option>
                            <option value="placed">Placed</option>
                            <option value="not_placed">Not Placed</option>
                        </select>
                    </div>

                    <button onClick={handleClearFilters} style={{ padding: '10px 16px', backgroundColor: colors.secondary, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>
                        Clear Filters
                    </button>
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
        </div>
    );
}
