import PayoutRequest from '../models/PayoutRequest.js';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key');

/**
 * Owner: Request a payout
 */
export const requestPayout = asyncHandler(async (req, res) => {
  const { amount, notes } = req.body;
  const ownerId = req.user.userId;

  if (!amount || amount < 10) {
    throw new AppError('Minimum payout amount is ₹10', 400);
  }

  // 1. Calculate available balance (Total rent netted minus total paid out and pending requests)
  // Find all net rent payments
  const completedPayments = await Payment.aggregate([
    { $match: { owner: ownerId, status: 'paid', type: 'rent' } },
    { $group: { _id: null, total: { $sum: '$netAmount' } } }
  ]);
  const totalEarned = completedPayments[0]?.total || 0;

  // Find all requested/completed payouts
  const payoutHistory = await PayoutRequest.aggregate([
    { $match: { owner: ownerId, status: { $in: ['pending', 'approved', 'completed'] } } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const totalWithdrawn = payoutHistory[0]?.total || 0;

  const availableBalance = totalEarned - totalWithdrawn;

  if (amount > availableBalance) {
    throw new AppError(`Insufficient funds. Available balance: ₹${availableBalance}`, 400);
  }

  const request = await PayoutRequest.create({
    owner: ownerId,
    amount,
    notes
  });

  logger.info(`Payout requested: ${request._id} by Owner: ${ownerId} for ₹${amount}`);

  res.status(201).json({
    success: true,
    message: 'Payout request submitted successfully',
    data: request,
    availableBalance: availableBalance - amount
  });
});

/**
 * Owner: Get current available balance and earnings info
 */
export const getOwnerBalance = asyncHandler(async (req, res) => {
  const ownerId = req.user.userId;

  // 1. Total rent earned (paid)
  const completedRent = await Payment.aggregate([
    { $match: { owner: ownerId, status: 'paid', type: 'rent' } },
    { $group: { _id: null, total: { $sum: '$netAmount' } } }
  ]);
  const totalEarned = completedRent[0]?.total || 0;

  // 2. Pending earnings (future/pending rent)
  const pendingRent = await Payment.aggregate([
    { $match: { owner: ownerId, status: 'pending', type: 'rent' } },
    { $group: { _id: null, total: { $sum: '$netAmount' } } }
  ]);
  const totalPending = pendingRent[0]?.total || 0;

  // 3. Already withdrawn or requested
  const payoutHistory = await PayoutRequest.aggregate([
    { $match: { owner: ownerId, status: { $in: ['pending', 'approved', 'completed'] } } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const totalWithdrawn = payoutHistory[0]?.total || 0;

  const availableBalance = totalEarned - totalWithdrawn;

  res.status(200).json({
    success: true,
    data: {
      availableBalance,
      totalEarned,
      totalPending,
      totalWithdrawn
    }
  });
});

/**
 * Admin: View all payout requests
 */
export const getAllPayoutRequests = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};

  const requests = await PayoutRequest.find(filter)
    .populate('owner', 'firstName lastName email stripeAccountId')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: requests });
});

/**
 * Admin: Approve a payout request (Trigger Stripe Transfer)
 */
export const approvePayout = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const adminId = req.user.userId;

  const request = await PayoutRequest.findById(id).populate('owner');
  if (!request) throw new AppError('Payout request not found', 404);
  if (request.status !== 'pending') throw new AppError(`Request is already ${request.status}`, 400);

  // Trigger Stripe Transfer to connected account
  if (request.owner.stripeAccountId) {
    try {
      const transfer = await stripe.transfers.create({
        amount: request.amount * 100, // paise
        currency: 'inr',
        destination: request.owner.stripeAccountId,
        description: `Payout for request ${request._id}`
      });
      request.stripeTransferId = transfer.id;
    } catch (err) {
      logger.error('Stripe Transfer failed:', err);
      throw new AppError(`Stripe Transfer Failed: ${err.message}`, 500);
    }
  } else {
    // Manual fulfillment
    logger.info(`No Stripe Connect ID found for owner ${request.owner._id}. Marking approved for manual tracking.`);
  }

  request.status = 'approved';
  request.approvedBy = adminId;
  request.processedAt = new Date();
  await request.save();

  // (Optional) Automatically transition to completed assuming rapid wire, or wait for another hook
  request.status = 'completed';
  await request.save();

  res.status(200).json({
    success: true,
    message: 'Payout request approved and transferred',
    data: request
  });
});

/**
 * Admin: Reject a payout request
 */
export const rejectPayout = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;
  const adminId = req.user.userId;

  const request = await PayoutRequest.findById(id);
  if (!request) throw new AppError('Payout request not found', 404);
  
  // Note: we can't reject a completed one
  if (request.status === 'completed' || request.status === 'approved') {
    throw new AppError(`Request is already ${request.status}`, 400);
  }

  request.status = 'rejected';
  if (note) request.notes = `${request.notes} | Rejection Reason: ${note}`;
  request.processedAt = new Date();
  request.approvedBy = adminId;
  await request.save();

  res.status(200).json({
    success: true,
    message: 'Payout request rejected',
    data: request
  });
});
