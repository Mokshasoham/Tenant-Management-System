import mongoose from 'mongoose';
import Feedback from '../models/Feedback.js';
import Lease from '../models/Lease.js';
import Property from '../models/Property.js';
import User from '../models/User.js';
import Tenant from '../models/Tenant.js';
import NotificationService from '../services/NotificationService.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';
import {
  getLeaseFeedbackEligibility,
  recalculatePropertyRating,
  isUserLeaseOwner,
} from '../services/feedbackService.js';

const ALLOWED_CATEGORY_KEYS = [
  'propertyCondition',
  'cleanliness',
  'maintenance',
  'location',
  'valueForMoney',
  'safety',
  'management'
];

const ALLOWED_PROPERTY_TYPE_KEYS = [
  'waterSupply',
  'parking',
  'security',
  'commonAreas',
  'neighborhood',
  'accessibility',
  'visibility',
  'powerSupply',
  'spaceUsability'
];

/**
 * POST /api/feedback
 * Submit verified tenant feedback bound strictly to an active lease.
 */
export const submitFeedback = asyncHandler(async (req, res) => {
  const userId = req.user?.userId || req.user?._id || req.user?.id;
  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  const {
    leaseId,
    overallRating,
    categoryRatings = {},
    maintenanceFeedback = {},
    propertyTypeAnswers = {},
    amenitiesRatings = {},
    liked = '',
    improvements = '',
    comments = '',
  } = req.body;

  if (!leaseId) {
    throw new AppError('Lease ID is required', 400);
  }

  if (!overallRating || typeof overallRating !== 'number' || overallRating < 1 || overallRating > 5) {
    throw new AppError('Overall rating is required and must be between 1 and 5', 400);
  }

  // 1. Authoritative Eligibility Check (Safeguard 1 & Safeguard 3)
  const eligibility = await getLeaseFeedbackEligibility(leaseId, userId);
  if (eligibility.status !== 'DUE') {
    if (eligibility.status === 'SUBMITTED') {
      throw new AppError('Feedback has already been submitted for this lease period', 400);
    }
    if (eligibility.status === 'UPCOMING') {
      throw new AppError(`Feedback is not yet due for this lease (next available on ${new Date(eligibility.nextFeedbackAt).toLocaleDateString()})`, 400);
    }
    throw new AppError(eligibility.reason || 'This lease is not currently eligible for feedback', 403);
  }

  // 2. Fetch lease and derive property strictly from Lease.property (Safeguard 1)
  const lease = await Lease.findById(leaseId)
    .select('property tenant status')
    .populate('property', 'name');
  if (!lease) {
    throw new AppError('Lease not found', 404);
  }
  const propertyId = lease.property?._id || lease.property;
  if (!propertyId) {
    throw new AppError('Lease has no linked property', 400);
  }
  const propertyName = lease.property?.name || eligibility.propertyName || 'the property';

  // 3. Validate category ratings keys and bounds
  const sanitizedCategoryRatings = {};
  for (const key of ALLOWED_CATEGORY_KEYS) {
    if (categoryRatings[key] !== undefined && categoryRatings[key] !== null) {
      const val = Number(categoryRatings[key]);
      if (isNaN(val) || val < 1 || val > 5) {
        throw new AppError(`Invalid rating for category "${key}": must be between 1 and 5`, 400);
      }
      sanitizedCategoryRatings[key] = val;
    }
  }

  // 4. Validate property-type question answers
  const sanitizedPropertyTypeAnswers = {};
  for (const key of ALLOWED_PROPERTY_TYPE_KEYS) {
    if (propertyTypeAnswers[key] !== undefined && propertyTypeAnswers[key] !== null) {
      const val = Number(propertyTypeAnswers[key]);
      if (isNaN(val) || val < 1 || val > 5) {
        throw new AppError(`Invalid score for "${key}": must be between 1 and 5`, 400);
      }
      sanitizedPropertyTypeAnswers[key] = val;
    }
  }

  // 5. Sanitize open-ended text
  const cleanLiked = typeof liked === 'string' ? liked.trim().slice(0, 1000) : '';
  const cleanImprovements = typeof improvements === 'string' ? improvements.trim().slice(0, 1000) : '';
  const cleanComments = typeof comments === 'string' ? comments.trim().slice(0, 1000) : '';

  // 6. Persist Feedback Document
  const feedback = new Feedback({
    tenant: userId,
    lease: lease._id,
    property: propertyId,
    periodIndex: eligibility.periodIndex,
    periodStart: eligibility.periodStart,
    periodEnd: eligibility.periodEnd,
    overallRating: Math.round(overallRating * 10) / 10,
    categoryRatings: sanitizedCategoryRatings,
    maintenanceFeedback: {
      hadMaintenance: Boolean(maintenanceFeedback.hadMaintenance || eligibility.hasMaintenance),
      responseRating: maintenanceFeedback.responseRating || undefined,
      repairQuality: maintenanceFeedback.repairQuality || undefined,
      communication: maintenanceFeedback.communication || undefined,
    },
    propertyType: eligibility.propertyType || 'apartment',
    propertyTypeAnswers: sanitizedPropertyTypeAnswers,
    amenitiesRatings,
    liked: cleanLiked,
    improvements: cleanImprovements,
    comments: cleanComments,
    status: 'published',
    submittedAt: new Date(),
  });

  try {
    await feedback.save();
  } catch (saveErr) {
    if (saveErr.code === 11000) {
      throw new AppError('Feedback has already been recorded for this lease period', 400);
    }
    throw saveErr;
  }

  // 7. Resilient Property Rating Recalculation (Safeguard 2)
  try {
    await recalculatePropertyRating(propertyId);
  } catch (recalcErr) {
    logger.error(`[submitFeedback] Rating recalculation failed for property ${propertyId}. Rolling back feedback ${feedback._id}:`, recalcErr);
    await Feedback.findByIdAndDelete(feedback._id);
    throw new AppError('Failed to update property rating; feedback submission was aborted. Please try again.', 500);
  }

  // 8. Create "Feedback Recorded" Notification for Tenant (Safe & Idempotent)
  try {
    // Safeguard 1: Confirm recipient is the actual User _id expected by the notification system
    let recipientUserId = userId;
    const userDoc = await User.findById(recipientUserId).select('_id');
    if (!userDoc) {
      // If userId was a Tenant document ID, resolve the linked User ID
      const tenantDoc = await Tenant.findById(recipientUserId).select('user userId');
      if (tenantDoc?.user || tenantDoc?.userId) {
        recipientUserId = tenantDoc.user || tenantDoc.userId;
      }
    }

    await NotificationService.notify({
      recipient: recipientUserId,
      title: 'Feedback Recorded',
      message: `Your feedback for ${propertyName} has been successfully recorded. Thank you for sharing your experience.`,
      category: 'lease',
      type: 'success',
      priority: 'medium',
      severity: 'success',
      link: `/my-lease?leaseId=${lease._id}`,
      actionUrl: `/my-lease?leaseId=${lease._id}`,
      redirectUrl: `/my-lease?leaseId=${lease._id}`,
      idempotencyKey: `feedback-recorded:${lease._id}:${eligibility.periodIndex}`,
      entityType: 'Lease',
      entityId: lease._id,
      sourceModule: 'lease',
      metadata: {
        leaseId: lease._id,
        periodIndex: eligibility.periodIndex,
        propertyId,
        feedbackId: feedback._id,
      },
    });
  } catch (notifErr) {
    // Non-blocking: capture error without rolling back already-persisted feedback
    logger.error(`[submitFeedback] Failed to create confirmation notification for feedback ${feedback._id}:`, notifErr.message);
  }

  res.status(201).json({
    success: true,
    message: 'Feedback submitted successfully',
    data: feedback,
  });
});

