import Stripe from 'stripe';
import StripeConnectAccount from '../models/StripeConnectAccount.js';
import StripeEvent from '../models/StripeEvent.js';
import PayoutRequest from '../models/PayoutRequest.js';
import User from '../models/User.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';
import NotificationService from '../services/NotificationService.js';

const isStripeConfigured = Boolean(
  process.env.STRIPE_SECRET_KEY &&
  process.env.STRIPE_SECRET_KEY !== 'sk_test_mock_key' &&
  process.env.STRIPE_SECRET_KEY.startsWith('sk_')
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key');

/**
 * Helper: Retrieve or sync connected account directly from Stripe
 */
async function syncAccountWithStripe(connectRecord) {
  if (!isStripeConfigured || !connectRecord?.stripeAccountId) return connectRecord;

  try {
    const account = await stripe.accounts.retrieve(connectRecord.stripeAccountId);
    
    const payoutsEnabled = Boolean(account.payouts_enabled);
    const chargesEnabled = Boolean(account.charges_enabled);
    const detailsSubmitted = Boolean(account.details_submitted);
    const currentlyDue = account.requirements?.currently_due || [];
    const eventuallyDue = account.requirements?.eventually_due || [];
    const pastDue = account.requirements?.past_due || [];
    const disabledReason = account.requirements?.disabled_reason || null;

    // Find external bank account
    const externalAccounts = account.external_accounts?.data || [];
    const bankAccount = externalAccounts.find(ea => ea.object === 'bank_account') || externalAccounts[0];
    const accountNumberLast4 = bankAccount?.last4 || null;
    const bankName = bankAccount?.bank_name || null;

    // Determine onboarding status
    let onboardingStatus = 'pending';
    if (payoutsEnabled) {
      onboardingStatus = 'completed';
    } else if (currentlyDue.length > 0) {
      onboardingStatus = detailsSubmitted ? 'restricted' : 'in_progress';
    } else if (detailsSubmitted) {
      onboardingStatus = 'in_progress';
    }

    connectRecord.payoutsEnabled = payoutsEnabled;
    connectRecord.chargesEnabled = chargesEnabled;
    connectRecord.detailsSubmitted = detailsSubmitted;
    connectRecord.requirementsDue = currentlyDue;
    connectRecord.requirementsEventuallyDue = eventuallyDue;
    connectRecord.requirementsPastDue = pastDue;
    connectRecord.disabledReason = disabledReason;
    connectRecord.onboardingStatus = onboardingStatus;
    connectRecord.accountNumberLast4 = accountNumberLast4;
    connectRecord.bankName = bankName;
    connectRecord.lastSyncedAt = new Date();

    await connectRecord.save();
    return connectRecord;
  } catch (err) {
    logger.error(`[StripeConnect] Failed to sync account ${connectRecord.stripeAccountId}:`, err);
    return connectRecord;
  }
}

/**
 * POST /api/stripe-connect/account
 * Create or retrieve Stripe Connected Account for the authenticated manager
 */
export const createOrGetAccount = asyncHandler(async (req, res) => {
  const managerId = req.user.userId;
  const user = await User.findById(managerId);
  if (!user) throw new AppError('User not found', 404);

  if (!isStripeConfigured) {
    return res.status(200).json({
      success: true,
      configured: false,
      connected: false,
      message: 'Bank payouts are not configured for this account yet. Manager payout requires Stripe Connect configuration.'
    });
  }

  // Check if a StripeConnectAccount record already exists
  let connectRecord = await StripeConnectAccount.findOne({ manager: managerId });

  if (connectRecord) {
    // Sync with live Stripe API
    connectRecord = await syncAccountWithStripe(connectRecord);
    return res.status(200).json({
      success: true,
      configured: true,
      connected: true,
      data: {
        stripeAccountId: connectRecord.stripeAccountId,
        onboardingStatus: connectRecord.onboardingStatus,
        payoutsEnabled: connectRecord.payoutsEnabled,
        chargesEnabled: connectRecord.chargesEnabled,
        detailsSubmitted: connectRecord.detailsSubmitted,
        requirements: {
          currentlyDue: connectRecord.requirementsDue,
          eventuallyDue: connectRecord.requirementsEventuallyDue,
          pastDue: connectRecord.requirementsPastDue
        },
        bankName: connectRecord.bankName,
        accountNumberLast4: connectRecord.accountNumberLast4
      }
    });
  }

  // Create new Stripe Express account for manager
  try {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'IN',
      email: user.email,
      capabilities: {
        transfers: { requested: true }
      },
      business_type: 'individual',
      individual: {
        first_name: user.firstName,
        last_name: user.lastName,
        email: user.email,
        phone: user.phone || undefined
      },
      metadata: {
        managerId: user._id.toString(),
        role: user.role,
        email: user.email,
        platform: 'TMS'
      }
    });

    connectRecord = await StripeConnectAccount.create({
      manager: managerId,
      stripeAccountId: account.id,
      accountType: 'express',
      onboardingStatus: 'pending',
      chargesEnabled: Boolean(account.charges_enabled),
      payoutsEnabled: Boolean(account.payouts_enabled),
      detailsSubmitted: Boolean(account.details_submitted),
      requirementsDue: account.requirements?.currently_due || [],
      country: account.country || 'IN',
      currency: 'INR'
    });

    user.stripeAccountId = account.id;
    await user.save();

    logger.info(`[StripeConnect] Created new Connected Account ${account.id} for Manager ${managerId}`);

    res.status(201).json({
      success: true,
      configured: true,
      connected: true,
      data: {
        stripeAccountId: account.id,
        onboardingStatus: 'pending',
        payoutsEnabled: false,
        chargesEnabled: false,
        detailsSubmitted: false,
        requirements: {
          currentlyDue: account.requirements?.currently_due || [],
          eventuallyDue: account.requirements?.eventually_due || [],
          pastDue: account.requirements?.past_due || []
        }
      }
    });
  } catch (err) {
    logger.error('[StripeConnect] Account creation error:', err);
    throw new AppError(`Stripe Account Creation Error: ${err.message}`, 500);
  }
});

