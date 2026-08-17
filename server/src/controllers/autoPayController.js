import mongoose from 'mongoose';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import AutoPay from '../models/AutoPay.js';
import Lease from '../models/Lease.js';
import Payment from '../models/Payment.js';
import Bill from '../models/Bill.js';
import Tenant from '../models/Tenant.js';
import User from '../models/User.js';
import Property from '../models/Property.js';
import NotificationModel from '../models/Notification.js';
import EventService from '../services/eventService.js';
import { calculateNextPaymentDue } from '../utils/paymentSchedule.js';
import { generateInvoicePDF, buildInvoiceViewModel } from '../services/pdfService.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';

// Safe Notification dispatcher proxy
const dispatchNotification = async (data) => {
  try {
    return await EventService.publish({
      recipient: data.recipient,
      category: 'payments',
      event: data.event || 'autopay_alert',
      title: data.title,
      description: data.message,
      sourceModule: 'autopay',
      entityType: 'AutoPay',
      entityId: data.relatedId,
      redirectUrl: data.link || '/payments',
      action: 'view',
      priority: data.priority || 'medium',
      severity: data.severity || 'information',
      metadata: {
        relatedId: data.relatedId,
      },
    });
  } catch (err) {
    logger.warn(`[AutoPay Notification Wrapper] Falling back to direct DB creation: ${err.message}`);
    return await NotificationModel.create(data);
  }
};

/**
 * Helper to verify authenticated tenant ownership of a lease.
 */
const verifyTenantLeaseOwnership = async (userId, leaseId) => {
  const user = await User.findById(userId).select('email firstName lastName phone');
  if (!user) throw new AppError('Authenticated user not found', 404);

  const tenants = await Tenant.find({ email: user.email });
  const tenantIds = tenants.map(t => t._id.toString());

  const lease = await Lease.findById(leaseId).populate('property').populate('tenant');
  if (!lease) throw new AppError('Lease not found', 404);

  const leaseTenantId = lease.tenant?._id ? lease.tenant._id.toString() : (lease.tenant ? lease.tenant.toString() : '');
  const isOwner = tenantIds.includes(leaseTenantId) || leaseTenantId === userId.toString();

  if (!isOwner) {
    throw new AppError('Forbidden: Access denied to this lease', 403);
  }

  return { user, tenants, primaryTenant: tenants[0] || null, lease };
};

/**
 * GET /api/autopay/status/:leaseId
 * Retrieves the AutoPay configuration, activation status, and next scheduled rent date.
 */
export const getAutoPayStatus = asyncHandler(async (req, res) => {
  const { leaseId } = req.params;
  const { user, tenants, lease } = await verifyTenantLeaseOwnership(req.user.userId, leaseId);

  const tenantIds = [req.user.userId, ...tenants.map(t => t._id)];
  const autoPay = await AutoPay.findOne({
    tenant: { $in: tenantIds },
    lease: lease._id,
  });

  const tenantPayments = await Payment.find({
    lease: lease._id,
  }).sort({ dueDate: -1, createdAt: -1 });

  const schedule = calculateNextPaymentDue(lease, tenantPayments);

  const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  const isProviderConfigured = Boolean(keyId && keySecret && !keyId.includes('placeholder'));

  res.status(200).json({
    success: true,
    data: {
      enabled: autoPay ? autoPay.status === 'active' : false,
      status: autoPay ? autoPay.status : 'disabled',
      autoPay: autoPay || null,
      schedule: schedule || null,
      monthlyAmount: lease.rentAmount || 0,
      propertyName: lease.property?.name || 'Assigned Residence',
      isProviderConfigured,
    },
  });
});

/**
 * GET /api/autopay/my-autopays
 * Retrieves all AutoPay configurations for the authenticated tenant across all their leases.
 */
export const getMyAutoPays = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId).select('email');
  if (!user) return res.status(200).json({ success: true, data: [] });

  const tenants = await Tenant.find({ email: user.email });
  const tenantIds = [req.user.userId, ...tenants.map(t => t._id)];

  const autoPays = await AutoPay.find({
    tenant: { $in: tenantIds },
  })
    .populate('lease', 'leaseNumber rentAmount startDate endDate status')
    .populate('property', 'name address city')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: autoPays,
  });
});

/**
 * POST /api/autopay/setup-intent
 * Creates a Razorpay customer and mandate authorization order for Auto-Pay setup.
 */
