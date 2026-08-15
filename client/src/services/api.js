import apiClient from './apiClient';

export const authService = {
  register: (data) => apiClient.post('/auth/register', data),
  login: (data) => apiClient.post('/auth/login', data),
  getCurrentUser: () => apiClient.get('/auth/profile'),
  updateProfile: (data) => apiClient.put('/auth/profile', data),
  changePassword: (data) => apiClient.post('/auth/change-password', data),
  logout: () => apiClient.post('/auth/logout'),
  forgotPassword: (data) => apiClient.post('/auth/forgot-password', data),
  resetPassword: (token, data) => apiClient.post(`/auth/reset-password/${token}`, data),
  verifyEmail: (token) => apiClient.get(`/auth/verify-email/${token}`),
  googleAuth: (idToken) => apiClient.post('/auth/google', { idToken }),
  verify2FALogin: (data) => apiClient.post('/auth/login/2fa', data),
  setup2FA: () => apiClient.post('/auth/2fa/setup'),
  verifyAndEnable2FA: (data) => apiClient.post('/auth/2fa/verify', data),
};

export const userService = {
  getAllUsers: (params) => apiClient.get('/users/admin/all', { params }),
  getUserById: (id) => apiClient.get(`/users/${id}`),
  createUser: (data) => apiClient.post('/users/admin/create', data),
  updateUser: (id, data) => apiClient.put(`/users/admin/${id}`, data),
  deleteUser: (id) => apiClient.delete(`/users/admin/${id}`),
  assignRole: (id, role) => apiClient.post(`/users/admin/${id}/role`, { role }),
  toggleUserStatus: (id) => apiClient.post(`/users/admin/${id}/toggle-status`),
  getDashboardStats: () => apiClient.get('/users/admin/stats'),
  getPeopleSummary: () => apiClient.get('/users/admin/people-summary'),
  getPeopleMapData: () => apiClient.get('/users/admin/people-map'),
  getPeople: (params) => apiClient.get('/users/admin/people', { params }),
  getAvailableTechnicians: (params) => apiClient.get('/users/technicians/available', { params }),
  uploadKycDocuments: (formData) => apiClient.post('/users/kyc', formData),
};

export const tenantService = {
  getAllTenants: (params) => apiClient.get('/tenants', { params }),
  getTenantById: (id) => apiClient.get(`/tenants/${id}`),
  createTenant: (data) => apiClient.post('/tenants', data),
  updateTenant: (id, data) => apiClient.put(`/tenants/${id}`, data),
  deleteTenant: (id) => apiClient.delete(`/tenants/${id}`),
  changeTenantStatus: (id, status) =>
    apiClient.post(`/tenants/${id}/status`, { status }),
  getTenantStats: () => apiClient.get('/tenants/stats'),
};

export const propertyService = {
  getAllProperties: (params) => apiClient.get('/properties', { params }),
  getPropertyById: (id) => apiClient.get(`/properties/${id}`),
  createProperty: (data) => apiClient.post('/properties', data),
  updateProperty: (id, data) => apiClient.put(`/properties/${id}`, data),
  deleteProperty: (id) => apiClient.delete(`/properties/${id}`),
  changePropertyStatus: (id, status) =>
    apiClient.post(`/properties/${id}/status`, { status }),
  getPropertyStats: () => apiClient.get('/properties/stats'),
  saveProperty: (id) => apiClient.post(`/properties/${id}/save`),
  unsaveProperty: (id) => apiClient.delete(`/properties/${id}/save`),
  getAvailability: (id) => apiClient.get(`/properties/${id}/availability`),
  getSimilarProperties: (id) => apiClient.get(`/properties/${id}/similar`),
  uploadPropertyMedia: (id, formData) => apiClient.post(`/properties/${id}/media`, formData, { timeout: 120000 }),
};

export const leaseService = {
  getAllLeases: (params) => apiClient.get('/leases', { params }),
  getLeaseById: (id) => apiClient.get(`/leases/${id}`),
  getMyLease: () => apiClient.get('/leases/my-lease'),
  createLease: (data) => apiClient.post('/leases', data),
  updateLease: (id, data) => apiClient.put(`/leases/${id}`, data),
  terminateLease: (id) => apiClient.post(`/leases/${id}/terminate`),
  uploadDocument: (id, data) => apiClient.post(`/leases/${id}/documents`, data),
  getLeaseStats: () => apiClient.get('/leases/stats'),
  signLease: (id, data) => apiClient.post(`/leases/${id}/sign`, data),
  getLeaseChecklist: (id) => apiClient.get(`/leases/${id}/checklist?t=${Date.now()}`),
};

