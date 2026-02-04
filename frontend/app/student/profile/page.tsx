'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { isLoggedIn, getUserRole } from '@/lib/auth';
import { useTheme } from '@/context/ThemeContext';

interface ProfileResponse {
    user_id: string;
    full_name: string;
    cgpa: number | null;
    branch: string;
    department: string | null;
    resume_url: string | null;
    is_placed: boolean;
}

export default function StudentProfilePage() {
    const { colors } = useTheme();
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
                {value || <span style={{ color: colors.textMuted, opacity: 0.5, fontWeight: 400 }}>No data provided</span>}
            </div>
        </div>
    );

    return (
        <div style={{ padding: '40px' }}>
            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ color: colors.text, fontSize: '28px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>My Profile</h1>
                    <p style={{ color: colors.textMuted, margin: '4px 0 0 0', fontSize: '14px' }}>Manage your personal and academic details</p>
                </div>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        style={{
                            padding: '10px 24px',
                            backgroundColor: colors.primary,
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '14px',
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

            {/* Main Content */}
            <div style={{ maxWidth: '800px' }}>

                {error && (
                    <div style={{ color: colors.danger, backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: '12px', marginBottom: '32px', border: `1px solid ${colors.danger}`, fontSize: '19px' }}>
                        {error}
                    </div>
                )}

                {success && (
                    <div style={{ color: colors.success, backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: '12px', marginBottom: '32px', border: `1px solid ${colors.success}`, fontSize: '19px' }}>
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
                                    <span style={{ color: colors.textMuted, opacity: 0.5, fontSize: '19px' }}>No resume provided</span>
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
                                        style={{ width: '100%', padding: '14px 18px', border: `1px solid ${colors.border}`, borderRadius: '12px', fontSize: '18px', outline: 'none', backgroundColor: colors.inputBg, color: colors.text, boxSizing: 'border-box' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '15px', fontWeight: 700, color: colors.text, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Department</label>
                                    <input
                                        type="text"
                                        value={formData.department}
                                        onChange={(e) => setFormData(p => ({ ...p, department: e.target.value }))}
                                        placeholder="e.g. Engineering"
                                        style={{ width: '100%', padding: '14px 18px', border: `1px solid ${colors.border}`, borderRadius: '12px', fontSize: '18px', outline: 'none', backgroundColor: colors.inputBg, color: colors.text, boxSizing: 'border-box' }}
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
                                        style={{ width: '100%', padding: '14px 18px', border: `1px solid ${colors.border}`, borderRadius: '12px', fontSize: '18px', outline: 'none', backgroundColor: colors.inputBg, color: colors.text, boxSizing: 'border-box' }}
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
                                        style={{ width: '100%', padding: '14px 18px', border: `1px solid ${colors.border}`, borderRadius: '12px', fontSize: '18px', outline: 'none', backgroundColor: colors.inputBg, color: colors.text, boxSizing: 'border-box' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '15px', fontWeight: 700, color: colors.text, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Placement Status</label>
                                    <div style={{ width: '100%', padding: '14px 18px', border: `1px solid ${colors.border}`, borderRadius: '12px', fontSize: '18px', backgroundColor: colors.readonlyBg, color: colors.textMuted, cursor: 'not-allowed', boxSizing: 'border-box' }}>
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
                                        style={{ width: '100%', padding: '14px 18px', border: `1px solid ${colors.border}`, borderRadius: '12px', fontSize: '18px', outline: 'none', backgroundColor: colors.inputBg, color: colors.text, boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginTop: '48px', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    style={{
                                        padding: '12px 28px',
                                        backgroundColor: colors.inputBg,
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
            </div>
        </div>
    );
}
