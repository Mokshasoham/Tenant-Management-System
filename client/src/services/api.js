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
  // New SaaS features
  saveProperty: (id) => apiClient.post(`/properties/${id}/save`),
  getAvailability: (id) => apiClient.get(`/properties/${id}/availability`),
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
};

export const paymentService = {
  getAllPayments: (params) => apiClient.get('/payments', { params }),
  getMyPayments: () => apiClient.get('/payments/my-payments'),
  getPaymentById: (id) => apiClient.get(`/payments/${id}`),
  createPayment: (data) => apiClient.post('/payments', data),
  recordPayment: (id, data) => apiClient.post(`/payments/${id}/record`, data),
  updatePaymentStatus: (id, status) =>
    apiClient.put(`/payments/${id}/status`, { status }),
  getPaymentStats: () => apiClient.get('/payments/stats'),
};

export const messageService = {
  sendMessage: (data) => apiClient.post('/messages', data),
  getConversations: () => apiClient.get('/messages/conversations'),
  getAvailableUsers: () => apiClient.get('/messages/available-users'),
  getMessages: (otherUserId) => apiClient.get(`/messages/${otherUserId}`),
  markAsRead: (senderId) => apiClient.put(`/messages/read/${senderId}`),
};

export const maintenanceService = {
  getAllRequests: (params) => apiClient.get('/maintenance', { params }),
  getRequestById: (id) => apiClient.get(`/maintenance/${id}`),
  createRequest: (data) => apiClient.post('/maintenance', data),
  updateRequest: (id, data) => apiClient.put(`/maintenance/${id}`, data),
  addNote: (id, text) => apiClient.post(`/maintenance/${id}/notes`, { text }),
  deleteRequest: (id) => apiClient.delete(`/maintenance/${id}`),
  getStats: () => apiClient.get('/maintenance/stats'),
};

export const notificationService = {
  getMyNotifications: (params) => apiClient.get('/notifications', { params }),
  getUnreadCount: () => apiClient.get('/notifications/unread-count'),
  markRead: (id) => apiClient.put(`/notifications/${id}/read`),
  markAllRead: () => apiClient.put('/notifications/mark-all-read'),
  deleteNotification: (id) => apiClient.delete(`/notifications/${id}`),
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
  // Razorpay payment flow
  createRazorpayOrder: (data) => apiClient.post('/bookings/razorpay/create-order', data),
  verifyRazorpayPayment: (data) => apiClient.post('/bookings/razorpay/verify', data),
  // Manager approval
  approveBooking: (id, note) => apiClient.put(`/bookings/${id}/approve`, { note }),
  rejectBooking: (id, note) => apiClient.put(`/bookings/${id}/reject`, { note }),
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

export default apiClient;

