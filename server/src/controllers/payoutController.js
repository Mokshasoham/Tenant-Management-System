import PayoutRequest from '../models/PayoutRequest.js';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import Property from '../models/Property.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';
import NotificationService from '../services/NotificationService.js';
import Stripe from 'stripe';

const isStripeConfigured = Boolean(
  process.env.STRIPE_SECRET_KEY &&
  process.env.STRIPE_SECRET_KEY !== 'sk_test_mock_key' &&
  process.env.STRIPE_SECRET_KEY.startsWith('sk_')
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key');

/**
 * Helper: Calculate real-time financial ledger for a manager/owner
 * - Total Earned: Sum of all verified (status: 'paid') rent/deposit payments for properties owned/managed
 * - Pending Earnings: Sum of payments currently pending/partially_paid
 * - Reserved Amount: Payouts requested/pending/processing/approved (funds held in transit)
 * - Completed Amount: Payouts successfully paid/completed
 * - Available Balance: Total Earned - Reserved Amount - Completed Amount
 */
export async function calculateManagerLedger(managerId) {
  // 1. Identify all properties managed or owned by this manager
  const managedProperties = await Property.find({
    $or: [{ manager: managerId }, { owner: managerId }]
  }).select('_id name');
  const propertyIds = managedProperties.map(p => p._id);

  // 2. Fetch all verified payments for this manager's portfolio
  const paidPayments = await Payment.find({
    $or: [
      { property: { $in: propertyIds } },
      { owner: managerId }
    ],
    status: 'paid'
  }).select('amount amountPaid netAmount status createdAt');

  const totalEarned = paidPayments.reduce((sum, p) => {
    return sum + (p.amountPaid || p.amount || 0);
  }, 0);

  // 3. Fetch all pending/upcoming payments
  const pendingPayments = await Payment.find({
    $or: [
      { property: { $in: propertyIds } },
      { owner: managerId }
    ],
    status: { $in: ['pending', 'partially_paid'] }
  }).select('amount');

  const totalPending = pendingPayments.reduce((sum, p) => {
    return sum + (p.amount || 0);
  }, 0);

  // 4. Fetch all payouts for this manager
  const payouts = await PayoutRequest.find({
    $or: [{ owner: managerId }, { manager: managerId }]
  }).sort({ createdAt: -1 });

  // Reserved funds: requested, pending, processing, approved
  const reservedStatuses = ['requested', 'pending', 'processing', 'approved'];
  const reservedAmount = payouts
    .filter(p => reservedStatuses.includes(p.status))
    .reduce((sum, p) => sum + p.amount, 0);

  // Completed funds: paid, completed
  const completedStatuses = ['paid', 'completed'];
  const completedAmount = payouts
    .filter(p => completedStatuses.includes(p.status))
    .reduce((sum, p) => sum + p.amount, 0);

  // Available to withdraw (failed/rejected/cancelled payouts are released automatically)
  const availableBalance = Math.max(0, totalEarned - reservedAmount - completedAmount);

  return {
    totalEarned,
    totalPending,
    reservedAmount,
    completedAmount,
    totalWithdrawn: completedAmount,
    availableBalance,
    payouts,
    propertyCount: propertyIds.length
  };
}

/**
 * Helper: Verify Stripe Connect account status directly via Stripe API
 */
async function verifyStripeConnectAccount(user) {
  if (!isStripeConfigured) {
    return {
      isConfigured: false,
      isReady: false,
      reason: 'Bank payouts are not configured for this account yet. Manager payout requires Stripe Connect configuration.'
    };
  }

  if (!user.stripeAccountId) {
    return {
      isConfigured: true,
      isReady: false,
      reason: 'No connected Stripe bank account found for this manager. Please complete Stripe onboarding.'
    };
  }

  try {
    const account = await stripe.accounts.retrieve(user.stripeAccountId);
    const payoutsEnabled = Boolean(account.payouts_enabled);
    const chargesEnabled = Boolean(account.charges_enabled);
    const detailsSubmitted = Boolean(account.details_submitted);

    if (!payoutsEnabled) {
      return {
        isConfigured: true,
        isReady: false,
        account,
        reason: 'Stripe Connect bank payouts are not enabled for this account. Additional verification may be required.'
      };
    }

    // Extract last 4 of default external bank account if available
    const externalAccounts = account.external_accounts?.data || [];
    const bankAccount = externalAccounts.find(ea => ea.object === 'bank_account') || externalAccounts[0];
    const accountNumberLast4 = bankAccount?.last4 || null;
    const bankName = bankAccount?.bank_name || null;

    return {
      isConfigured: true,
      isReady: true,
      account,
      payoutsEnabled,
      chargesEnabled,
      detailsSubmitted,
      accountNumberLast4,
      bankName
    };
  } catch (err) {
    logger.error('[verifyStripeConnectAccount] Stripe account retrieve failed:', err);
    return {
      isConfigured: true,
      isReady: false,
      reason: `Stripe verification failed: ${err.message}`
    };
  }
}

/**
 * GET /api/payouts/summary (or /balance)
 * Manager/Admin: Get real-time balance, earnings, and Stripe status
 */
export const getPayoutSummary = asyncHandler(async (req, res) => {
  const managerId = req.user.userId;
  const user = await User.findById(managerId);
  if (!user) throw new AppError('User not found', 404);

  const ledger = await calculateManagerLedger(managerId);
  const stripeStatus = await verifyStripeConnectAccount(user);

  res.status(200).json({
    success: true,
    data: {
      available: ledger.availableBalance,
      availableBalance: ledger.availableBalance,
      totalEarned: ledger.totalEarned,
      pending: ledger.totalPending,
      reserved: ledger.reservedAmount,
      totalWithdrawn: ledger.completedAmount,
      isPayoutReady: stripeStatus.isReady,
      providerConfigured: isStripeConfigured,
      hasConnectedAccount: Boolean(user.stripeAccountId),
      payoutDisabledReason: stripeStatus.isReady ? null : stripeStatus.reason,
      stripeAccountId: user.stripeAccountId || null,
      accountNumberLast4: stripeStatus.accountNumberLast4 || null,
      bankName: stripeStatus.bankName || null,
      payoutProvider: 'stripe'
    }
  });
});

/**
 * GET /api/payouts
 * Manager/Admin: View withdrawal history
 */
export const getAllPayoutRequests = asyncHandler(async (req, res) => {
  const managerId = req.user.userId;
  const role = req.user.role;

  let filter = {};
  if (role === 'admin') {
    if (req.query.status) filter.status = req.query.status;
  } else {
    filter = { $or: [{ owner: managerId }, { manager: managerId }] };
    if (req.query.status) filter.status = req.query.status;
  }

  const payouts = await PayoutRequest.find(filter)
    .populate('owner', 'firstName lastName email stripeAccountId')
    .populate('manager', 'firstName lastName email stripeAccountId')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: payouts.length,
    data: payouts
  });
});

