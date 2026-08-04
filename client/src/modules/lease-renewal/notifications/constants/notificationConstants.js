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

export const CATEGORY_LABELS = Object.freeze({
    all: 'All Categories',
    renewal: 'Lease Renewal',
    lease: 'Lease Agreements',
    booking: 'Bookings',
    billing: 'Billing & Invoices',
    payments: 'Payments',
    maintenance: 'Maintenance Requests',
    'move-out': 'Move Out',
    inspection: 'Inspections',
    deposit_settlement: 'Deposit Settlement',
    documents: 'Documents',
    messages: 'Messages',
    announcements: 'Announcements',
    security: 'Security Alert',
    system: 'System Updates',
});