export const paymentService = {
  getAllPayments: (params) => apiClient.get('/payments', { params }),
  getMyPayments: (params) => apiClient.get('/payments/my-payments', { params }),
  getPaymentById: (id) => apiClient.get(`/payments/${id}`),
  createPayment: (data) => apiClient.post('/payments', data),
  recordPayment: (id, data) => apiClient.post(`/payments/${id}/record`, data),
  updatePaymentStatus: (id, status) =>
    apiClient.put(`/payments/${id}/status`, { status }),
  getPaymentStats: () => apiClient.get('/payments/stats'),
  getPaymentInvoice: (id) => apiClient.get(`/payments/${id}/invoice`),
  getLegacyPayments: (params) => {
    // Branch based on role is handled in controller query strings, 
    // but we support custom parameters like ?bill=null
    return apiClient.get('/payments', { params: { ...params, bill: 'null' } });
  },
  getMyLegacyPayments: (params) => {
    return apiClient.get('/payments/my-payments', { params: { ...params, bill: 'null' } });
  }
};

export const billService = {
  getAllBills: (params) => apiClient.get('/bills', { params }),
  getMyBills: () => apiClient.get('/bills/my-bills'),
  getBillById: (id) => apiClient.get(`/bills/${id}`),
  downloadBillInvoice: (id) => apiClient.get(`/bills/${id}/download`),
  createBill: (data) => apiClient.post('/bills', data),
  recordBillPayment: (id, data) => apiClient.post(`/bills/${id}/record-payment`, data),
  voidBill: (id, data) => apiClient.post(`/bills/${id}/void`, data),
  getBillAnalytics: () => apiClient.get('/bills/analytics/stats'),
  exportBillsCSV: (params) => apiClient.get('/bills/export/csv', { params, responseType: 'blob' }),
};

