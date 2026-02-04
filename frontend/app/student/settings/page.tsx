'use client';

import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';

export default function StudentSettingsPage() {
    const { colors, theme, toggleTheme } = useTheme();
    const [notifications, setNotifications] = useState(true);
    const [emailAlerts, setEmailAlerts] = useState(true);

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
                                padding: 0 // Reset default padding
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

                {/* Account Settings */}
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

                    <button style={{
                        padding: '12px 24px',
                        backgroundColor: colors.inputBg || '#fff', // Fallback or strict strict typing? colors.inputBg is in our type now
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
                    }}>
                        Change Password
                        <span style={{ color: colors.textMuted }}>→</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
