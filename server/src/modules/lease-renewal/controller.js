import { asyncHandler } from '../../utils/errorHandling.js';
import * as service from './service.js';

/**
 * Helper to construct standard audit trail metadata context.
 */
const getAuditContext = (req) => {
  return {
    ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
    requestId: req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    sessionId: req.headers['x-session-id'] || req.session?.id,
    correlationId: req.headers['x-correlation-id'],
    traceId: req.headers['x-trace-id']
  };
};

/**
 * POST /api/v1/lease-renewals
 * POST /api/renewals/request (legacy mapping)
 */
export const createRequest = asyncHandler(async (req, res) => {
  const { leaseId, duration, message, proposedRent, requestedStartDate, requestedEndDate } = req.body;
  const auditContext = getAuditContext(req);

  const result = await service.createRenewalRequest({
    leaseId,
    duration,
    message,
    proposedRent,
    requestedStartDate,
    requestedEndDate,
    userId: req.user.userId,
    auditContext
  });

  res.status(201).json({
    success: true,
    message: 'Lease renewal request registered successfully',
    data: result,
    meta: {},
    requestId: auditContext.requestId
  });
});

/**
 * GET /api/v1/lease-renewals/my
 * GET /api/renewals/my (legacy mapping)
 */
export const getHistory = asyncHandler(async (req, res) => {
  const auditContext = getAuditContext(req);
  const result = await service.getTenantRenewals(req.user.userId);

  res.status(200).json({
    success: true,
    message: 'Tenant renewal history fetched successfully',
    data: result,
    meta: { total: result.length },
    requestId: auditContext.requestId
  });
});

/**
 * GET /api/v1/lease-renewals/manager
 * GET /api/renewals (legacy mapping)
 */
export const getManagerRequests = asyncHandler(async (req, res) => {
  const auditContext = getAuditContext(req);
  const result = await service.getManagerRenewals(req.user.userId);

  res.status(200).json({
    success: true,
    message: 'Manager properties pending renewals fetched successfully',
    data: result,
    meta: { total: result.length },
    requestId: auditContext.requestId
  });
});

/**
 * GET /api/v1/lease-renewals/:id
 */
export const getDetails = asyncHandler(async (req, res) => {
  const auditContext = getAuditContext(req);
  const result = await service.getRenewalDetails(req.params.id, req.user);

  res.status(200).json({
    success: true,
    message: 'Renewal request details fetched successfully',
    data: result,
    meta: {},
    requestId: auditContext.requestId
  });
});

/**
 * PUT /api/v1/lease-renewals/:id
 */
export const updateRequest = asyncHandler(async (req, res) => {
  const auditContext = getAuditContext(req);
  const result = await service.updateRenewalRequest(req.params.id, req.body, req.user, auditContext);

  res.status(200).json({
    success: true,
    message: 'Renewal request updated successfully',
    data: result,
    meta: {},
    requestId: auditContext.requestId
  });
});

/**
 * DELETE /api/v1/lease-renewals/:id
 */
export const cancelRequest = asyncHandler(async (req, res) => {
  const auditContext = getAuditContext(req);
  const result = await service.cancelRenewalRequest(req.params.id, req.user, auditContext);

  res.status(200).json({
    success: true,
    message: 'Renewal request cancelled successfully',
    data: result,
    meta: {},
    requestId: auditContext.requestId
  });
});

/**
 * GET /api/v1/lease-renewals/dashboard
 */
export const getDashboard = asyncHandler(async (req, res) => {
  const auditContext = getAuditContext(req);
  const result = await service.getTenantDashboardData(req.user.userId);

  res.status(200).json({
    success: true,
    message: 'Dashboard payload aggregated successfully',
    data: result,
    meta: {},
    requestId: auditContext.requestId
  });
});

/**
 * POST /api/v1/lease-renewals/:id/offers
 */
export const submitCounterOffer = asyncHandler(async (req, res) => {
  const auditContext = getAuditContext(req);
  const result = await service.submitCounterOffer(req.params.id, req.body, req.user, auditContext);
  res.status(200).json({ success: true, data: result, requestId: auditContext.requestId });
});

/**
 * GET /api/v1/lease-renewals/:id/offers
 */
export const getOffers = asyncHandler(async (req, res) => {
  const auditContext = getAuditContext(req);
  const result = await service.getRenewalOffers(req.params.id, req.user);
  res.status(200).json({ success: true, data: result, requestId: auditContext.requestId });
});

/**
 * POST /api/v1/lease-renewals/:id/messages
 */
export const addMessage = asyncHandler(async (req, res) => {
  const result = await service.addMessage(req.params.id, req.body.content, req.user);
  res.status(201).json({ success: true, data: result });
});

/**
 * GET /api/v1/lease-renewals/:id/messages
 */
export const getMessages = asyncHandler(async (req, res) => {
  const result = await service.getRenewalMessages(req.params.id, req.user);
  res.status(200).json({ success: true, data: result });
});

/**
 * POST /api/v1/lease-renewals/:id/approve
 */
export const approveRenewal = asyncHandler(async (req, res) => {
  const auditContext = getAuditContext(req);
  const result = await service.acceptRenewal(req.params.id, req.user, auditContext);
  res.status(200).json({ success: true, data: result, requestId: auditContext.requestId });
});

/**
 * POST /api/v1/lease-renewals/:id/reject
 */
export const rejectRenewal = asyncHandler(async (req, res) => {
  const auditContext = getAuditContext(req);
  const result = await service.rejectRenewal(req.params.id, req.body.rejectionReason, req.user, auditContext);
  res.status(200).json({ success: true, data: result, requestId: auditContext.requestId });
});

/**
 * POST /api/v1/lease-renewals/:id/sign
 */
export const signRenewal = asyncHandler(async (req, res) => {
  const auditContext = getAuditContext(req);
  const result = await service.signRenewal(
    req.params.id,
    req.body.signatureData,
    req.user,
    auditContext.ipAddress,
    auditContext.userAgent,
    auditContext
  );
  res.status(200).json({ success: true, data: result, requestId: auditContext.requestId });
});