/**
 * GET /api/payouts/:id
 * Manager/Admin: View single payout details
 */
export const getPayoutById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const managerId = req.user.userId;
  const role = req.user.role;

  const payout = await PayoutRequest.findById(id)
    .populate('owner', 'firstName lastName email stripeAccountId')
    .populate('manager', 'firstName lastName email');

  if (!payout) throw new AppError('Payout request not found', 404);

  // Authorization check: only the manager or admin can view
  if (role !== 'admin' && payout.owner?._id?.toString() !== managerId && payout.manager?._id?.toString() !== managerId) {
    throw new AppError('Not authorized to view this payout', 403);
  }

  res.status(200).json({
    success: true,
    data: payout
  });
});

/**
 * POST /api/payouts/request
 * Manager: Submit a withdrawal request
 */
export const requestPayout = asyncHandler(async (req, res) => {
  const { amount, notes } = req.body;
  const managerId = req.user.userId;

  const user = await User.findById(managerId);
  if (!user) throw new AppError('User not found', 404);

  const numericAmount = Number(amount);
  if (!numericAmount || isNaN(numericAmount) || numericAmount < 500) {
    throw new AppError('Minimum payout amount is ₹500', 400);
  }

  // 1. Calculate live available balance
  const ledger = await calculateManagerLedger(managerId);
  if (numericAmount > ledger.availableBalance) {
    throw new AppError(`Insufficient available balance. Available: ₹${ledger.availableBalance.toLocaleString('en-IN')}`, 400);
  }

  // 2. Strict Payout Provider Check
  const stripeStatus = await verifyStripeConnectAccount(user);
  if (!stripeStatus.isReady) {
    throw new AppError(stripeStatus.reason || 'Bank payouts are not configured for this account yet. Manager payout requires Stripe Connect configuration.', 400);
  }

  // 3. Idempotency & rapid duplicate prevention (< 15 seconds)
  const idempotencyKey = req.body.idempotencyKey || `PAYOUT_${managerId}_${Date.now()}`;
  const recentDuplicate = await PayoutRequest.findOne({
    $or: [{ owner: managerId }, { manager: managerId }],
    amount: numericAmount,
    createdAt: { $gt: new Date(Date.now() - 15000) }
  });

  if (recentDuplicate) {
    return res.status(200).json({
      success: true,
      message: 'Payout request is already processing',
      data: recentDuplicate,
      availableBalance: ledger.availableBalance - numericAmount
    });
  }

  // 4. Create PayoutRequest record (immediately reserving funds)
  const payoutRecord = await PayoutRequest.create({
    owner: managerId,
    manager: managerId,
    amount: numericAmount,
    currency: 'INR',
    status: 'processing',
    provider: 'stripe',
    idempotencyKey,
    accountNumberLast4: stripeStatus.accountNumberLast4 || null,
    requestedAt: new Date(),
    processingAt: new Date(),
    notes: notes || 'Manager payout to connected Stripe bank account'
  });

  logger.info(`[Payout] Created PayoutRequest ${payoutRecord._id} for Manager ${managerId} (₹${numericAmount})`);

  // 5. Execute Stripe Transfer: Platform balance -> Connected Manager Account
  try {
    const transfer = await stripe.transfers.create({
      amount: Math.round(numericAmount * 100), // paise
      currency: 'inr',
      destination: user.stripeAccountId,
      description: `Payout #${payoutRecord._id} for Manager ${user.firstName} ${user.lastName}`,
      metadata: {
        payoutId: payoutRecord._id.toString(),
        managerId: managerId.toString(),
        idempotencyKey
      }
    }, { idempotencyKey });

    payoutRecord.providerTransferId = transfer.id;
    payoutRecord.stripeTransferId = transfer.id;
    await payoutRecord.save();
    logger.info(`[Payout] Stripe Transfer ${transfer.id} succeeded for PayoutRequest ${payoutRecord._id}`);
  } catch (stripeErr) {
    logger.error(`[Payout] Stripe Transfer failed:`, stripeErr);
    payoutRecord.status = 'failed';
    payoutRecord.failedAt = new Date();
    payoutRecord.failureReason = stripeErr.message;
    await payoutRecord.save();
    throw new AppError(`Stripe Transfer error: ${stripeErr.message}`, 502);
  }

  // 6. Initiate Payout from Connected Account to External Bank
  try {
    const payout = await stripe.payouts.create({
      amount: Math.round(numericAmount * 100), // paise
      currency: 'inr',
      description: `TMS Bank Payout #${payoutRecord._id}`,
      metadata: {
        payoutId: payoutRecord._id.toString(),
        managerId: managerId.toString()
      }
    }, {
      stripeAccount: user.stripeAccountId,
      idempotencyKey: `PO_${payoutRecord._id}`
    });

    payoutRecord.providerPayoutId = payout.id;
    if (payout.status === 'paid') {
      payoutRecord.status = 'paid';
      payoutRecord.completedAt = new Date();
    }
    await payoutRecord.save();
    logger.info(`[Payout] Stripe Connected Payout ${payout.id} initiated (Status: ${payout.status})`);
  } catch (payoutErr) {
    logger.warn(`[Payout] Stripe Connected Payout warning: ${payoutErr.message}. Funds transferred to connected balance; payout will complete via automatic schedule or webhook.`);
  }

  // 7. Send notification using NotificationService
  await NotificationService.notify({
    recipient: managerId,
    category: 'payments',
    event: 'payout_requested',
    title: 'Payout Request Submitted',
    message: `Your payout request of ₹${numericAmount.toLocaleString('en-IN')} has been submitted to your connected bank account.`,
    sourceModule: 'financials',
    entityType: 'PayoutRequest',
    entityId: payoutRecord._id,
    priority: 'medium'
  }).catch(err => logger.warn(`[Payout Notification Error]: ${err.message}`));

  res.status(201).json({
    success: true,
    message: 'Payout request submitted successfully',
    data: payoutRecord,
    availableBalance: ledger.availableBalance - numericAmount
  });
});

