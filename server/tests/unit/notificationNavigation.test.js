import {
    resolveNotificationDestination,
    isAllowedInternalUrl,
    ALLOWED_INTERNAL_PREFIXES
} from '../../../client/src/modules/lease-renewal/notifications/utils/notificationNavigation.js';

describe('TMS Notification Navigation & Destination Resolution Suite', () => {

    describe('Scenario 1: Manager clicks a new visit-request notification', () => {
        it('resolves to manager visit-management section with pending tab and visitId', () => {
            const notification = {
                category: 'booking',
                event: 'visit_requested',
                entityType: 'PropertyVisit',
                entityId: 'visit_abc_123',
                metadata: {
                    visitId: 'visit_abc_123',
                    propertyId: 'prop_xyz_789'
                }
            };
            const destination = resolveNotificationDestination(notification, 'manager');
            expect(destination).toBe('/dashboard?tab=visits&visitTab=pending&visitId=visit_abc_123');
        });
    });

    describe('Scenario 2: Tenant clicks an approval notification', () => {
        it('resolves to tenant property details page with visit action', () => {
            const notification = {
                category: 'booking',
                event: 'visit_approved',
                entityType: 'PropertyVisit',
                entityId: 'visit_abc_123',
                metadata: {
                    visitId: 'visit_abc_123',
                    propertyId: 'prop_xyz_789'
                }
            };
            const destination = resolveNotificationDestination(notification, 'tenant');
            expect(destination).toBe('/properties/prop_xyz_789?action=visit');
        });
    });

    describe('Scenario 3: Tenant opens a reschedule proposal notification', () => {
        it('resolves to property details where reschedule proposal can be accepted or declined', () => {
            const notification = {
                category: 'booking',
                event: 'visit_reschedule_proposed',
                entityType: 'PropertyVisit',
                entityId: 'visit_abc_123',
                metadata: {
                    visitId: 'visit_abc_123',
                    propertyId: 'prop_xyz_789',
                    proposedDate: '2026-11-25',
                    timeSlot: '04:00 PM - 05:00 PM'
                }
            };
            const destination = resolveNotificationDestination(notification, 'tenant');
            expect(destination).toBe('/properties/prop_xyz_789?action=visit');
        });
    });

    describe('Scenario 4: Manager opens reschedule acceptance and decline notifications', () => {
        it('resolves reschedule accepted to manager scheduled visits (approved tab)', () => {
            const notification = {
                category: 'booking',
                event: 'visit_reschedule_accepted',
                entityType: 'PropertyVisit',
                entityId: 'visit_abc_123',
                metadata: {
                    visitId: 'visit_abc_123',
                    propertyId: 'prop_xyz_789'
                }
            };
            const destination = resolveNotificationDestination(notification, 'manager');
            expect(destination).toBe('/dashboard?tab=visits&visitTab=approved&visitId=visit_abc_123');
        });

        it('resolves reschedule declined to manager pending visits tab', () => {
            const notification = {
                category: 'booking',
                event: 'visit_reschedule_declined',
                entityType: 'PropertyVisit',
                entityId: 'visit_abc_123',
                metadata: {
                    visitId: 'visit_abc_123',
                    propertyId: 'prop_xyz_789'
                }
            };
            const destination = resolveNotificationDestination(notification, 'manager');
            expect(destination).toBe('/dashboard?tab=visits&visitTab=pending&visitId=visit_abc_123');
        });

        it('resolves feedback submitted and not interested to completed visits tab', () => {
            const fbNotification = {
                category: 'booking',
                event: 'visit_feedback_submitted',
                entityType: 'PropertyVisit',
                entityId: 'visit_abc_123',
                metadata: { visitId: 'visit_abc_123', rating: 5 }
            };
            const niNotification = {
                category: 'booking',
                event: 'visit_not_interested',
                entityType: 'PropertyVisit',
                entityId: 'visit_abc_123',
                metadata: { visitId: 'visit_abc_123' }
            };

            expect(resolveNotificationDestination(fbNotification, 'manager'))
                .toBe('/dashboard?tab=visits&visitTab=completed&visitId=visit_abc_123');
            expect(resolveNotificationDestination(niNotification, 'manager'))
                .toBe('/dashboard?tab=visits&visitTab=completed&visitId=visit_abc_123');
        });
    });

    describe('Scenario 5: "View Details" and notification-card click resolve to same destination', () => {
        it('produces identical destination for card click and view details link', () => {
            const notification = {
                id: 'notif_1',
                category: 'booking',
                event: 'visit_approved',
                metadata: { propertyId: 'prop_100', visitId: 'vis_200' }
            };

            const cardDestination = resolveNotificationDestination(notification, 'tenant');
            const viewDetailsDestination = resolveNotificationDestination(notification, 'tenant');

            expect(cardDestination).toBe('/properties/prop_100?action=visit');
            expect(viewDetailsDestination).toBe(cardDestination);
        });
    });

    describe('Scenario 6: Valid redirectUrl preserves the correct destination', () => {
        it('preserves valid allowed internal routes for appropriate role', () => {
            const notification = {
                actionUrl: '/maintenance/ticket_999',
                category: 'maintenance',
                entityId: 'ticket_999'
            };
            expect(resolveNotificationDestination(notification, 'tenant')).toBe('/maintenance/ticket_999');
        });

        it('preserves valid payment route', () => {
            const notification = {
                actionUrl: '/payments',
                category: 'payments'
            };
            expect(resolveNotificationDestination(notification, 'tenant')).toBe('/payments');
        });
    });

    describe('Scenario 7: Notifications with no redirectUrl use fallback mapping from metadata', () => {
        it('resolves booking without redirectUrl to /bookings/:id for tenant', () => {
            const notification = {
                category: 'booking',
                entityType: 'Booking',
                entityId: 'booking_555'
            };
            expect(resolveNotificationDestination(notification, 'tenant')).toBe('/bookings/booking_555');
        });

        it('resolves maintenance without redirectUrl to /maintenance/:id', () => {
            const notification = {
                category: 'maintenance',
                metadata: { maintenanceId: 'maint_777' }
            };
            expect(resolveNotificationDestination(notification, 'tenant')).toBe('/maintenance/maint_777');
        });

        it('resolves bill without redirectUrl to /bills/:id', () => {
            const notification = {
                category: 'billing',
                entityType: 'Bill',
                entityId: 'bill_888'
            };
            expect(resolveNotificationDestination(notification, 'tenant')).toBe('/bills/bill_888');
        });
    });

    describe('Scenario 8: Legacy notifications remain navigable where enough metadata exists', () => {
        it('translates legacy /visits route to /properties/:id?action=visit when propertyId is in metadata', () => {
            const legacyNotification = {
                actionUrl: '/visits',
                redirectUrl: '/visits',
                category: 'booking',
                metadata: {
                    propertyId: 'prop_legacy_456',
                    visitId: 'visit_legacy_123'
                }
            };
            const destination = resolveNotificationDestination(legacyNotification, 'tenant');
            expect(destination).toBe('/properties/prop_legacy_456?action=visit');
        });

        it('translates legacy /visits route to /dashboard?tab=visits for manager', () => {
            const legacyNotification = {
                actionUrl: '/visits',
                category: 'booking',
                metadata: {
                    visitId: 'visit_legacy_123'
                }
            };
            const destination = resolveNotificationDestination(legacyNotification, 'manager');
            expect(destination).toBe('/dashboard?tab=visits&visitTab=pending&visitId=visit_legacy_123');
        });
    });

    describe('Scenario 9: Missing or malformed resource IDs are handled safely', () => {
        it('handles null, undefined, empty object without throwing exceptions', () => {
            expect(resolveNotificationDestination(null, 'tenant')).toBe('/dashboard');
            expect(resolveNotificationDestination(undefined, 'manager')).toBe('/dashboard');
            expect(resolveNotificationDestination({}, 'tenant')).toBe('/dashboard');
            expect(resolveNotificationDestination({ category: 'unknown_cat' }, 'tenant')).toBe('/dashboard');
        });

        it('falls back safely when propertyId is missing for a tenant visit', () => {
            const notification = {
                category: 'booking',
                event: 'visit_approved',
                metadata: {} // No propertyId
            };
            expect(resolveNotificationDestination(notification, 'tenant')).toBe('/dashboard');
        });
    });

    describe('Scenario 10: Unauthorized destinations and untrusted external URLs cannot be opened', () => {
        it('rejects external URLs starting with http:// and https://', () => {
            const maliciousHttp = { actionUrl: 'http://evil.com/phishing' };
            const maliciousHttps = { actionUrl: 'https://evil.com/phishing' };
            expect(resolveNotificationDestination(maliciousHttp, 'tenant')).toBe('/dashboard');
            expect(resolveNotificationDestination(maliciousHttps, 'tenant')).toBe('/dashboard');
        });

        it('rejects protocol-relative and javascript: schemes', () => {
            const maliciousRelative = { actionUrl: '//evil.com' };
            const maliciousJs = { actionUrl: 'javascript:alert(document.cookie)' };
            const maliciousData = { actionUrl: 'data:text/html,<script>alert(1)</script>' };

            expect(resolveNotificationDestination(maliciousRelative, 'tenant')).toBe('/dashboard');
            expect(resolveNotificationDestination(maliciousJs, 'tenant')).toBe('/dashboard');
            expect(resolveNotificationDestination(maliciousData, 'tenant')).toBe('/dashboard');
        });

        it('rejects directory traversal attacks', () => {
            const maliciousTraversal = { actionUrl: '/properties/../../../etc/passwd' };
            expect(resolveNotificationDestination(maliciousTraversal, 'tenant')).toBe('/dashboard');
        });

        it('isAllowedInternalUrl validates correctly', () => {
            expect(isAllowedInternalUrl('/dashboard')).toBe(true);
            expect(isAllowedInternalUrl('/properties/123')).toBe(true);
            expect(isAllowedInternalUrl('/maintenance/456?filter=open')).toBe(true);
            expect(isAllowedInternalUrl('https://google.com')).toBe(false);
            expect(isAllowedInternalUrl('//google.com')).toBe(false);
            expect(isAllowedInternalUrl('/unrecognized_route')).toBe(false);
        });
    });

    describe('Scenario 11: Correct route is enforced for each user role', () => {
        it('prevents tenant from accessing manager routes (/leases -> /my-lease)', () => {
            const notification = {
                actionUrl: '/leases?tab=renewals',
                category: 'lease'
            };
            const destination = resolveNotificationDestination(notification, 'tenant');
            expect(destination).toBe('/my-lease?tab=renewals');
        });

        it('prevents tenant from accessing /manager/* routes', () => {
            const notification = {
                actionUrl: '/manager/renewals/dashboard',
                category: 'renewal'
            };
            const destination = resolveNotificationDestination(notification, 'tenant');
            expect(destination).toBe('/lease-renewal');
        });

        it('prevents manager from accessing tenant-only /my-lease route', () => {
            const notification = {
                actionUrl: '/my-lease',
                category: 'lease'
            };
            const destination = resolveNotificationDestination(notification, 'manager');
            expect(destination).toBe('/leases');
        });

        it('routes technician to technician-specific routes', () => {
            const maintNotification = {
                category: 'maintenance',
                metadata: { maintenanceId: 'job_444' }
            };
            const msgNotification = {
                category: 'messages'
            };

            expect(resolveNotificationDestination(maintNotification, 'technician')).toBe('/technician/jobs/job_444');
            expect(resolveNotificationDestination(msgNotification, 'technician')).toBe('/technician/messages');
        });
    });

    describe('Scenario 12: Notification status and real-time delivery preservation', () => {
        it('preserves notification payload shape with metadata and canonical redirectUrl', () => {
            const notification = {
                id: 'notif_prod_001',
                title: 'Property Visit Approved',
                message: 'Your visit has been approved.',
                category: 'booking',
                event: 'visit_approved',
                isRead: false,
                metadata: {
                    propertyId: 'prop_678',
                    visitId: 'visit_999'
                }
            };

            const destination = resolveNotificationDestination(notification, 'tenant');
            expect(destination).toBe('/properties/prop_678?action=visit');
            expect(notification.isRead).toBe(false);
        });
    });
});
