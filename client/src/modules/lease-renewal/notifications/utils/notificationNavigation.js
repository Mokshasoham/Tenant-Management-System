/**
 * notificationNavigation.js
 * Centralized, safe destination resolver for TMS in-app notifications.
 *
 * Adheres strictly to client route definitions in App.jsx and authenticated roles.
 */

// Whitelist of allowed application route prefixes
export const ALLOWED_INTERNAL_PREFIXES = [
    '/dashboard',
    '/properties',
    '/manager/properties',
    '/bookings',
    '/my-lease',
    '/leases',
    '/maintenance',
    '/payments',
    '/bills',
    '/messages',
    '/notifications',
    '/lease-renewal',
    '/lease-decision',
    '/move-out',
    '/exit-feedback',
    '/tenants',
    '/technicians',
    '/technician',
    '/settings',
    '/profile',
    '/subscription',
    '/saved',
    '/compare',
    '/reviews',
    '/tenant/verification',
    '/manager/verification',
    '/admin/verification',
    '/manager/renewals/dashboard',
    '/manager/lease-renewals/dashboard',
    '/workforce-scheduling',
    '/analytics',
    '/browse'
];

/**
 * Validates whether a path is an allowed internal application route.
 * Rejects external URLs, protocol schemes, directory traversal, etc.
 *
 * @param {string} path
 * @returns {boolean}
 */
export function isAllowedInternalUrl(path) {
    if (!path || typeof path !== 'string') return false;

    const trimmed = path.trim();

    // Must start with '/' and not '//' (protocol-relative URL)
    if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return false;

    // Disallow directory traversal
    if (trimmed.includes('..')) return false;

    // Disallow protocols anywhere (e.g., javascript:, data:, https:)
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return false;

    // Extract pathname portion before query parameters or hash
    const pathname = trimmed.split('?')[0].split('#')[0];

    // Check against allowed prefixes
    return ALLOWED_INTERNAL_PREFIXES.some(prefix =>
        pathname === prefix || pathname.startsWith(prefix + '/')
    );
}

/**
 * Resolves the canonical, role-safe destination for a notification.
 *
 * @param {Object} notification - Notification DTO or model object
 * @param {string} userRole - Authenticated user role ('tenant', 'manager', 'admin', 'technician', etc.)
 * @returns {string} Target internal route (fallback to '/dashboard')
 */
