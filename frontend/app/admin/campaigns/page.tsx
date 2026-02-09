'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn, getUserRole } from '@/lib/auth';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/lib/api';

// =============================================================================
// TYPES
// =============================================================================

type CampaignMode = 'call' | 'email' | 'whatsapp';

interface CallCampaign {
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

interface CallCampaignDetail {
    campaign: CallCampaign;
    call_logs: CallLog[];
}

interface EmailCampaign {
    id: string;
    title: string;
    subject: string;
    status: string;
    created_at: string;
    total_emails: number;
    sent_emails: number;
    failed_emails: number;
}

interface EmailLog {
    id: string;
    student_name: string;
    student_email: string;
    status: string;
    error_message: string | null;
    sent_at: string | null;
}

interface EmailCampaignDetail {
    campaign: EmailCampaign;
    email_logs: EmailLog[];
}

interface WhatsAppCampaign {
    id: string;
    title: string;
    body_text: string;
    status: string;
    created_at: string;
    total_messages: number;
    sent_messages: number;
    failed_messages: number;
}

interface WhatsAppLog {
    id: string;
    student_name: string;
    student_phone: string;
    status: string;
    error_message: string | null;
    sent_at: string | null;
}

interface WhatsAppCampaignDetail {
    campaign: WhatsAppCampaign;
    logs: WhatsAppLog[];
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function CampaignsPage() {
    const { colors } = useTheme();
    const router = useRouter();

    // Mode toggle
    const [mode, setMode] = useState<CampaignMode>('call');

    // Call campaigns state
    const [callCampaigns, setCallCampaigns] = useState<CallCampaign[]>([]);
    const [selectedCallCampaign, setSelectedCallCampaign] = useState<CallCampaignDetail | null>(null);

    // Email campaigns state
    const [emailCampaigns, setEmailCampaigns] = useState<EmailCampaign[]>([]);
    const [selectedEmailCampaign, setSelectedEmailCampaign] = useState<EmailCampaignDetail | null>(null);

    // WhatsApp campaigns state
    const [whatsappCampaigns, setWhatsappCampaigns] = useState<WhatsAppCampaign[]>([]);
    const [selectedWhatsAppCampaign, setSelectedWhatsAppCampaign] = useState<WhatsAppCampaignDetail | null>(null);

    const [loading, setLoading] = useState(true);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isLoggedIn() || getUserRole() !== 'ADMIN') {
            router.push('/login');
            return;
        }
        fetchCampaigns();
    }, [router, mode]);

    const fetchCampaigns = async () => {
        setLoading(true);
        try {
            if (mode === 'call') {
                const data = await api.get<CallCampaign[]>('/campaigns');
                setCallCampaigns(data);
            } else if (mode === 'email') {
                const data = await api.get<EmailCampaign[]>('/email-campaigns');
                setEmailCampaigns(data);
            } else {
                const data = await api.get<WhatsAppCampaign[]>('/whatsapp-campaigns');
                setWhatsappCampaigns(data);
            }
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load campaigns');
        } finally {
            setLoading(false);
        }
    };

    // Call campaign actions
    const viewCallCampaign = async (campaignId: string) => {
        setLoadingDetail(true);
        try {
            const res = await api.get<CallCampaignDetail>(`/campaigns/${campaignId}`);
            setSelectedCallCampaign(res);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to load campaign details');
        } finally {
            setLoadingDetail(false);
        }
    };

    const startCallCampaign = async (campaignId: string) => {
        if (!confirm('Start this campaign? Calls will begin immediately.')) return;
        try {
            await api.post(`/campaigns/${campaignId}/start`, {});
            fetchCampaigns();
            viewCallCampaign(campaignId);
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
            viewCallCampaign(campaignId);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to retry calls');
        }
    };

    const deleteCallCampaign = async (campaignId: string) => {
        if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) return;
        try {
            await api.delete(`/campaigns/${campaignId}`);
            setCallCampaigns(prev => prev.filter(c => c.id !== campaignId));
            if (selectedCallCampaign?.campaign.id === campaignId) setSelectedCallCampaign(null);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete campaign');
        }
    };

    // Email campaign actions
    const viewEmailCampaign = async (campaignId: string) => {
        setLoadingDetail(true);
        try {
            const res = await api.get<EmailCampaignDetail>(`/email-campaigns/${campaignId}`);
            setSelectedEmailCampaign(res);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to load campaign details');
        } finally {
            setLoadingDetail(false);
        }
    };

    const startEmailCampaign = async (campaignId: string) => {
        if (!confirm('Start this campaign? Emails will be sent immediately.')) return;
        try {
            await api.post(`/email-campaigns/${campaignId}/start`, {});
            fetchCampaigns();
            viewEmailCampaign(campaignId);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to start campaign');
        }
    };

    const retryFailedEmails = async (campaignId: string) => {
        if (!confirm('Retry all failed emails?')) return;
        try {
            const res = await api.post<{ message: string; retried_count: number }>(`/email-campaigns/${campaignId}/retry`, {});
            alert(res.message);
            fetchCampaigns();
            viewEmailCampaign(campaignId);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to retry emails');
        }
    };

    const deleteEmailCampaign = async (campaignId: string) => {
        if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) return;
        try {
            await api.delete(`/email-campaigns/${campaignId}`);
            setEmailCampaigns(prev => prev.filter(c => c.id !== campaignId));
            if (selectedEmailCampaign?.campaign.id === campaignId) setSelectedEmailCampaign(null);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete campaign');
        }
    };

    // WhatsApp campaign actions
    const viewWhatsAppCampaign = async (campaignId: string) => {
        setLoadingDetail(true);
        try {
            const res = await api.get<WhatsAppCampaignDetail>(`/whatsapp-campaigns/${campaignId}`);
            setSelectedWhatsAppCampaign(res);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to load campaign details');
        } finally {
            setLoadingDetail(false);
        }
    };

    const startWhatsAppCampaign = async (campaignId: string) => {
        if (!confirm('Start this WhatsApp broadcast? Messages will be sent immediately.')) return;
        try {
            await api.post(`/whatsapp-campaigns/${campaignId}/start`, {});
            fetchCampaigns();
            viewWhatsAppCampaign(campaignId);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to start campaign');
        }
    };

    const deleteWhatsAppCampaign = async (campaignId: string) => {
        if (!confirm('Are you sure you want to delete this WhatsApp campaign?')) return;
        try {
            await api.delete(`/whatsapp-campaigns/${campaignId}`);
            setWhatsappCampaigns(prev => prev.filter(c => c.id !== campaignId));
            if (selectedWhatsAppCampaign?.campaign.id === campaignId) setSelectedWhatsAppCampaign(null);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete campaign');
        }
    };

    const retryFailedWhatsApp = async (campaignId: string) => {
        if (!confirm('Retry all failed WhatsApp messages?')) return;
        try {
            const res = await api.post<{ message: string; retried_count: number }>(`/whatsapp-campaigns/${campaignId}/retry`, {});
            alert(res.message);
            fetchCampaigns();
            viewWhatsAppCampaign(campaignId);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to retry messages');
        }
    };

    const reconfigureCampaign = (id: string, type: CampaignMode) => {
        const url = type === 'call' ? `/admin/campaigns/new?edit_id=${id}`
            : type === 'email' ? `/admin/campaigns/email/new?edit_id=${id}`
                : `/admin/campaigns/whatsapp/new?edit_id=${id}`;
        router.push(url);
    };

    const syncWhatsAppStatus = async (campaignId: string) => {
        try {
            const res = await api.post<{ message: string }>(`/whatsapp-campaigns/${campaignId}/sync-status`, {});
            alert(res.message);
            fetchCampaigns();
            viewWhatsAppCampaign(campaignId);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to sync status');
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
            'SENDING': { bg: 'rgba(245, 158, 11, 0.2)', color: colors.warning },
            'SENT': { bg: 'rgba(34, 197, 94, 0.2)', color: colors.success },
            'FAILED': { bg: 'rgba(239, 68, 68, 0.2)', color: colors.danger },
            'NO_ANSWER': { bg: 'rgba(251, 191, 36, 0.2)', color: '#f59e0b' },
            'BUSY': { bg: 'rgba(251, 191, 36, 0.2)', color: '#f59e0b' },
        };
        const style = styles[status] || styles['PENDING'];
        return (
            <span style={{
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: style.bg,
                color: style.color
            }}>
                {status}
            </span>
        );
    };

    // =============================================================================
    // RENDER
    // =============================================================================

    return (
        <div style={{ padding: '24px' }}>
            {/* Header with Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 700, color: colors.text, margin: 0 }}>
                        {mode === 'call' ? '📞 Call Campaigns' : mode === 'email' ? '📧 Email Outreach' : '🟢 WhatsApp Broadcast'}
                    </h1>
                    <p style={{ color: colors.textMuted, marginTop: '4px', fontSize: '14px' }}>
                        {mode === 'call' ? 'Manage automated voice call campaigns' : mode === 'email' ? 'Manage email outreach campaigns' : 'Manage WhatsApp broadcast campaigns'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {/* Toggle Button */}
                    <div style={{
                        display: 'flex',
                        backgroundColor: colors.card,
                        borderRadius: '8px',
                        padding: '4px',
                        border: `1px solid ${colors.border}`
                    }}>
                        <button
                            onClick={() => { setMode('call'); setSelectedCallCampaign(null); setSelectedEmailCampaign(null); setSelectedWhatsAppCampaign(null); }}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '6px',
                                border: 'none',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                backgroundColor: mode === 'call' ? colors.primary : 'transparent',
                                color: mode === 'call' ? 'white' : colors.textMuted,
                                transition: 'all 0.2s'
                            }}
                        >
                            📞 Calls
                        </button>
                        <button
                            onClick={() => { setMode('email'); setSelectedCallCampaign(null); setSelectedEmailCampaign(null); setSelectedWhatsAppCampaign(null); }}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '6px',
                                border: 'none',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                backgroundColor: mode === 'email' ? colors.primary : 'transparent',
                                color: mode === 'email' ? 'white' : colors.textMuted,
                                transition: 'all 0.2s'
                            }}
                        >
                            📧 Emails
                        </button>
                        <button
                            onClick={() => { setMode('whatsapp'); setSelectedCallCampaign(null); setSelectedEmailCampaign(null); setSelectedWhatsAppCampaign(null); }}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '6px',
                                border: 'none',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                backgroundColor: mode === 'whatsapp' ? '#25D366' : 'transparent',
                                color: mode === 'whatsapp' ? 'white' : colors.textMuted,
                                transition: 'all 0.2s'
                            }}
                        >
                            🟢 WhatsApp
                        </button>
                    </div>

                    {/* New Campaign Button */}
                    <button
                        onClick={() => router.push(mode === 'call' ? '/admin/campaigns/new' : mode === 'email' ? '/admin/campaigns/email/new' : '/admin/campaigns/whatsapp/new')}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: mode === 'whatsapp' ? '#25D366' : colors.primary,
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        + New {mode === 'call' ? 'Call' : mode === 'email' ? 'Email' : 'WhatsApp'} Campaign
                    </button>
                </div>
            </div>

            {/* Loading / Error */}
            {loading && <p style={{ color: colors.textMuted }}>Loading campaigns...</p>}
            {error && <p style={{ color: colors.danger }}>{error}</p>}

            {/* Main Content */}
            {!loading && !error && (
                <div style={{ display: 'grid', gridTemplateColumns: selectedCallCampaign || selectedEmailCampaign || selectedWhatsAppCampaign ? '1fr 2fr' : '1fr', gap: '24px' }}>

                    {/* Campaign List */}
                    <div style={{ backgroundColor: colors.card, borderRadius: '12px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
                            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: colors.text }}>
                                {mode === 'call' ? 'Call Campaigns' : mode === 'email' ? 'Email Campaigns' : 'WhatsApp Campaigns'} ({mode === 'call' ? callCampaigns.length : mode === 'email' ? emailCampaigns.length : whatsappCampaigns.length})
                            </h2>
                        </div>

                        {mode === 'call' ? (
                            // Call Campaigns List
                            callCampaigns.length === 0 ? (
                                <p style={{ padding: '20px', color: colors.textMuted, textAlign: 'center' }}>No call campaigns yet</p>
                            ) : (
                                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                    {callCampaigns.map(c => (
                                        <div
                                            key={c.id}
                                            onClick={() => viewCallCampaign(c.id)}
                                            style={{
                                                padding: '16px 20px',
                                                borderBottom: `1px solid ${colors.border}`,
                                                cursor: 'pointer',
                                                backgroundColor: selectedCallCampaign?.campaign.id === c.id ? colors.primary + '10' : 'transparent',
                                                transition: 'background-color 0.2s'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: colors.text }}>{c.title}</h3>
                                                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: colors.textMuted }}>
                                                        {c.completed_calls}/{c.total_calls} calls completed
                                                    </p>
                                                </div>
                                                {getStatusBadge(c.status)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        ) : mode === 'email' ? (
                            // Email Campaigns List
                            emailCampaigns.length === 0 ? (
                                <p style={{ padding: '20px', color: colors.textMuted, textAlign: 'center' }}>No email campaigns yet</p>
                            ) : (
                                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                    {emailCampaigns.map(c => (
                                        <div
                                            key={c.id}
                                            onClick={() => viewEmailCampaign(c.id)}
                                            style={{
                                                padding: '16px 20px',
                                                borderBottom: `1px solid ${colors.border}`,
                                                cursor: 'pointer',
                                                backgroundColor: selectedEmailCampaign?.campaign.id === c.id ? colors.primary + '10' : 'transparent',
                                                transition: 'background-color 0.2s'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: colors.text }}>{c.title}</h3>
                                                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: colors.textMuted }}>
                                                        {c.sent_emails}/{c.total_emails} sent • {c.failed_emails} failed
                                                    </p>
                                                </div>
                                                {getStatusBadge(c.status)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        ) : (
                            // WhatsApp Campaigns List
                            whatsappCampaigns.length === 0 ? (
                                <p style={{ padding: '20px', color: colors.textMuted, textAlign: 'center' }}>No WhatsApp campaigns yet</p>
                            ) : (
                                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                    {whatsappCampaigns.map(c => (
                                        <div
                                            key={c.id}
                                            onClick={() => viewWhatsAppCampaign(c.id)}
                                            style={{
                                                padding: '16px 20px',
                                                borderBottom: `1px solid ${colors.border}`,
                                                cursor: 'pointer',
                                                backgroundColor: selectedWhatsAppCampaign?.campaign.id === c.id ? '#25D366' + '10' : 'transparent',
                                                transition: 'background-color 0.2s'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: colors.text }}>{c.title}</h3>
                                                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: colors.textMuted }}>
                                                        {c.sent_messages}/{c.total_messages} sent • {c.failed_messages} failed
                                                    </p>
                                                </div>
                                                {getStatusBadge(c.status)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}
                    </div>

                    {/* Detail Panel - Call Campaign */}
                    {mode === 'call' && selectedCallCampaign && (
                        <div style={{ backgroundColor: colors.card, borderRadius: '12px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
                            {/* Header */}
                            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: colors.text }}>{selectedCallCampaign.campaign.title}</h3>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: colors.textMuted }}>
                                        Script: "{selectedCallCampaign.campaign.script_template.substring(0, 100)}..."
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => viewCallCampaign(selectedCallCampaign.campaign.id)}
                                        disabled={loadingDetail}
                                        style={{
                                            padding: '8px 12px',
                                            backgroundColor: loadingDetail ? colors.primary + '20' : colors.card,
                                            color: loadingDetail ? colors.primary : colors.text,
                                            border: `1px solid ${loadingDetail ? colors.primary : colors.border}`,
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            fontWeight: 500,
                                            cursor: loadingDetail ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        {loadingDetail ? '⏳ Loading...' : '🔄 Refresh'}
                                    </button>
                                    {selectedCallCampaign.campaign.status === 'DRAFT' && (
                                        <button
                                            onClick={() => startCallCampaign(selectedCallCampaign.campaign.id)}
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
                                    {selectedCallCampaign.call_logs.some(cl => ['FAILED', 'IN_PROGRESS', 'BUSY', 'NO_ANSWER'].includes(cl.status)) && (
                                        <button
                                            onClick={() => retryFailedCalls(selectedCallCampaign.campaign.id)}
                                            style={{
                                                padding: '8px 16px',
                                                backgroundColor: colors.danger + '20',
                                                color: colors.danger,
                                                border: `1px solid ${colors.danger}`,
                                                borderRadius: '6px',
                                                fontSize: '13px',
                                                fontWeight: 600,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            🔁 Retry Failed
                                        </button>
                                    )}
                                    <button
                                        onClick={() => reconfigureCampaign(selectedCallCampaign.campaign.id, 'call')}
                                        style={{
                                            padding: '8px 12px',
                                            backgroundColor: 'transparent',
                                            color: colors.primary,
                                            border: `1px solid ${colors.primary}`,
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ⚙️ Reconfigure
                                    </button>
                                </div>
                            </div>

                            {/* Call Logs Table */}
                            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: colors.tableHeaderBg }}>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>Student</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>Status</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>Duration</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>Transcript</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>Recording</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedCallCampaign.call_logs.map(log => (
                                            <tr key={log.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <div style={{ fontSize: '14px', fontWeight: 500, color: colors.text }}>{log.student_name}</div>
                                                    <div style={{ fontSize: '12px', color: colors.textMuted }}>{log.student_email}</div>
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>{getStatusBadge(log.status)}</td>
                                                <td style={{ padding: '12px 16px', fontSize: '13px', color: colors.textMuted }}>
                                                    {log.duration ? `${Math.round(log.duration)}s` : '-'}
                                                </td>
                                                <td style={{ padding: '12px 16px', fontSize: '12px', color: colors.text, maxWidth: '200px' }}>
                                                    {log.transcription_text ? (
                                                        <div style={{ maxHeight: '60px', overflowY: 'auto' }}>"{log.transcription_text}"</div>
                                                    ) : (
                                                        <span style={{ color: colors.textMuted }}>-</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    {log.recording_url ? (
                                                        <audio controls src={log.recording_url} style={{ height: '32px' }} />
                                                    ) : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Detail Panel - Email Campaign */}
                    {mode === 'email' && selectedEmailCampaign && (
                        <div style={{ backgroundColor: colors.card, borderRadius: '12px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
                            {/* Header */}
                            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: colors.text }}>{selectedEmailCampaign.campaign.title}</h3>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: colors.textMuted }}>
                                        Subject: "{selectedEmailCampaign.campaign.subject}"
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => viewEmailCampaign(selectedEmailCampaign.campaign.id)}
                                        disabled={loadingDetail}
                                        style={{
                                            padding: '8px 12px',
                                            backgroundColor: loadingDetail ? colors.primary + '20' : colors.card,
                                            color: loadingDetail ? colors.primary : colors.text,
                                            border: `1px solid ${loadingDetail ? colors.primary : colors.border}`,
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            fontWeight: 500,
                                            cursor: loadingDetail ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        {loadingDetail ? '⏳ Loading...' : '🔄 Refresh'}
                                    </button>
                                    {selectedEmailCampaign.campaign.status === 'DRAFT' && (
                                        <button
                                            onClick={() => startEmailCampaign(selectedEmailCampaign.campaign.id)}
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
                                            ▶ Start Sending
                                        </button>
                                    )}
                                    {selectedEmailCampaign.email_logs.some(el => el.status === 'FAILED') && (
                                        <button
                                            onClick={() => retryFailedEmails(selectedEmailCampaign.campaign.id)}
                                            style={{
                                                padding: '8px 16px',
                                                backgroundColor: colors.danger + '20',
                                                color: colors.danger,
                                                border: `1px solid ${colors.danger}`,
                                                borderRadius: '6px',
                                                fontSize: '13px',
                                                fontWeight: 600,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            🔁 Retry Failed
                                        </button>
                                    )}
                                    <button
                                        onClick={() => reconfigureCampaign(selectedEmailCampaign.campaign.id, 'email')}
                                        style={{
                                            padding: '8px 12px',
                                            backgroundColor: 'transparent',
                                            color: colors.primary,
                                            border: `1px solid ${colors.primary}`,
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ⚙️ Reconfigure
                                    </button>
                                </div>
                            </div>

                            {/* Email Logs Table */}
                            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: colors.tableHeaderBg }}>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>Recipient</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>Status</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>Sent At</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>Error</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedEmailCampaign.email_logs.map(log => (
                                            <tr key={log.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <div style={{ fontSize: '14px', fontWeight: 500, color: colors.text }}>{log.student_name}</div>
                                                    <div style={{ fontSize: '12px', color: colors.textMuted }}>{log.student_email}</div>
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>{getStatusBadge(log.status)}</td>
                                                <td style={{ padding: '12px 16px', fontSize: '13px', color: colors.textMuted }}>
                                                    {log.sent_at ? new Date(log.sent_at).toLocaleString() : '-'}
                                                </td>
                                                <td style={{ padding: '12px 16px', fontSize: '12px', color: colors.danger }}>
                                                    {log.error_message || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {/* Detail Panel - WhatsApp Campaign */}
                    {mode === 'whatsapp' && selectedWhatsAppCampaign && (
                        <div style={{ backgroundColor: colors.card, borderRadius: '12px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
                            {/* Header */}
                            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: colors.text }}>{selectedWhatsAppCampaign.campaign.title}</h3>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: colors.textMuted }}>
                                        Preview: "{selectedWhatsAppCampaign.campaign.body_text.substring(0, 100)}..."
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => viewWhatsAppCampaign(selectedWhatsAppCampaign.campaign.id)}
                                        disabled={loadingDetail}
                                        style={{
                                            padding: '8px 12px',
                                            backgroundColor: loadingDetail ? colors.primary + '20' : colors.card,
                                            color: loadingDetail ? colors.primary : colors.text,
                                            border: `1px solid ${loadingDetail ? colors.primary : colors.border}`,
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            fontWeight: 500,
                                            cursor: loadingDetail ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        {loadingDetail ? '⏳ Loading...' : '🔄 Refresh'}
                                    </button>
                                    {selectedWhatsAppCampaign.campaign.status === 'DRAFT' && (
                                        <button
                                            onClick={() => startWhatsAppCampaign(selectedWhatsAppCampaign.campaign.id)}
                                            style={{
                                                padding: '8px 16px',
                                                backgroundColor: '#25D366',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontSize: '13px',
                                                fontWeight: 600,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            ▶ Start Broadcast
                                        </button>
                                    )}
                                    {selectedWhatsAppCampaign.campaign.status !== 'COMPLETED' && (
                                        <button
                                            onClick={() => deleteWhatsAppCampaign(selectedWhatsAppCampaign.campaign.id)}
                                            style={{
                                                padding: '8px 12px',
                                                backgroundColor: 'transparent',
                                                color: colors.danger,
                                                border: `1px solid ${colors.danger}`,
                                                borderRadius: '6px',
                                                fontSize: '13px',
                                                fontWeight: 600,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            🗑️ Delete
                                        </button>
                                    )}
                                    {selectedWhatsAppCampaign.logs.some(l => l.status === 'FAILED') && (
                                        <button
                                            onClick={() => retryFailedWhatsApp(selectedWhatsAppCampaign.campaign.id)}
                                            style={{
                                                padding: '8px 12px',
                                                backgroundColor: colors.danger + '20',
                                                color: colors.danger,
                                                border: `1px solid ${colors.danger}`,
                                                borderRadius: '6px',
                                                fontSize: '13px',
                                                fontWeight: 600,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            🔁 Retry Failed
                                        </button>
                                    )}
                                    <button
                                        onClick={() => syncWhatsAppStatus(selectedWhatsAppCampaign.campaign.id)}
                                        style={{
                                            padding: '8px 12px',
                                            backgroundColor: 'transparent',
                                            color: colors.text,
                                            border: `1px solid ${colors.border}`,
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        🔄 Sync Status
                                    </button>
                                    <button
                                        onClick={() => reconfigureCampaign(selectedWhatsAppCampaign.campaign.id, 'whatsapp')}
                                        style={{
                                            padding: '8px 12px',
                                            backgroundColor: 'transparent',
                                            color: colors.primary,
                                            border: `1px solid ${colors.primary}`,
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ⚙️ Reconfigure
                                    </button>
                                </div>
                            </div>

                            {/* WhatsApp Logs Table */}
                            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: colors.tableHeaderBg }}>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>Recipient</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>Status</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>Sent At</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>Error</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedWhatsAppCampaign.logs.map(log => (
                                            <tr key={log.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <div style={{ fontSize: '14px', fontWeight: 500, color: colors.text }}>{log.student_name}</div>
                                                    <div style={{ fontSize: '12px', color: colors.textMuted }}>{log.student_phone}</div>
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>{getStatusBadge(log.status)}</td>
                                                <td style={{ padding: '12px 16px', fontSize: '13px', color: colors.textMuted }}>
                                                    {log.sent_at ? new Date(log.sent_at).toLocaleString() : '-'}
                                                </td>
                                                <td style={{ padding: '12px 16px', fontSize: '12px', color: colors.danger }}>
                                                    {log.error_message || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
