'use client';

import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/lib/api';

export default function StudentSettingsPage() {
    const { colors, theme, toggleTheme } = useTheme();
    const [notifications, setNotifications] = useState(true);
    const [emailAlerts, setEmailAlerts] = useState(true);

    // Change Password state
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    const handleChangePassword = async () => {
        setPasswordError('');
        setPasswordSuccess('');

        // Client-side validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordError('All fields are required');
            return;
        }
        if (newPassword.length < 8) {
            setPasswordError('New password must be at least 8 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError('New passwords do not match');
            return;
        }
        if (currentPassword === newPassword) {
            setPasswordError('New password must be different from current password');
            return;
        }

        setPasswordLoading(true);
        try {
            await api.post('/users/me/change-password', {
                current_password: currentPassword,
                new_password: newPassword,
            });
            setPasswordSuccess('Password changed successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            // Auto-hide form after 2 seconds
            setTimeout(() => {
                setShowPasswordForm(false);
                setPasswordSuccess('');
            }, 2000);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to change password';
            setPasswordError(errorMessage);
        } finally {
            setPasswordLoading(false);
        }
    };

    const inputStyle = {
        width: '100%',
        padding: '10px 14px',
        backgroundColor: colors.inputBg || colors.background,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        fontSize: '14px',
        color: colors.text,
        outline: 'none',
        boxSizing: 'border-box' as const,
    };

    return (
        <div style={{ padding: '40px' }}>
            {/* Page Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ color: colors.text, fontSize: '28px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Settings</h1>
                <p style={{ color: colors.textMuted, margin: '4px 0 0 0', fontSize: '14px' }}>Manage your account preferences</p>
            </div>

            {/* Main Content */}
            <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* Appearance Settings */}
                <div style={{
                    backgroundColor: colors.card,
                    borderRadius: '16px',
                    padding: '32px',
                    border: `1px solid ${colors.border}`,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 600, color: colors.text, marginBottom: '24px', marginTop: 0 }}>
                        Appearance
                    </h2>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '16px', fontWeight: 500, color: colors.text }}>Dark Mode</div>
                            <div style={{ fontSize: '14px', color: colors.textMuted, marginTop: '4px' }}>Switch between light and dark themes</div>
                        </div>
                        <button
                            onClick={toggleTheme}
                            style={{
                                width: '48px',
                                height: '28px',
                                borderRadius: '14px',
                                backgroundColor: theme === 'dark' ? colors.primary : '#e2e8f0',
                                position: 'relative',
                                cursor: 'pointer',
                                border: 'none',
                                transition: 'all 0.2s',
                                padding: 0
                            }}
                        >
                            <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                backgroundColor: 'white',
                                position: 'absolute',
                                top: '2px',
                                left: theme === 'dark' ? '22px' : '2px',
                                transition: 'all 0.2s',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                            }} />
                        </button>
                    </div>
                </div>

                {/* Notification Settings */}
                <div style={{
                    backgroundColor: colors.card,
                    borderRadius: '16px',
                    padding: '32px',
                    border: `1px solid ${colors.border}`,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 600, color: colors.text, marginBottom: '24px', marginTop: 0 }}>
                        Notifications
                    </h2>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '24px', borderBottom: `1px solid ${colors.border}` }}>
                        <div>
                            <div style={{ fontSize: '16px', fontWeight: 500, color: colors.text }}>Push Notifications</div>
                            <div style={{ fontSize: '14px', color: colors.textMuted, marginTop: '4px' }}>Receive browser notifications for new jobs</div>
                        </div>
                        <button
                            onClick={() => setNotifications(!notifications)}
                            style={{
                                width: '48px',
                                height: '28px',
                                borderRadius: '14px',
                                backgroundColor: notifications ? colors.primary : '#e2e8f0',
                                position: 'relative',
                                cursor: 'pointer',
                                border: 'none',
                                transition: 'all 0.2s',
                                padding: 0
                            }}
                        >
                            <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                backgroundColor: 'white',
                                position: 'absolute',
                                top: '2px',
                                left: notifications ? '22px' : '2px',
                                transition: 'all 0.2s',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                            }} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '16px', fontWeight: 500, color: colors.text }}>Email Alerts</div>
                            <div style={{ fontSize: '14px', color: colors.textMuted, marginTop: '4px' }}>Receive email updates for your applications</div>
                        </div>
                        <button
                            onClick={() => setEmailAlerts(!emailAlerts)}
                            style={{
                                width: '48px',
                                height: '28px',
                                borderRadius: '14px',
                                backgroundColor: emailAlerts ? colors.primary : '#e2e8f0',
                                position: 'relative',
                                cursor: 'pointer',
                                border: 'none',
                                transition: 'all 0.2s',
                                padding: 0
                            }}
                        >
                            <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                backgroundColor: 'white',
                                position: 'absolute',
                                top: '2px',
                                left: emailAlerts ? '22px' : '2px',
                                transition: 'all 0.2s',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                            }} />
                        </button>
                    </div>
                </div>

                {/* Account Settings — Change Password */}
                <div style={{
                    backgroundColor: colors.card,
                    borderRadius: '16px',
                    padding: '32px',
                    border: `1px solid ${colors.border}`,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 600, color: colors.text, marginBottom: '24px', marginTop: 0 }}>
                        Account
                    </h2>

                    <button
                        onClick={() => {
                            setShowPasswordForm(!showPasswordForm);
                            setPasswordError('');
                            setPasswordSuccess('');
                            setCurrentPassword('');
                            setNewPassword('');
                            setConfirmPassword('');
                        }}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: colors.inputBg || '#fff',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '8px',
                            fontSize: '15px',
                            fontWeight: 500,
                            color: colors.text,
                            cursor: 'pointer',
                            width: '100%',
                            textAlign: 'left',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >
                        Change Password
                        <span style={{ color: colors.textMuted, transition: 'transform 0.2s', transform: showPasswordForm ? 'rotate(90deg)' : 'none' }}>→</span>
                    </button>

                    {/* Change Password Form */}
                    {showPasswordForm && (
                        <div style={{
                            marginTop: '20px',
                            padding: '24px',
                            backgroundColor: colors.background,
                            borderRadius: '12px',
                            border: `1px solid ${colors.border}`,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px'
                        }}>
                            {/* Error Message */}
                            {passwordError && (
                                <div style={{
                                    padding: '10px 14px',
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '8px',
                                    color: colors.danger || '#ef4444',
                                    fontSize: '14px'
                                }}>
                                    {passwordError}
                                </div>
                            )}

                            {/* Success Message */}
                            {passwordSuccess && (
                                <div style={{
                                    padding: '10px 14px',
                                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                    borderRadius: '8px',
                                    color: '#10b981',
                                    fontSize: '14px'
                                }}>
                                    ✓ {passwordSuccess}
                                </div>
                            )}

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: colors.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Current Password
                                </label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="Enter current password"
                                    style={inputStyle}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: colors.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Minimum 8 characters"
                                    style={inputStyle}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: colors.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter new password"
                                    style={inputStyle}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                                <button
                                    onClick={handleChangePassword}
                                    disabled={passwordLoading}
                                    style={{
                                        padding: '10px 24px',
                                        backgroundColor: passwordLoading ? colors.textMuted : colors.primary,
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        cursor: passwordLoading ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {passwordLoading ? 'Changing...' : 'Update Password'}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowPasswordForm(false);
                                        setPasswordError('');
                                        setPasswordSuccess('');
                                    }}
                                    style={{
                                        padding: '10px 24px',
                                        backgroundColor: 'transparent',
                                        color: colors.textMuted,
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
