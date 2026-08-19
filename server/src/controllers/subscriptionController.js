import { asyncHandler, AppError } from '../utils/errorHandling.js';
import * as subscriptionService from '../services/subscriptionService.js';
import logger from '../utils/logger.js';

/**
 * GET /api/subscriptions/me
 * Returns the authenticated user's current subscription, active limits, and live usage.
 */
export const getMySubscription = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user._id || req.user.id;
  const role = req.user.role;

  const data = await subscriptionService.getUserSubscription(userId, role);
  res.status(200).json({
    success: true,
    data,
  });
});

/**
 * GET /api/subscriptions/plans
 * Returns available plans for the authenticated user's role.
 */
export const getAvailablePlans = asyncHandler(async (req, res) => {
  const role = req.query.role || req.user.role || 'tenant';
  const configs = await subscriptionService.getPlanConfigs();
  const normalizedRole = role === 'admin' ? 'manager' : role;
  const plans = configs[normalizedRole] || configs.tenant;

  res.status(200).json({
    success: true,
    data: Object.values(plans),
  });
});

/**
 * POST /api/subscriptions/create-order
 * Initiates Razorpay checkout order for a plan upgrade.
 */
export const createUpgradeOrder = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user._id || req.user.id;
  const role = req.user.role;
  const { planId, billingCycle } = req.body;

  if (!planId) {
    throw new AppError('planId is required for upgrade order', 400);
  }

  const order = await subscriptionService.createSubscriptionOrder(userId, role, planId, billingCycle || 'monthly');
  res.status(201).json({
    success: true,
    message: 'Subscription upgrade order created successfully',
    data: order,
  });
});

/**
 * POST /api/subscriptions/verify-payment
 * Verifies Razorpay payment signature and activates the upgraded subscription.
 */
export const verifyUpgradePayment = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user._id || req.user.id;
  const role = req.user.role;
  const { planId, billingCycle, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  if (!planId || !razorpayOrderId || !razorpayPaymentId) {
    throw new AppError('Missing payment verification parameters', 400);
  }

  const updatedSub = await subscriptionService.verifySubscriptionPayment({
    userId,
    role,
    targetPlanId: planId,
    billingCycle: billingCycle || 'monthly',
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });

  res.status(200).json({
    success: true,
    message: `Subscription successfully upgraded to ${updatedSub.subscription.planName}`,
    data: updatedSub,
  });
});

/**
 * POST /api/subscriptions/cancel
 * Cancels auto-renewal for the user's active paid subscription.
 */
export const cancelSubscription = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user._id || req.user.id;
  const role = req.user.role;

  const Subscription = (await import('../models/Subscription.js')).default;
  const sub = await Subscription.findOne({ user: userId, role: role === 'admin' ? 'manager' : role });

  if (!sub) {
    throw new AppError('No subscription found to cancel', 404);
  }

  sub.autoRenew = false;
  await sub.save();

  res.status(200).json({
    success: true,
    message: 'Subscription auto-renewal cancelled. Your current plan remains active until expiration.',
    data: sub,
  });
});

/**
 * GET /api/subscriptions/admin/stats (Admin only)
 */
export const getAdminStats = asyncHandler(async (req, res) => {
  const stats = await subscriptionService.getAdminSubscriptionStats();
  res.status(200).json({
    success: true,
    data: stats,
  });
});

/**
 * PUT /api/subscriptions/admin/config (Admin only)
 */
export const updatePlanConfig = asyncHandler(async (req, res) => {
  const adminUserId = req.user.userId || req.user._id || req.user.id;
  const updatedConfigs = await subscriptionService.updateAdminPlanConfig(req.body, adminUserId);
  res.status(200).json({
    success: true,
    message: 'Plan configurations updated successfully',
    data: updatedConfigs,
  });
});