export const createSetupIntent = asyncHandler(async (req, res) => {
  const { leaseId, paymentMethodType = 'upi_autopay' } = req.body;
  if (!leaseId) throw new AppError('Lease ID is required', 400);

  const { user, lease, primaryTenant } = await verifyTenantLeaseOwnership(req.user.userId, leaseId);

  const keyId = (process.env.RAZORPAY_KEY_ID || 'rzp_test_SUn7uPXz1VaEa1').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || 'J1XPHqYCTE8sSNhNtzarqYaQ').trim();

  if (!keyId || !keySecret) {
    throw new AppError('Auto-Pay requires Razorpay recurring payment configuration.', 503);
  }

  const rzp = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  // Calculate standard token authorization amount (₹1 / ₹5 mandate registration fee or 100 paise)
  const authAmountInPaise = 100; // ₹1 token registration

  let rzpOrder;
  try {
    rzpOrder = await rzp.orders.create({
      amount: authAmountInPaise,
      currency: 'INR',
      receipt: `mandate_${lease._id.toString().slice(-8)}_${Date.now().toString().slice(-6)}`,
      notes: {
        purpose: 'AUTOPAY_MANDATE_REGISTRATION',
        leaseId: lease._id.toString(),
        tenantUserId: req.user.userId.toString(),
        monthlyRent: String(lease.rentAmount || 0),
        methodType: paymentMethodType,
      },
    });
  } catch (rzpErr) {
    const errMsg = rzpErr.description || rzpErr.error?.description || rzpErr.message || 'Razorpay Order Error';
    logger.error(`[AutoPay] Setup Intent Order creation failed: ${errMsg}`);
    throw new AppError(`Auto-Pay authorization order creation failed: ${errMsg}`, 400);
  }

  res.status(200).json({
    success: true,
    data: {
      orderId: rzpOrder.id,
      keyId,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      leaseId: lease._id,
      monthlyAmount: lease.rentAmount,
      propertyName: lease.property?.name || 'Residence',
      customerName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Valued Tenant',
      customerEmail: user.email,
      customerPhone: user.phone || '9999999999',
    },
  });
});

/**
 * POST /api/autopay/verify-and-enable
 * Verifies Razorpay mandate authorization response and activates Auto-Pay for the lease.
 */
export const verifyAndEnableAutoPay = asyncHandler(async (req, res) => {
  const {
    leaseId,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    paymentMethodType = 'upi_autopay',
  } = req.body;

  if (!leaseId) throw new AppError('Lease ID is required', 400);
  if (!razorpayOrderId || !razorpayPaymentId) {
    throw new AppError('Razorpay payment credentials are required for verification', 400);
  }

  const { user, lease, primaryTenant } = await verifyTenantLeaseOwnership(req.user.userId, leaseId);

  const keyId = (process.env.RAZORPAY_KEY_ID || 'rzp_test_SUn7uPXz1VaEa1').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || 'J1XPHqYCTE8sSNhNtzarqYaQ').trim();

  // 1. HMAC Signature Verification
  let isValid = false;
  if (razorpaySignature) {
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSig = crypto
      .createHmac('sha256', keySecret)
      .update(body.toString())
      .digest('hex');
    isValid = expectedSig === razorpaySignature;
  }

  // 2. Direct Razorpay API Verification fallback
  let verifiedPayment = null;
  if (!isValid) {
    try {
      const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
      verifiedPayment = await rzp.payments.fetch(razorpayPaymentId);
      if (verifiedPayment && ['authorized', 'captured'].includes(verifiedPayment.status)) {
        isValid = true;
      }
    } catch (apiErr) {
      logger.warn(`[AutoPay] Razorpay verification API fetch failed: ${apiErr.message}`);
    }
  }

  if (!isValid) {
    logger.error(`[AutoPay] Mandate signature verification failed for lease ${leaseId}, order ${razorpayOrderId}`);
    throw new AppError('Invalid payment provider mandate signature. Auto-Pay could not be enabled.', 400);
  }

  // 3. Calculate authoritative next scheduled payment date
  const tenantPayments = await Payment.find({ lease: lease._id });
  const schedule = calculateNextPaymentDue(lease, tenantPayments);
  const nextPaymentDate = schedule?.nextPaymentDueAt ? new Date(schedule.nextPaymentDueAt) : new Date();

  // 4. Authoritatively upsert AutoPay configuration
  const autoPay = await AutoPay.findOneAndUpdate(
    { tenant: user._id, lease: lease._id },
    {
      $set: {
        tenant: user._id,
        tenantProfile: primaryTenant?._id,
        lease: lease._id,
        property: lease.property._id,
        status: 'active',
        monthlyAmount: lease.rentAmount || 0,
        currency: 'INR',
        nextPaymentDate,
        paymentMethodType,
        provider: 'razorpay',
        providerCustomerId: verifiedPayment?.customer_id || `cust_${user._id.toString().slice(-8)}`,
        providerTokenId: verifiedPayment?.token_id || razorpayPaymentId,
        providerMandateStatus: 'active',
        enabledAt: new Date(),
        disabledAt: null,
        failureCount: 0,
        failureReason: null,
      },
    },
    { upsert: true, new: true }
  );

  logger.info(`[AutoPay] Activated Auto-Pay for tenant ${user._id} on lease ${lease._id} (${lease.property?.name})`);

  // 5. In-app Notification
  await dispatchNotification({
    recipient: user._id,
    title: '🔄 Auto-Pay Enabled',
    message: `Auto-Pay is now ACTIVE for ${lease.property?.name || 'your residence'}. Monthly rent of ₹${(lease.rentAmount || 0).toLocaleString('en-IN')} is scheduled for automatic payment on the lease due date.`,
    type: 'success',
    link: '/payments',
    priority: 'high',
    relatedId: autoPay._id,
  });

  res.status(200).json({
    success: true,
    message: 'Auto-Pay enabled and activated successfully',
    data: autoPay,
  });
});

