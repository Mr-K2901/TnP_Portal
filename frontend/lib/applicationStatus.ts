/**
 * Application Status Types
 * 
 * Centralized type definitions for application status system.
 * This matches the backend state machine.
 */

// All possible application statuses
export type ApplicationStatus =
    | 'APPLIED'
    | 'SELECTED'
    | 'IN_PROCESS'
    | 'INTERVIEW_SCHEDULED'
    | 'SHORTLISTED'
    | 'OFFER_RELEASED'
    | 'PLACED'
    | 'OFFER_DECLINED'
    | 'WITHDRAWN'
    | 'REJECTED';

// Terminal states - no further actions possible
export const TERMINAL_STATES: ApplicationStatus[] = [
    'PLACED',
    'OFFER_DECLINED',
    'WITHDRAWN',
    'REJECTED'
];

// Status flow for display purposes
export const STATUS_FLOW: ApplicationStatus[] = [
    'APPLIED',
    'SELECTED',
    'IN_PROCESS',
    'INTERVIEW_SCHEDULED',
    'SHORTLISTED',
    'OFFER_RELEASED',
    'PLACED'
];

// Human-readable labels
export const STATUS_LABELS: Record<ApplicationStatus, string> = {
    'APPLIED': 'Applied',
    'SELECTED': 'Selected',
    'IN_PROCESS': 'In Process',
    'INTERVIEW_SCHEDULED': 'Interview Scheduled',
    'SHORTLISTED': 'Shortlisted',
    'OFFER_RELEASED': 'Offer Released',
    'PLACED': 'Placed',
    'OFFER_DECLINED': 'Offer Declined',
    'WITHDRAWN': 'Withdrawn',
    'REJECTED': 'Rejected',
};

// Status colors for badges
export interface StatusStyle {
    bg: string;
    color: string;
    label: string;
}

export const getStatusStyle = (status: ApplicationStatus, colors: {
    success: string;
    warning: string;
    danger: string;
    primary: string;
    info: string;
    secondary: string;
    textMuted: string;
}): StatusStyle => {
    const styles: Record<ApplicationStatus, StatusStyle> = {
        'APPLIED': {
            bg: colors.info + '20',
            color: colors.info,
            label: 'Applied'
        },
        'SELECTED': {
            bg: colors.primary + '20',
            color: colors.primary,
            label: 'Selected'
        },
        'IN_PROCESS': {
            bg: colors.warning + '20',
            color: colors.warning,
            label: 'In Process'
        },
        'INTERVIEW_SCHEDULED': {
            bg: colors.warning + '30',
            color: colors.warning,
            label: 'Interview Scheduled'
        },
        'SHORTLISTED': {
            bg: colors.success + '20',
            color: colors.success,
            label: 'Shortlisted'
        },
        'OFFER_RELEASED': {
            bg: colors.success + '30',
            color: colors.success,
            label: '🎉 Offer Released'
        },
        'PLACED': {
            bg: colors.success + '40',
            color: colors.success,
            label: '✅ Placed'
        },
        'OFFER_DECLINED': {
            bg: colors.secondary + '20',
            color: colors.textMuted,
            label: 'Offer Declined'
        },
        'WITHDRAWN': {
            bg: colors.secondary + '20',
            color: colors.textMuted,
            label: 'Withdrawn'
        },
        'REJECTED': {
            bg: colors.danger + '20',
            color: colors.danger,
            label: 'Rejected'
        },
    };

    return styles[status] || {
        bg: colors.secondary + '20',
        color: colors.textMuted,
        label: status
    };
};

// Admin actions available for each status
export const ADMIN_ACTIONS: Record<string, { next: ApplicationStatus; label: string; color: 'primary' | 'success' | 'danger' | 'warning' }[]> = {
    'APPLIED': [
        { next: 'SELECTED', label: 'Select', color: 'primary' },
        { next: 'REJECTED', label: 'Reject', color: 'danger' },
    ],
    'SELECTED': [
        { next: 'IN_PROCESS', label: 'Start Process', color: 'primary' },
        { next: 'REJECTED', label: 'Reject', color: 'danger' },
    ],
    'IN_PROCESS': [
        { next: 'INTERVIEW_SCHEDULED', label: 'Schedule Interview', color: 'primary' },
        { next: 'REJECTED', label: 'Reject', color: 'danger' },
    ],
    'INTERVIEW_SCHEDULED': [
        { next: 'SHORTLISTED', label: 'Shortlist', color: 'success' },
        { next: 'REJECTED', label: 'Reject', color: 'danger' },
    ],
    'SHORTLISTED': [
        { next: 'OFFER_RELEASED', label: 'Release Offer', color: 'success' },
        { next: 'REJECTED', label: 'Reject', color: 'danger' },
    ],
    'OFFER_RELEASED': [
        { next: 'REJECTED', label: 'Revoke Offer', color: 'danger' },
    ],
};

// Student actions
export const STUDENT_ACTIONS: Record<string, { next: ApplicationStatus; label: string; color: 'primary' | 'success' | 'danger' }[]> = {
    'APPLIED': [
        { next: 'WITHDRAWN', label: 'Withdraw', color: 'danger' },
    ],
    'OFFER_RELEASED': [
        { next: 'PLACED', label: 'Accept Offer', color: 'success' },
        { next: 'OFFER_DECLINED', label: 'Decline Offer', color: 'danger' },
    ],
};

// API action endpoint mapping
export const ACTION_ENDPOINTS: Record<ApplicationStatus, string> = {
    'APPLIED': '', // Initial state, no action
    'SELECTED': 'select',
    'IN_PROCESS': 'start-process',
    'INTERVIEW_SCHEDULED': 'schedule-interview',
    'SHORTLISTED': 'shortlist',
    'OFFER_RELEASED': 'release-offer',
    'PLACED': 'accept-offer',
    'OFFER_DECLINED': 'decline-offer',
    'WITHDRAWN': 'withdraw', // Uses existing withdraw endpoint
    'REJECTED': 'reject',
};
