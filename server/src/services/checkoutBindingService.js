import crypto from 'crypto';
import mongoose from 'mongoose';
import CheckoutSession from '../models/CheckoutSession.js';
import Payment from '../models/Payment.js';
import { runTransactionWithRetry, TransactionOutcome } from '../utils/transactionRunner.js';
import { AppError } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';

/**
 * Derives a deterministic receipt ID within Razorpay's 40-character limit.
 *
 * Structure:
 * "r_" (2) + targetIdHex (24) + "_" (1) + periodSecHex (8) + "_" (1) + attemptHex (2) = 38 chars
 */
export function deriveDeterministicReceiptId(targetId, periodEpochSec, attempt = 1) {
  const targetHex = String(targetId).replace(/[^0-9a-fA-F]/g, '').slice(-24).padStart(24, '0').toLowerCase();
  const periodHex = Math.floor(Number(periodEpochSec) || 0).toString(16).padStart(8, '0').toLowerCase().slice(-8);
  const attemptHex = Math.max(1, Math.min(255, Number(attempt) || 1)).toString(16).padStart(2, '0').toLowerCase().slice(-2);

  const receiptId = `r_${targetHex}_${periodHex}_${attemptHex}`;
  if (receiptId.length > 40) {
    throw new Error(`Receipt ID length ${receiptId.length} exceeds 40 characters limit`);
  }
  return receiptId;
}

/**
 * Derives the deterministic CheckoutSession ID.
 *
 * Structure:
 * "chk_" (4) + targetHex (24) + "_" (1) + periodSecHex (8) = 37 chars
 */
export function deriveCheckoutSessionId(targetId, periodEpochSec) {
  const targetHex = String(targetId).replace(/[^0-9a-fA-F]/g, '').slice(-24).padStart(24, '0').toLowerCase();
  const periodHex = Math.floor(Number(periodEpochSec) || 0).toString(16).padStart(8, '0').toLowerCase().slice(-8);
  return `chk_${targetHex}_${periodHex}`;
}

/**
 * Atomically allocates a checkout attempt and claims dispatch ownership.
 * Fences off stale or concurrent workers.
 */
export async function claimCheckoutAttempt({
  targetId,
  targetType,
  tenantId,
  expectedAmountPaise,
  periodEpochSec,
  workerId = crypto.randomUUID(),
  claimTtlMs = 60000, // 1 minute dispatch claim lock
}) {
  const sessionId = deriveCheckoutSessionId(targetId, periodEpochSec);
  const now = new Date();
  const claimExpiresAt = new Date(now.getTime() + claimTtlMs);
  const sessionExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h lifetime

  // Step 1: Ensure session exists (idempotent upsert)
  await CheckoutSession.findOneAndUpdate(
    { _id: sessionId },
    {
      $setOnInsert: {
        _id: sessionId,
        targetId: new mongoose.Types.ObjectId(targetId),
        targetType,
        tenant: new mongoose.Types.ObjectId(tenantId),
        expectedAmountPaise,
        currency: 'INR',
        dispatchState: 'UNCLAIMED',
        currentAttempt: 0,
        expiresAt: sessionExpiresAt,
      },
    },
    { upsert: true, new: true }
  );

  // Step 2: Atomic dispatch claim
  // Worker can claim if session is UNCLAIMED, or if previous claim expired without being BOUND
  const claimed = await CheckoutSession.findOneAndUpdate(
    {
      _id: sessionId,
      $or: [
        { dispatchState: 'UNCLAIMED' },
        { dispatchState: 'CLAIMED', claimExpiresAt: { $lt: now } },
      ],
    },
    {
      $inc: { currentAttempt: 1 },
      $set: {
        dispatchState: 'CLAIMED',
        claimWorkerId: workerId,
        claimExpiresAt,
      },
    },
    { new: true }
  );

  if (!claimed) {
    // Another worker holds an active claim or order is already BOUND
    const current = await CheckoutSession.findById(sessionId);
    if (current && current.dispatchState === 'BOUND') {
      return {
        claimed: false,
        alreadyBound: true,
        activeOrderId: current.activeOrderId,
        activeReceiptId: current.activeReceiptId,
      };
    }
    return {
      claimed: false,
      alreadyBound: false,
      conflict: true,
      message: 'Concurrent attempt in progress by another worker',
    };
  }

  // Derive attempt-specific receipt ID
  const receiptId = deriveDeterministicReceiptId(targetId, periodEpochSec, claimed.currentAttempt);
  claimed.activeReceiptId = receiptId;
  await claimed.save();

  logger.info(`[CheckoutBinding] Worker ${workerId} claimed attempt ${claimed.currentAttempt} for session ${sessionId} (Receipt: ${receiptId})`);

  return {
    claimed: true,
    sessionId: claimed._id,
    attempt: claimed.currentAttempt,
    receiptId,
    workerId,
    expectedAmountPaise,
  };
}

