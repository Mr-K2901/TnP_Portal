'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface JobBrief {
    id: string;
    company_name: string;
    role: string;
    ctc?: string | null;
}

interface JobFull {
    id: string;
    company_name: string;
    role: string;
    ctc: string | null;
    min_cgpa: number;
    jd_link: string | null;
    description: string | null;
}

interface JobDescriptionDrawerProps {
    job: JobBrief | null;
    isOpen: boolean;
    onClose: () => void;
}

const colors = {
    primary: '#4f46e5',
    background: '#f8fafc',
    card: '#ffffff',
    border: '#e2e8f0',
    text: '#1e293b',
    textMuted: '#64748b',
    overlay: 'rgba(0, 0, 0, 0.4)',
};

export default function JobDescriptionDrawer({ job, isOpen, onClose }: JobDescriptionDrawerProps) {
    const [fullJob, setFullJob] = useState<JobFull | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && job) {
            fetchJobDetails(job.id);
        }
    }, [isOpen, job]);

    const fetchJobDetails = async (jobId: string) => {
        setLoading(true);
        try {
            const response = await api.get<JobFull>(`/jobs/${jobId}`);
            setFullJob(response);
        } catch {
            // Use partial data if fetch fails
            setFullJob(null);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !job) return null;

    const displayJob = fullJob || {
        ...job,
        min_cgpa: 0,
        jd_link: null,
        description: null
    };

    return (
        <>
            {/* Overlay */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: colors.overlay,
                    zIndex: 999,
                    transition: 'opacity 0.2s ease',
                }}
            />

            {/* Drawer */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    width: '420px',
                    maxWidth: '90vw',
                    height: '100vh',
                    backgroundColor: colors.card,
                    boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.15)',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'slideIn 0.2s ease-out',
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: `1px solid ${colors.border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: colors.text }}>
                        Job Details
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            color: colors.textMuted,
                            padding: '4px 8px',
                            borderRadius: '4px',
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', color: colors.textMuted, padding: '40px' }}>
                            Loading...
                        </div>
                    ) : (
                        <>
                            {/* Company Name */}
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ fontSize: '12px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                                    Company
                                </div>
                                <div style={{ fontSize: '22px', fontWeight: 600, color: colors.text }}>
                                    {displayJob.company_name}
                                </div>
                            </div>

                            {/* Role */}
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ fontSize: '12px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                                    Role / Position
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: 500, color: colors.text }}>
                                    {displayJob.role}
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
                                <div style={{
                                    backgroundColor: colors.background,
                                    padding: '16px',
                                    borderRadius: '10px',
                                    border: `1px solid ${colors.border}`,
                                }}>
                                    <div style={{ fontSize: '12px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                                        CTC
                                    </div>
                                    <div style={{ fontSize: '16px', fontWeight: 600, color: colors.primary }}>
                                        {displayJob.ctc || 'Not specified'}
                                    </div>
                                </div>
                                <div style={{
                                    backgroundColor: colors.background,
                                    padding: '16px',
                                    borderRadius: '10px',
                                    border: `1px solid ${colors.border}`,
                                }}>
                                    <div style={{ fontSize: '12px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                                        Min CGPA
                                    </div>
                                    <div style={{ fontSize: '16px', fontWeight: 600, color: colors.text }}>
                                        {fullJob ? fullJob.min_cgpa : '—'}
                                    </div>
                                </div>
                            </div>

                            {/* Description Section */}
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ fontSize: '12px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                                    Description Summary
                                </div>
                                {fullJob?.description ? (
                                    <div style={{
                                        padding: '16px',
                                        backgroundColor: '#f1f5f9',
                                        borderRadius: '10px',
                                        color: colors.text,
                                        fontSize: '14px',
                                        lineHeight: '1.6',
                                        border: `1px solid ${colors.border}`,
                                        whiteSpace: 'pre-wrap',
                                        marginBottom: '16px'
                                    }}>
                                        {fullJob.description}
                                    </div>
                                ) : (
                                    <div style={{
                                        padding: '16px',
                                        backgroundColor: colors.background,
                                        borderRadius: '10px',
                                        color: colors.textMuted,
                                        fontSize: '14px',
                                        textAlign: 'center',
                                        border: `1px solid ${colors.border}`,
                                        marginBottom: '16px'
                                    }}>
                                        No text description provided
                                    </div>
                                )}

                                <div style={{ fontSize: '12px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                                    Job Links
                                </div>
                                {fullJob?.jd_link ? (
                                    <a
                                        href={fullJob.jd_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '14px 18px',
                                            backgroundColor: '#eef2ff',
                                            color: colors.primary,
                                            borderRadius: '10px',
                                            textDecoration: 'none',
                                            fontWeight: 500,
                                            fontSize: '15px',
                                            border: `1px solid #c7d2fe`,
                                        }}
                                    >
                                        <span style={{ fontSize: '18px' }}>📄</span>
                                        View Full JD / Application Link
                                        <span style={{ marginLeft: 'auto', fontSize: '14px' }}>↗</span>
                                    </a>
                                ) : (
                                    <div style={{
                                        padding: '16px',
                                        backgroundColor: colors.background,
                                        borderRadius: '10px',
                                        color: colors.textMuted,
                                        fontSize: '14px',
                                        textAlign: 'center',
                                        border: `1px solid ${colors.border}`,
                                    }}>
                                        No external links provided
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 24px',
                    borderTop: `1px solid ${colors.border}`,
                    backgroundColor: colors.background,
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            width: '100%',
                            padding: '12px',
                            backgroundColor: colors.primary,
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 500,
                            cursor: 'pointer',
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* Animation */}
            <style jsx global>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
            `}</style>
        </>
    );
}