/**
 * POST /api/autopay/disable
 * Safely disables Auto-Pay for a specific lease.
 */
export const disableAutoPay = asyncHandler(async (req, res) => {
  const { leaseId } = req.body;
  if (!leaseId) throw new AppError('Lease ID is required', 400);

  const { user, lease } = await verifyTenantLeaseOwnership(req.user.userId, leaseId);

  const autoPay = await AutoPay.findOne({
    tenant: user._id,
    lease: lease._id,
  });

  if (!autoPay) {
    throw new AppError('No Auto-Pay configuration found for this lease', 404);
  }

  autoPay.status = 'disabled';
  autoPay.disabledAt = new Date();
  await autoPay.save();

  logger.info(`[AutoPay] Disabled Auto-Pay for tenant ${user._id} on lease ${lease._id}`);

  // In-app Notification
  await dispatchNotification({
    recipient: user._id,
    title: 'Auto-Pay Disabled',
    message: `Auto-Pay for ${lease.property?.name || 'your residence'} has been disabled. Future automatic payments are stopped. You can pay your rent manually via Pay Rent Now.`,
    type: 'info',
    link: '/payments',
    priority: 'medium',
    relatedId: autoPay._id,
  });

  res.status(200).json({
    success: true,
    message: 'Auto-Pay disabled successfully. Existing payments remain unaffected.',
    data: autoPay,
  });
});

/**
 * Internal Cron/Scheduled Execution Engine:
 * Processes all active Auto-Pays that are due today.
 *
 * INVARIANTS:
 * 1. Checks idempotency (AUTOPAY_leaseId_cycleDate).
 * 2. Only creates a Payment with status 'paid' after verified provider confirmation.
 * 3. Never creates fake paid payments if provider is unconfigured.
 */
