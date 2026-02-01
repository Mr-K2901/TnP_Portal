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

export default function AdminJobsPage() {
    const router = useRouter();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [togglingId, setTogglingId] = useState<string | null>(null);

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

    if (loading) {
        return <div style={{ padding: '40px' }}>Loading jobs...</div>;
    }

    return (
        <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1>Manage Jobs</h1>
                <div>
                    <a href="/admin/applications" style={{ marginRight: '20px' }}>
                        Applications
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

            {/* Create Job Button/Form */}
            <div style={{ marginBottom: '20px' }}>
                {!showForm ? (
                    <button
                        onClick={() => setShowForm(true)}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#0070f3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                        }}
                    >
                        + Create New Job
                    </button>
                ) : (
                    <form onSubmit={handleCreateJob} style={{
                        padding: '20px',
                        border: '1px solid #ccc',
                        borderRadius: '8px',
                        backgroundColor: '#f9f9f9'
                    }}>
                        <h3 style={{ marginTop: 0 }}>Create New Job</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px' }}>Company Name *</label>
                                <input
                                    type="text"
                                    value={formData.company_name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                                    required
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px' }}>Role *</label>
                                <input
                                    type="text"
                                    value={formData.role}
                                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                                    required
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px' }}>CTC</label>
                                <input
                                    type="text"
                                    value={formData.ctc}
                                    onChange={(e) => setFormData(prev => ({ ...prev, ctc: e.target.value }))}
                                    placeholder="e.g., 12-15 LPA"
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px' }}>Min CGPA</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="10"
                                    value={formData.min_cgpa}
                                    onChange={(e) => setFormData(prev => ({ ...prev, min_cgpa: e.target.value }))}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ display: 'block', marginBottom: '5px' }}>JD Link</label>
                                <input
                                    type="url"
                                    value={formData.jd_link}
                                    onChange={(e) => setFormData(prev => ({ ...prev, jd_link: e.target.value }))}
                                    placeholder="https://..."
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                        </div>
                        <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                            <button
                                type="submit"
                                disabled={creating}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: creating ? '#ccc' : '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: creating ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {creating ? 'Creating...' : 'Create Job'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Jobs Table */}
            {jobs.length === 0 ? (
                <p>No jobs created yet.</p>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                            <th style={{ padding: '10px' }}>Company</th>
                            <th style={{ padding: '10px' }}>Role</th>
                            <th style={{ padding: '10px' }}>CTC</th>
                            <th style={{ padding: '10px' }}>Min CGPA</th>
                            <th style={{ padding: '10px' }}>Status</th>
                            <th style={{ padding: '10px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {jobs.map(job => (
                            <tr key={job.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '10px' }}>{job.company_name}</td>
                                <td style={{ padding: '10px' }}>{job.role}</td>
                                <td style={{ padding: '10px' }}>{job.ctc || '-'}</td>
                                <td style={{ padding: '10px' }}>{job.min_cgpa}</td>
                                <td style={{ padding: '10px' }}>
                                    <span style={{
                                        color: job.is_active ? 'green' : 'red',
                                        fontWeight: 'bold'
                                    }}>
                                        {job.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td style={{ padding: '10px' }}>
                                    <button
                                        onClick={() => handleToggleActive(job)}
                                        disabled={togglingId === job.id}
                                        style={{
                                            padding: '5px 10px',
                                            backgroundColor: job.is_active ? '#dc3545' : '#28a745',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: togglingId === job.id ? 'not-allowed' : 'pointer',
                                            marginRight: '10px',
                                        }}
                                    >
                                        {togglingId === job.id ? '...' : job.is_active ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <a href={`/admin/applications?job=${job.id}`}>
                                        View Applications
                                    </a>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            <p style={{ marginTop: '20px', color: '#666' }}>
                Total jobs: {jobs.length}
            </p>
        </div>
    );
}
