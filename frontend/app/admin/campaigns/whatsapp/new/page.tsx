'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';
import { isLoggedIn, getUserRole } from '@/lib/auth';

// =============================================================================
// TYPES
// =============================================================================

interface Student {
    user_id: string;
    full_name: string;
    email: string;
    branch: string;
    cgpa: number | null;
    is_placed: boolean;
    department: string;
    phone: string | null;
}

interface Template {
    id: string;
    name: string;
    body_text: string;
    variables: string | null;
    is_prebuilt: boolean;
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const StepIndicator = ({ currentStep }: { currentStep: number }) => {
    const { colors } = useTheme();
    const steps = ['Select Students', 'Compose Message', 'Review & Send'];

    return (
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
            {steps.map((step, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', flex: index === steps.length - 1 ? '0 1 auto' : '1 1 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: index + 1 <= currentStep ? '#25D366' : colors.card,
                            border: `2px solid ${index + 1 <= currentStep ? '#25D366' : colors.border}`,
                            color: index + 1 <= currentStep ? 'white' : colors.textMuted,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '13px'
                        }}>
                            {index + 1}
                        </div>
                        <span style={{
                            fontSize: '14px',
                            fontWeight: index + 1 === currentStep ? 600 : 500,
                            color: index + 1 === currentStep ? colors.text : colors.textMuted
                        }}>
                            {step}
                        </span>
                    </div>
                    {index < steps.length - 1 && (
                        <div style={{ height: '2px', backgroundColor: index + 1 < currentStep ? '#25D366' : colors.border, flex: 1, margin: '0 16px' }} />
                    )}
                </div>
            ))}
        </div>
    );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function NewWhatsAppCampaignPage() {
    const router = useRouter();
    const { colors } = useTheme();

    // State
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Data State
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
    const [templates, setTemplates] = useState<Template[]>([]);

    // Filter State
    const [filters, setFilters] = useState({
        branch: '',
        minCgpa: '',
        placed: 'all'
    });

    // Edit Mode
    const searchParams = useSearchParams();
    const editId = searchParams.get('edit_id');

    // Campaign State
    const [campaignTitle, setCampaignTitle] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [customBody, setCustomBody] = useState('');

    // Template Management Modal
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null); // null = creating new
    const [templateName, setTemplateName] = useState('');
    const [templateBody, setTemplateBody] = useState('');

    // Fetch initial data
    useEffect(() => {
        if (!isLoggedIn() || getUserRole() !== 'ADMIN') {
            router.push('/login');
            return;
        }
        fetchStudents();
        fetchTemplates();
        if (editId) {
            fetchCampaignDetails(editId);
        }
    }, [router, editId]);

    const fetchCampaignDetails = async (id: string) => {
        try {
            const res = await api.get<any>(`/whatsapp-campaigns/${id}`);
            // res.campaign contains details
            setCampaignTitle(res.campaign.title);
            setCustomBody(res.campaign.body_text || '');
            if (res.campaign.template_id) {
                setSelectedTemplateId(res.campaign.template_id);
            }

            // Extract student IDs (Note: similar limitations as Email/Call if ID not returned)
            // But allows user to edit content at least.
        } catch (err) {
            console.error('Failed to load campaign:', err);
        }
    };

    const fetchStudents = async () => {
        try {
            const res = await api.get<{ students: Student[] }>('/admin/students');
            setStudents(res.students || []);
        } catch (err) {
            console.error(err);
            setError('Failed to fetch students');
        }
    };

    const fetchTemplates = async () => {
        try {
            const res = await api.get<{ templates: Template[] }>('/whatsapp-campaigns/templates/list');
            setTemplates(res.templates || []);
        } catch (err) {
            console.error("Templates fetch error", err);
            // Fallback empty
            setTemplates([]);
        }
    };

    // Filter Logic
    const filteredStudents = students.filter(student => {
        if (filters.branch && student.branch !== filters.branch) return false;
        if (filters.minCgpa && (student.cgpa === null || student.cgpa < parseFloat(filters.minCgpa))) return false;
        if (filters.placed === 'placed' && !student.is_placed) return false;
        if (filters.placed === 'not_placed' && student.is_placed) return false;
        return true;
    });

    const hasActiveFilters = filters.branch !== '' || filters.minCgpa !== '' || filters.placed !== 'all';

    const handleSelectStudent = (id: string) => {
        const newSelected = new Set(selectedStudents);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedStudents(newSelected);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allIds = filteredStudents.map(s => s.user_id);
            setSelectedStudents(new Set(allIds));
        } else {
            setSelectedStudents(new Set());
        }
    };

    // Template Management
    /* 
       NOTE: Since we didn't add specific Template Management endpoints (CRUD) in whatsapp_campaigns.py yet
       (just Campaign CRUD), I will omit the 'Edit/Create Template' modal logic for now and 
       focus on 'One-off Custom Message' flow which creates a campaign directly.
       Future Polish: Add full template management.
    */

    // Submit
    const handleSubmit = async () => {
        if (!campaignTitle.trim()) {
            alert('Please enter a campaign title');
            return;
        }
        if (selectedStudents.size === 0) {
            alert('Please select at least one student');
            return;
        }
        if (!customBody.trim()) {
            alert('Please enter a message body');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                title: campaignTitle,
                body_text: customBody,
                student_ids: Array.from(selectedStudents),
                template_id: selectedTemplateId || null
            };

            if (editId) {
                await api.put(`/whatsapp-campaigns/${editId}`, payload);
            } else {
                await api.post('/whatsapp-campaigns', payload);
            }

            // Redirect
            router.push('/admin/campaigns');
        } catch (err: any) { // eslint-disable-line
            alert(err.message || 'Failed to save campaign');
            setLoading(false);
        }
    };

    // =============================================================================
    // RENDER
    // =============================================================================

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <button
                    onClick={() => router.back()}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: colors.textMuted,
                        cursor: 'pointer',
                        fontSize: '14px',
                        marginBottom: '8px',
                        padding: 0
                    }}
                >
                    ← Back to Campaigns
                </button>
                <h1 style={{ fontSize: '28px', fontWeight: 700, color: colors.text, margin: 0 }}>
                    <span style={{ color: '#25D366' }}>WhatsApp</span> {editId ? 'Broadcast (Edit)' : 'Broadcast'}
                </h1>
                <p style={{ color: colors.textMuted, marginTop: '8px' }}>
                    Send WhatsApp messages to students. Note: Requires verified templates for production.
                </p>
            </div>

            <StepIndicator currentStep={step} />

            {/* ERROR */}
            {error && (
                <div style={{ padding: '16px', backgroundColor: colors.danger + '15', color: colors.danger, borderRadius: '8px', marginBottom: '24px' }}>
                    {error}
                </div>
            )}

            {/* STEP 1: SELECT STUDENTS */}
            {step === 1 && (
                <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '24px' }}>
                    {/* Filters Sidebar */}
                    <div style={{ backgroundColor: colors.card, padding: '20px', borderRadius: '12px', border: `1px solid ${colors.border}`, height: 'fit-content' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: colors.text }}>Filters</h3>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500, color: colors.textMuted }}>Branch</label>
                            <select
                                value={filters.branch}
                                onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${colors.border}`, backgroundColor: colors.background, color: colors.text }}
                            >
                                <option value="">All Branches</option>
                                <option value="CSE">CSE</option>
                                <option value="ECE">ECE</option>
                                <option value="ME">ME</option>
                                <option value="CE">CE</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500, color: colors.textMuted }}>Min CGPA</label>
                            <input
                                type="number"
                                placeholder="0.0"
                                step="0.1"
                                min="0"
                                max="10"
                                value={filters.minCgpa}
                                onChange={(e) => setFilters({ ...filters, minCgpa: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${colors.border}`, backgroundColor: colors.background, color: colors.text }}
                            />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500, color: colors.textMuted }}>Placed Status</label>
                            <select
                                value={filters.placed}
                                onChange={(e) => setFilters({ ...filters, placed: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${colors.border}`, backgroundColor: colors.background, color: colors.text }}
                            >
                                <option value="all">Any</option>
                                <option value="placed">Placed Only</option>
                                <option value="not_placed">Not Placed</option>
                            </select>
                        </div>

                        {hasActiveFilters && (
                            <button
                                onClick={() => setFilters({ branch: '', minCgpa: '', placed: 'all' })}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    backgroundColor: colors.card,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    color: colors.textMuted,
                                    fontSize: '13px'
                                }}
                            >
                                ✕ Clear Filters
                            </button>
                        )}
                    </div>

                    {/* Students List */}
                    <div style={{ backgroundColor: colors.card, borderRadius: '12px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: colors.text }}>
                                {filteredStudents.length} Students Found
                            </div>
                            <div style={{ fontSize: '14px', color: colors.textMuted }}>
                                {selectedStudents.size} Selected
                            </div>
                        </div>

                        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ position: 'sticky', top: 0, backgroundColor: colors.card, zIndex: 1 }}>
                                    <tr style={{ backgroundColor: colors.tableHeaderBg }}>
                                        <th style={{ padding: '12px 16px', width: '40px' }}>
                                            <input
                                                type="checkbox"
                                                onChange={handleSelectAll}
                                                checked={filteredStudents.length > 0 && selectedStudents.size === filteredStudents.length}
                                            />
                                        </th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>Name</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>Branch</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>CGPA</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>Phone</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.map(student => (
                                        <tr key={student.user_id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                                            <td style={{ padding: '12px 16px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedStudents.has(student.user_id)}
                                                    onChange={() => handleSelectStudent(student.user_id)}
                                                />
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '14px', color: colors.text }}>{student.full_name}</td>
                                            <td style={{ padding: '12px 16px', fontSize: '14px', color: colors.text }}>{student.branch}</td>
                                            <td style={{ padding: '12px 16px', fontSize: '14px', color: colors.text }}>{student.cgpa}</td>
                                            <td style={{ padding: '12px 16px', fontSize: '14px', color: colors.text }}>
                                                {student.phone ? student.phone : <span style={{ color: colors.danger, fontSize: '11px' }}>Missing</span>}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredStudents.length === 0 && (
                                        <tr>
                                            <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: colors.textMuted }}>
                                                No students found matching filters
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 2: COMPOSE MESSAGE */}
            {step === 2 && (
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: colors.text }}>Campaign Title</label>
                        <input
                            type="text"
                            placeholder="e.g. Internship Announcement - Batch 2026"
                            value={campaignTitle}
                            onChange={(e) => setCampaignTitle(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                border: `1px solid ${colors.border}`,
                                backgroundColor: colors.card,
                                color: colors.text,
                                fontSize: '15px'
                            }}
                        />
                    </div>

                    <div style={{ backgroundColor: colors.card, padding: '24px', borderRadius: '12px', border: `1px solid ${colors.border}` }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: colors.text }}>Compose Message</h3>

                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 600, color: colors.textMuted }}>Message Body</label>
                                <span style={{ fontSize: '12px', color: colors.textMuted }}>Supports Emojis 📝</span>
                            </div>
                            <textarea
                                value={customBody}
                                onChange={(e) => setCustomBody(e.target.value)}
                                placeholder={`Hi {{student_name}},

We have a new update for you regarding...

Regards,
TnP Cell`}
                                rows={12}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: `1px solid ${colors.border}`,
                                    backgroundColor: '#fff', // WhatsApp-like white background
                                    color: '#111b21', // WhatsApp text color
                                    fontSize: '15px',
                                    lineHeight: '1.5',
                                    fontFamily: 'Segoe UI, Helvetica, Arial, sans-serif',
                                    resize: 'vertical',
                                    boxSizing: 'border-box'
                                }}
                            />
                            <p style={{ marginTop: '8px', fontSize: '12px', color: colors.textMuted }}>
                                Available variables: <code>{'{{student_name}}'}</code>, <code>{'{{email}}'}</code>, <code>{'{{branch}}'}</code>, <code>{'{{cgpa}}'}</code>
                            </p>
                        </div>

                        {/* Template Selection UI */}
                        {templates.length > 0 && (
                            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: `1px solid ${colors.border}` }}>
                                <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: 600, color: colors.text }}>Or Choose a Template</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {templates.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => {
                                                setSelectedTemplateId(t.id);
                                                setCustomBody(t.body_text);
                                            }}
                                            style={{
                                                padding: '8px 12px',
                                                backgroundColor: selectedTemplateId === t.id ? '#25D366' : 'transparent',
                                                color: selectedTemplateId === t.id ? 'white' : colors.text,
                                                border: `1px solid ${selectedTemplateId === t.id ? '#25D366' : colors.border}`,
                                                borderRadius: '20px',
                                                fontSize: '13px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {t.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* STEP 3: REVIEW & SEND */}
            {step === 3 && (
                <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                    <div style={{ fontSize: '64px', marginBottom: '16px' }}>🚀</div>
                    <h2 style={{ fontSize: '24px', fontWeight: 700, color: colors.text, marginBottom: '8px' }}>Ready to Launch?</h2>
                    <p style={{ color: colors.textMuted, marginBottom: '32px' }}>
                        You are about to utilize the WhatsApp API to broadcast messages.
                    </p>

                    <div style={{ backgroundColor: colors.card, padding: '24px', borderRadius: '12px', border: `1px solid ${colors.border}`, textAlign: 'left', marginBottom: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: `1px solid ${colors.border}`, paddingBottom: '12px' }}>
                            <span style={{ color: colors.textMuted }}>Campaign</span>
                            <span style={{ fontWeight: 600, color: colors.text }}>{campaignTitle}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: `1px solid ${colors.border}`, paddingBottom: '12px' }}>
                            <span style={{ color: colors.textMuted }}>Recipients</span>
                            <span style={{ fontWeight: 600, color: colors.text }}>{selectedStudents.size} Students</span>
                        </div>
                        <div>
                            <span style={{ color: colors.textMuted, display: 'block', marginBottom: '8px' }}>Message Preview</span>
                            <div style={{
                                backgroundColor: '#d9fdd3', // WhatsApp sent bubble color
                                padding: '12px',
                                borderRadius: '8px',
                                color: '#111b21',
                                fontSize: '14px',
                                whiteSpace: 'pre-wrap'
                            }}>
                                {customBody.replace('{{student_name}}', 'John Doe').replace('{{branch}}', 'CSE')}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        style={{
                            padding: '14px 32px',
                            backgroundColor: '#25D366', // WhatsApp Green
                            color: 'white',
                            border: 'none',
                            borderRadius: '50px',
                            fontSize: '16px',
                            fontWeight: 700,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            width: '100%',
                            boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)',
                            opacity: loading ? 0.8 : 1
                        }}
                    >
                        {loading ? (editId ? 'Updating...' : 'Sending Broadcast...') : (editId ? 'Update Campaign' : 'Send WhatsApp Broadcast')}
                    </button>
                    {loading && <p style={{ marginTop: '16px', fontSize: '13px', color: colors.textMuted }}>This may take a moment while we queue the messages...</p>}
                </div>
            )}

            {/* NAVIGATION BUTTONS */}
            <div style={{ maxWidth: '800px', margin: '32px auto 0', display: 'flex', justifyContent: 'space-between' }}>
                {step > 1 && (
                    <button
                        onClick={() => setStep(step - 1)}
                        style={{
                            padding: '10px 24px',
                            backgroundColor: colors.card,
                            color: colors.text,
                            border: `1px solid ${colors.border}`,
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Back
                    </button>
                )}

                {step < 3 && (
                    <button
                        onClick={() => {
                            if (step === 1 && selectedStudents.size === 0) {
                                alert('Please select at least one student');
                                return;
                            }
                            setStep(step + 1);
                        }}
                        style={{
                            padding: '10px 24px',
                            backgroundColor: colors.primary,
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            marginLeft: 'auto'
                        }}
                    >
                        Next
                    </button>
                )}
            </div>
        </div>
    );
}
