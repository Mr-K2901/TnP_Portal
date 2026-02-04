'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { isLoggedIn, getUserRole, removeToken } from '@/lib/auth';

interface ProfileResponse {
    user_id: string;
    full_name: string;
    cgpa: number | null;
    branch: string;
    department: string | null;
    resume_url: string | null;
    is_placed: boolean;
}

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

export default function StudentProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [profile, setProfile] = useState<ProfileResponse | null>(null);

    const [formData, setFormData] = useState({
        full_name: '',
        cgpa: '',
        branch: '',
        department: '',
        resume_url: '',
    });

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
    }, [router]);

    const fetchProfile = async () => {
        try {
            const res = await api.get<ProfileResponse>('/users/me/profile');
            setProfile(res);
            setFormData({
                full_name: res.full_name,
                cgpa: res.cgpa !== null ? String(res.cgpa) : '',
                branch: res.branch,
                department: res.department || '',
                resume_url: res.resume_url || '',
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch profile');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const updated = await api.patch<ProfileResponse>('/users/me/profile', {
                full_name: formData.full_name,
                cgpa: formData.cgpa ? parseFloat(formData.cgpa) : null,
                branch: formData.branch,
                department: formData.department || null,
                resume_url: formData.resume_url || null,
            });
            setProfile(updated);
            setIsEditing(false);
            setSuccess('Profile updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        removeToken();
        router.push('/login');
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: colors.background, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted }}>
                Loading profile...
            </div>
        );
    }

    const ProfileField = ({ label, value, isFullWidth = false }: { label: string; value: string | null | undefined; isFullWidth?: boolean }) => (
        <div style={{ padding: '20px 0', borderBottom: `1px solid ${colors.border}`, gridColumn: isFullWidth ? '1 / -1' : 'span 1' }}>
            <label style={{ display: 'block', fontSize: '16px', fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                {label}
            </label>
            <div style={{ fontSize: '21px', color: colors.text, fontWeight: 500 }}>
                {value || <span style={{ color: '#cbd5e1', fontWeight: 400 }}>No data provided</span>}
            </div>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', backgroundColor: colors.background }}>
            <header style={{ backgroundColor: colors.headerBg, padding: '16px 40px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{ color: '#fff', fontSize: '20px', margin: 0, fontWeight: 600 }}>TnP Portal</h1>
                    <nav style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                        <a href="/student" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px' }}>Home</a>
                        <a href="/student/dashboard" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px' }}>Browse Jobs</a>
                        <a href="/student/applications" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px' }}>My Applications</a>
                        <a href="/student/profile" style={{ color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>Profile</a>
                        <button onClick={handleLogout} style={{ backgroundColor: 'transparent', border: '1px solid #475569', color: '#94a3b8', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>Logout</button>
                    </nav>
                </div>
            </header>

            <main style={{ padding: '60px 20px', maxWidth: '900px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <h2 style={{ margin: 0, fontSize: '37px', color: colors.text, fontWeight: 800, letterSpacing: '-0.02em' }}>Student Profile</h2>
                    {!isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            style={{
                                padding: '10px 24px',
                                backgroundColor: colors.primary,
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '17px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)'
                            }}
                        >
                            Edit Profile
                        </button>
                    )}
                </div>

                {error && (
                    <div style={{ color: colors.danger, backgroundColor: '#fef2f2', padding: '16px', borderRadius: '12px', marginBottom: '32px', border: '1px solid #fecaca', fontSize: '19px' }}>
                        {error}
                    </div>
                )}

                {success && (
                    <div style={{ color: '#065f46', backgroundColor: '#ecfdf5', padding: '16px', borderRadius: '12px', marginBottom: '32px', border: '1px solid #a7f3d0', fontSize: '19px' }}>
                        {success}
                    </div>
                )}

                <div style={{
                    backgroundColor: colors.card,
                    borderRadius: '20px',
                    padding: '40px',
                    border: `1px solid ${colors.border}`,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}>
                    {!isEditing ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 40px' }}>
                            <ProfileField label="Full Name" value={profile?.full_name} isFullWidth />
                            <ProfileField label="Department" value={profile?.department} />
                            <ProfileField label="Course / Branch" value={profile?.branch} />
                            <ProfileField label="Current CGPA" value={profile?.cgpa?.toFixed(2)} />
                            <ProfileField
                                label="Placement Status"
                                value={profile?.is_placed ? 'Placed' : 'Seeking Opportunity'}
                            />
                            <div style={{ gridColumn: 'span 2', padding: '20px 0' }}>
                                <label style={{ display: 'block', fontSize: '16px', fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                                    Resume Link
                                </label>
                                {profile?.resume_url ? (
                                    <a
                                        href={profile.resume_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: colors.primary, textDecoration: 'none', fontWeight: 600, fontSize: '20px' }}
                                    >
                                        {profile.resume_url} ↗
                                    </a>
                                ) : (
                                    <span style={{ color: '#cbd5e1', fontSize: '19px' }}>No resume provided</span>
                                )}
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleUpdate}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '15px', fontWeight: 700, color: colors.text, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Full Name</label>
                                    <input
                                        type="text"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData(p => ({ ...p, full_name: e.target.value }))}
                                        required
                                        style={{ width: '100%', padding: '14px 18px', border: `1px solid ${colors.border}`, borderRadius: '12px', fontSize: '18px', outline: 'none', backgroundColor: '#fcfcfc' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '15px', fontWeight: 700, color: colors.text, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Department</label>
                                    <input
                                        type="text"
                                        value={formData.department}
                                        onChange={(e) => setFormData(p => ({ ...p, department: e.target.value }))}
                                        placeholder="e.g. Engineering"
                                        style={{ width: '100%', padding: '14px 18px', border: `1px solid ${colors.border}`, borderRadius: '12px', fontSize: '18px', outline: 'none', backgroundColor: '#fcfcfc' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '15px', fontWeight: 700, color: colors.text, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Course / Branch</label>
                                    <input
                                        type="text"
                                        value={formData.branch}
                                        onChange={(e) => setFormData(p => ({ ...p, branch: e.target.value }))}
                                        required
                                        placeholder="e.g. CSE"
                                        style={{ width: '100%', padding: '14px 18px', border: `1px solid ${colors.border}`, borderRadius: '12px', fontSize: '18px', outline: 'none', backgroundColor: '#fcfcfc' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '15px', fontWeight: 700, color: colors.text, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Current CGPA</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="10"
                                        value={formData.cgpa}
                                        onChange={(e) => setFormData(p => ({ ...p, cgpa: e.target.value }))}
                                        required
                                        style={{ width: '100%', padding: '14px 18px', border: `1px solid ${colors.border}`, borderRadius: '12px', fontSize: '18px', outline: 'none', backgroundColor: '#fcfcfc' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '15px', fontWeight: 700, color: colors.text, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Placement Status</label>
                                    <div style={{ width: '100%', padding: '14px 18px', border: `1px solid ${colors.border}`, borderRadius: '12px', fontSize: '18px', backgroundColor: '#f5f5f5', color: colors.textMuted, cursor: 'not-allowed' }}>
                                        {profile?.is_placed ? 'Placed' : 'Seeking Opportunity'} (Admin Only)
                                    </div>
                                </div>

                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '15px', fontWeight: 700, color: colors.text, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Resume Link</label>
                                    <input
                                        type="url"
                                        value={formData.resume_url}
                                        onChange={(e) => setFormData(p => ({ ...p, resume_url: e.target.value }))}
                                        placeholder="https://drive.google.com/..."
                                        style={{ width: '100%', padding: '14px 18px', border: `1px solid ${colors.border}`, borderRadius: '12px', fontSize: '18px', outline: 'none', backgroundColor: '#fcfcfc' }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginTop: '48px', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    style={{
                                        padding: '12px 28px',
                                        backgroundColor: '#fff',
                                        color: colors.secondary,
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: '12px',
                                        fontSize: '18px',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    style={{
                                        padding: '12px 36px',
                                        backgroundColor: saving ? colors.secondary : colors.primary,
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontSize: '18px',
                                        fontWeight: 600,
                                        cursor: saving ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    {saving ? 'Processing...' : 'Save Profile'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </main>
        </div>
    );
}
