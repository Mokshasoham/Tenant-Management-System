import mongoose from 'mongoose';
import Feedback from '../models/Feedback.js';
import Lease from '../models/Lease.js';
import Property from '../models/Property.js';
import User from '../models/User.js';
import Tenant from '../models/Tenant.js';
import Maintenance from '../models/Maintenance.js';
import logger from '../utils/logger.js';

/**
 * Resolves all potential tenant and user ObjectIds associated with an authenticated userId.
 * Supports direct User ID, linked Tenant document ID, email, or phone matching.
 * 
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<string[]>} Array of unique string IDs
 */
export async function getTenantIdsForUser(userId) {
  if (!userId) return [];
  const actualUserId = userId.toString();
  const user = await User.findById(actualUserId).select('email phone firstName lastName');
  if (!user) return [actualUserId];

  const cleanEmail = (user.email || '').trim();
  const emailRegex = cleanEmail ? new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') : null;
  const cleanPhone = (user.phone || '').trim();
  const phoneRegex = cleanPhone ? new RegExp(`^${cleanPhone.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') : null;

  const tenants = await Tenant.find({
    $or: [
      ...(emailRegex ? [{ email: emailRegex }] : []),
      { user: actualUserId },
      { userId: actualUserId },
      ...(phoneRegex ? [{ phone: phoneRegex }] : []),
    ]
  }).select('_id leases');

  const tenantIds = new Set([
    actualUserId,
    ...tenants.map(t => t._id.toString()),
  ]);

  return Array.from(tenantIds);
}

/**
 * Authoritative Lease Ownership Check:
 * Strictly verifies that the authenticated user owns or is the registered tenant on the Lease.
 * 
 * @param {Object} lease 
 * @param {string|mongoose.Types.ObjectId} userId 
 * @returns {Promise<boolean>}
 */
export async function isUserLeaseOwner(lease, userId) {
  if (!lease || !userId) return false;
  const actualUserId = userId.toString();
  const validTenantIds = await getTenantIdsForUser(actualUserId);
  const leaseTenantId = String(lease.tenant?._id || lease.tenant || '');
  const leaseUserId = String(lease.user?._id || lease.user || '');

  if (validTenantIds.includes(leaseTenantId) || validTenantIds.includes(leaseUserId) || leaseTenantId === actualUserId) {
    return true;
  }

  // Also verify via tenant document email or user link
  let tenantDoc = lease.tenant;
  if (tenantDoc && (!tenantDoc.email || typeof tenantDoc === 'string' || tenantDoc instanceof mongoose.Types.ObjectId)) {
    tenantDoc = await Tenant.findById(leaseTenantId).select('email phone user userId');
  }

  if (tenantDoc) {
    if (tenantDoc.user && tenantDoc.user.toString() === actualUserId) return true;
    if (tenantDoc.userId && tenantDoc.userId.toString() === actualUserId) return true;

    const user = await User.findById(actualUserId).select('email phone');
    if (user && tenantDoc.email && user.email && tenantDoc.email.trim().toLowerCase() === user.email.trim().toLowerCase()) {
      return true;
    }
    if (user && tenantDoc.phone && user.phone && tenantDoc.phone.trim() === user.phone.trim()) {
      return true;
    }
  }

  return false;
}

/**
 * Deterministic feedback frequency interval (in days) based on lease duration:
 * - <= 31 days (<= 1 month): 7 days
 * - 32 - 93 days (1 - 3 months): 14 days
 * - > 93 days (> 3 months): 21 days
 * 
 * @param {Object} lease
 * @returns {number} interval in days
 */
export function calculateFeedbackIntervalDays(lease) {
  const start = new Date(lease.startDate).getTime();
  const end = new Date(lease.endDate).getTime();
  const durationDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

  if (durationDays <= 31) return 7;
  if (durationDays <= 93) return 14;
  return 21;
}

/**
 * Deterministic feedback periods calculation:
 * - First period opens 7 days after lease starts (minimum occupancy threshold).
 * - Subsequent periods open every intervalDays.
 * - Boundaries: periodStart <= now < periodEnd.
 * - Stop condition: if periodStart >= lease.endDate, period does not exist.
 * - periodEnd is capped at lease.endDate.
 * 
 * @param {Object} lease
 * @returns {Array<{periodIndex: number, periodStart: Date, periodEnd: Date}>}
 */
export function calculateFeedbackPeriods(lease) {
  if (!lease || !lease.startDate || !lease.endDate) return [];

  const intervalDays = calculateFeedbackIntervalDays(lease);
  const startDate = new Date(lease.startDate);
  const endDate = new Date(lease.endDate);

  // Initial threshold: 7 days after lease start
  const firstPeriodStart = new Date(startDate.getTime() + 7 * 86400000);
  const periods = [];

  let k = 1;
  while (true) {
    const pStart = new Date(firstPeriodStart.getTime() + (k - 1) * intervalDays * 86400000);
    // Period cannot start at or after lease end date
    if (pStart.getTime() >= endDate.getTime()) {
      break;
    }

    const unconstrainedEnd = new Date(pStart.getTime() + intervalDays * 86400000);
    const pEnd = unconstrainedEnd.getTime() > endDate.getTime() ? new Date(endDate.getTime()) : unconstrainedEnd;

    periods.push({
      periodIndex: k,
      periodStart: pStart,
      periodEnd: pEnd,
    });

    k++;
  }

  return periods;
}

/**
 * Authoritative Eligibility Determination for a given lease and tenant.
 * Uses exact boundary semantics: periodStart <= now < periodEnd.
 * 
 * @param {string|mongoose.Types.ObjectId} leaseId
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {Date} [now=new Date()]
 * @returns {Promise<Object>} Eligibility state DTO
 */
export async function getLeaseFeedbackEligibility(leaseId, userId, now = new Date()) {
  const lease = await Lease.findById(leaseId).populate('property');
  if (!lease) {
    return { status: 'NOT_ELIGIBLE', reason: 'Lease not found' };
  }

  // Safeguard 1: Verify authenticated user owns this lease
  const isOwner = await isUserLeaseOwner(lease, userId);
  if (!isOwner) {
    return { status: 'NOT_ELIGIBLE', reason: 'User is not the authorized tenant for this lease' };
  }

  // Active Lease verification
  if (lease.status !== 'active') {
    return { status: 'NOT_ELIGIBLE', reason: `Lease is not active (current status: ${lease.status})` };
  }

  const currentDate = new Date(now);
  const leaseEndDate = new Date(lease.endDate);

  if (currentDate.getTime() >= leaseEndDate.getTime()) {
    return { status: 'NOT_ELIGIBLE', reason: 'Lease duration has concluded' };
  }

  const periods = calculateFeedbackPeriods(lease);
  if (periods.length === 0) {
    return { status: 'NOT_ELIGIBLE', reason: 'Lease duration is too short for feedback periods' };
  }

  const firstPeriod = periods[0];
  // Before first period opens (under 7 days of occupancy)
  if (currentDate.getTime() < firstPeriod.periodStart.getTime()) {
    const diffMs = firstPeriod.periodStart.getTime() - currentDate.getTime();
    return {
      status: 'UPCOMING',
      nextFeedbackAt: firstPeriod.periodStart,
      daysUntilAvailable: Math.ceil(diffMs / 86400000),
      totalPeriods: periods.length,
      propertyId: lease.property?._id,
      propertyName: lease.property?.name,
    };
  }

  // Find active period matching periodStart <= now < periodEnd
  const activePeriod = periods.find(
    p => currentDate.getTime() >= p.periodStart.getTime() && currentDate.getTime() < p.periodEnd.getTime()
  );

  if (!activePeriod) {
    // Current time is past all valid feedback periods
    return { status: 'NOT_ELIGIBLE', reason: 'All scheduled feedback periods for this lease have concluded' };
  }

  // Check if feedback already submitted for this specific periodIndex
  const existingFeedback = await Feedback.findOne({
    lease: lease._id,
    periodIndex: activePeriod.periodIndex,
  });

  if (existingFeedback) {
    const nextPeriod = periods.find(p => p.periodIndex === activePeriod.periodIndex + 1);
    return {
      status: 'SUBMITTED',
      periodIndex: activePeriod.periodIndex,
      periodStart: activePeriod.periodStart,
      periodEnd: activePeriod.periodEnd,
      submittedAt: existingFeedback.submittedAt,
      rating: existingFeedback.overallRating,
      nextFeedbackAt: nextPeriod ? nextPeriod.periodStart : null,
      totalPeriods: periods.length,
      propertyId: lease.property?._id,
      propertyName: lease.property?.name,
    };
  }

  // Check if tenant had any maintenance interaction on this lease / property
  const userTenantIds = await getTenantIdsForUser(userId);
  const maintenanceCount = await Maintenance.countDocuments({
    $or: [
      { lease: lease._id },
      { property: lease.property?._id, tenant: { $in: userTenantIds } }
    ]
  });
  const hasMaintenance = maintenanceCount > 0 || Boolean(lease.maintenanceEnabled);

  return {
    status: 'DUE',
    periodIndex: activePeriod.periodIndex,
    periodStart: activePeriod.periodStart,
    periodEnd: activePeriod.periodEnd,
    hasMaintenance,
    propertyId: lease.property?._id,
    propertyName: lease.property?.name,
    propertyType: lease.property?.type || 'apartment',
    propertyAmenities: lease.property?.amenities || [],
    totalPeriods: periods.length,
  };
}

/**
 * Authoritative Mathematical Property Rating Recalculator:
 * Calculates average of published overall ratings and category averages.
 * Updates Property.rating, Property.reviewCount, Property.verifiedReviewCount, and Property.ratingBreakdown.
 * 
 * @param {string|mongoose.Types.ObjectId} propertyId
 * @returns {Promise<Object>} Updated rating summary
 */
export async function recalculatePropertyRating(propertyId) {
  if (!propertyId) throw new Error('Property ID is required for rating recalculation');

  const publishedFeedbacks = await Feedback.find({
    property: propertyId,
    status: 'published',
  });

  const count = publishedFeedbacks.length;

  if (count === 0) {
    const emptyBreakdown = {
      propertyCondition: 0,
      cleanliness: 0,
      maintenance: 0,
      location: 0,
      valueForMoney: 0,
      safety: 0,
      management: 0,
    };

    await Property.findByIdAndUpdate(propertyId, {
      rating: 0,
      reviewCount: 0,
      verifiedReviewCount: 0,
      ratingBreakdown: emptyBreakdown,
    });

    return {
      rating: 0,
      reviewCount: 0,
      verifiedReviewCount: 0,
      ratingBreakdown: emptyBreakdown,
    };
  }

  const sumOverall = publishedFeedbacks.reduce((sum, f) => sum + (f.overallRating || 0), 0);
  const avgOverall = Math.round((sumOverall / count) * 10) / 10;

  const categories = ['propertyCondition', 'cleanliness', 'maintenance', 'location', 'valueForMoney', 'safety', 'management'];
  const breakdown = {};

  for (const cat of categories) {
    const rated = publishedFeedbacks.filter(
      f => f.categoryRatings && typeof f.categoryRatings[cat] === 'number' && f.categoryRatings[cat] > 0
    );
    if (rated.length > 0) {
      const catAvg = rated.reduce((sum, f) => sum + f.categoryRatings[cat], 0) / rated.length;
      breakdown[cat] = Math.round(catAvg * 10) / 10;
    } else {
      breakdown[cat] = 0;
    }
  }

  await Property.findByIdAndUpdate(propertyId, {
    rating: avgOverall,
    reviewCount: count,
    verifiedReviewCount: count,
    ratingBreakdown: breakdown,
  });

  logger.info(`[recalculatePropertyRating] Property ${propertyId} recalculated: rating=${avgOverall}, count=${count}`);

  return {
    rating: avgOverall,
    reviewCount: count,
    verifiedReviewCount: count,
    ratingBreakdown: breakdown,
  };
}
