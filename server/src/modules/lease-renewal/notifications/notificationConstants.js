export const NOTIFICATION_CATEGORIES = Object.freeze({
    RENEWAL: 'renewal',
    LEASE: 'lease',
    BOOKING: 'booking',
    BILLING: 'billing',
    PAYMENTS: 'payments',
    MAINTENANCE: 'maintenance',
    MOVE_OUT: 'move-out',
    INSPECTION: 'inspection',
    DEPOSIT_SETTLEMENT: 'deposit_settlement',
    DOCUMENTS: 'documents',
    MESSAGES: 'messages',
    ANNOUNCEMENTS: 'announcements',
    SECURITY: 'security',
    SYSTEM: 'system',
});

export const NOTIFICATION_PRIORITIES = Object.freeze({
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
});

export const NOTIFICATION_SEVERITIES = Object.freeze({
    INFORMATION: 'information',
    SUCCESS: 'success',
    WARNING: 'warning',
    CRITICAL: 'critical',
});
