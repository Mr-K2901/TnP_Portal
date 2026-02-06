'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn, getUserRole } from '@/lib/auth';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/lib/api';

interface Student {
    user_id: string;
    full_name: string;
    email: string;
    branch: string;
    cgpa: number | null;
    is_placed: boolean;
}

export default function NewCampaignPage() {
    const { colors } = useTheme();
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    // Filters
    const [branchFilter, setBranchFilter] = useState('');
    const [placedFilter, setPlacedFilter] = useState<string>('all');

    // Campaign Config
    const [title, setTitle] = useState('');
    const [script, setScript] = useState(
        'Hello, this is the Training and Placement Cell. Please share your feedback about the recent placement drive after the beep.'
    );

    useEffect(() => {
        if (!isLoggedIn() || getUserRole() !== 'ADMIN') {
            router.push('/login');
            return;
        }
        fetchStudents();
    }, [router]);

    const fetchStudents = async () => {
        try {
            const res = await api.get<{ students: Student[] }>('/admin/students');
            setStudents(res.students || []);
        } catch (err) {
            console.error('Failed to load students:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = students.filter(s => {
        if (branchFilter && s.branch !== branchFilter) return false;
        if (placedFilter === 'placed' && !s.is_placed) return false;
        if (placedFilter === 'not_placed' && s.is_placed) return false;
        return true;
    });

    const branches = [...new Set(students.map(s => s.branch))];

    const toggleStudent = (id: string) => {
        const newSet = new Set(selectedStudents);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedStudents(newSet);
    };

    const selectAll = () => {
        const ids = filteredStudents.map(s => s.user_id);
        setSelectedStudents(new Set(ids));
    };

    const deselectAll = () => {
        setSelectedStudents(new Set());
    };

    const createCampaign = async () => {
        if (!title.trim()) {
            alert('Please enter a campaign title');
            return;
        }
        if (selectedStudents.size === 0) {
            alert('Please select at least one student');
            return;
        }

        setCreating(true);
        try {
            await api.post('/campaigns', {
                title: title.trim(),
                script_template: script.trim(),
                student_ids: Array.from(selectedStudents)
            });
            router.push('/admin/campaigns');
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to create campaign');
            setCreating(false);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: colors.background, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted }}>
                Loading students...
            </div>
        );
    }

    return (
        <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <button
                    onClick={() => router.push('/admin/campaigns')}
                    style={{ background: 'none', border: 'none', color: colors.primary, cursor: 'pointer', fontSize: '14px', marginBottom: '8px' }}
                >
                    ← Back to Campaigns
                </button>
                <h1 style={{ color: colors.text, fontSize: '28px', fontWeight: 700, margin: 0 }}>New Call Campaign</h1>
            </div>

            {/* Steps */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
                {['Select Students', 'Configure Campaign'].map((label, idx) => (
                    <div
                        key={idx}
                        style={{
                            flex: 1,
                            padding: '12px',
                            backgroundColor: step === idx + 1 ? colors.primary : colors.card,
                            color: step === idx + 1 ? 'white' : colors.textMuted,
                            borderRadius: '8px',
                            textAlign: 'center',
                            fontWeight: 600,
                            fontSize: '14px',
                            border: `1px solid ${step === idx + 1 ? colors.primary : colors.border}`
                        }}
                    >
                        Step {idx + 1}: {label}
                    </div>
                ))}
            </div>

            {/* Step 1: Select Students */}
            {step === 1 && (
                <div style={{ backgroundColor: colors.card, borderRadius: '12px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
                    {/* Filters */}
                    <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <select
                            value={branchFilter}
                            onChange={(e) => setBranchFilter(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '6px', border: `1px solid ${colors.border}`, backgroundColor: colors.inputBg, color: colors.text }}
                        >
                            <option value="">All Branches</option>
                            {branches.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                        <select
                            value={placedFilter}
                            onChange={(e) => setPlacedFilter(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '6px', border: `1px solid ${colors.border}`, backgroundColor: colors.inputBg, color: colors.text }}
                        >
                            <option value="all">All Students</option>
                            <option value="placed">Placed Only</option>
                            <option value="not_placed">Not Placed</option>
                        </select>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                            <button onClick={selectAll} style={{ padding: '6px 12px', border: `1px solid ${colors.border}`, borderRadius: '6px', backgroundColor: 'transparent', color: colors.text, cursor: 'pointer', fontSize: '13px' }}>
                                Select All ({filteredStudents.length})
                            </button>
                            <button onClick={deselectAll} style={{ padding: '6px 12px', border: `1px solid ${colors.border}`, borderRadius: '6px', backgroundColor: 'transparent', color: colors.textMuted, cursor: 'pointer', fontSize: '13px' }}>
                                Clear
                            </button>
                        </div>
                    </div>

                    {/* Student List */}
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {filteredStudents.map((student, idx) => (
                            <div
                                key={student.user_id}
                                onClick={() => toggleStudent(student.user_id)}
                                style={{
                                    padding: '12px 20px',
                                    borderBottom: `1px solid ${colors.border}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    cursor: 'pointer',
                                    backgroundColor: selectedStudents.has(student.user_id) ? colors.primary + '15' : (idx % 2 === 0 ? colors.card : colors.background)
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedStudents.has(student.user_id)}
                                    onChange={() => toggleStudent(student.user_id)}
                                    style={{ width: '18px', height: '18px', accentColor: colors.primary }}
                                />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 500, color: colors.text }}>{student.full_name}</div>
                                    <div style={{ fontSize: '12px', color: colors.textMuted }}>{student.email} • {student.branch}</div>
                                </div>
                                {student.is_placed && (
                                    <span style={{ padding: '4px 8px', backgroundColor: 'rgba(34, 197, 94, 0.2)', color: colors.success, borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                                        PLACED
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div style={{ padding: '16px 20px', borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: colors.textMuted, fontSize: '14px' }}>
                            {selectedStudents.size} student{selectedStudents.size !== 1 ? 's' : ''} selected
                        </span>
                        <button
                            onClick={() => setStep(2)}
                            disabled={selectedStudents.size === 0}
                            style={{
                                padding: '10px 24px',
                                backgroundColor: selectedStudents.size > 0 ? colors.primary : colors.secondary,
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 600,
                                cursor: selectedStudents.size > 0 ? 'pointer' : 'not-allowed'
                            }}
                        >
                            Next →
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Configure Campaign */}
            {step === 2 && (
                <div style={{ backgroundColor: colors.card, borderRadius: '12px', border: `1px solid ${colors.border}`, padding: '24px' }}>
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: colors.text }}>Campaign Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Google Placement Confirmation"
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                border: `1px solid ${colors.border}`,
                                backgroundColor: colors.inputBg,
                                color: colors.text,
                                fontSize: '15px'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: colors.text }}>Voice Script</label>
                        <p style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '8px' }}>
                            This message will be spoken to students. After the script, they will hear a beep and can record their response.
                        </p>
                        <textarea
                            value={script}
                            onChange={(e) => setScript(e.target.value)}
                            rows={4}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                border: `1px solid ${colors.border}`,
                                backgroundColor: colors.inputBg,
                                color: colors.text,
                                fontSize: '15px',
                                resize: 'vertical'
                            }}
                        />
                    </div>

                    <div style={{ padding: '16px', backgroundColor: colors.background, borderRadius: '8px', marginBottom: '24px' }}>
                        <div style={{ fontSize: '14px', color: colors.textMuted }}>
                            <strong style={{ color: colors.text }}>Summary:</strong> {selectedStudents.size} students will receive a call
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <button
                            onClick={() => setStep(1)}
                            style={{
                                padding: '10px 24px',
                                backgroundColor: 'transparent',
                                color: colors.text,
                                border: `1px solid ${colors.border}`,
                                borderRadius: '8px',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            ← Back
                        </button>
                        <button
                            onClick={createCampaign}
                            disabled={creating || !title.trim()}
                            style={{
                                padding: '10px 24px',
                                backgroundColor: colors.success,
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 600,
                                cursor: creating ? 'not-allowed' : 'pointer',
                                opacity: creating ? 0.7 : 1
                            }}
                        >
                            {creating ? 'Creating...' : 'Create Campaign'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