export function resolveNotificationDestination(notification, userRole = '') {
    if (!notification || typeof notification !== 'object') {
        return '/dashboard';
    }

    const normalizedRole = (userRole || '').toLowerCase();
    const isTenant = normalizedRole === 'tenant' || normalizedRole === 'user' || !normalizedRole;
    const isManager = normalizedRole === 'manager' || normalizedRole === 'admin';
    const isTechnician = normalizedRole === 'technician';

    const event = notification.event || '';
    const category = (notification.category || '').toLowerCase();
    const entityType = notification.entityType || notification.relatedModel || '';
    const metadata = notification.metadata || {};

    // Extract potential entity IDs
    const visitId = metadata.visitId || (entityType === 'PropertyVisit' ? (notification.entityId || notification.relatedId) : null);
    const propertyId = metadata.propertyId || (entityType === 'Property' ? (notification.entityId || notification.relatedId) : null);
    const bookingId = metadata.bookingId || (category === 'booking' || entityType === 'Booking' ? (notification.entityId || notification.relatedId) : null);
    const leaseId = metadata.leaseId || (category === 'lease' || category === 'renewal' || entityType === 'Lease' || entityType === 'LeaseRenewal' ? (notification.entityId || notification.relatedId) : null);
    const maintenanceId = metadata.maintenanceId || (category === 'maintenance' || entityType === 'Maintenance' || entityType === 'Ticket' ? (notification.entityId || notification.relatedId) : null);
    const billId = metadata.billId || (category === 'billing' || entityType === 'Bill' ? (notification.entityId || notification.relatedId) : null);

    // 1. PROPERTY VISIT NOTIFICATIONS (Explicit event or visit metadata/path)
    const isVisitNotification =
        entityType === 'PropertyVisit' ||
        event.startsWith('visit_') ||
        (notification.actionUrl && (notification.actionUrl.includes('/visits') || notification.actionUrl.includes('tab=visits')));

    if (isVisitNotification) {
        if (isManager) {
            let visitTab = 'pending';
            if (event === 'visit_reschedule_accepted') {
                visitTab = 'approved';
            } else if (event === 'visit_feedback_submitted' || event === 'visit_not_interested') {
                visitTab = 'completed';
            } else if (event === 'visit_reschedule_declined' || event === 'visit_requested') {
                visitTab = 'pending';
            }

            const query = ['tab=visits', `visitTab=${visitTab}`];
            if (visitId) {
                query.push(`visitId=${encodeURIComponent(visitId)}`);
            }
            return `/dashboard?${query.join('&')}`;
        }

        // Tenant destination: route to property details where active visit & actions live
        if (propertyId) {
            return `/properties/${encodeURIComponent(propertyId)}?action=visit`;
        }

        // Fallback if propertyId not in metadata but raw actionUrl contains valid /properties/:id
        const rawAction = notification.actionUrl || notification.redirectUrl || '';
        if (rawAction && /^\/properties\/[a-zA-Z0-9_-]+/.test(rawAction)) {
            const clean = rawAction.split('?')[0];
            return `${clean}?action=visit`;
        }

        // If no propertyId can be resolved, route tenant to properties or dashboard
        return '/dashboard';
    }

    // 2. VALIDATE & ENFORCE RAW ACTION URL (If provided, non-generic, and safe)
    const rawUrl = notification.actionUrl || notification.redirectUrl || notification.link;
    if (rawUrl && typeof rawUrl === 'string') {
        const trimmedUrl = rawUrl.trim();

        if (isAllowedInternalUrl(trimmedUrl) && trimmedUrl !== '/dashboard') {
            if (isTenant) {
                if (trimmedUrl.startsWith('/leases')) {
                    return trimmedUrl.replace(/^\/leases/, '/my-lease');
                }
                if (trimmedUrl.startsWith('/manager/renewals') || trimmedUrl.startsWith('/manager/lease-renewals')) {
                    return '/lease-renewal';
                }
                if (trimmedUrl.startsWith('/manager/') || trimmedUrl.startsWith('/admin/')) {
                    return category === 'renewal' ? '/lease-renewal' : '/dashboard';
                }
            } else if (isManager) {
                if (trimmedUrl.startsWith('/my-lease')) {
                    return trimmedUrl.replace(/^\/my-lease/, '/leases');
                }
                if (trimmedUrl.startsWith('/lease-renewal')) {
                    return '/manager/renewals/dashboard';
                }
            }
            return trimmedUrl;
        }
    }

    // 3. BOOKINGS (non-visit booking workflows)
    if (category === 'booking' || entityType === 'Booking') {
        if (bookingId) {
            return `/bookings/${encodeURIComponent(bookingId)}`;
        }
        return '/dashboard';
    }

    // 4. LEASES & RENEWALS
    if (category === 'lease' || category === 'renewal' || entityType === 'Lease' || entityType === 'LeaseRenewal') {
        if (isTenant) {
            if (category === 'renewal' || event.includes('renewal')) {
                return '/lease-renewal';
            }
            if (leaseId) {
                return `/my-lease?leaseId=${encodeURIComponent(leaseId)}`;
            }
            return '/my-lease';
        }
        if (isManager) {
            if (category === 'renewal' || event.includes('renewal')) {
                return '/manager/renewals/dashboard';
            }
            if (leaseId) {
                return `/leases?leaseId=${encodeURIComponent(leaseId)}`;
            }
            return '/leases';
        }
    }

    // 5. MAINTENANCE
    if (category === 'maintenance' || entityType === 'Maintenance' || entityType === 'Ticket') {
        if (isTechnician) {
            return maintenanceId ? `/technician/jobs/${encodeURIComponent(maintenanceId)}` : '/technician/jobs';
        }
        return maintenanceId ? `/maintenance/${encodeURIComponent(maintenanceId)}` : '/maintenance';
    }

    // 6. BILLING & PAYMENTS
    if (category === 'billing' || category === 'payments' || entityType === 'Payment' || entityType === 'Bill') {
        if (billId) {
            return `/bills/${encodeURIComponent(billId)}`;
        }
        if (category === 'billing' || entityType === 'Bill') {
            return '/bills';
        }
        return '/payments';
    }

    // 7. MESSAGES
    if (category === 'messages' || event === 'new_message') {
        return isTechnician ? '/technician/messages' : '/messages';
    }

    // 8. VERIFICATION
    if (category === 'verification') {
        if (isTechnician) return '/technician/verification';
        if (normalizedRole === 'admin') return '/admin/verification';
        if (isManager) return '/manager/verification';
        return '/tenant/verification';
    }

    // Default fallback
    return '/dashboard';
}

export default resolveNotificationDestination;