/**
 * GET /api/feedback/eligibility/:leaseId
 * Get authoritative feedback eligibility for a specific lease.
 */
export const getEligibility = asyncHandler(async (req, res) => {
  const userId = req.user?.userId || req.user?._id || req.user?.id;
  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  const { leaseId } = req.params;
  const eligibility = await getLeaseFeedbackEligibility(leaseId, userId);

  res.status(200).json({
    success: true,
    data: eligibility,
  });
});

/**
 * GET /api/feedback/my
 * Get all feedback submitted by the authenticated tenant.
 */
export const getMyFeedback = asyncHandler(async (req, res) => {
  const userId = req.user?.userId || req.user?._id || req.user?.id;
  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  const feedbacks = await Feedback.find({ tenant: userId })
    .sort({ createdAt: -1 })
    .populate('property', 'name address city images media')
    .populate('lease', 'leaseNumber startDate endDate status');

  res.status(200).json({
    success: true,
    data: feedbacks,
  });
});

/**
 * GET /api/feedback/lease/:leaseId
 * Get feedback history for a specific lease.
 * Tenant can view their own; Manager can view for their property.
 */
export const getLeaseFeedback = asyncHandler(async (req, res) => {
  const userId = req.user?.userId || req.user?._id || req.user?.id;
  const { leaseId } = req.params;

  const lease = await Lease.findById(leaseId).populate('property');
  if (!lease) {
    throw new AppError('Lease not found', 404);
  }

  const isOwner = await isUserLeaseOwner(lease, userId);
  const isManager = lease.property?.manager?.toString() === userId?.toString() ||
                    lease.property?.owner?.toString() === userId?.toString() ||
                    req.user?.role === 'admin';

  if (!isOwner && !isManager) {
    throw new AppError('Not authorized to view feedback for this lease', 403);
  }

  const feedbacks = await Feedback.find({ lease: leaseId }).sort({ periodIndex: 1 });

  res.status(200).json({
    success: true,
    data: feedbacks,
  });
});

