import crypto from 'crypto';
import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import OfflineRecoveryApproval from '../models/OfflineRecoveryApproval.js';
import { calculatePaymentBreakdown } from './platformFeeService.js';
import { runTransactionWithRetry, TransactionOutcome } from '../utils/transactionRunner.js';
import { AppError } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';

const getApprovalSecret = () => process.env.OFFLINE_APPROVAL_SECRET || process.env.JWT_SECRET || 'tms_super_admin_offline_secret_key';

/**
 * Generates an HMAC-SHA256 signature for Four-Eyes approval verification.
 */
export function generateApprovalSignature(approvalId, paymentId, expectedPaise, superAdminId) {
  const secret = getApprovalSecret();
  const payload = `${approvalId}|${paymentId}|${expectedPaise}|${superAdminId}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Validates the HMAC-SHA256 signature.
 */
export function verifyApprovalSignature(approvalId, paymentId, expectedPaise, superAdminId, signature) {
  if (!signature) return false;
  const expected = generateApprovalSignature(approvalId, paymentId, expectedPaise, superAdminId);
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
}

/**
 * Step 1: Propose an offline recovery settlement.
 * Can be initiated by a manager or property accountant.
 */
export async function proposeOfflineRecovery({
  paymentId,
  proposedByUser,
  expectedPaise,
  currency = 'INR',
  proposalReason,
  evidenceIdentifier,
}) {
  if (!paymentId || !proposedByUser || !expectedPaise || !proposalReason || !evidenceIdentifier) {
    throw new AppError('Missing required parameters for offline recovery proposal', 400);
  }

  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new AppError('Payment not found', 404);
  }

  if (payment.status === 'paid') {
    throw new AppError('Payment obligation has already been fully settled', 400);
  }

  // Calculate gross obligation and exact unpaid balance in integer paise
  const grossObligation = payment.totalAmount || payment.amount;
  const alreadyPaid = payment.amountPaid || 0;
  const unpaidBalance = Math.max(0, grossObligation - alreadyPaid);
  const calculatedUnpaidPaise = Math.round(unpaidBalance * 100);

  if (Math.round(expectedPaise) !== calculatedUnpaidPaise) {
    throw new AppError(
      `Proposed amount (${expectedPaise} paise) does not match exact unpaid balance (${calculatedUnpaidPaise} paise)`,
      400
    );
  }

  if ((payment.currency || 'INR').toUpperCase() !== currency.toUpperCase()) {
    throw new AppError(`Currency mismatch: Payment is in ${payment.currency}, proposed is in ${currency}`, 400);
  }

  // Check if an active proposal already exists for this payment
  const existingActive = await OfflineRecoveryApproval.findOne({
    payment: payment._id,
    status: { $in: ['PENDING_SUPER_ADMIN_APPROVAL', 'APPROVED'] },
  });
  if (existingActive) {
    throw new AppError('An active offline recovery proposal already exists for this payment', 409);
  }

  // Check if evidenceIdentifier was already used
  const existingEvidence = await OfflineRecoveryApproval.findOne({
    evidenceIdentifier,
    status: { $in: ['APPROVED', 'CONSUMED'] },
  });
  if (existingEvidence) {
    throw new AppError(`Evidence identifier ${evidenceIdentifier} has already been registered or consumed`, 409);
  }

  const proposal = await OfflineRecoveryApproval.create({
    payment: payment._id,
    tenant: payment.tenant,
    property: payment.property,
    expectedPaise: calculatedUnpaidPaise,
    currency,
    proposedBy: proposedByUser._id,
    proposedAt: new Date(),
    proposalReason,
    evidenceIdentifier,
    status: 'PENDING_SUPER_ADMIN_APPROVAL',
  });

  logger.info(`[OfflineSettlement] Created recovery proposal ${proposal._id} for Payment ${payment._id} (₹${unpaidBalance})`);
  return proposal;
}

/**
 * Step 2: Super Admin Four-Eyes Approval.
 * Enforces that the approving super admin is distinct from the proposer.
 */
export async function approveOfflineRecovery({
  approvalId,
  superAdminUser,
}) {
  if (!approvalId || !superAdminUser) {
    throw new AppError('Missing approvalId or superAdminUser', 400);
  }

  const approval = await OfflineRecoveryApproval.findById(approvalId);
  if (!approval) {
    throw new AppError('Offline recovery proposal not found', 404);
  }

  if (approval.status !== 'PENDING_SUPER_ADMIN_APPROVAL') {
    throw new AppError(`Cannot approve proposal in status "${approval.status}"`, 400);
  }

  // FOUR-EYES ENFORCEMENT: Proposer CANNOT approve their own proposal!
  if (approval.proposedBy.toString() === superAdminUser._id.toString()) {
    logger.warn(`[OfflineSettlement] Four-Eyes violation: User ${superAdminUser._id} attempted to self-approve proposal ${approval._id}`);
    throw new AppError('Four-Eyes policy violation: You cannot approve a proposal you created', 403);
  }

  // Role validation: Approver must be an authentic Super Administrator (super_admin role or isSuperAdmin flag)
  const isSuper = superAdminUser.role === 'super_admin' || superAdminUser.isSuperAdmin === true;
  if (!isSuper) {
    throw new AppError('Forbidden: Only Super Administrators can approve offline settlements', 403);
  }

  const approvedAt = new Date();
  const signature = generateApprovalSignature(
    approval._id.toString(),
    approval.payment.toString(),
    approval.expectedPaise,
    superAdminUser._id.toString()
  );

  approval.status = 'APPROVED';
  approval.approvedBy = superAdminUser._id;
  approval.approvedAt = approvedAt;
  approval.approvalSignature = signature;
  await approval.save();

  logger.info(`[OfflineSettlement] Proposal ${approval._id} approved by Super Admin ${superAdminUser._id}`);
  return approval;
}

/**
 * Step 3: Atomic Settlement Execution.
 * Executes offline settlement inside a multi-document transaction with the 5-outcome runner.
 */
export async function executeOfflineRecoverySettlementAtomic({
  approvalId,
  executorUser,
  mongooseInstance = mongoose,
}) {
  const approval = await OfflineRecoveryApproval.findById(approvalId);
  if (!approval) {
    throw new AppError('Approval not found', 404);
  }

  if (approval.status === 'CONSUMED') {
    throw new AppError('This approval has already been consumed and settled', 409);
  }

  if (approval.status !== 'APPROVED') {
    throw new AppError(`Cannot execute settlement for proposal in status "${approval.status}"`, 400);
  }

  // Verify cryptographic Four-Eyes signature
  const isSigValid = verifyApprovalSignature(
    approval._id.toString(),
    approval.payment.toString(),
    approval.expectedPaise,
    approval.approvedBy.toString(),
    approval.approvalSignature
  );

  if (!isSigValid) {
    logger.error(`[OfflineSettlement] Cryptographic signature invalid for approval ${approval._id}`);
    approval.status = 'REJECTED';
    approval.discrepancyNotes = 'Cryptographic Four-Eyes signature validation failed at execution time';
    await approval.save();
    throw new AppError('Invalid approval signature. Settlement aborted for security reasons.', 403);
  }

  let finalPayment = null;
  let finalTransaction = null;

  const txnResult = await runTransactionWithRetry(
    async (session) => {
      // 1. Atomically consume the approval within transaction
      const lockedApproval = await OfflineRecoveryApproval.findOneAndUpdate(
        { _id: approvalId, status: 'APPROVED' },
        {
          $set: {
            status: 'CONSUMED',
            consumedAt: new Date(),
          },
        },
        { session, new: true }
      );

      if (!lockedApproval) {
        throw new AppError('Concurrent execution conflict: Approval already consumed or modified', 409);
      }

      // 2. Fetch Payment within session
      const payment = await Payment.findById(lockedApproval.payment).session(session);
      if (!payment) {
        throw new AppError('Payment record not found within transaction', 404);
      }

      if (payment.status === 'paid') {
        throw new AppError('Payment is already marked as paid', 400);
      }

      // 3. Verify exact integer paise balance
      const grossObligation = payment.totalAmount || payment.amount;
      const alreadyPaid = payment.amountPaid || 0;
      const currentUnpaidPaise = Math.round(Math.max(0, grossObligation - alreadyPaid) * 100);

      if (lockedApproval.expectedPaise !== currentUnpaidPaise) {
        throw new AppError(
          `Financial balance conflict: Expected ${lockedApproval.expectedPaise} paise, but unpaid balance is ${currentUnpaidPaise} paise`,
          409
        );
      }

      // 4. Verify no duplicate receipt reference already recorded
      const hasDuplicateReceipt = (payment.receipts || []).some(
        (r) => r.reference && r.reference === lockedApproval.evidenceIdentifier
      );
      if (hasDuplicateReceipt) {
        throw new AppError(`Receipt with reference ${lockedApproval.evidenceIdentifier} already recorded on payment`, 409);
      }

      const incrementalPaid = lockedApproval.expectedPaise / 100;
      const newAmountPaid = alreadyPaid + incrementalPaid;

      // 5. Calculate and lock authoritative ledger values
      const breakdown = await calculatePaymentBreakdown(payment.rentAmount || payment.amount);

      payment.receipts.push({
        amount: incrementalPaid,
        date: lockedApproval.approvedAt || new Date(),
        method: 'transfer',
        reference: lockedApproval.evidenceIdentifier,
      });

      payment.amountPaid = newAmountPaid;
      payment.status = 'paid';
      payment.paidAt = new Date();
      payment.paymentDate = lockedApproval.approvedAt || new Date();

      // Preserve / establish synchronized financial ledger
      payment.managerGrossAmount = breakdown.managerGrossAmount;
      payment.managerCommission = breakdown.managerCommission;
      payment.managerNetAmount = breakdown.managerNetAmount;
      payment.platformFee = breakdown.platformFee;
      payment.taxAmount = breakdown.taxAmount;
      payment.totalAmount = breakdown.totalPayable;

      // 6. Upsert PaymentTransaction ledger record
      let transaction = await PaymentTransaction.findOne({ payment: payment._id }).session(session);

      const txnData = {
        payment: payment._id,
        tenant: payment.tenant,
        lease: payment.lease,
        property: payment.property,
        manager: payment.owner,
        rentAmount: breakdown.rentAmount,
        platformFee: breakdown.platformFee,
        platformFeePercentage: breakdown.platformFeePercentage,
        platformTax: breakdown.taxAmount,
        managerCommission: breakdown.managerCommission,
        managerCommissionPercentage: breakdown.managerCommissionPercentage,
        managerGrossAmount: breakdown.managerGrossAmount,
        managerNetAmount: breakdown.managerNetAmount,
        platformRevenue: breakdown.platformRevenue,
        totalAmount: breakdown.totalPayable,
        currency: payment.currency || 'INR',
        feePayer: breakdown.feePayer,
        razorpayPaymentId: `offline_${lockedApproval.evidenceIdentifier}`,
        status: 'paid',
        netPlatformRevenue: breakdown.platformRevenue,
      };

      if (transaction) {
        Object.assign(transaction, txnData);
        await transaction.save({ session });
      } else {
        const created = await PaymentTransaction.create([txnData], { session });
        transaction = created[0];
      }

      payment.transaction = transaction._id;
      lockedApproval.consumedByTransaction = transaction._id;

      await payment.save({ session });
      await lockedApproval.save({ session });

      finalPayment = payment;
      finalTransaction = transaction;

      return { payment, transaction, approval: lockedApproval };
    },
    {
      clientOrMongoose: mongooseInstance,
      operationName: `OfflineSettlement-${approvalId}`,
      reconciliationFn: async (session) => {
        const checkAppr = await OfflineRecoveryApproval.findById(approvalId).session(session);
        const checkPay = await Payment.findById(approval.payment).session(session);
        if (checkAppr && checkAppr.status === 'CONSUMED' && checkPay && checkPay.status === 'paid') {
          return { confirmedCommitted: true, result: { payment: checkPay, approval: checkAppr } };
        }
        return { confirmedCommitted: false };
      },
    }
  );

  if (txnResult.outcome === TransactionOutcome.COMMITTED) {
    logger.info(`[OfflineSettlement] Settlement COMMITTED successfully for Approval ${approvalId}`);
    return {
      success: true,
      outcome: TransactionOutcome.COMMITTED,
      payment: finalPayment || txnResult.result?.payment,
      transaction: finalTransaction || txnResult.result?.transaction,
    };
  }

  if (txnResult.outcome === TransactionOutcome.INDETERMINATE_COMMIT) {
    logger.error(`[OfflineSettlement] Settlement reached INDETERMINATE_COMMIT for Approval ${approvalId}. Quarantining.`);
    await OfflineRecoveryApproval.findByIdAndUpdate(approvalId, {
      status: 'COMMIT_INDETERMINATE',
      discrepancyNotes: 'Transaction commit outcome unknown after retries. Manual operator reconciliation required.',
    });
    return {
      success: false,
      outcome: TransactionOutcome.INDETERMINATE_COMMIT,
      message: 'Commit outcome indeterminate; quarantined for manual operator review.',
    };
  }

  if (txnResult.outcome === TransactionOutcome.DUPLICATE_KEY_CONFLICT) {
    logger.warn(`[OfflineSettlement] Duplicate key conflict on Approval ${approvalId}.`);
    return {
      success: false,
      outcome: TransactionOutcome.DUPLICATE_KEY_CONFLICT,
      error: txnResult.error?.message,
    };
  }

  throw new AppError(`Settlement execution failed: ${txnResult.error?.message || 'Transaction aborted'}`, 500);
}
