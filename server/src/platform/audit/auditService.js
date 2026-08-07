import LeaseRenewalAudit from '../../models/LeaseRenewalAudit.js';
import ProfileAudit from '../../models/ProfileAudit.js';

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

/**
 * Reusable Verification Audit Log Helper.
 * Logs verification state changes asynchronously to ProfileAudit collection.
 * 
 * @param {object} payload - Verification audit details
 */
export const logVerificationAudit = async ({
  userId,
  updatedBy,
  changedFields = [],
  ipAddress = '',
  userAgent = ''
}) => {
  return await ProfileAudit.create({
    userId,
    updatedBy: updatedBy || userId,
    changedFields,
    ipAddress,
    userAgent
  });
};