/**
 * PUT /api/payouts/:id/approve
 * Admin: Approve a manual or pending payout request
 */
export const approvePayout = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const adminId = req.user.userId;

  const request = await PayoutRequest.findById(id).populate('owner');
  if (!request) throw new AppError('Payout request not found', 404);
  if (['paid', 'completed', 'failed', 'rejected'].includes(request.status)) {
    throw new AppError(`Request is already ${request.status}`, 400);
  }

  request.status = 'paid';
  request.approvedBy = adminId;
  request.completedAt = new Date();
  request.processedAt = new Date();
  await request.save();

  // Send notification to manager
  await NotificationService.notify({
    recipient: request.owner._id || request.manager,
    category: 'payments',
    event: 'payout_completed',
    title: 'Payout Completed',
    message: `Your payout of ₹${request.amount.toLocaleString('en-IN')} has been approved and completed.`,
    sourceModule: 'financials',
    entityType: 'PayoutRequest',
    entityId: request._id,
    priority: 'high'
  }).catch(() => {});

  res.status(200).json({
    success: true,
    message: 'Payout request approved and completed',
    data: request
  });
});

/**
 * PUT /api/payouts/:id/reject
 * Admin: Reject a payout request (releasing reserved balance)
 */
export const rejectPayout = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;
  const adminId = req.user.userId;

  const request = await PayoutRequest.findById(id);
  if (!request) throw new AppError('Payout request not found', 404);

  if (request.status === 'completed' || request.status === 'paid') {
    throw new AppError(`Cannot reject a payout that is already ${request.status}`, 400);
  }

  request.status = 'rejected';
  request.failureReason = note || 'Rejected by administrator';
  if (note) request.notes = `${request.notes || ''} | Rejection Reason: ${note}`.trim();
  request.processedAt = new Date();
  request.failedAt = new Date();
  request.approvedBy = adminId;
  await request.save();

  // Send notification to manager
  await NotificationService.notify({
    recipient: request.owner || request.manager,
    category: 'payments',
    event: 'payout_rejected',
    title: 'Payout Request Rejected',
    message: `Your payout request of ₹${request.amount.toLocaleString('en-IN')} was rejected: ${note || 'Contact support'}`,
    sourceModule: 'financials',
    entityType: 'PayoutRequest',
    entityId: request._id,
    priority: 'high'
  }).catch(() => {});

  res.status(200).json({
    success: true,
    message: 'Payout request rejected',
    data: request
  });
});