export const messageService = {
  sendMessage: (data) => apiClient.post('/messages', data),
  getConversations: () => apiClient.get('/messages/conversations'),
  getAvailableUsers: () => apiClient.get('/messages/available-users'),
  getMessages: (otherUserId) => apiClient.get(`/messages/${otherUserId}`),
  markAsRead: (senderId) => apiClient.put(`/messages/read/${senderId}`),
  uploadAttachment: (formData) => apiClient.post('/messages/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  searchMessages: (query) => apiClient.get('/messages/search', { params: { query } }),
  deleteMessage: (messageId) => apiClient.delete(`/messages/${messageId}`),
};

export const maintenanceService = {
  getAllRequests: (params) => apiClient.get('/maintenance', { params }),
  getRequestById: (id) => apiClient.get(`/maintenance/${id}`),
  getTimeline: (id) => apiClient.get(`/maintenance/${id}/timeline`),
  getComments: (id) => apiClient.get(`/maintenance/${id}/comments`),
  createRequest: (data) => apiClient.post('/maintenance', data),
  uploadAttachments: (id, formData) => apiClient.post(`/maintenance/${id}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteAttachment: (id, attachmentUrl) => apiClient.delete(`/maintenance/${id}/attachments`, { data: { attachmentUrl } }),
  updateStatus: (id, status, note) => apiClient.put(`/maintenance/${id}/status`, { status, note }),
  updateRequest: (id, data) => apiClient.put(`/maintenance/${id}`, data),
  addNote: (id, text, attachmentUrl) => apiClient.post(`/maintenance/${id}/notes`, { text, attachmentUrl }),
  addComment: (id, text, attachmentUrl) => apiClient.post(`/maintenance/${id}/comments`, { text, attachmentUrl }),
  submitRating: (id, payload, feedbackText) => {
    const data = typeof payload === 'object' ? payload : { rating: payload, score: payload, comment: feedbackText, feedback: feedbackText };
    return apiClient.post(`/maintenance/${id}/feedback`, data);
  },
  submitFeedback: (id, data) => apiClient.post(`/maintenance/${id}/feedback`, data),
  deleteRequest: (id) => apiClient.delete(`/maintenance/${id}`),
  getStats: () => apiClient.get('/maintenance/stats'),
  getManagerDashboard: (params) => apiClient.get('/maintenance/manager-dashboard', { params }),
  addInternalNote: (id, text, attachmentUrl) => apiClient.post(`/maintenance/${id}/internal-notes`, { text, attachmentUrl }),
  escalateTicket: (id, reason) => apiClient.post(`/maintenance/${id}/escalate`, { reason }),
  mergeTicket: (id, targetId) => apiClient.post(`/maintenance/${id}/merge`, { targetId }),
  updateCosts: (id, costData) => apiClient.put(`/maintenance/${id}/costs`, costData),
  updateChecklist: (id, checklistData) => apiClient.put(`/maintenance/${id}/checklist`, checklistData),
  assignTechnician: (id, technicianId, scheduledDate, scheduledTimeSlot) => apiClient.put(`/maintenance/${id}/assign`, { technicianId, scheduledDate, scheduledTimeSlot }),
  getAuditTrail: (id) => apiClient.get(`/maintenance/${id}/audit-trail`),
  getRelatedTickets: (id) => apiClient.get(`/maintenance/${id}/related`),
  uploadPhasePhotos: (id, phase, formData) => apiClient.post(`/maintenance/${id}/photos/${phase}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deletePhasePhoto: (id, phase, photoUrl) => apiClient.delete(`/maintenance/${id}/photos/${phase}`, { data: { photoUrl } }),
  saveSignature: (id, data) => apiClient.post(`/maintenance/${id}/signature`, data),
  uploadVoiceNote: (id, formData) => apiClient.post(`/maintenance/${id}/voice-notes`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

export const technicianService = {
  getAllTechnicians: (params) => apiClient.get('/technicians', { params }),
  getTechnicianById: (id) => apiClient.get(`/technicians/${id}`),
  createTechnician: (data) => apiClient.post('/technicians', data),
  updateTechnician: (id, data) => apiClient.put(`/technicians/${id}`, data),
  deleteTechnician: (id) => apiClient.delete(`/technicians/${id}`),
  getWorkload: (id) => apiClient.get(`/technicians/${id}/workload`),
  getPerformance: (id) => apiClient.get(`/technicians/${id}/performance`),
  getAvailableTechnicians: (params) => apiClient.get('/technicians/available', { params }),
  searchTechnicians: (params) => apiClient.get('/technicians/search', { params }),
};

export const workforceSchedulingService = {
  getScheduleCalendar: (params) => apiClient.get('/workforce/calendar', { params }),
  createShift: (data) => apiClient.post('/workforce/shifts', data),
  detectConflicts: (data) => apiClient.post('/workforce/conflicts', data),
  autoSuggestTechnician: (ticketId) => apiClient.get(`/workforce/auto-suggest/${ticketId}`),
  dispatchTicket: (data) => apiClient.post('/workforce/dispatch', data),
  requestLeave: (data) => apiClient.post('/workforce/leave', data),
  approveLeave: (id, managerNote) => apiClient.put(`/workforce/leave/${id}/approve`, { managerNote }),
};

export const notificationService = {
  getMyNotifications: (params) => apiClient.get('/notifications', { params }),
  getUnreadCount: () => apiClient.get('/notifications/unread-count'),
  markRead: (id) => apiClient.put(`/notifications/${id}/read`),
  markAllRead: () => apiClient.put('/notifications/mark-all-read'),
  deleteNotification: (id) => apiClient.delete(`/notifications/${id}`),
  
  // --- Versioned V1 Notification endpoints ---
  getV1Notifications: (params) => apiClient.get('/v1/notifications', { params }),
  getCalendarAgenda: (params) => apiClient.get('/v1/notifications/calendar', { params }),
  getEventStats: () => apiClient.get('/v1/notifications/stats'),
  archiveNotification: (id) => apiClient.put(`/v1/notifications/${id}/archive`),
  markV1Read: (id) => apiClient.put(`/v1/notifications/${id}/read`),
  markAllV1Read: () => apiClient.put('/v1/notifications/read-all'),
  deleteV1Notification: (id) => apiClient.delete(`/v1/notifications/${id}`),
};

export const analyticsService = {
  getRevenue: (months) => apiClient.get('/analytics/revenue', { params: { months } }),
  getOccupancy: () => apiClient.get('/analytics/occupancy'),
  getCollectionRate: () => apiClient.get('/analytics/collection-rate'),
  getSummary: () => apiClient.get('/analytics/summary'),
  getTopProperties: () => apiClient.get('/analytics/top-properties'),
};

export const bookingService = {
  requestBooking: (data) => apiClient.post('/bookings/request', data),
  getMyBookings: () => apiClient.get('/bookings/my'),
  getManagerBookings: () => apiClient.get('/bookings/manager'),
  getBookingById: (id) => apiClient.get(`/bookings/${id}`),
  updateBookingStatus: (id, data) => apiClient.put(`/bookings/${id}/status`, data),
  cancelBooking: (id, data) => apiClient.post('/bookings/' + id + '/cancel', data),
  // Razorpay payment flow
  createRazorpayOrder: (data) => apiClient.post('/bookings/razorpay/create-order', data),
  verifyRazorpayPayment: (data) => apiClient.post('/bookings/razorpay/verify', data),
  // Manager approval
  approveBooking: (id, note) => apiClient.put(`/bookings/${id}/approve`, { note }),
  rejectBooking: (id, note) => apiClient.put(`/bookings/${id}/reject`, { note }),
  // Receipt download
  getBookingReceipt: (id) => apiClient.get(`/bookings/${id}/receipt`),
  // Mock Demo flow
  processMockPayment: (data) => apiClient.post('/bookings/process-mock-payment', data),
};

export const reviewService = {
  getPropertyReviews: (propertyId) => apiClient.get(`/reviews/property/${propertyId}`),
  createReview: (data) => apiClient.post('/reviews', data),
  updateReview: (id, data) => apiClient.put(`/reviews/${id}`, data),
  deleteReview: (id) => apiClient.delete(`/reviews/${id}`),
  replyToReview: (id, text) => apiClient.put(`/reviews/${id}/reply`, { text }),
  markHelpful: (id) => apiClient.post(`/reviews/${id}/helpful`),
};

export const offerService = {
  createOffer: (data) => apiClient.post('/offers', data),
  getPropertyOffers: (propertyId) => apiClient.get(`/offers/property/${propertyId}`),
  getMyOffers: () => apiClient.get('/offers/my'),
  respondToOffer: (id, action, data) =>
    apiClient.put(`/offers/${id}/respond`, { action, ...data }),
};

export const payoutService = {
  requestPayout: (data) => apiClient.post('/payouts/request', data),
  getAllPayouts: (status) => apiClient.get('/payouts', { params: { status } }),
  approvePayout: (id) => apiClient.put(`/payouts/${id}/approve`),
  rejectPayout: (id, note) => apiClient.put(`/payouts/${id}/reject`, { note }),
};

export const subscriptionService = {
  getMySubscription: () => apiClient.get('/subscriptions/my'),
  createCheckoutSession: (data) => apiClient.post('/subscriptions/checkout', data),
  cancelSubscription: () => apiClient.post('/subscriptions/cancel'),
};

export const visitService = {
  requestVisit: (data) => apiClient.post('/visits', data),
  getMyVisits: () => apiClient.get('/visits/my-visits'),
  getManagerVisits: () => apiClient.get('/visits/manager-visits'),
  updateVisitStatus: (id, data) => apiClient.patch(`/visits/${id}/status`, data),
  submitFeedback: (id, data) => apiClient.post(`/visits/${id}/feedback`, data),
  setNotInterested: (id) => apiClient.post(`/visits/${id}/not-interested`),
};

export const assignmentEngineService = {
  getRecommendations: (ticketId, params = {}) => apiClient.get(`/v1/assignments/recommendations/${ticketId}`, { params }),
  getRecommendationHistory: (ticketId) => apiClient.get(`/v1/assignments/recommendations/${ticketId}/history`),
  saveDecision: (data, idempotencyKey) => apiClient.post('/v1/assignments/decision', data, {
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}
  }),
  simulate: (data) => apiClient.post('/v1/assignments/simulate', data),
  optimizeRoute: (data) => apiClient.post('/v1/assignments/route-optimize', data),
  getAnalytics: (params = {}) => apiClient.get('/v1/assignments/analytics', { params }),
  getConfig: () => apiClient.get('/v1/assignments/config'),
  updateConfig: (weights) => apiClient.put('/v1/assignments/config', { weights })
};

export const technicianPortalService = {
  getMyProfile: () => apiClient.get('/technicians/me'),
  updateMyProfile: (data) => apiClient.patch('/technicians/me', data),
  getMyJobs: (params) => apiClient.get('/technicians/me/jobs', { params }),
  getMySchedule: (params) => apiClient.get('/technicians/me/schedule', { params }),
  updateMyAvailability: (availabilityStatus, liveStatus) => apiClient.patch('/technicians/me/availability', { availabilityStatus, liveStatus }),
  getMyKPIs: () => apiClient.get('/technicians/me/kpis'),
  activateAccount: (token, password) => apiClient.post(`/auth/activate-technician/${token}`, { password }),
  checkInJob: (id, coords) => apiClient.post(`/technicians/me/jobs/${id}/check-in`, coords),
  checkOutJob: (id, data) => apiClient.post(`/technicians/me/jobs/${id}/check-out`, data),
  updateLocationTelemetry: (coords) => apiClient.post('/technicians/me/location', coords),
  lookupPropertyByQR: (qrCode) => apiClient.get('/technicians/me/property-lookup', { params: { qrCode } }),
  searchTechnicianData: (q) => apiClient.get('/maintenance/technician/search', { params: { q } }),
};

export const verificationService = {
  getVerifications: (params) => apiClient.get('/verifications', { params }),
  getVerificationById: (id) => apiClient.get(`/verifications/${id}`),
  initiateVerification: (data) => apiClient.post('/verifications', data),
  updateDraft: (id, data) => apiClient.put(`/verifications/${id}`, data),
  submitVerification: (id) => apiClient.post(`/verifications/${id}/submit`),
  resubmitVerification: (id, documents) => apiClient.post(`/verifications/${id}/resubmit`, { documents }),
  uploadDocument: (id, data) => apiClient.post(`/verifications/${id}/documents`, data),
  reviewVerification: (id, data) => apiClient.post(`/verifications/${id}/review`, data),
  approveVerification: (id, data) => apiClient.post(`/verifications/${id}/approve`, data),
  rejectVerification: (id, data) => apiClient.post(`/verifications/${id}/reject`, data),
  getHistory: (entityType, entityId) => apiClient.get(`/verifications/history/${entityType}/${entityId}`),
  getWidget: (profile, entityId) => apiClient.get(`/verifications/widget/${profile}${entityId ? `/${entityId}` : ''}`),
  getTemplates: () => apiClient.get('/verifications/templates'),
  getWorkflows: () => apiClient.get('/verifications/workflows'),
  startIdentityVerification: (id, data) => apiClient.post(`/verifications/${id}/identity/start`, data),
  verifyIdentity: (id, data) => apiClient.post(`/verifications/${id}/identity/verify`, data),
  getIdentityStatus: (id) => apiClient.get(`/verifications/${id}/identity/status`),
  retryIdentityVerification: (id, data) => apiClient.post(`/verifications/${id}/identity/retry`, data),
  unlockIdentity: (id, data) => apiClient.post(`/verifications/${id}/identity/unlock`, data),
  startPropertyVerification: (id, data) => apiClient.post(`/verifications/${id}/property/start`, data),
  uploadPropertyDocument: (id, data) => apiClient.post(`/verifications/${id}/property/documents`, data),
  verifyProperty: (id, data) => apiClient.post(`/verifications/${id}/property/verify`, data),
  getPropertyVerificationStatus: (id) => apiClient.get(`/verifications/${id}/property/status`),
  retryPropertyVerification: (id, data) => apiClient.post(`/verifications/${id}/property/retry`, data),
  unlockPropertyVerification: (id, data) => apiClient.post(`/verifications/${id}/property/unlock`, data),
  connectDigiLocker: (id) => apiClient.get(`/verifications/${id}/digilocker/connect`),
  getDigiLockerStatus: (id) => apiClient.get(`/verifications/${id}/digilocker/status`),
  getDigiLockerDocuments: (id) => apiClient.get(`/verifications/${id}/digilocker/documents`),
  importDigiLockerDocument: (id, data) => apiClient.post(`/verifications/${id}/digilocker/import`, data),
  disconnectDigiLocker: (id) => apiClient.post(`/verifications/${id}/digilocker/disconnect`),
  grantBiometricConsent: (id) => apiClient.post(`/verifications/${id}/facial/consent`),
  revokeBiometricConsent: (id) => apiClient.post(`/verifications/${id}/facial/revoke-consent`),
  verifyFacialBiometrics: (id, data) => apiClient.post(`/verifications/${id}/facial/verify`, data),
  getFacialStatus: (id) => apiClient.get(`/verifications/${id}/facial/status`),
  retryFacialVerification: (id, data) => apiClient.post(`/verifications/${id}/facial/retry`, data),
  unlockFacialVerification: (id, data) => apiClient.post(`/verifications/${id}/facial/unlock`, data),
  grantVideoKycConsent: (id, data) => apiClient.post(`/verifications/${id}/video-kyc/consent`, data),
  revokeVideoKycConsent: (id) => apiClient.post(`/verifications/${id}/video-kyc/revoke-consent`),
  createVideoKycSession: (id, data) => apiClient.post(`/verifications/${id}/video-kyc/session`, data),
  assignVideoKycAgent: (id, data) => apiClient.post(`/verifications/${id}/video-kyc/assign`, data),
  submitVideoKycEvaluation: (id, data) => apiClient.post(`/verifications/${id}/video-kyc/evaluate`, data),
  getVideoKycStatus: (id) => apiClient.get(`/verifications/${id}/video-kyc/status`),
  unlockVideoKyc: (id, data) => apiClient.post(`/verifications/${id}/video-kyc/unlock`, data),
  evaluateVerificationFraud: (id, data, headers = {}) => apiClient.post(`/verifications/${id}/fraud/evaluate`, data, { headers }),
  getFraudStatus: (id) => apiClient.get(`/verifications/${id}/fraud/status`),
  confirmFraud: (id, data, headers = {}) => apiClient.post(`/verifications/${id}/fraud/confirm`, data, { headers }),
  dismissFraud: (id, data, headers = {}) => apiClient.post(`/verifications/${id}/fraud/dismiss`, data, { headers }),
  unlockFraudDetection: (id, data) => apiClient.post(`/verifications/${id}/fraud/unlock`, data),
  screenSanction: (id, data, headers = {}) => apiClient.post(`/verifications/${id}/sanction/screen`, data, { headers }),
  getSanctionStatus: (id) => apiClient.get(`/verifications/${id}/sanction/status`),
  confirmSanctionMatch: (id, data, headers = {}) => apiClient.post(`/verifications/${id}/sanction/confirm`, data, { headers }),
  dismissSanctionMatch: (id, data, headers = {}) => apiClient.post(`/verifications/${id}/sanction/dismiss`, data, { headers }),
  unlockSanctionScreening: (id, data) => apiClient.post(`/verifications/${id}/sanction/unlock`, data),
  synthesizeEvidence: (id, data, headers = {}) => apiClient.post(`/verifications/${id}/fusion/synthesize`, data, { headers }),
  getFusionStatus: (id) => apiClient.get(`/verifications/${id}/fusion/status`),
  confirmFusionRecommendation: (id, data, headers = {}) => apiClient.post(`/verifications/${id}/fusion/confirm`, data, { headers }),
  overrideFusionRecommendation: (id, data, headers = {}) => apiClient.post(`/verifications/${id}/fusion/override`, data, { headers }),
  unlockFusion: (id, data) => apiClient.post(`/verifications/${id}/fusion/unlock`, data),
  getComplianceLedger: (id) => apiClient.get(`/verifications/${id}/compliance/ledger`),
  verifyLedgerIntegrity: (id) => apiClient.get(`/verifications/${id}/compliance/verify`),
  triggerRecertification: (id, data) => apiClient.post(`/verifications/${id}/compliance/recertify`, data),
  downloadCompliancePackage: (id, params = {}) => apiClient.get(`/verifications/${id}/compliance/export`, { params }),
};

export default apiClient;