/**
 * GET /api/feedback/property/:propertyId
 * Public endpoint: returns aggregated property rating, verified review count,
 * category breakdown, and anonymized published feedback.
 */
export const getPropertyFeedback = asyncHandler(async (req, res) => {
  const { propertyId } = req.params;

  const property = await Property.findById(propertyId).select(
    'name rating reviewCount verifiedReviewCount ratingBreakdown'
  );
  if (!property) {
    throw new AppError('Property not found', 404);
  }

  // Fetch published reviews for this property
  const feedbacks = await Feedback.find({
    property: propertyId,
    status: 'published',
  })
    .sort({ submittedAt: -1 })
    .select('overallRating categoryRatings maintenanceFeedback propertyType propertyTypeAnswers amenitiesRatings liked improvements comments submittedAt');

  // Strip private tenant identities and internal IDs
  const anonymizedReviews = feedbacks.map(f => ({
    _id: f._id,
    author: 'Verified Tenant',
    overallRating: f.overallRating,
    categoryRatings: f.categoryRatings,
    maintenanceFeedback: f.maintenanceFeedback?.hadMaintenance ? f.maintenanceFeedback : undefined,
    propertyType: f.propertyType,
    propertyTypeAnswers: f.propertyTypeAnswers,
    amenitiesRatings: f.amenitiesRatings,
    liked: f.liked || '',
    improvements: f.improvements || '',
    comments: f.comments || '',
    submittedAt: f.submittedAt,
  }));

  res.status(200).json({
    success: true,
    data: {
      propertyRating: property.rating || 0,
      reviewCount: property.reviewCount || 0,
      verifiedReviewCount: property.verifiedReviewCount || property.reviewCount || 0,
      ratingBreakdown: property.ratingBreakdown || {
        propertyCondition: 0,
        cleanliness: 0,
        maintenance: 0,
        location: 0,
        valueForMoney: 0,
        safety: 0,
        management: 0,
      },
      reviews: anonymizedReviews,
    },
  });
});

/**
 * PUT /api/feedback/:id/status
 * Moderation endpoint: change status (published, hidden, flagged) and recalculate ratings.
 */
export const updateFeedbackStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['published', 'hidden', 'flagged'].includes(status)) {
    throw new AppError('Invalid status value', 400);
  }

  const feedback = await Feedback.findById(id).populate('property');
  if (!feedback) {
    throw new AppError('Feedback not found', 404);
  }

  const userId = req.user?.userId || req.user?._id;
  const isManager = feedback.property?.manager?.toString() === userId?.toString() ||
                    feedback.property?.owner?.toString() === userId?.toString() ||
                    req.user?.role === 'admin';

  if (!isManager) {
    throw new AppError('Not authorized to moderate this feedback', 403);
  }

  feedback.status = status;
  await feedback.save();

  // Recalculate property rating
  await recalculatePropertyRating(feedback.property._id || feedback.property);

  res.status(200).json({
    success: true,
    message: `Feedback status updated to ${status}`,
    data: feedback,
  });
});
