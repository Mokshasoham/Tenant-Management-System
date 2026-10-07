import mongoose from 'mongoose';
import User from '../models/User.js';
import Tenant from '../models/Tenant.js';
import logger from './logger.js';

/**
 * Canonical check to determine if an authenticated user role represents a tenant.
 * Handles both 'tenant' and legacy/default registration role 'user'.
 *
 * @param {Object} userOrReq - User object or Express Request object
 * @returns {boolean}
 */
export const isTenantRole = (userOrReq) => {
  if (!userOrReq) return false;
  const role = userOrReq.role || userOrReq.user?.role;
  return role === 'tenant' || role === 'user';
};

/**
 * Authoritatively resolves the authenticated user's ID from req.user
 * Handles req.user.userId, req.user._id, req.user.id
 *
 * @param {Object} req - Express Request
 * @returns {string|null}
 */
export const getAuthenticatedUserId = (req) => {
  if (!req?.user) return null;
  return req.user.userId || req.user._id || req.user.id || null;
};

/**
 * Resolves the single authoritative Tenant document for the authenticated user.
 * 
 * Strict Invariant Ownership Chain:
 * JWT (req.user)
 *   ↓
 * authenticated User._id
 *   ↓
 * User document (User.findById)
 *   ↓
 * normalized unique User.email
 *   ↓
 * exact Tenant.email match
 *   ↓
 * ONE Tenant._id
 *
 * Safety Rules:
 * 1. Exact normalized email match ONLY. Zero phone or name regex.
 * 2. If multiple Tenant documents exist with the same email, log an integrity warning and fail closed / pick single primary. Never merge.
 * 3. Never return an array of merged identities or mix User._id into Tenant._id.
 *
 * @param {Object} req - Express Request
 * @returns {Promise<{ user: Object|null, tenant: Object|null, warning?: string }>}
 */
export const getAuthenticatedTenant = async (req) => {
  const actualUserId = getAuthenticatedUserId(req);
  if (!actualUserId) {
    return { user: null, tenant: null };
  }

  const user = await User.findById(actualUserId).select('_id email phone role firstName lastName');
  if (!user || !user.email) {
    return { user: null, tenant: null };
  }

  const normalizedEmail = String(user.email).trim().toLowerCase();

  // Exact normalized email match ONLY — strictly scoped, no phone, no name regex
  const tenants = await Tenant.find({ email: normalizedEmail });

  let tenant = null;
  let warning = undefined;

  if (tenants.length === 1) {
    tenant = tenants[0];
  } else if (tenants.length > 1) {
    warning = `Multiple Tenant documents (${tenants.length}) found for email ${normalizedEmail}. Selected primary without merging.`;
    logger.warn(`[DATA INTEGRITY] ${warning} Tenant IDs: ${tenants.map(t => t._id).join(', ')}`);
    tenant = tenants[0];
  } else {
    // Fallback: check if tenant was linked directly by user ObjectId
    tenant = await Tenant.findOne({ user: actualUserId });
  }

  return { user, tenant, warning };
};

/**
 * Validates whether the authenticated tenant owns a given Lease.
 *
 * @param {Object} lease - Lease document or plain object
 * @param {Object|string} tenant - Tenant document or tenant _id
 * @returns {boolean}
 */
export const isTenantLeaseOwner = (lease, tenant) => {
  if (!lease || !tenant) return false;
  const tenantIdStr = String(tenant._id || tenant);
  const leaseTenantIdStr = String(lease.tenant?._id || lease.tenant || '');
  return leaseTenantIdStr === tenantIdStr;
};

/**
 * Validates whether the authenticated tenant owns a given Payment.
 *
 * @param {Object} payment - Payment document or plain object
 * @param {Object|string} tenant - Tenant document or tenant _id
 * @returns {boolean}
 */
export const isTenantPaymentOwner = (payment, tenant) => {
  if (!payment || !tenant) return false;
  const tenantIdStr = String(tenant._id || tenant);
  const paymentTenantIdStr = String(payment.tenant?._id || payment.tenant || '');
  return paymentTenantIdStr === tenantIdStr;
};
