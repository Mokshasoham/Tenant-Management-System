import PlatformSetting from '../models/PlatformSetting.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import Payment from '../models/Payment.js';
import logger from '../utils/logger.js';

/**
 * Default fallback platform settings
 */
const DEFAULT_CONFIG = {
  platformFeeEnabled: true,
  platformFeeType: 'percentage',
  platformFeePercentage: 1.0, // 1% initial platform fee
  platformFeeFixedAmount: 0,
  platformFeePayer: 'tenant',
  platformFeeTaxPercentage: 0,
  managerCommissionEnabled: false,
  managerCommissionPercentage: 0,
};

/**
 * Retrieve active platform fee and commission settings
 */
export async function getPlatformFeeConfig() {
  try {
    let config = await PlatformSetting.findOne().sort({ createdAt: -1 });
    if (!config) {
      config = await PlatformSetting.create(DEFAULT_CONFIG);
      logger.info('[PlatformFee] Initialized default platform fee settings (1% tenant fee, 0% commission).');
    }
    return config;
  } catch (err) {
    logger.warn(`[PlatformFee] Error fetching platform settings, using defaults: ${err.message}`);
    return DEFAULT_CONFIG;
  }
}

/**
 * Server-side calculation of payment breakdown
 * NEVER trust client-submitted platform fee or total amounts!
 *
 * Example:
 * rentAmount = 15000, 1% fee ->
 * platformFee = 150, taxAmount = 0, totalPayable = 15150
 * managerGrossAmount = 15000, managerCommission = 0, managerNetAmount = 15000
 * platformRevenue = 150
 */
export async function calculatePaymentBreakdown(rentAmountInput) {
  const rentAmount = Math.max(0, Number(rentAmountInput) || 0);
  const config = await getPlatformFeeConfig();

  let platformFee = 0;
  if (config.platformFeeEnabled && rentAmount > 0) {
    if (config.platformFeeType === 'percentage') {
      platformFee = Math.round((rentAmount * (config.platformFeePercentage / 100)) * 100) / 100;
    } else if (config.platformFeeType === 'fixed') {
      platformFee = Math.round((config.platformFeeFixedAmount || 0) * 100) / 100;
    }
  }

  // Applicable tax on platform fee
  let taxAmount = 0;
  if (config.platformFeeTaxPercentage > 0 && platformFee > 0) {
    taxAmount = Math.round((platformFee * (config.platformFeeTaxPercentage / 100)) * 100) / 100;
  }

  // Manager Commission (0% by default unless enabled)
  let managerCommission = 0;
  if (config.managerCommissionEnabled && config.managerCommissionPercentage > 0 && rentAmount > 0) {
    managerCommission = Math.round((rentAmount * (config.managerCommissionPercentage / 100)) * 100) / 100;
  }

  const managerGrossAmount = rentAmount;
  const managerNetAmount = Math.max(0, rentAmount - managerCommission);

  // Total payable by payer
  let totalPayable = rentAmount;
  const feePayer = config.platformFeePayer || 'tenant';

  if (feePayer === 'tenant') {
    totalPayable = rentAmount + platformFee + taxAmount;
  } else if (feePayer === 'manager') {
    totalPayable = rentAmount;
  } else if (feePayer === 'split') {
    const halfFee = Math.round(((platformFee + taxAmount) / 2) * 100) / 100;
    totalPayable = rentAmount + halfFee;
  }

  // Net Platform Revenue earned by TMS
  const platformRevenue = platformFee + managerCommission;

  return {
    rentAmount,
    platformFee,
    platformFeePercentage: config.platformFeePercentage,
    platformFeeType: config.platformFeeType,
    taxAmount,
    taxPercentage: config.platformFeeTaxPercentage,
    managerCommission,
    managerCommissionPercentage: config.managerCommissionPercentage,
    managerGrossAmount,
    managerNetAmount,
    totalPayable: Math.round(totalPayable * 100) / 100,
    totalAmount: Math.round(totalPayable * 100) / 100,
    platformRevenue,
    currency: 'INR',
    feePayer,
    feeEnabled: config.platformFeeEnabled,
  };
}

/**
 * Idempotently record verified revenue into the PaymentTransaction immutable ledger
 * Called ONLY after Razorpay HMAC signature or captured status is verified.
 */
