import PayoutRequest from '../models/PayoutRequest.js';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import Property from '../models/Property.js';
import ManagerBankAccount from '../models/ManagerBankAccount.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';
import NotificationService from '../services/NotificationService.js';
import Razorpay from 'razorpay';

// Comprehensive Indian Bank IFSC prefix dictionary
const IFSC_BANK_MAP = {
  'SBIN': 'State Bank of India',
  'HDFC': 'HDFC Bank',
  'ICIC': 'ICICI Bank',
  'UTIB': 'Axis Bank',
  'PUNB': 'Punjab National Bank',
  'BARB': 'Bank of Baroda',
  'KKBK': 'Kotak Mahindra Bank',
  'UBIN': 'Union Bank of India',
  'CNRB': 'Canara Bank',
  'IOBA': 'Indian Overseas Bank',
  'BKID': 'Bank of India',
  'IDIB': 'Indian Bank',
  'YESB': 'YES Bank',
  'INDB': 'IndusInd Bank',
  'FDRL': 'Federal Bank',
  'IDFB': 'IDFC FIRST Bank',
  'AIRP': 'Airtel Payments Bank',
  'PYTM': 'Paytm Payments Bank',
  'AUBL': 'AU Small Finance Bank',
  'ESFB': 'Equitas Small Finance Bank',
  'CBIN': 'Central Bank of India',
  'PSIB': 'Punjab & Sind Bank',
  'UCOB': 'UCO Bank',
  'MAHB': 'Bank of Maharashtra',
};

/**
 * Helper: Lookup bank and branch details from IFSC code
 */