/**
 * POST /api/stripe-connect/onboarding
 * Generate a Stripe AccountLink onboarding URL for the manager
 */
export const createOnboardingLink = asyncHandler(async (req, res) => {
  const managerId = req.user.userId;
  const user = await User.findById(managerId);
  if (!user) throw new AppError('User not found', 404);

  if (!isStripeConfigured) {
    throw new AppError('Bank payouts are not configured for this account yet. Manager payout requires Stripe Connect configuration.', 400);
  }

  // Ensure connect account exists
  let connectRecord = await StripeConnectAccount.findOne({ manager: managerId });
  if (!connectRecord) {
    // Create one automatically
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'IN',
      email: user.email,
      capabilities: {
        transfers: { requested: true }
      },
      business_type: 'individual',
      individual: {
        first_name: user.firstName,
        last_name: user.lastName,
        email: user.email,
        phone: user.phone || undefined
      },
      metadata: {
        managerId: user._id.toString(),
        role: user.role,
        platform: 'TMS'
      }
    });

    connectRecord = await StripeConnectAccount.create({
      manager: managerId,
      stripeAccountId: account.id,
      accountType: 'express',
      onboardingStatus: 'pending'
    });

    user.stripeAccountId = account.id;
    await user.save();
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const returnUrl = process.env.STRIPE_CONNECT_RETURN_URL || `${frontendUrl}/dashboard?view=financials&connect=return`;
  const refreshUrl = process.env.STRIPE_CONNECT_REFRESH_URL || `${frontendUrl}/dashboard?view=financials&connect=refresh`;

  try {
    const accountLink = await stripe.accountLinks.create({
      account: connectRecord.stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding'
    });

    logger.info(`[StripeConnect] Generated onboarding link for Manager ${managerId} (Account: ${connectRecord.stripeAccountId})`);

    res.status(200).json({
      success: true,
      url: accountLink.url
    });
  } catch (err) {
    logger.error('[StripeConnect] AccountLink creation error:', err);
    throw new AppError(`Stripe Onboarding Link Error: ${err.message}`, 500);
  }
});

/**
 * POST /api/stripe-connect/login-link
 * Generate single-sign-on login link for managing payout account
 */
export const createLoginLink = asyncHandler(async (req, res) => {
  const managerId = req.user.userId;
  const connectRecord = await StripeConnectAccount.findOne({ manager: managerId });

  if (!isStripeConfigured || !connectRecord?.stripeAccountId) {
    throw new AppError('No connected Stripe payout account found.', 404);
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const returnUrl = process.env.STRIPE_CONNECT_RETURN_URL || `${frontendUrl}/dashboard?view=financials&connect=return`;
  const refreshUrl = process.env.STRIPE_CONNECT_REFRESH_URL || `${frontendUrl}/dashboard?view=financials&connect=refresh`;

  try {
    // Attempt Express Dashboard Login Link
    const loginLink = await stripe.accounts.createLoginLink(connectRecord.stripeAccountId);
    return res.status(200).json({ success: true, url: loginLink.url });
  } catch (err) {
    logger.warn(`[StripeConnect] Login link failed (${err.message}). Falling back to onboarding link.`);
    // Fallback to standard onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: connectRecord.stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding'
    });
    return res.status(200).json({ success: true, url: accountLink.url });
  }
});

/**
 * GET /api/stripe-connect/status
 * Get real-time Stripe Connect onboarding and verification status
 */