export const processDueAutoPayments = async () => {
  logger.info('[AUTOPAY CRON] Starting daily scheduled Auto-Pay execution sweep...');
  const now = new Date();
  const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  try {
    const activeAutoPays = await AutoPay.find({
      status: 'active',
      nextPaymentDate: { $lte: todayEnd },
    })
      .populate('lease')
      .populate('property')
      .populate('tenant');

    if (activeAutoPays.length === 0) {
      logger.info('[AUTOPAY CRON] No active Auto-Pay payments due for execution today.');
      return;
    }

    logger.info(`[AUTOPAY CRON] Found ${activeAutoPays.length} active Auto-Pay schedule(s) due.`);

    const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
    const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
    const isProviderReady = Boolean(keyId && keySecret && !keyId.includes('placeholder'));

    for (const autoPay of activeAutoPays) {
      const lease = autoPay.lease;
      const property = autoPay.property;
      const tenantUser = autoPay.tenant;

      if (!lease || lease.status !== 'active') {
        logger.warn(`[AUTOPAY CRON] Lease ${autoPay.lease?._id} is not active. Skipping Auto-Pay.`);
        continue;
      }

      // 1. Idempotency Check: Formulate unique cycle key
      const cycleDateStr = new Date(autoPay.nextPaymentDate).toISOString().slice(0, 10);
      const idempotencyKey = `AUTOPAY_${lease._id}_${cycleDateStr}`;

      const existingPayment = await Payment.findOne({
        lease: lease._id,
        $or: [
          { reference: idempotencyKey },
          { notes: { $regex: idempotencyKey } },
          {
            type: 'rent',
            status: 'paid',
            dueDate: {
              $gte: new Date(Date.UTC(autoPay.nextPaymentDate.getUTCFullYear(), autoPay.nextPaymentDate.getUTCMonth(), 1)),
              $lte: new Date(Date.UTC(autoPay.nextPaymentDate.getUTCFullYear(), autoPay.nextPaymentDate.getUTCMonth() + 1, 0)),
            },
          },
        ],
      });

      if (existingPayment) {
        logger.info(`[AUTOPAY CRON] Rent already paid for cycle ${cycleDateStr} on lease ${lease._id}. Advancing Auto-Pay cycle.`);
        const tenantPayments = await Payment.find({ lease: lease._id });
        const updatedSchedule = calculateNextPaymentDue(lease, tenantPayments);
        if (updatedSchedule?.nextPaymentDueAt) {
          autoPay.nextPaymentDate = new Date(updatedSchedule.nextPaymentDueAt);
          await autoPay.save();
        }
        continue;
      }

      // 2. Real Provider Execution Guard:
      // If Razorpay recurring charge capability is unconfigured on the current account:
      if (!isProviderReady) {
        logger.warn(`[AUTOPAY CRON] Razorpay recurring charge not configured for AutoPay ${autoPay._id}. Setting status to failed (No fake payment created).`);
        autoPay.lastPaymentStatus = 'failed';
        autoPay.failureCount += 1;
        autoPay.failureReason = 'Payment provider recurring capability unconfigured.';
        await autoPay.save();

        if (tenantUser) {
          await dispatchNotification({
            recipient: tenantUser._id,
            title: '⚠️ Auto-Pay Notice',
            message: `Automatic payment for ₹${(lease.rentAmount || 0).toLocaleString('en-IN')} could not be processed automatically. Please pay rent manually via the Pay Rent Now portal.`,
            type: 'alert',
            priority: 'high',
            relatedId: autoPay._id,
          });
        }
        continue;
      }

      // 3. Attempt Real Razorpay Recurring Charge
      try {
        const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
        const amountInPaise = Math.round(Number(lease.rentAmount || autoPay.monthlyAmount) * 100);

        // Call Razorpay recurring payment / mandate charge
        const rzpRecurringCharge = await rzp.payments.createRecurringPayment({
          email: tenantUser.email,
          contact: tenantUser.phone || '9999999999',
          amount: amountInPaise,
          currency: 'INR',
          order_id: autoPay.providerSubscriptionId || undefined,
          customer_id: autoPay.providerCustomerId || undefined,
          token: autoPay.providerTokenId,
          recurring: '1',
          description: `Auto-Pay Rent: ${property?.name || 'Property'} (${cycleDateStr})`,
          notes: {
            idempotencyKey,
            leaseId: lease._id.toString(),
            autoPayId: autoPay._id.toString(),
          },
        });

        // 4. Verify that the provider response actually captured/authorized the payment
        if (rzpRecurringCharge && ['captured', 'authorized'].includes(rzpRecurringCharge.status)) {
          const paymentRef = rzpRecurringCharge.id || idempotencyKey;

          // Create authoritative Payment record
          const tenantDoc = await Tenant.findOne({ email: tenantUser.email });
          const newPayment = await Payment.create({
            type: 'rent',
            lease: lease._id,
            tenant: tenantDoc?._id,
            property: property?._id,
            amount: lease.rentAmount || autoPay.monthlyAmount,
            amountPaid: lease.rentAmount || autoPay.monthlyAmount,
            paymentDate: new Date(),
            dueDate: autoPay.nextPaymentDate,
            status: 'paid',
            paymentMethod: 'other',
            reference: paymentRef,
            razorpayPaymentId: rzpRecurringCharge.id,
            notes: `Auto-Pay monthly rent payment - Cycle ${cycleDateStr} [${idempotencyKey}]`,
          });

          // Generate corresponding Bill & PDF Invoice
          try {
            const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
            const billNumber = `BILL-AP-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;
            const bill = await Bill.create({
              billNumber,
              type: 'rent',
              lease: lease._id,
              tenant: tenantDoc?._id,
              property: property?._id,
              status: 'paid',
              dueDate: autoPay.nextPaymentDate,
              billingPeriodStart: autoPay.nextPaymentDate,
              billingPeriodEnd: new Date(autoPay.nextPaymentDate.getTime() + 30 * 24 * 60 * 60 * 1000),
              breakdown: [{ label: 'Monthly Rent (Auto-Pay)', amount: lease.rentAmount || autoPay.monthlyAmount }],
              amountDue: lease.rentAmount || autoPay.monthlyAmount,
              amountPaid: lease.rentAmount || autoPay.monthlyAmount,
              payment: newPayment._id,
              timeline: [
                { status: 'generated', note: 'Rent invoice created automatically by Auto-Pay.' },
                { status: 'paid', note: `Paid automatically via Razorpay Auto-Pay (${paymentRef}).` },
              ],
            });

            newPayment.bill = bill._id;
            await newPayment.save();

            const viewModel = buildInvoiceViewModel(bill, newPayment);
            generateInvoicePDF(viewModel, tenantDoc, property, lease).then(async (pdfResult) => {
              if (pdfResult?.fileId) {
                bill.fileId = pdfResult.fileId;
                bill.invoiceUrl = `/api/files/download/${pdfResult.fileId}`;
                await bill.save();
                newPayment.fileId = pdfResult.fileId;
                newPayment.invoiceUrl = `/api/files/download/${pdfResult.fileId}`;
                await newPayment.save();
              }
            }).catch(() => {});
          } catch (billErr) {
            logger.warn(`[AUTOPAY CRON] Bill/PDF generation warning: ${billErr.message}`);
          }

          // Advance AutoPay to next cycle
          const allPayments = await Payment.find({ lease: lease._id });
          const nextSchedule = calculateNextPaymentDue(lease, allPayments);
          autoPay.lastPaymentDate = new Date();
          autoPay.lastPaymentStatus = 'success';
          autoPay.lastPaymentReference = paymentRef;
          autoPay.failureCount = 0;
          autoPay.failureReason = null;
          if (nextSchedule?.nextPaymentDueAt) {
            autoPay.nextPaymentDate = new Date(nextSchedule.nextPaymentDueAt);
          }
          await autoPay.save();

          logger.info(`[AUTOPAY CRON] Successfully processed Auto-Pay payment ${newPayment._id} for lease ${lease._id}`);

          // Send Success Notification
          await dispatchNotification({
            recipient: tenantUser._id,
            title: '✅ Auto-Pay Successful',
            message: `Your monthly rent of ₹${(lease.rentAmount || autoPay.monthlyAmount).toLocaleString('en-IN')} for ${property?.name || 'your residence'} was automatically paid successfully. Receipt is available in Payments.`,
            type: 'success',
            priority: 'high',
            relatedId: newPayment._id,
          });
        } else {
          throw new Error(rzpRecurringCharge?.error?.description || 'Recurring charge not captured');
        }
      } catch (chargeErr) {
        logger.error(`[AUTOPAY CRON] Recurring charge failed for AutoPay ${autoPay._id}: ${chargeErr.message}`);
        autoPay.lastPaymentStatus = 'failed';
        autoPay.failureCount += 1;
        autoPay.failureReason = chargeErr.message;
        await autoPay.save();

        if (tenantUser) {
          await dispatchNotification({
            recipient: tenantUser._id,
            title: '⚠️ Auto-Pay Payment Failed',
            message: `Automatic payment for ₹${(lease.rentAmount || autoPay.monthlyAmount).toLocaleString('en-IN')} failed. Reason: ${chargeErr.message}. Please pay your rent manually to avoid late fees.`,
            type: 'alert',
            priority: 'critical',
            severity: 'critical',
            relatedId: autoPay._id,
          });
        }
      }
    }
  } catch (err) {
    logger.error(`[AUTOPAY CRON] Severe exception during Auto-Pay sweep: ${err.message}`);
  }
};
