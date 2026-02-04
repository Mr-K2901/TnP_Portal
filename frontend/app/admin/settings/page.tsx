'use client';

import { useTheme } from '@/context/ThemeContext';

export default function AdminSettingsPage() {
    const { colors, theme, toggleTheme } = useTheme();

    return (
        <div style={{ padding: '40px' }}>
            {/* Page Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ color: colors.text, fontSize: '28px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Settings</h1>
                <p style={{ color: colors.textMuted, margin: '4px 0 0 0', fontSize: '14px' }}>System configuration and preferences</p>
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

                {/* General Settings */}
                <div style={{
                    backgroundColor: colors.card,
                    borderRadius: '16px',
                    padding: '32px',
                    border: `1px solid ${colors.border}`,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 600, color: colors.text, marginBottom: '24px', marginTop: 0 }}>
                        General
                    </h2>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: colors.text, marginBottom: '8px' }}>
                            Placement Season
                        </label>
                        <select style={{
                            width: '100%',
                            padding: '10px 14px',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '8px',
                            fontSize: '15px',
                            backgroundColor: colors.inputBg,
                            color: colors.text
                        }}>
                            <option>2023-2024</option>
                            <option>2024-2025</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: colors.text, marginBottom: '8px' }}>
                            System Status
                        </label>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{
                                padding: '8px 16px',
                                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                color: colors.success,
                                borderRadius: '20px',
                                fontSize: '14px',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                border: `1px solid ${colors.success}40`
                            }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: colors.success }}></span>
                                Active
                            </div>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div style={{
                    backgroundColor: colors.card,
                    borderRadius: '16px',
                    padding: '32px',
                    border: `1px solid ${colors.danger}40`,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 600, color: colors.danger, marginBottom: '8px', marginTop: 0 }}>
                        Danger Zone
                    </h2>
                    <p style={{ color: colors.textMuted, fontSize: '14px', margin: '0 0 24px 0' }}>
                        Irreversible actions for the placement portal.
                    </p>

                    <button style={{
                        padding: '12px 24px',
                        backgroundColor: 'transparent',
                        border: `1px solid ${colors.danger}`,
                        borderRadius: '8px',
                        fontSize: '15px',
                        fontWeight: 600,
                        color: colors.danger,
                        cursor: 'pointer',
                    }}>
                        Reset Placement Data
                    </button>
                </div>
            </div>
        </div>
    );
}