export const getConnectStatus = asyncHandler(async (req, res) => {
  const managerId = req.user.userId;
  const user = await User.findById(managerId);
  if (!user) throw new AppError('User not found', 404);

  if (!isStripeConfigured) {
    return res.status(200).json({
      success: true,
      configured: false,
      connected: false,
      stripeAccountId: null,
      payoutsEnabled: false,
      chargesEnabled: false,
      detailsSubmitted: false,
      onboardingComplete: false,
      status: 'unconfigured',
      message: 'Bank payouts are not configured for this account yet. Manager payout requires Stripe Connect configuration.'
    });
  }

  let connectRecord = await StripeConnectAccount.findOne({ manager: managerId });
  if (!connectRecord && user.stripeAccountId) {
    // Link existing stripeAccountId
    connectRecord = await StripeConnectAccount.create({
      manager: managerId,
      stripeAccountId: user.stripeAccountId,
      accountType: 'express'
    });
  }

  if (!connectRecord) {
    return res.status(200).json({
      success: true,
      configured: true,
      connected: false,
      stripeAccountId: null,
      payoutsEnabled: false,
      chargesEnabled: false,
      detailsSubmitted: false,
      onboardingComplete: false,
      status: 'not_connected',
      message: 'Connect your bank account to receive property rental payouts securely.'
    });
  }

  // Live sync with Stripe API
  connectRecord = await syncAccountWithStripe(connectRecord);

  // Derive human-readable state
  let state = 'not_connected';
  let message = 'Connect your bank account to receive property rental payouts securely.';

  if (connectRecord.payoutsEnabled) {
    state = 'payouts_enabled';
    message = 'Bank account connected. Payouts are enabled.';
  } else if (connectRecord.detailsSubmitted && connectRecord.requirementsDue.length === 0) {
    state = 'verification_pending';
    message = 'Stripe is verifying your payout account.';
  } else if (connectRecord.requirementsDue.length > 0) {
    state = connectRecord.detailsSubmitted ? 'verification_required' : 'onboarding_incomplete';
    message = connectRecord.detailsSubmitted
      ? 'Additional verification is required for your bank payout account.'
      : 'Stripe payout setup is incomplete.';
  } else if (connectRecord.disabledReason) {
    state = 'payouts_disabled';
    message = 'Bank payouts are currently unavailable.';
  }

  res.status(200).json({
    success: true,
    configured: true,
    connected: true,
    data: {
      stripeAccountId: connectRecord.stripeAccountId,
      payoutsEnabled: connectRecord.payoutsEnabled,
      chargesEnabled: connectRecord.chargesEnabled,
      detailsSubmitted: connectRecord.detailsSubmitted,
      onboardingComplete: connectRecord.payoutsEnabled,
      onboardingStatus: connectRecord.onboardingStatus,
      status: state,
      message,
      bankName: connectRecord.bankName,
      accountNumberLast4: connectRecord.accountNumberLast4,
      requirements: {
        currentlyDue: connectRecord.requirementsDue,
        eventuallyDue: connectRecord.requirementsEventuallyDue,
        pastDue: connectRecord.requirementsPastDue
      },
      disabledReason: connectRecord.disabledReason
    }
  });
});

/**
 * POST /api/stripe-connect/webhook
 * Authoritative Stripe Connect Webhook Handler with Idempotency Protection
 */
export const handleStripeConnectWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (endpointSecret && sig) {
      event = stripe.webhooks.constructEvent(req.rawBody || req.body, sig, endpointSecret);
    } else {
      event = req.body;
    }
  } catch (err) {
    logger.error(`[StripeConnect Webhook Error]: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (!event || !event.id) {
    return res.status(400).json({ error: 'Invalid event structure' });
  }

  // Idempotency: Skip duplicate events
  const existingEvent = await StripeEvent.findOne({ eventId: event.id });
  if (existingEvent) {
    logger.info(`[StripeConnect Webhook] Skipping duplicate event ${event.id}`);
    return res.status(200).json({ received: true, duplicate: true });
  }

  await StripeEvent.create({
    eventId: event.id,
    type: event.type,
    data: event.data?.object || {}
  });

  const dataObj = event.data?.object;
  logger.info(`[StripeConnect Webhook] Processing event ${event.type} (${event.id})`);

  switch (event.type) {
    case 'account.updated': {
      const connectRecord = await StripeConnectAccount.findOne({ stripeAccountId: dataObj.id });
      if (connectRecord) {
        const prevPayouts = connectRecord.payoutsEnabled;
        await syncAccountWithStripe(connectRecord);

        // If payouts just became enabled, send notification
        if (!prevPayouts && connectRecord.payoutsEnabled) {
          await NotificationService.notify({
            recipient: connectRecord.manager,
            category: 'payments',
            event: 'stripe_connected',
            title: 'Bank Account Connected',
            message: 'Your bank account has been verified and enabled for payouts. You can now withdraw property earnings.',
            sourceModule: 'financials',
            priority: 'high'
          }).catch(() => {});
        }
      }
      break;
    }

    case 'account.application.deauthorized': {
      const connectRecord = await StripeConnectAccount.findOne({ stripeAccountId: dataObj.id });
      if (connectRecord) {
        connectRecord.payoutsEnabled = false;
        connectRecord.chargesEnabled = false;
        connectRecord.onboardingStatus = 'restricted';
        await connectRecord.save();
      }
      break;
    }

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
          message: `Your payout of ₹${payoutRecord.amount.toLocaleString('en-IN')} has been transferred to your connected bank account.`,
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

    default:
      logger.info(`[StripeConnect Webhook] Unhandled event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
});
