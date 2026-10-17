import crypto from 'crypto';
import Razorpay from 'razorpay';
import config from '../config/config.js';
import { AppError } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';

/**
 * Checks whether mock payments are enabled globally for the environment.
 */
export function isMockPaymentsEnabled() {
  return process.env.ENABLE_MOCK_PAYMENTS === 'true' || config.ENABLE_MOCK_PAYMENTS === true;
}

/**
 * Instantiates and returns a live Razorpay SDK client.
 * Strictly enforces that:
 * 1. Live client creation is BLOCKED if ENABLE_MOCK_PAYMENTS is true.
 * 2. Missing credentials throw 503 instead of falling back to embedded/hardcoded keys.
 */
export function getRazorpayClient() {
  if (isMockPaymentsEnabled()) {
    throw new AppError('Live payment gateway client creation is strictly blocked when ENABLE_MOCK_PAYMENTS is enabled', 400);
  }

  const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();

  if (!keyId || !keySecret) {
    throw new AppError('Razorpay payment gateway credentials not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing)', 503);
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

/**
 * Creates a server-side mock order for rent / bill payment.
 */
export function createMockRentOrder({ amountInPaise, leaseId, receiptId, notes = {} }) {
  if (!isMockPaymentsEnabled()) {
    throw new AppError('createMockRentOrder called when ENABLE_MOCK_PAYMENTS is disabled', 400);
  }

  const mockOrderId = `order_mock_${crypto.randomBytes(12).toString('hex')}`;
  logger.info(`[MockPayment] Generated mock rent order: ${mockOrderId} for amount: ${amountInPaise} paise`);

  return {
    id: mockOrderId,
    entity: 'order',
    amount: amountInPaise,
    currency: 'INR',
    receipt: receiptId || (leaseId ? `rcpt_mock_${String(leaseId).slice(-8)}` : `rcpt_mock_${Date.now()}`),
    status: 'created',
    notes,
    isMock: true,
  };
}

/**
 * Creates a server-side mock order for booking payment.
 */
export function createMockBookingOrder({ amountInPaise, bookingId, notes = {} }) {
  if (!isMockPaymentsEnabled()) {
    throw new AppError('createMockBookingOrder called when ENABLE_MOCK_PAYMENTS is disabled', 400);
  }

  const mockOrderId = `order_mock_bk_${crypto.randomBytes(12).toString('hex')}`;
  logger.info(`[MockPayment] Generated mock booking order: ${mockOrderId} for booking: ${bookingId}`);

  return {
    id: mockOrderId,
    entity: 'order',
    amount: amountInPaise,
    currency: 'INR',
    receipt: bookingId ? `rcpt_mock_${String(bookingId).slice(-8)}` : `rcpt_mock_${Date.now()}`,
    status: 'created',
    notes,
    isMock: true,
  };
}

/**
 * Creates a server-side mock order for subscription upgrade.
 */
export function createMockSubscriptionOrder({ amountInPaise, userId, planId, billingCycle, notes = {} }) {
  if (!isMockPaymentsEnabled()) {
    throw new AppError('createMockSubscriptionOrder called when ENABLE_MOCK_PAYMENTS is disabled', 400);
  }

  const mockOrderId = `order_mock_sub_${crypto.randomBytes(12).toString('hex')}`;
  logger.info(`[MockPayment] Generated mock subscription order: ${mockOrderId} for plan: ${planId}`);

  return {
    id: mockOrderId,
    entity: 'order',
    amount: amountInPaise,
    currency: 'INR',
    status: 'created',
    notes: { ...notes, planId, billingCycle, userId: String(userId) },
    isMock: true,
  };
}

/**
 * Creates a server-side mock order for maintenance fee.
 */
export function createMockMaintenanceOrder({ amountInPaise, leaseId, notes = {} }) {
  if (!isMockPaymentsEnabled()) {
    throw new AppError('createMockMaintenanceOrder called when ENABLE_MOCK_PAYMENTS is disabled', 400);
  }

  const mockOrderId = `order_mock_maint_${crypto.randomBytes(12).toString('hex')}`;
  logger.info(`[MockPayment] Generated mock maintenance order: ${mockOrderId} for lease: ${leaseId}`);

  return {
    id: mockOrderId,
    entity: 'order',
    amount: amountInPaise,
    currency: 'INR',
    status: 'created',
    notes,
    isMock: true,
  };
}

/**
 * Generates a deterministic mock signature for mock payments.
 */
export function generateMockSignature(orderId, paymentId) {
  return `mock_sig_${crypto.createHash('sha256').update(`${orderId}|${paymentId}|mock_staging_salt`).digest('hex')}`;
}

/**
 * Validates a mock signature in mock payment mode.
 */
export function verifyMockSignature(orderId, paymentId, signature) {
  if (!signature) return false;
  if (signature === 'mock_signature_data' || signature === 'mock_signature') return true;
  const expected = generateMockSignature(orderId, paymentId);
  return signature === expected;
}

/**
 * Verifies and constructs a trusted mock payment entity based on authoritative server calculations.
 * Client request body CANNOT dictate payment success or amount.
 */
export function verifyMockPayment({ orderId, paymentId, expectedAmountPaise, expectedCurrency = 'INR' }) {
  if (!isMockPaymentsEnabled()) {
    throw new AppError('verifyMockPayment called when ENABLE_MOCK_PAYMENTS is disabled', 400);
  }

  if (!orderId || !paymentId) {
    throw new AppError('Missing mock payment verification parameters (orderId, paymentId)', 400);
  }

  const isValidMockOrderId = orderId.startsWith('order_mock_') || orderId.startsWith('order_test_');
  const isValidMockPaymentId = paymentId.startsWith('pay_mock_') || paymentId.startsWith('mock_pay_') || paymentId.startsWith('pay_test_');

  if (!isValidMockOrderId) {
    throw new AppError(`Invalid mock order ID format: ${orderId}`, 400);
  }
  if (!isValidMockPaymentId) {
    throw new AppError(`Invalid mock payment ID format: ${paymentId}`, 400);
  }

  return {
    id: paymentId,
    order_id: orderId,
    amount: expectedAmountPaise,
    currency: expectedCurrency,
    status: 'captured',
    method: 'mock',
    isMock: true,
  };
}

/**
 * Executes an offline durable mock refund without calling external gateway APIs.
 */
export function executeMockRefund({ payment, refundAmount, reason, refundIntentId }) {
  if (!isMockPaymentsEnabled() && !payment?.isMock) {
    throw new AppError('executeMockRefund called on non-mock payment while mock mode is disabled', 400);
  }

  const mockRefundId = `rfnd_mock_${crypto.randomBytes(8).toString('hex')}`;
  const amountPaise = Math.round(Number(refundAmount) * 100);

  logger.info(`[MockRefund] Processed mock refund ${mockRefundId} for payment ${payment?._id || payment}: ₹${refundAmount}`);

  return {
    id: mockRefundId,
    entity: 'refund',
    amount: amountPaise,
    currency: 'INR',
    payment_id: payment?.razorpayPaymentId || `pay_mock_${Date.now()}`,
    status: 'processed',
    notes: {
      reason,
      refundIntentId: refundIntentId ? String(refundIntentId) : undefined,
    },
    isMock: true,
  };
}