/**
 * POST /api/payouts/webhook
 * Stripe Webhook: Authoritative provider payout lifecycle updates
 */
export const handlePayoutWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_PAYOUT_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (endpointSecret && sig) {
      event = stripe.webhooks.constructEvent(req.rawBody || req.body, sig, endpointSecret);
    } else {
      event = req.body;
    }
  } catch (err) {
    logger.error(`[Payout Webhook Error]: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const dataObj = event.data?.object;
  logger.info(`[Payout Webhook] Received Stripe event: ${event.type} (ID: ${dataObj?.id})`);

  switch (event.type) {
    case 'payout.paid': {
      const payoutRecord = await PayoutRequest.findOne({
        $or: [
          { providerPayoutId: dataObj.id },
          { _id: dataObj.metadata?.payoutId }
        ]
      });
      if (payoutRecord) {
        payoutRecord.status = 'paid';
        payoutRecord.completedAt = new Date();
        await payoutRecord.save();

        await NotificationService.notify({
          recipient: payoutRecord.owner || payoutRecord.manager,
          category: 'payments',
          event: 'payout_completed',
          title: 'Payout Completed',
          message: `Your payout of ₹${payoutRecord.amount.toLocaleString('en-IN')} has been transferred to your bank account.`,
          sourceModule: 'financials',
          entityType: 'PayoutRequest',
          entityId: payoutRecord._id,
          priority: 'high'
        }).catch(() => {});
      }
      break;
    }

    case 'payout.failed': {
      const payoutRecord = await PayoutRequest.findOne({
        $or: [
          { providerPayoutId: dataObj.id },
          { _id: dataObj.metadata?.payoutId }
        ]
      });
      if (payoutRecord) {
        payoutRecord.status = 'failed';
        payoutRecord.failedAt = new Date();
        payoutRecord.failureReason = dataObj.failure_message || 'Stripe payout failed';
        await payoutRecord.save();

        await NotificationService.notify({
          recipient: payoutRecord.owner || payoutRecord.manager,
          category: 'payments',
          event: 'payout_failed',
          title: 'Payout Failed',
          message: `Your payout of ₹${payoutRecord.amount.toLocaleString('en-IN')} could not be completed: ${payoutRecord.failureReason}`,
          sourceModule: 'financials',
          entityType: 'PayoutRequest',
          entityId: payoutRecord._id,
          priority: 'high'
        }).catch(() => {});
      }
      break;
    }

    case 'transfer.created': {
      const payoutRecord = await PayoutRequest.findOne({
        $or: [
          { providerTransferId: dataObj.id },
          { _id: dataObj.metadata?.payoutId }
        ]
      });
      if (payoutRecord && payoutRecord.status === 'requested') {
        payoutRecord.status = 'processing';
        payoutRecord.processingAt = new Date();
        await payoutRecord.save();
      }
      break;
    }

    case 'transfer.reversed': {
      const payoutRecord = await PayoutRequest.findOne({
        $or: [
          { providerTransferId: dataObj.id },
          { _id: dataObj.metadata?.payoutId }
        ]
      });
      if (payoutRecord) {
        payoutRecord.status = 'failed';
        payoutRecord.failedAt = new Date();
        payoutRecord.failureReason = 'Stripe transfer was reversed';
        await payoutRecord.save();
      }
      break;
    }

    default:
      logger.info(`[Payout Webhook] Unhandled event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
});
