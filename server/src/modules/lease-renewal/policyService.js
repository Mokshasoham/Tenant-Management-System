import LeasePolicy from '../../models/LeasePolicy.js';
import cacheProvider from '../../platform/cache/cacheProvider.js';
import { logRenewalAudit } from '../../platform/audit/auditService.js';
import { dispatchEvent } from '../../platform/events/eventDispatcher.js';

const CACHE_TTL_SECONDS = 3600;

export const getCacheKey = (propertyType, propertyId, leaseId) => {
  return `policy:${propertyType || 'default'}:${propertyId || 'none'}:${leaseId || 'none'}`;
};

/**
 * Resolves the complete lease policy hierarchy.
 * Order of specificity: Lease Override > Property Override > PropertyType (Category/Sub-category) > Global
 */
export const resolvePolicy = async ({ propertyType, propertyId, leaseId }) => {
  const cacheKey = getCacheKey(propertyType, propertyId, leaseId);
  const cached = await cacheProvider.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Load policies in parallel
  const [globalPolicy, typePolicy, propertyPolicy, leasePolicy] = await Promise.all([
    LeasePolicy.findOne({ propertyType: 'global', active: true }),
    propertyType ? LeasePolicy.findOne({ propertyType, active: true }) : null,
    propertyId ? LeasePolicy.findOne({ propertyId, active: true }) : null,
    leaseId ? LeasePolicy.findOne({ leaseId, active: true }) : null
  ]);

  const merged = {};
  const policies = [globalPolicy, typePolicy, propertyPolicy, leasePolicy].filter(Boolean);

  for (const p of policies) {
    if (p.minDurationMonths !== undefined && p.minDurationMonths !== null) merged.minDurationMonths = p.minDurationMonths;
    if (p.maxDurationMonths !== undefined && p.maxDurationMonths !== null) merged.maxDurationMonths = p.maxDurationMonths;
    if (p.maxRentIncreasePercent !== undefined && p.maxRentIncreasePercent !== null) merged.maxRentIncreasePercent = p.maxRentIncreasePercent;
    if (p.minNoticeDays !== undefined && p.minNoticeDays !== null) merged.minNoticeDays = p.minNoticeDays;
    if (p.maxCounterOffers !== undefined && p.maxCounterOffers !== null) merged.maxCounterOffers = p.maxCounterOffers;
    if (p.autoApprovalEnabled !== undefined && p.autoApprovalEnabled !== null) merged.autoApprovalEnabled = p.autoApprovalEnabled;
    merged.policyId = p._id;
    merged.version = p.version;
  }

  // Standard defaults
  if (merged.minDurationMonths === undefined) merged.minDurationMonths = 6;
  if (merged.maxDurationMonths === undefined) merged.maxDurationMonths = 36;
  if (merged.maxRentIncreasePercent === undefined) merged.maxRentIncreasePercent = 15;
  if (merged.minNoticeDays === undefined) merged.minNoticeDays = 30;
  if (merged.maxCounterOffers === undefined) merged.maxCounterOffers = 5;
  if (merged.autoApprovalEnabled === undefined) merged.autoApprovalEnabled = true;

  await cacheProvider.set(cacheKey, merged, CACHE_TTL_SECONDS);
  return merged;
};

/**
 * Creates or updates a policy with version tracking and circular loop protection.
 */
export const savePolicy = async (payload, user, auditContext = {}) => {
  if (payload.parentPolicy) {
    let parent = await LeasePolicy.findById(payload.parentPolicy);
    const visited = new Set([payload.parentPolicy.toString()]);
    while (parent && parent.parentPolicy) {
      const parentIdStr = parent.parentPolicy.toString();
      if (visited.has(parentIdStr)) {
        throw new Error('Circular reference detected in parent policy hierarchy.');
      }
      visited.add(parentIdStr);
      parent = await LeasePolicy.findById(parent.parentPolicy);
    }
  }

  const existing = await LeasePolicy.findOne({
    propertyType: payload.propertyType,
    propertyId: payload.propertyId || null,
    leaseId: payload.leaseId || null,
    active: true
  });

  let policy;
  if (existing) {
    const updatedVersion = (existing.version || 1) + 1;
    existing.active = false;
    existing.effectiveTo = new Date();
    await existing.save();

    policy = await LeasePolicy.create({
      ...payload,
      version: updatedVersion,
      active: true,
      effectiveFrom: new Date()
    });
  } else {
    policy = await LeasePolicy.create({
      ...payload,
      active: true
    });
  }

  // Evict cache
  const cacheKey = getCacheKey(policy.propertyType, policy.propertyId, policy.leaseId);
  await cacheProvider.del(cacheKey);
  await dispatchEvent('lease.policy.cache.invalidated', { cacheKey });

  // Audit
  await logRenewalAudit({
    userId: user.userId,
    action: 'POLICY_SAVE',
    newValue: policy.toObject(),
    ...auditContext
  });

  await dispatchEvent('lease.policy.updated', { policyId: policy._id, version: policy.version });

  return policy;
};
