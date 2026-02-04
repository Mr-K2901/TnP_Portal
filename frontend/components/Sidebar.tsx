'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { removeToken } from '@/lib/auth';
import { useTheme } from '@/context/ThemeContext';

interface SidebarItem {
    label: string;
    icon: string;
    href: string;
}

interface SidebarGroup {
    title: string;
    items: SidebarItem[];
}

interface SidebarProps {
    isCollapsed: boolean;
    toggleSidebar: () => void;
    role: string | null;
}

export default function Sidebar({ isCollapsed, toggleSidebar, role }: SidebarProps) {
    const { colors, theme } = useTheme();
    const pathname = usePathname();
    const router = useRouter();

    const adminNav: SidebarGroup[] = [
        {
            title: 'Primary Work',
            items: [
                { label: 'Overview', icon: '📊', href: '/admin' },
                { label: 'Jobs', icon: '💼', href: '/admin/jobs' },
                { label: 'Applications', icon: '📝', href: '/admin/applications' },
                { label: 'Students', icon: '👥', href: '/admin/students' },
            ]
        },
        {
            title: 'System',
            items: [
                { label: 'Settings', icon: '⚙️', href: '/admin/settings' },
                { label: 'Logout', icon: '🚪', href: '#logout' },
            ]
        }
    ];

    const studentNav: SidebarGroup[] = [
        {
            title: 'Primary Work',
            items: [
                { label: 'Overview', icon: '🏠', href: '/student' },
                { label: 'Browse Jobs', icon: '🔍', href: '/student/dashboard' },
                { label: 'My Applications', icon: '📝', href: '/student/applications' },
            ]
        },
        {
            title: 'Personal',
            items: [
                { label: 'Profile', icon: '👤', href: '/student/profile' },
            ]
        },
        {
            title: 'System',
            items: [
                { label: 'Settings', icon: '⚙️', href: '/student/settings' },
                { label: 'Logout', icon: '🚪', href: '#logout' },
            ]
        }
    ];

    const navGroups = role === 'ADMIN' ? adminNav : studentNav;

    const handleLogout = () => {
        removeToken();
        router.push('/login');
    };

    return (
        <aside style={{
            width: isCollapsed ? '80px' : '260px',
            backgroundColor: colors.card,
            color: colors.text,
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s, border-color 0.3s',
            position: 'fixed',
            height: '100vh',
            zIndex: 100,
            borderRight: `1px solid ${colors.border}`
        }}>
            {/* Sidebar Header */}
            <div style={{
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                borderBottom: `1px solid ${colors.border}`
            }}>
                {!isCollapsed && <span style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em', color: colors.text }}>TnP Portal</span>}
                <button
                    onClick={toggleSidebar}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: colors.textMuted,
                        cursor: 'pointer',
                        fontSize: '18px',
                        padding: '4px'
                    }}
                >
                    {isCollapsed ? '→' : '←'}
                </button>
            </div>

            {/* Sidebar Nav */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
                {navGroups.map((group, idx) => (
                    <div key={idx} style={{ marginBottom: '24px' }}>
                        {!isCollapsed && (
                            <div style={{
                                padding: '0 24px',
                                marginBottom: '8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                color: colors.textMuted,
                                letterSpacing: '0.05em'
                            }}>
                                {group.title}
                            </div>
                        )}
                        {group.items.map((item, i) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={i}
                                    href={item.href === '#logout' ? '#' : item.href}
                                    onClick={item.href === '#logout' ? (e) => { e.preventDefault(); handleLogout(); } : undefined}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '10px 24px',
                                        textDecoration: 'none',
                                        color: isActive ? colors.primary : colors.textMuted,
                                        backgroundColor: isActive ? (theme === 'dark' ? 'rgba(79, 70, 229, 0.2)' : '#eef2ff') : 'transparent',
                                        borderLeft: isActive ? `3px solid ${colors.primary}` : '3px solid transparent',
                                        transition: 'all 0.2s',
                                        gap: '12px'
                                    }}
                                >
                                    <span style={{ fontSize: '18px' }}>{item.icon}</span>
                                    {!isCollapsed && <span style={{ fontSize: '14px', fontWeight: 500 }}>{item.label}</span>}
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Sidebar Footer */}
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${colors.border}` }}>
                {!isCollapsed && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: colors.primary,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#fff'
                        }}>
                            {role?.charAt(0)}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                User Profile
                            </div>
                            <div style={{ fontSize: '11px', color: colors.textMuted }}>{role}</div>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