export async function recordVerifiedRevenue(data) {
  const {
    paymentId,
    tenantId,
    leaseId,
    propertyId,
    managerId,
    rentAmount,
    platformFee,
    platformFeePercentage,
    platformTax,
    managerCommission,
    managerCommissionPercentage,
    managerGrossAmount,
    managerNetAmount,
    providerFee = 0,
    providerTax = 0,
    platformRevenue,
    totalAmount,
    currency = 'INR',
    feePayer = 'tenant',
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  } = data;

  if (!paymentId) {
    throw new Error('paymentId is required to record verified revenue');
  }

  // Idempotency: Check if transaction already exists for this payment or razorpayPaymentId
  const filter = razorpayPaymentId 
    ? { $or: [{ payment: paymentId }, { razorpayPaymentId }] }
    : { payment: paymentId };

  let transaction = await PaymentTransaction.findOne(filter);

  const transactionData = {
    payment: paymentId,
    tenant: tenantId || null,
    lease: leaseId || null,
    property: propertyId || null,
    manager: managerId || null,
    rentAmount: rentAmount || 0,
    platformFee: platformFee || 0,
    platformFeePercentage: platformFeePercentage || 0,
    platformTax: platformTax || 0,
    managerCommission: managerCommission || 0,
    managerCommissionPercentage: managerCommissionPercentage || 0,
    managerGrossAmount: managerGrossAmount || rentAmount || 0,
    managerNetAmount: managerNetAmount !== undefined ? managerNetAmount : (rentAmount || 0),
    providerFee: providerFee || 0,
    providerTax: providerTax || 0,
    platformRevenue: platformRevenue !== undefined ? platformRevenue : (platformFee || 0),
    totalAmount: totalAmount || (rentAmount + (platformFee || 0)),
    currency,
    feePayer,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    status: 'paid',
    netPlatformRevenue: platformRevenue !== undefined ? platformRevenue : (platformFee || 0),
  };

  if (transaction) {
    Object.assign(transaction, transactionData);
    await transaction.save();
    logger.info(`[RevenueLedger] Updated existing transaction ${transaction._id} for Payment ${paymentId}`);
  } else {
    transaction = await PaymentTransaction.create(transactionData);
    logger.info(`[RevenueLedger] Created new transaction ${transaction._id} for Payment ${paymentId}, TMS Revenue: ₹${transaction.platformRevenue}`);
  }

  // Link transaction to Payment record
  await Payment.findByIdAndUpdate(paymentId, {
    transaction: transaction._id,
    rentAmount: transaction.rentAmount,
    platformFee: transaction.platformFee,
    platformFeePercentage: transaction.platformFeePercentage,
    taxAmount: transaction.platformTax,
    totalAmount: transaction.totalAmount,
    managerGrossAmount: transaction.managerGrossAmount,
    managerCommission: transaction.managerCommission,
    managerNetAmount: transaction.managerNetAmount,
    platformRevenue: transaction.platformRevenue,
    providerFee: transaction.providerFee,
    providerTax: transaction.providerTax,
    razorpayOrderId: transaction.razorpayOrderId,
    razorpayPaymentId: transaction.razorpayPaymentId,
    razorpaySignature: transaction.razorpaySignature,
    providerStatus: 'captured',
  });

  return transaction;
}

/**
 * Reversal / Refund accounting for platform revenue
 * Does NOT delete records; records reversal amount and net platform revenue.
 */
export async function handleRevenueRefund(paymentId, refundAmount, reason = '') {
  const transaction = await PaymentTransaction.findOne({ payment: paymentId });
  if (!transaction) {
    logger.warn(`[RevenueLedger] No transaction record found to refund for Payment ${paymentId}`);
    return null;
  }

  const refundAmt = Math.min(transaction.totalAmount, Number(refundAmount) || transaction.totalAmount);
  
  // Calculate proportional reversed platform fee
  let reversedFee = 0;
  if (transaction.totalAmount > 0 && transaction.platformFee > 0) {
    const ratio = refundAmt / transaction.totalAmount;
    reversedFee = Math.round((transaction.platformFee * ratio) * 100) / 100;
  }

  transaction.refundedAmount = (transaction.refundedAmount || 0) + refundAmt;
  transaction.reversedPlatformFee = (transaction.reversedPlatformFee || 0) + reversedFee;
  transaction.netPlatformRevenue = Math.max(0, transaction.platformRevenue - transaction.reversedPlatformFee);
  transaction.status = transaction.refundedAmount >= transaction.totalAmount ? 'refunded' : 'partially_refunded';
  transaction.refundReason = reason || transaction.refundReason;
  transaction.refundedAt = new Date();

  await transaction.save();

  logger.info(`[RevenueLedger] Refund logged for Payment ${paymentId}: Refunded ₹${refundAmt}, Reversed Fee ₹${reversedFee}, Net TMS Revenue: ₹${transaction.netPlatformRevenue}`);
  return transaction;
}
