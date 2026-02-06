'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn, getUserRole } from '@/lib/auth';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/lib/api';

interface Campaign {
    id: string;
    title: string;
    script_template: string;
    status: string;
    created_at: string;
    total_calls: number;
    completed_calls: number;
}

interface CallLog {
    id: string;
    student_name: string;
    student_email: string;
    status: string;
    recording_url: string | null;
    transcription_text: string | null;
    duration: number | null;
}

interface CampaignDetail {
    campaign: Campaign;
    call_logs: CallLog[];
}

export default function CampaignsPage() {
    const { colors } = useTheme();
    const router = useRouter();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [selectedCampaign, setSelectedCampaign] = useState<CampaignDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isLoggedIn() || getUserRole() !== 'ADMIN') {
            router.push('/login');
            return;
        }
        fetchCampaigns();
    }, [router]);

    const fetchCampaigns = async () => {
        try {
            const res = await api.get<Campaign[]>('/campaigns');
            setCampaigns(res);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load campaigns');
        } finally {
            setLoading(false);
        }
    };

    const [loadingDetail, setLoadingDetail] = useState(false);

    const viewCampaign = async (campaignId: string) => {
        setLoadingDetail(true);
        try {
            const res = await api.get<CampaignDetail>(`/campaigns/${campaignId}`);
            setSelectedCampaign(res);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to load campaign details');
        } finally {
            setLoadingDetail(false);
        }
    };

    const startCampaign = async (campaignId: string) => {
        if (!confirm('Start this campaign? Calls will begin immediately.')) return;
        try {
            await api.post(`/campaigns/${campaignId}/start`, {});
            fetchCampaigns();
            if (selectedCampaign?.campaign.id === campaignId) {
                viewCampaign(campaignId);
            }
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to start campaign');
        }
    };

    const retryFailedCalls = async (campaignId: string) => {
        if (!confirm('Retry all failed and stuck calls?')) return;
        try {
            const res = await api.post<{ message: string; retried_count: number }>(`/campaigns/${campaignId}/retry`, {});
            alert(res.message);
            fetchCampaigns();
            viewCampaign(campaignId);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to retry calls');
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, { bg: string; color: string }> = {
            'DRAFT': { bg: 'rgba(156, 163, 175, 0.2)', color: colors.textMuted },
            'RUNNING': { bg: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' },
            'COMPLETED': { bg: 'rgba(34, 197, 94, 0.2)', color: colors.success },
            'CANCELLED': { bg: 'rgba(239, 68, 68, 0.2)', color: colors.danger },
            'PENDING': { bg: 'rgba(156, 163, 175, 0.2)', color: colors.textMuted },
            'IN_PROGRESS': { bg: 'rgba(245, 158, 11, 0.2)', color: colors.warning },
            'FAILED': { bg: 'rgba(239, 68, 68, 0.2)', color: colors.danger },
            'NO_ANSWER': { bg: 'rgba(251, 191, 36, 0.2)', color: '#f59e0b' },
            'BUSY': { bg: 'rgba(251, 191, 36, 0.2)', color: '#f59e0b' },
        };
        const style = styles[status] || styles['PENDING'];
        return (
            <span style={{
                padding: '4px 12px',
                borderRadius: '12px',
                backgroundColor: style.bg,
                color: style.color,
                fontSize: '12px',
                fontWeight: 600
            }}>
                {status.replace('_', ' ')}
            </span>
        );
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: colors.background, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted }}>
                Loading campaigns...
            </div>
        );
    }

    return (
        <div style={{ padding: '40px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ color: colors.text, fontSize: '28px', fontWeight: 700, margin: 0 }}>Call Campaigns</h1>
                    <p style={{ color: colors.textMuted, margin: '4px 0 0 0', fontSize: '14px' }}>
                        Manage automated voice call campaigns
                    </p>
                </div>
                <button
                    onClick={() => router.push('/admin/campaigns/new')}
                    style={{
                        padding: '10px 18px',
                        backgroundColor: colors.primary,
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    + New Campaign
                </button>
            </div>

            {error && (
                <div style={{ color: colors.danger, backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
                    {error}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: selectedCampaign ? '1fr 2fr' : '1fr', gap: '24px' }}>
                {/* Campaign List */}
                <div style={{ backgroundColor: colors.card, borderRadius: '12px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: colors.text }}>All Campaigns</h3>
                    </div>
                    {campaigns.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: colors.textMuted }}>
                            No campaigns yet. Create one to get started.
                        </div>
                    ) : (
                        <div>
                            {campaigns.map((campaign) => (
                                <div
                                    key={campaign.id}
                                    onClick={() => viewCampaign(campaign.id)}
                                    style={{
                                        padding: '16px 20px',
                                        borderBottom: `1px solid ${colors.border}`,
                                        cursor: 'pointer',
                                        backgroundColor: selectedCampaign?.campaign.id === campaign.id ? colors.primary + '10' : 'transparent',
                                        transition: 'background-color 0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                                        <span style={{ fontWeight: 600, color: colors.text }}>{campaign.title}</span>
                                        {getStatusBadge(campaign.status)}
                                    </div>
                                    <div style={{ fontSize: '13px', color: colors.textMuted }}>
                                        {campaign.completed_calls}/{campaign.total_calls} calls completed
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Campaign Detail */}
                {selectedCampaign && (
                    <div style={{ backgroundColor: colors.card, borderRadius: '12px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: colors.text }}>{selectedCampaign.campaign.title}</h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: colors.textMuted }}>
                                    Script: "{selectedCampaign.campaign.script_template.substring(0, 100)}..."
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => viewCampaign(selectedCampaign.campaign.id)}
                                    disabled={loadingDetail}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: loadingDetail ? colors.primary + '20' : colors.card,
                                        color: loadingDetail ? colors.primary : colors.text,
                                        border: `1px solid ${loadingDetail ? colors.primary : colors.border}`,
                                        borderRadius: '6px',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        cursor: loadingDetail ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        opacity: loadingDetail ? 0.8 : 1
                                    }}
                                    title="Refresh call logs"
                                >
                                    {loadingDetail ? '⏳ Loading...' : '🔄 Refresh'}
                                </button>
                                <button
                                    onClick={() => router.push(`/admin/campaigns/new?edit=${selectedCampaign.campaign.id}`)}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: colors.warning + '20',
                                        color: colors.warning,
                                        border: `1px solid ${colors.warning}`,
                                        borderRadius: '6px',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                    title="Edit campaign settings"
                                >
                                    ✏️ Reconfigure
                                </button>
                                {selectedCampaign.campaign.status === 'DRAFT' && (
                                    <button
                                        onClick={() => startCampaign(selectedCampaign.campaign.id)}
                                        style={{
                                            padding: '8px 16px',
                                            backgroundColor: colors.success,
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ▶ Start Calling
                                    </button>
                                )}
                                {selectedCampaign.call_logs.some(cl => ['FAILED', 'IN_PROGRESS', 'BUSY', 'NO_ANSWER'].includes(cl.status)) && (
                                    <button
                                        onClick={() => retryFailedCalls(selectedCampaign.campaign.id)}
                                        style={{
                                            padding: '8px 16px',
                                            backgroundColor: colors.danger + '20',
                                            color: colors.danger,
                                            border: `1px solid ${colors.danger}`,
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                        title="Retry all failed and stuck calls"
                                    >
                                        🔁 Retry Failed
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Call Logs Table */}
                        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: colors.tableHeaderBg }}>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>Student</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>Status</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>Recording</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>Transcript</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedCampaign.call_logs.map((log, idx) => (
                                        <tr key={log.id} style={{ backgroundColor: idx % 2 === 0 ? colors.card : colors.background }}>
                                            <td style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border}` }}>
                                                <div style={{ fontWeight: 500, color: colors.text }}>{log.student_name}</div>
                                                <div style={{ fontSize: '12px', color: colors.textMuted }}>{log.student_email}</div>
                                            </td>
                                            <td style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border}` }}>
                                                {getStatusBadge(log.status)}
                                            </td>
                                            <td style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border}` }}>
                                                {log.recording_url ? (
                                                    <audio controls style={{ height: '32px', width: '150px' }}>
                                                        <source src={log.recording_url} type="audio/mpeg" />
                                                    </audio>
                                                ) : (
                                                    <span style={{ color: colors.textMuted, fontSize: '13px' }}>—</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border}`, maxWidth: '300px' }}>
                                                {log.transcription_text ? (
                                                    <div style={{ fontSize: '13px', color: colors.text, lineHeight: 1.4 }}>
                                                        "{log.transcription_text}"
                                                    </div>
                                                ) : (
                                                    <span style={{ color: colors.textMuted, fontSize: '13px' }}>
                                                        {log.status === 'COMPLETED' ? 'Processing...' : '—'}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