export async function lookupIfscDetails(ifscCode) {
  const cleanIfsc = (ifscCode || '').trim().toUpperCase();
  const prefix = cleanIfsc.substring(0, 4);
  const fallbackBankName = IFSC_BANK_MAP[prefix] || `${prefix} Bank`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const resp = await fetch(`https://ifsc.razorpay.com/${cleanIfsc}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (resp.ok) {
      const data = await resp.json();
      return {
        valid: true,
        bankName: data.BANK || fallbackBankName,
        branch: data.BRANCH || null,
        city: data.CITY || null,
        state: data.STATE || null,
        micr: data.MICR || null,
        ifsc: cleanIfsc
      };
    }
  } catch (err) {
    // Network or timeout fallback
  }

  return {
    valid: /^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc),
    bankName: fallbackBankName,
    branch: null,
    city: null,
    state: null,
    ifsc: cleanIfsc
  };
}

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
  })
    .populate('tenant', 'firstName lastName email')
    .populate('property', 'name address')
    .populate('lease', 'leaseNumber rentAmount')
    .sort({ paymentDate: -1, createdAt: -1 });

  // Manager Total Earned = sum of managerNetAmount (gross rent - manager commission).
  // CRITICAL: TMS Platform Fee (e.g. ₹150) is platform revenue and is NEVER added to manager withdrawable funds!
  const totalEarned = paidPayments.reduce((sum, p) => {
    const net = (p.managerNetAmount !== undefined && p.managerNetAmount !== null)
      ? p.managerNetAmount
      : ((p.rentAmount !== undefined && p.rentAmount !== null)
          ? p.rentAmount - (p.managerCommission || 0)
          : (p.amountPaid || p.amount || 0));
    return sum + net;
  }, 0);

  // Total Platform Revenue generated across this portfolio
  const totalPlatformFees = paidPayments.reduce((sum, p) => {
    return sum + (p.platformFee || 0);
  }, 0);

  // Itemized Earnings Breakdown for Manager Portal
  const earningsBreakdown = paidPayments.map(p => {
    const gross = p.managerGrossAmount || p.rentAmount || p.amountPaid || p.amount || 0;
    const commission = p.managerCommission || 0;
    const net = (p.managerNetAmount !== undefined && p.managerNetAmount !== null)
      ? p.managerNetAmount
      : Math.max(0, gross - commission);

    return {
      _id: p._id,
      tenantName: p.tenant ? `${p.tenant.firstName || ''} ${p.tenant.lastName || ''}`.trim() : 'Valued Tenant',
      propertyName: p.property?.name || 'Assigned Property',
      leaseNumber: p.lease?.leaseNumber || '—',
      grossRent: gross,
      platformFee: p.platformFee !== undefined ? p.platformFee : null,
      managerCommission: commission,
      managerNet: net,
      paymentDate: p.paymentDate || p.createdAt,
      status: p.status,
      razorpayPaymentId: p.razorpayPaymentId || p.reference || '—',
    };
  });

  // 3. Fetch all pending/upcoming payments
  const pendingPayments = await Payment.find({
    $or: [
      { property: { $in: propertyIds } },
      { owner: managerId }
    ],
    status: { $in: ['pending', 'partially_paid'] }
  }).select('amount rentAmount');

  const totalPending = pendingPayments.reduce((sum, p) => {
    return sum + (p.rentAmount || p.amount || 0);
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

  // Available to withdraw (Total Net Earned - Reserved - Completed)
  const availableBalance = Math.max(0, totalEarned - reservedAmount - completedAmount);

  return {
    totalEarned,
    totalPending,
    totalPlatformFees,
    reservedAmount,
    completedAmount,
    totalWithdrawn: completedAmount,
    availableBalance,
    payouts,
    earningsBreakdown,
    propertyCount: propertyIds.length
  };
}

import jwt from 'jsonwebtoken';
import config from '../config/config.js';

function signVerificationToken(payload) {
  return jwt.sign(
    { ...payload, type: 'bank_verification' },
    config.JWT_SECRET,
    { expiresIn: '15m' }
  );
}

function verifyVerificationToken(token, managerId) {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    if (decoded.type !== 'bank_verification') return null;
    if (decoded.managerId !== managerId.toString()) return null;
    return decoded;
  } catch (err) {
    return null;
  }
}

/**
 * POST /api/payouts/bank-account
 * Authenticate manager, validate bank account inputs & save bank destination safely.
 * If provider verification is not available: saves as PENDING VERIFICATION without blocking error.
 */
export const saveBankAccount = asyncHandler(async (req, res) => {
  const managerId = req.user.userId || req.user.id;
  const { accountHolderName, accountNumber, confirmAccountNumber, ifsc } = req.body;

  // 1. Validate inputs
  const name = (accountHolderName || '').trim();
  if (!name) {
    throw new AppError('Account holder name is required.', 400);
  }

  const cleanAccNum = (accountNumber || '').toString().trim();
  const cleanConfirmAccNum = (confirmAccountNumber || '').toString().trim();

  if (!cleanAccNum) {
    throw new AppError('Bank account number is required.', 400);
  }

  if (cleanAccNum.length < 8 || cleanAccNum.length > 20 || !/^\d+$/.test(cleanAccNum)) {
    throw new AppError('Please enter a valid bank account number (8 to 20 digits).', 400);
  }

  if (cleanConfirmAccNum && cleanAccNum !== cleanConfirmAccNum) {
    throw new AppError('Account numbers do not match.', 400);
  }

  const cleanIfsc = (ifsc || '').trim().toUpperCase();
  if (!cleanIfsc) {
    throw new AppError('IFSC code is required.', 400);
  }

  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
    throw new AppError('Please enter a valid 11-character IFSC code (e.g. SBIN0001234, UBIN0804681).', 400);
  }

  // 2. Lookup IFSC & Branch details
  const ifscDetails = await lookupIfscDetails(cleanIfsc);
  if (!ifscDetails.valid) {
    return res.status(400).json({
      success: false,
      status: 'failed',
      message: 'Invalid IFSC code. Please verify and try again.'
    });
  }

  const bankName = ifscDetails.bankName;
  const branch = ifscDetails.branch;
  const city = ifscDetails.city;
  const last4 = cleanAccNum.slice(-4);

  // 3. Provider Check & Verification Attempt
  let verificationStatus = 'pending';
  let connectionStatus = 'connected_pending_verification';
  let providerVerificationAvailable = false;
  let fundAccountId = null;
  let providerReference = null;
  let verifiedAt = null;

  const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  const isConfigured = Boolean(keyId && keySecret && !keyId.includes('mock'));

  if (isConfigured) {
    try {
      const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const user = await User.findById(managerId).select('firstName lastName email phone');
      const contactEmail = user?.email || 'manager@tms.local';
      const contactPhone = user?.phone || '9999999999';

      // Create contact
      let contactId = null;
      try {
        const contactResp = await fetch('https://api.razorpay.com/v1/contacts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify({
            name: name,
            email: contactEmail,
            contact: contactPhone,
            type: 'vendor',
            reference_id: managerId.toString()
          })
        });
        if (contactResp.ok) {
          const contactData = await contactResp.json();
          contactId = contactData.id;
        }
      } catch (cErr) {
        logger.warn(`[BankSave] Contact step warning: ${cErr.message}`);
      }

      if (!contactId) contactId = `cont_${Date.now()}`;

      // Create fund account on Razorpay
      const faResp = await fetch('https://api.razorpay.com/v1/fund_accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({
          contact_id: contactId,
          account_type: 'bank_account',
          bank_account: {
            name: name,
            ifsc: cleanIfsc,
            account_number: cleanAccNum
          }
        })
      });

      if (faResp.ok) {
        const faData = await faResp.json();
        fundAccountId = faData.id;
        providerReference = faData.id;

        // Try penny-drop validation if enabled on merchant account
        try {
          const valResp = await fetch('https://api.razorpay.com/v1/fund_accounts/validations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader
            },
            body: JSON.stringify({
              account_number: process.env.RAZORPAY_ACCOUNT_NUMBER || '2323230034479900',
              fund_account: { id: fundAccountId },
              amount: 100,
              currency: 'INR'
            })
          });

          if (valResp.ok) {
            const valData = await valResp.json();
            if (valData.results?.account_status === 'active' || valData.status === 'completed') {
              verificationStatus = 'verified';
              connectionStatus = 'connected';
              providerVerificationAvailable = true;
              verifiedAt = new Date();
              providerReference = valData.id || providerReference;
            }
          }
        } catch (vErr) {
          logger.info(`[BankSave] Penny-drop validation not available: ${vErr.message}`);
        }
      }
    } catch (pErr) {
      logger.warn(`[BankSave] Provider validation unavailable: ${pErr.message}`);
    }
  }

  // 4. Save/Update ManagerBankAccount (Never stores full account number or secret credentials!)
  let bankAccount = await ManagerBankAccount.findOne({ manager: managerId });
  if (bankAccount) {
    bankAccount.accountHolderName = name;
    bankAccount.bankName = bankName;
    bankAccount.accountNumberLast4 = last4;
    bankAccount.ifsc = cleanIfsc;
    bankAccount.branch = branch || bankAccount.branch;
    bankAccount.city = city || bankAccount.city;
    bankAccount.verificationStatus = verificationStatus;
    bankAccount.connectionStatus = connectionStatus;
    bankAccount.providerVerificationAvailable = providerVerificationAvailable;
    bankAccount.provider = 'razorpay';
    bankAccount.providerReference = providerReference || bankAccount.providerReference;
    bankAccount.fundAccountId = fundAccountId || bankAccount.fundAccountId;
    bankAccount.verifiedAt = verifiedAt;
    bankAccount.connectedAt = new Date();
    await bankAccount.save();
  } else {
    bankAccount = await ManagerBankAccount.create({
      manager: managerId,
      accountHolderName: name,
      bankName: bankName,
      accountNumberLast4: last4,
      ifsc: cleanIfsc,
      branch: branch || null,
      city: city || null,
      verificationStatus: verificationStatus,
      connectionStatus: connectionStatus,
      providerVerificationAvailable: providerVerificationAvailable,
      provider: 'razorpay',
      providerReference: providerReference,
      fundAccountId: fundAccountId,
      verifiedAt: verifiedAt,
      connectedAt: new Date()
    });
  }

  logger.info(`[BankSave] Bank destination saved for Manager ${managerId}: ${bankName} (•••• ${last4}), Status: ${verificationStatus}`);

  return res.status(200).json({
    success: true,
    status: verificationStatus,
    connectionStatus: connectionStatus,
    providerVerificationAvailable: providerVerificationAvailable,
    message: verificationStatus === 'verified'
      ? 'Bank account verified and connected successfully.'
      : 'Bank ownership verification is currently unavailable. Your bank details have been saved securely and will require provider verification before real payouts can be processed.',
    data: {
      connected: true,
      bankName: bankAccount.bankName,
      accountHolderName: bankAccount.accountHolderName,
      accountNumberLast4: bankAccount.accountNumberLast4,
      ifsc: bankAccount.ifsc,
      branch: bankAccount.branch,
      city: bankAccount.city,
      status: bankAccount.connectionStatus,
      verificationStatus: bankAccount.verificationStatus,
      connectionStatus: bankAccount.connectionStatus,
      providerVerificationAvailable: bankAccount.providerVerificationAvailable,
      connectedAt: bankAccount.connectedAt
    }
  });
});

/**
 * POST /api/payouts/bank-account/verify
 * Authenticate manager & save bank destination safely (alias to saveBankAccount)
 */
export const verifyBankAccount = saveBankAccount;

/**
 * POST /api/payouts/bank-account/connect
 * Alias to saveBankAccount / connect verified bank account
 */
export const connectBankAccount = saveBankAccount;

/**
 * GET /api/payouts/bank-account
 * Get currently connected/saved bank account for manager
 */
export const getConnectedBankAccount = asyncHandler(async (req, res) => {
  const managerId = req.user.userId || req.user.id;
  const bankAccount = await ManagerBankAccount.findOne({ 
    manager: managerId, 
    connectionStatus: { $in: ['connected', 'connected_pending_verification'] } 
  });

  if (!bankAccount) {
    return res.status(200).json({
      success: true,
      connected: false,
      data: null
    });
  }

  res.status(200).json({
    success: true,
    connected: true,
    data: {
      bankName: bankAccount.bankName,
      accountHolderName: bankAccount.accountHolderName,
      accountNumberLast4: bankAccount.accountNumberLast4,
      ifsc: bankAccount.ifsc,
      branch: bankAccount.branch,
      city: bankAccount.city,
      status: bankAccount.connectionStatus,
      verificationStatus: bankAccount.verificationStatus,
      connectionStatus: bankAccount.connectionStatus,
      providerVerificationAvailable: bankAccount.providerVerificationAvailable ?? false,
      connectedAt: bankAccount.connectedAt
    }
  });
});

/**
 * DELETE /api/payouts/bank-account
 * Disconnect bank account (preserves payment & payout history)
 */
export const disconnectBankAccount = asyncHandler(async (req, res) => {
  const managerId = req.user.userId || req.user.id;
  const bankAccount = await ManagerBankAccount.findOne({ manager: managerId });

  if (bankAccount) {
    bankAccount.connectionStatus = 'disconnected';
    await bankAccount.save();
    logger.info(`[BankDisconnect] Manager ${managerId} disconnected bank account.`);
  }

  res.status(200).json({
    success: true,
    message: 'Bank account disconnected successfully.'
  });
});

/**
 * GET /api/payouts/summary (or /balance)
 * Manager/Admin: Get real-time balance, earnings, and connected bank account status
 */
export const getPayoutSummary = asyncHandler(async (req, res) => {
  const managerId = req.user.userId || req.user.id;
  const user = await User.findById(managerId);
  if (!user) throw new AppError('User not found', 404);

  const ledger = await calculateManagerLedger(managerId);
  const bankAccount = await ManagerBankAccount.findOne({ 
    manager: managerId, 
    connectionStatus: { $in: ['connected', 'connected_pending_verification'] } 
  });

  const hasConnectedAccount = Boolean(bankAccount);
  const isPayoutReady = Boolean(bankAccount && bankAccount.verificationStatus === 'verified');

  res.status(200).json({
    success: true,
    data: {
      available: ledger.availableBalance,
      availableBalance: ledger.availableBalance,
      totalEarned: ledger.totalEarned,
      pending: ledger.totalPending,
      reserved: ledger.reservedAmount,
      totalWithdrawn: ledger.completedAmount,
      totalPlatformFees: ledger.totalPlatformFees,
      earningsBreakdown: ledger.earningsBreakdown,
      isPayoutReady,
      hasConnectedAccount,
      verificationStatus: bankAccount?.verificationStatus || null,
      connectionStatus: bankAccount?.connectionStatus || null,
      providerVerificationAvailable: bankAccount?.providerVerificationAvailable ?? false,
      accountNumberLast4: bankAccount?.accountNumberLast4 || null,
      bankName: bankAccount?.bankName || null,
      ifsc: bankAccount?.ifsc || null,
      accountHolderName: bankAccount?.accountHolderName || null,
      payoutProvider: 'razorpay'
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
    .populate('owner', 'firstName lastName email')
    .populate('manager', 'firstName lastName email')
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
    .populate('owner', 'firstName lastName email')
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

  // 2. Validate Connected Bank Account
  const bankAccount = await ManagerBankAccount.findOne({ 
    manager: managerId, 
    connectionStatus: 'connected' 
  });

  if (!bankAccount) {
    throw new AppError('Please connect and verify your bank account before requesting a payout.', 400);
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
    provider: 'razorpay',
    idempotencyKey,
    accountNumberLast4: bankAccount.accountNumberLast4,
    requestedAt: new Date(),
    processingAt: new Date(),
    notes: notes || `Manager payout to ${bankAccount.bankName} (•••• ${bankAccount.accountNumberLast4})`
  });

  logger.info(`[Payout] Created PayoutRequest ${payoutRecord._id} for Manager ${managerId} (₹${numericAmount})`);

  // 5. Payout Provider Check
  const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  const isRazorpayConfigured = keyId && keySecret && !keyId.includes('mock');

  // Check if Razorpay Payouts is configured
  if (!isRazorpayConfigured) {
    // Safely release reservation
    payoutRecord.status = 'failed';
    payoutRecord.failedAt = new Date();
    payoutRecord.failureReason = 'Bank account verified successfully. Payout transfers are not configured on the payment gateway yet.';
    await payoutRecord.save();

    throw new AppError('Bank account verified successfully. Payout transfers are not configured on the payment gateway yet.', 400);
  }

  // 6. Attempt Razorpay Payouts API if available
  try {
    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const rzpPayoutResp = await fetch('https://api.razorpay.com/v1/payouts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'X-Payout-Idempotency': idempotencyKey
      },
      body: JSON.stringify({
        account_number: process.env.RAZORPAY_ACCOUNT_NUMBER || '2323230034479900',
        amount: Math.round(numericAmount * 100), // paise
        currency: 'INR',
        mode: 'NEFT',
        purpose: 'payout',
        fund_account: {
          account_type: 'bank_account',
          bank_account: {
            name: bankAccount.accountHolderName,
            ifsc: bankAccount.ifsc,
            account_number: bankAccount.accountNumberLast4
          }
        },
        queue_if_low_balance: true,
        reference_id: payoutRecord._id.toString(),
        narration: 'Rental Payout'
      })
    });

    if (rzpPayoutResp.ok) {
      const payoutData = await rzpPayoutResp.json();
      payoutRecord.providerPayoutId = payoutData.id;
      payoutRecord.status = payoutData.status === 'processed' ? 'paid' : 'processing';
      if (payoutData.status === 'processed') {
        payoutRecord.completedAt = new Date();
      }
      await payoutRecord.save();
    } else {
      const errData = await rzpPayoutResp.json().catch(() => ({}));
      payoutRecord.status = 'failed';
      payoutRecord.failedAt = new Date();
      payoutRecord.failureReason = errData.error?.description || 'Bank account verified successfully. Payout transfers are not configured on the payment gateway yet.';
      await payoutRecord.save();

      throw new AppError(payoutRecord.failureReason, 400);
    }
  } catch (payoutErr) {
    if (payoutRecord.status === 'processing') {
      payoutRecord.status = 'failed';
      payoutRecord.failedAt = new Date();
      payoutRecord.failureReason = payoutErr.message || 'Payout transfer failed';
      await payoutRecord.save();
    }
    throw new AppError(payoutErr.message || 'Payout transfer could not be initiated.', 400);
  }

  // 7. Emit notification
  await NotificationService.notify({
    recipient: managerId,
    category: 'payments',
    event: 'payout_requested',
    title: 'Payout Request Submitted',
    message: `Your payout request for ₹${numericAmount.toLocaleString('en-IN')} to ${bankAccount.bankName} (•••• ${bankAccount.accountNumberLast4}) has been submitted.`,
    sourceModule: 'financials',
    entityType: 'PayoutRequest',
    entityId: payoutRecord._id,
    priority: 'high'
  }).catch(() => {});

  res.status(200).json({
    success: true,
    message: `Payout request for ₹${numericAmount.toLocaleString('en-IN')} submitted successfully to ${bankAccount.bankName} (•••• ${bankAccount.accountNumberLast4}).`,
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
