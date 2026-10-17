import crypto from 'crypto';
import Payment from '../models/Payment.js';
import RefundIntent from '../models/RefundIntent.js';
import { handleRevenueRefund } from './platformFeeService.js';
import { AppError } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';
import { isMockPaymentsEnabled, executeMockRefund } from './paymentGatewayService.js';

/**
 * Checks if an error represents an uncertain network outcome where refund might have succeeded at gateway.
 */
export function isUncertainGatewayError(error) {
  if (!error) return false;
  const msg = error.message ? error.message.toLowerCase() : '';
  const name = error.name ? error.name.toLowerCase() : '';

  if (
    msg.includes('timeout') ||
    msg.includes('etimedout') ||
    msg.includes('econnreset') ||
    msg.includes('socket hang up') ||
    msg.includes('network') ||
    name.includes('timeout') ||
    name.includes('network') ||
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT'
  ) {
    return true;
  }
  return false;
}

/**
 * Initiates a durable refund with mandatory pre-call persistence, cumulative bounds checking,
 * and strict refusal to automatically redispatch indeterminate outcomes.
 */
export async function initiateDurableRefund({
  paymentId,
  refundAmount,
  reason,
  requestedByUser,
  idempotencyKey = null,
  razorpayClient = null,
}) {
  if (!paymentId || !refundAmount || !reason || !requestedByUser) {
    throw new AppError('Missing required parameters for durable refund', 400);
  }

  const isPrivileged = requestedByUser.role === 'admin' || requestedByUser.role === 'super_admin' || requestedByUser.isSuperAdmin === true;
  if (!isPrivileged) {
    throw new AppError('Forbidden: Only Administrators or Super Administrators can initiate payment refunds', 403);
  }

  const numRefundAmount = Math.round(Number(refundAmount) * 100) / 100;
  if (isNaN(numRefundAmount) || numRefundAmount <= 0) {
    throw new AppError('Refund amount must be a positive number', 400);
  }

  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new AppError('Payment obligation not found', 404);
  }

  if (!['paid', 'partially_refunded'].includes(payment.status)) {
    throw new AppError(`Cannot refund payment in status "${payment.status}"`, 400);
  }

  if (!payment.razorpayPaymentId) {
    throw new AppError('Payment does not have a gateway payment ID (razorpayPaymentId) to refund', 400);
  }

  // Cumulative Refund Bounds Checking
  const grossPaid = payment.amountPaid || payment.totalAmount || payment.amount || 0;
  const alreadyRefunded = payment.refundedAmount || 0;
  const maxRefundable = Math.round(Math.max(0, grossPaid - alreadyRefunded) * 100) / 100;

  if (numRefundAmount > maxRefundable) {
    throw new AppError(
      `Requested refund (₹${numRefundAmount}) exceeds remaining refundable balance (₹${maxRefundable})`,
      400
    );
  }

  const amountPaise = Math.round(numRefundAmount * 100);
  const effectiveIdempotencyKey = idempotencyKey || `ref_${payment._id}_${amountPaise}_${Date.now()}`;

  // Step 1: Check Idempotency / Replay
  let refundIntent = await RefundIntent.findOne({ idempotencyKey: effectiveIdempotencyKey });
  if (refundIntent) {
    if (refundIntent.status === 'SETTLED') {
      logger.info(`[RefundService] Replay detected: RefundIntent ${refundIntent._id} is already SETTLED`);
      return {
        success: true,
        status: 'SETTLED',
        alreadySettled: true,
        refundIntent,
      };
    }
    if (refundIntent.status === 'REFUND_INDETERMINATE') {
      logger.warn(`[RefundService] Replay rejected: RefundIntent ${refundIntent._id} is in REFUND_INDETERMINATE quarantine`);
      return {
        success: false,
        status: 'REFUND_INDETERMINATE',
        quarantined: true,
        message: 'Refund outcome is indeterminate; automatic redispatch is strictly prohibited',
      };
    }
    if (refundIntent.status === 'GATEWAY_DISPATCHED') {
      logger.warn(`[RefundService] Concurrent dispatch in progress for RefundIntent ${refundIntent._id}`);
      return {
        success: false,
        status: 'GATEWAY_DISPATCHED',
        inProgress: true,
        message: 'Refund dispatch is currently in progress',
      };
    }
  }

  // Step 2: Durable Pre-Call Persistence
  if (!refundIntent) {
    refundIntent = await RefundIntent.create({
      payment: payment._id,
      transaction: payment.transaction,
      amount: numRefundAmount,
      amountPaise,
      currency: payment.currency || 'INR',
      reason,
      requestedBy: requestedByUser._id,
      idempotencyKey: effectiveIdempotencyKey,
      gatewayPaymentId: payment.razorpayPaymentId,
      status: 'INTENT_PERSISTED',
    });
    logger.info(`[RefundService] Persisted durable RefundIntent ${refundIntent._id} before gateway dispatch (₹${numRefundAmount})`);
  }

  // Step 3: Transition to GATEWAY_DISPATCHED
  refundIntent.status = 'GATEWAY_DISPATCHED';
  refundIntent.dispatchedAt = new Date();
  refundIntent.dispatchAttempts += 1;
  await refundIntent.save();

  // Step 4: Dispatch Gateway Call (or execute offline mock refund if in mock mode)
  let gatewayResponse = null;
  const isMockPayment = isMockPaymentsEnabled() || payment.isMock === true || (payment.razorpayPaymentId && (payment.razorpayPaymentId.startsWith('pay_mock_') || payment.razorpayPaymentId.startsWith('mock_pay_')));

  try {
    if (isMockPayment) {
      gatewayResponse = executeMockRefund({
        payment,
        refundAmount: numRefundAmount,
        reason,
        refundIntentId: refundIntent._id,
      });
    } else {
      if (!razorpayClient) {
        throw new AppError('Gateway client not configured for refund dispatch', 500);
      }

      gatewayResponse = await razorpayClient.payments.refund(payment.razorpayPaymentId, {
        amount: amountPaise,
        notes: {
          reason,
          refundIntentId: refundIntent._id.toString(),
          paymentId: payment._id.toString(),
        },
      });

      logger.info(`[RefundService] Gateway refund response received: id=${gatewayResponse.id}, status=${gatewayResponse.status}`);
    }
  } catch (gatewayErr) {
    const isUncertain = isUncertainGatewayError(gatewayErr);
    if (isUncertain) {
      // NEVER automatically redispatch an uncertain refund!
      logger.error(`[RefundService] Gateway refund outcome UNCERTAIN for RefundIntent ${refundIntent._id}: ${gatewayErr.message}`);
      refundIntent.status = 'REFUND_INDETERMINATE';
      refundIntent.lastError = gatewayErr.message;
      await refundIntent.save();

      return {
        success: false,
        status: 'REFUND_INDETERMINATE',
        quarantined: true,
        message: 'Gateway refund timed out or returned uncertain outcome. Quarantined; automatic redispatch prohibited.',
      };
    }

    // Definite failure (e.g. 400 Bad Request, invalid payment, already fully refunded)
    logger.error(`[RefundService] Gateway refund failed definitively: ${gatewayErr.message}`);
    refundIntent.status = 'FAILED';
    refundIntent.lastError = gatewayErr.message;
    await refundIntent.save();

    return {
      success: false,
      status: 'FAILED',
      error: gatewayErr.message,
    };
  }

  // Step 5: Settle Refund Durably
  refundIntent.status = 'SETTLED';
  refundIntent.gatewayRefundId = gatewayResponse?.id || `rfnd_${Date.now()}`;
  refundIntent.settledAt = new Date();
  await refundIntent.save();

  // Update Payment record cumulative refund accounting
  const newRefundedTotal = Math.round((alreadyRefunded + numRefundAmount) * 100) / 100;
  payment.refundedAmount = newRefundedTotal;
  payment.status = newRefundedTotal >= grossPaid ? 'refunded' : 'partially_refunded';
  await payment.save();

  // Update PaymentTransaction revenue split and reversal accounting
  try {
    const updatedTxn = await handleRevenueRefund(payment._id, numRefundAmount, reason);
    if (updatedTxn) {
      refundIntent.reversalBreakdown = {
        refundedAmount: updatedTxn.refundedAmount,
        reversedPlatformFee: updatedTxn.reversedPlatformFee,
        netPlatformRevenue: updatedTxn.netPlatformRevenue,
      };
      await refundIntent.save();
    }
  } catch (revErr) {
    logger.warn(`[RefundService] Revenue ledger refund update non-fatal warning: ${revErr.message}`);
  }

  logger.info(`[RefundService] Successfully SETTLED refund ${refundIntent._id} for Payment ${payment._id} (₹${numRefundAmount})`);

  return {
    success: true,
    status: 'SETTLED',
    refundIntent,
    payment,
  };
}