/**
 * Atomically binds a gateway order ID to both CheckoutSession and Payment.
 */
export async function bindGatewayOrderToCheckoutAtomic({
  sessionId,
  attempt,
  workerId,
  razorpayOrderId,
  receiptId,
  paymentId,
  mongooseInstance = mongoose,
}) {
  const txnResult = await runTransactionWithRetry(
    async (session) => {
      // 1. Verify and bind CheckoutSession
      const chk = await CheckoutSession.findOneAndUpdate(
        {
          _id: sessionId,
          currentAttempt: attempt,
          claimWorkerId: workerId,
          dispatchState: 'CLAIMED',
        },
        {
          $set: {
            activeOrderId: razorpayOrderId,
            activeReceiptId: receiptId,
            dispatchState: 'BOUND',
          },
        },
        { session, new: true }
      );

      if (!chk) {
        throw new Error(`CheckoutSession ${sessionId} attempt ${attempt} claim expired or taken by another worker`);
      }

      // 2. Bind Payment if paymentId provided
      if (paymentId) {
        const pay = await Payment.findOneAndUpdate(
          {
            _id: paymentId,
            status: { $in: ['pending', 'partially_paid', 'overdue'] },
            $or: [
              { razorpayOrderId: { $exists: false } },
              { razorpayOrderId: null },
              { razorpayOrderId },
            ],
          },
          {
            $set: {
              razorpayOrderId,
            },
          },
          { session, new: true }
        );

        if (!pay) {
          throw new Error(`Payment ${paymentId} cannot be bound to order ${razorpayOrderId} (invalid state or conflicting order)`);
        }
      }

      return { session: chk, bound: true };
    },
    {
      clientOrMongoose: mongooseInstance,
      operationName: `BindOrder-${sessionId}`,
      reconciliationFn: async (session) => {
        const c = await CheckoutSession.findById(sessionId).session(session);
        if (c && c.activeOrderId === razorpayOrderId && c.dispatchState === 'BOUND') {
          return { confirmedCommitted: true, result: { bound: true } };
        }
        return { confirmedCommitted: false };
      },
    }
  );

  if (txnResult.outcome === TransactionOutcome.COMMITTED) {
    logger.info(`[CheckoutBinding] Successfully BOUND order ${razorpayOrderId} to session ${sessionId}`);
    return { bound: true, outcome: TransactionOutcome.COMMITTED };
  }

  if (txnResult.outcome === TransactionOutcome.INDETERMINATE_COMMIT) {
    logger.error(`[CheckoutBinding] Order binding INDETERMINATE for session ${sessionId}, order ${razorpayOrderId}`);
    return {
      bound: false,
      indeterminate: true,
      outcome: TransactionOutcome.INDETERMINATE_COMMIT,
      message: 'Commit outcome indeterminate; requires manual reconciliation',
    };
  }

  logger.warn(`[CheckoutBinding] Order binding aborted with outcome ${txnResult.outcome}`);
  return {
    bound: false,
    indeterminate: false,
    outcome: txnResult.outcome,
    error: txnResult.error?.message,
  };
}
