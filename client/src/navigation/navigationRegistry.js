/**
 * Centralized Route Registry for the Enterprise Action Center Navigation System.
 * Maps primary resources and modules to route paths and initial UI state.
 */

export const ROUTES = {
  dashboard: () => ({
    path: '/dashboard',
    state: {}
  }),

  bills: (billId) => ({
    path: billId ? `/bills/${billId}` : '/bills',
    state: { targetEntityId: billId, openDetails: true, highlight: true }
  }),

  payNow: (paymentId) => ({
    path: '/pay-now',
    state: { paymentId }
  }),

  booking: (bookingId) => ({
    path: bookingId ? `/bookings/${bookingId}` : '/browse',
    state: { bookingId }
  }),

  lease: (role) => {
    const normalizedRole = (role || '').toLowerCase();
    const isManagerOrAdmin = normalizedRole === 'manager' || normalizedRole === 'admin';
    return {
      path: isManagerOrAdmin ? '/leases' : '/my-lease',
      state: {}
    };
  },

  renewal: (event) => ({
    path: event === 'approved' ? '/lease-history' : '/lease-renewal',
    state: {}
  }),

  maintenance: (maintId) => ({
    path: maintId ? `/maintenance/${maintId}` : '/maintenance',
    state: { targetEntityId: maintId, highlight: true }
  }),

  inspection: (inspectionId) => ({
    path: inspectionId ? `/inspection/${inspectionId}` : '/dashboard',
    state: { inspectionId }
  }),

  depositSettlement: (settlementId) => ({
    path: settlementId ? `/deposit-settlement/${settlementId}` : '/dashboard',
    state: { settlementId }
  }),

  moveOut: () => ({
    path: '/move-out',
    state: {}
  }),

  messages: (recipientId) => ({
    path: '/messages',
    state: { recipientId }
  }),

  profile: () => ({
    path: '/profile',
    state: {}
  }),

  settings: () => ({
    path: '/settings',
    state: {}
  })
};
