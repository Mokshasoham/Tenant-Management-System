import LeaseRenewalAudit from '../../models/LeaseRenewalAudit.js';

/**
 * Reusable Audit Log Service.
 * Logs transactional events asynchronously to MongoDB.
 * 
 * @param {object} payload - Audit context details
 */
export const logRenewalAudit = async ({
  leaseRenewalId,
  userId,
  action,
  oldValue,
  newValue,
  ipAddress,
  userAgent,
  requestId,
  sessionId,
  correlationId,
  traceId
}) => {
  return await LeaseRenewalAudit.create({
    leaseRenewalId,
    userId,
    action,
    oldValue,
    newValue,
    browser: userAgent?.split(' ')?.[0] || 'Unknown',
    device: userAgent?.includes('Mobi') ? 'Mobile' : 'Desktop',
    platform: userAgent?.includes('Windows') ? 'Windows' : 'Unix',
    userAgent,
    requestId,
    sessionId,
    correlationId,
    traceId,
    ipAddress
  });
};
