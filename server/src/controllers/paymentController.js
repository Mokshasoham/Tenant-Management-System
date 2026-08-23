import crypto from 'crypto';
import Razorpay from 'razorpay';
import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import Bill from '../models/Bill.js';
import Booking from '../models/Booking.js';
import Lease from '../models/Lease.js';
import Tenant from '../models/Tenant.js';
import User from '../models/User.js';
import Property from '../models/Property.js';
import AutoPay from '../models/AutoPay.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';
import { processPostPayment } from '../services/paymentAutomation.js';
import { generateInvoicePDF, buildInvoiceViewModel } from '../services/pdfService.js';
import { getSignedUrlForFile } from './fileController.js';
import { calculatePaymentBreakdown, recordVerifiedRevenue } from '../services/platformFeeService.js';
import { calculateNextPaymentDue } from '../utils/paymentSchedule.js';

const resolveInvoiceUrl = (payment, req) => {
  if (!payment) return payment;
  const payObj = payment.toObject ? payment.toObject() : payment;
  if (payObj.fileId) {
    payObj.invoiceUrl = `/api/files/download/${payObj.fileId}`;
  }
  if (payObj.invoiceUrl) {
    if (payObj.invoiceUrl.startsWith('https://') || (payObj.invoiceUrl.startsWith('http://') && !payObj.invoiceUrl.includes('/api/files/download/'))) {
      return payObj;
    }
    let relativePath = payObj.invoiceUrl;
    try {
      if (relativePath.startsWith('http')) {
        const parsed = new URL(relativePath);
        relativePath = parsed.pathname + parsed.search;
      }
    } catch (_) {}
    if (!relativePath.startsWith('/')) {
      relativePath = '/' + relativePath;
    }
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    payObj.invoiceUrl = `${protocol}://${host}${relativePath}`;
  }
  return payObj;
};


// Tenant-scoped: get the logged-in user's own payment history
export const getMyPayments = asyncHandler(async (req, res) => {
  // JWT has userId + role only — look up email via User model
  const user = await User.findById(req.user.userId).select('email');
  if (!user) return res.status(200).json({ success: true, data: [] });

  const tenants = await Tenant.find({ email: user.email });
  const tenantIds = tenants.map(t => t._id);
  if (tenantIds.length === 0) return res.status(200).json({ success: true, data: [] });

  // Self-heal: ensure paid bookings with deposits have Payment and Bill records
  try {
    const paidBookings = await Booking.find({
      user: req.user.userId,
      paymentStatus: 'paid',
      totalAmount: { $gt: 0 }
    }).populate('property');

    for (const b of paidBookings) {
      if (!b.razorpayPaymentId && !b.paymentReference) continue;
      const ref = b.razorpayPaymentId || b.paymentReference;
      const existingPay = await Payment.findOne({
        $or: [{ reference: ref }, { razorpayPaymentId: ref }]
      });
      if (!existingPay && b.property) {
        const primaryTenant = tenants[0];
        const lease = await Lease.findOne({
          property: b.property._id,
          tenant: { $in: tenantIds }
        });

        const billNumber = `BILL-DEP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const bill = await Bill.create({
          billNumber,
          type: 'security_deposit',
          lease: lease?._id,
          tenant: primaryTenant._id,
          property: b.property._id,
          status: 'paid',
          dueDate: b.startDate || new Date(),
          billingPeriodStart: b.startDate || new Date(),
          billingPeriodEnd: b.startDate || new Date(),
          breakdown: [{ label: 'Security Deposit & Escrow', amount: b.totalAmount }],
          amountDue: b.totalAmount,
          amountPaid: b.totalAmount,
          timeline: [
            { status: 'generated', note: 'Security deposit invoice generated automatically.' },
            { status: 'paid', note: 'Security deposit paid successfully via Razorpay.' }
          ]
        });

        const newPay = await Payment.create({
          type: 'security_deposit',
          tenant: primaryTenant._id,
          property: b.property._id,
          lease: lease?._id,
          amount: b.totalAmount,
          amountPaid: b.totalAmount,
          paymentDate: b.paymentDate || b.updatedAt || new Date(),
          dueDate: b.startDate || new Date(),
          status: 'paid',
          paymentMethod: 'card',
          reference: ref,
          razorpayPaymentId: b.razorpayPaymentId,
          description: `Security deposit for ${b.property.name || 'Property'}`,
          bill: bill._id
        });

        bill.payment = newPay._id;
        await bill.save();

        try {
          const viewModel = buildInvoiceViewModel(bill, newPay);
          generateInvoicePDF(viewModel).then(async (pdfResult) => {
            if (pdfResult?.fileId) {
              bill.fileId = pdfResult.fileId;
              bill.invoiceUrl = `/api/files/download/${pdfResult.fileId}`;
              await bill.save();
              newPay.fileId = pdfResult.fileId;
              newPay.invoiceUrl = `/api/files/download/${pdfResult.fileId}`;
              await newPay.save();
            }
          }).catch(() => {});
        } catch (_) {}
      }
    }
  } catch (healErr) {
    logger.warn(`[getMyPayments] Self-heal check non-fatal warning: ${healErr.message}`);
  }

  const filter = { tenant: { $in: tenantIds } };
  if (req.query.bill === 'null') {
    filter.$or = [
      { bill: null },
      { bill: { $exists: false } }
    ];
  }

  const payments = await Payment.find(filter)
    .sort({ paymentDate: -1, dueDate: -1, createdAt: -1 })
    .limit(100)
    .populate('lease', 'leaseNumber rentAmount')
    .populate('tenant', 'firstName lastName email')
    .populate('property', 'name address');

  const resolvedPayments = payments.map(p => resolveInvoiceUrl(p, req));
  res.status(200).json({ success: true, data: resolvedPayments });
});


export const getAllPayments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, leaseId, tenantId } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (leaseId) filter.lease = leaseId;
  if (tenantId) filter.tenant = tenantId;
  if (req.query.bill === 'null') {
    filter.$or = [
      { bill: null },
      { bill: { $exists: false } }
    ];
  }

  const skip = (page - 1) * limit;

  const payments = await Payment.find(filter)
    .skip(skip)
    .limit(parseInt(limit))
    .populate('lease', 'leaseNumber')
    .populate('tenant', 'firstName lastName email')
    .populate('property', 'name address');

  const total = await Payment.countDocuments(filter);

  const resolvedPayments = payments.map(p => resolveInvoiceUrl(p, req));
  res.status(200).json({
    success: true,
    data: resolvedPayments,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

export const getPaymentById = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id)
    .populate('lease')
    .populate('tenant')
    .populate('property');

  if (!payment) {
    throw new AppError('Payment not found', 404);
  }

  res.status(200).json({
    success: true,
    data: resolveInvoiceUrl(payment, req),
  });
});

export const getPaymentInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const payment = await Payment.findById(id).populate('lease');
  if (!payment) throw new AppError('Payment not found', 404);

  // Authenticate ownership: tenants can only see their own payments
  if (req.user.role === 'tenant') {
    const user = await User.findById(req.user.userId).select('email');
    const tenants = await Tenant.find({ email: user.email });
    const tenantIds = tenants.map(t => t._id.toString());
    if (!tenantIds.includes(payment.tenant.toString())) {
      throw new AppError('Forbidden: Access denied', 403);
    }
  }

  // 1. If payment has a linked bill, delegate to the Bill download flow
  if (payment.bill) {
    const Bill = (await import('../models/Bill.js')).default;
    const bill = await Bill.findById(payment.bill);
    if (!bill) throw new AppError('Linked bill not found', 404);
    if (!bill.fileId) throw new AppError('Invoice file metadata not generated yet', 404);
    
    req.params.fileId = bill.fileId.toString();
    return getSignedUrlForFile(req, res);
  }

  // 2. Generate legacy PDF invoice on the fly if not already done
  if (!payment.fileId) {
    const placeholderId = new mongoose.Types.ObjectId();
    // Try to claim the generation lock atomically
    const lockedPayment = await Payment.findOneAndUpdate(
      { _id: payment._id, fileId: { $exists: false } },
      { $set: { fileId: placeholderId } },
      { new: true }
    );

    if (lockedPayment && lockedPayment.fileId.toString() === placeholderId.toString()) {
      try {
        const tenant = await Tenant.findById(payment.tenant);
        const property = await Property.findById(payment.property);
        const pdfData = await generateInvoicePDF(payment, tenant, property, payment.lease);
        
        payment.fileId = pdfData.fileId;
        // Clean up legacy invoiceUrl to ensure signed URL security is enforced
        payment.invoiceUrl = undefined;
        await payment.save();
      } catch (err) {
        // Rollback on failure
        await Payment.updateOne({ _id: payment._id, fileId: placeholderId }, { $unset: { fileId: 1 } });
        throw err;
      }
    } else {
      // Wait for parallel generation to finish
      let pollCount = 0;
      let freshPayment = payment;
      while (pollCount < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        freshPayment = await Payment.findById(payment._id);
        if (!freshPayment.fileId) {
          // Winning thread failed and rolled back the lock
          break;
        }
        if (freshPayment.fileId.toString() !== placeholderId.toString()) {
          break;
        }
        pollCount++;
      }
      
      if (!freshPayment.fileId || freshPayment.fileId.toString() === placeholderId.toString()) {
        throw new AppError('PDF generation timed out. Please try again.', 408);
      }
      payment.fileId = freshPayment.fileId;
    }
  }

  // 3. Return fresh short-lived signed URL
  req.params.fileId = payment.fileId.toString();
  return getSignedUrlForFile(req, res);
});

export const createPayment = asyncHandler(async (req, res) => {
  const { leaseId, tenantId, propertyId, amount, dueDate, paymentMethod, reference } =
    req.body;

  // Verify lease exists
  const lease = await Lease.findById(leaseId);
  if (!lease) {
    throw new AppError('Lease not found', 404);
  }

  const payment = await Payment.create({
    lease: leaseId,
    tenant: tenantId,
    property: propertyId,
    amount,
    dueDate,
    status: 'pending',
    paymentMethod,
    reference,
  });

  logger.info(`New payment created: ${payment._id}`);

  res.status(201).json({
    success: true,
    message: 'Payment created successfully',
    data: resolveInvoiceUrl(payment, req),
  });
});

export const recordPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amountPaid, paymentDate, paymentMethod, reference } = req.body;

  const payment = await Payment.findById(id);
  if (!payment) {
    throw new AppError('Payment not found', 404);
  }

  // Add receipt
  payment.receipts.push({
    amount: amountPaid,
    date: paymentDate,
    method: paymentMethod,
    reference,
  });

  payment.amountPaid += amountPaid;

  // Update status
  if (payment.amountPaid >= payment.amount) {
    payment.status = 'paid';
    payment.paymentDate = paymentDate || new Date();
    payment.paidAt = paymentDate || new Date();
  } else if (payment.amountPaid > 0) {
    payment.status = 'partially_paid';
  }

  await payment.save();

  if (payment.status === 'paid') {
    try {
      const breakdown = await calculatePaymentBreakdown(payment.rentAmount || payment.amount);
      const property = await Property.findById(payment.property);
      const managerId = payment.owner || property?.manager || property?.owner;

      await recordVerifiedRevenue({
        paymentId: payment._id,
        tenantId: payment.tenant,
        leaseId: payment.lease,
        propertyId: payment.property,
        managerId: managerId,
        rentAmount: payment.rentAmount || breakdown.rentAmount,
        platformFee: payment.platformFee !== undefined ? payment.platformFee : breakdown.platformFee,
        platformFeePercentage: payment.platformFeePercentage || breakdown.platformFeePercentage,
        platformTax: payment.taxAmount || breakdown.taxAmount,
        managerCommission: payment.managerCommission || breakdown.managerCommission,
        managerCommissionPercentage: breakdown.managerCommissionPercentage,
        managerGrossAmount: payment.managerGrossAmount || breakdown.managerGrossAmount,
        managerNetAmount: payment.managerNetAmount !== undefined ? payment.managerNetAmount : breakdown.managerNetAmount,
        platformRevenue: payment.platformRevenue !== undefined ? payment.platformRevenue : breakdown.platformRevenue,
        totalAmount: payment.totalAmount || breakdown.totalPayable,
        currency: payment.currency || 'INR',
        feePayer: payment.feePayer || breakdown.feePayer,
        razorpayOrderId: payment.razorpayOrderId,
        razorpayPaymentId: payment.razorpayPaymentId || reference,
        razorpaySignature: payment.razorpaySignature,
      });
    } catch (revErr) {
      logger.warn(`[PaymentRecord] Revenue recording non-fatal warning: ${revErr.message}`);
    }
  }

  if (payment.bill) {
    try {
      const { syncPaymentToBill } = await import('../services/billSyncService.js');
      await syncPaymentToBill(payment._id);
    } catch (syncErr) {
      logger.error(`Failed to sync payment ${payment._id} to bill: ${syncErr.message}`);
    }
  }

  if (['paid', 'partially_paid'].includes(payment.status)) {
    processPostPayment(payment).catch((error) => {
      logger.error(`Failed to process post-payment for ${payment._id}: ${error.message}`);
    });
  }

  logger.info(`Payment recorded: ${payment._id}`);

  res.status(200).json({
    success: true,
    message: 'Payment recorded successfully',
    data: resolveInvoiceUrl(payment, req),
  });
});

export const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (
    !['pending', 'partially_paid', 'paid', 'overdue', 'cancelled'].includes(status)
  ) {
    throw new AppError('Invalid status', 400);
  }

  const payment = await Payment.findByIdAndUpdate(id, { status }, { new: true });

  if (!payment) {
    throw new AppError('Payment not found', 404);
  }

  if (payment.bill) {
    try {
      const { syncPaymentToBill } = await import('../services/billSyncService.js');
      await syncPaymentToBill(payment._id);
    } catch (syncErr) {
      logger.error(`Failed to sync payment status change for ${payment._id}: ${syncErr.message}`);
    }
  }

  if (['paid', 'partially_paid'].includes(payment.status)) {
    processPostPayment(payment).catch((error) => {
      logger.error(`Failed to process post-payment for ${payment._id}: ${error.message}`);
    });
  }

  logger.info(`Payment status updated: ${payment._id} - ${status}`);

  res.status(200).json({
    success: true,
    message: 'Payment status updated successfully',
    data: resolveInvoiceUrl(payment, req),
  });
});

export const getPaymentStats = asyncHandler(async (req, res) => {
  const totalPayments = await Payment.countDocuments();
  const paidPayments = await Payment.countDocuments({ status: 'paid' });
  const pendingPayments = await Payment.countDocuments({ status: 'pending' });
  const overduePayments = await Payment.countDocuments({ status: 'overdue' });

  const totalCollected = await Payment.aggregate([
    { $match: { status: 'paid' } },
    { $group: { _id: null, total: { $sum: '$amountPaid' } } },
  ]);

  const totalOutstanding = await Payment.aggregate([
    {
      $match: {
        status: { $in: ['pending', 'partially_paid', 'overdue'] },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: { $subtract: ['$amount', '$amountPaid'] } },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalPayments,
      paidPayments,
      pendingPayments,
      overduePayments,
      totalCollected: totalCollected[0]?.total || 0,
      totalOutstanding: totalOutstanding[0]?.total || 0,
    },
  });
});

/**
 * GET /api/payments/rent-summary
 * Single Source of Truth for Rent Payment calculation across the application.
 */
export const getRentPaymentSummary = asyncHandler(async (req, res) => {
  const { leaseId, billId } = req.query;
  const actualUserId = req.user?.userId || req.user?._id || req.user?.id;
  const user = await User.findById(actualUserId);

  let targetLease = null;
  const cleanEmail = user ? (user.email || '').trim() : '';
  const emailRegex = cleanEmail ? new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') : null;
  const tenantRecords = emailRegex ? await Tenant.find({ email: emailRegex }) : [];
  const allUsersWithEmail = emailRegex ? await User.find({ email: emailRegex }).select('_id') : [];
  const tenantIds = Array.from(new Set([
    actualUserId,
    ...(user ? [user._id] : []),
    ...tenantRecords.map(t => t._id),
    ...allUsersWithEmail.map(u => u._id)
  ].filter(Boolean).map(id => id.toString())));

  // Collect embedded lease IDs
  const embeddedLeaseIds = [];
  for (const t of tenantRecords) {
    if (Array.isArray(t.leases)) {
      embeddedLeaseIds.push(...t.leases);
    }
  }

  if (leaseId) {
    if (mongoose.Types.ObjectId.isValid(leaseId)) {
      targetLease = await Lease.findById(leaseId).populate('property tenant');
    }
    if (!targetLease) {
      targetLease = await Lease.findOne({ leaseNumber: leaseId }).populate('property tenant');
    }
  } else if (billId) {
    let bill = null;
    if (mongoose.Types.ObjectId.isValid(billId)) {
      bill = await Bill.findById(billId).populate('lease property tenant');
    }
    if (!bill) {
      bill = await Bill.findOne({ billNumber: billId }).populate('lease property tenant');
    }
    if (bill && bill.lease) {
      targetLease = await Lease.findById(bill.lease).populate('property tenant');
    }
  }

  if (!targetLease) {
    targetLease = await Lease.findOne({
      $or: [
        { tenant: { $in: tenantIds } },
        { _id: { $in: embeddedLeaseIds } },
        { user: { $in: tenantIds } }
      ],
      status: { $nin: ['terminated', 'expired', 'cancelled'] }
    }).populate('property tenant');
  }

  if (!targetLease) {
    targetLease = await Lease.findOne({
      $or: [
        { tenant: { $in: tenantIds } },
        { _id: { $in: embeddedLeaseIds } },
        { user: { $in: tenantIds } }
      ]
    }).sort({ createdAt: -1 }).populate('property tenant');
  }

  if (!targetLease) {
    throw new AppError('No lease found for payment calculation', 404);
  }

  const targetProperty = targetLease.property;
  const leasePayments = await Payment.find({ lease: targetLease._id }).sort({ dueDate: -1, createdAt: -1 });

  // Deterministic schedule & overdue calculation
  const schedule = calculateNextPaymentDue(targetLease, leasePayments, new Date());

  const rentAmount = schedule?.rentAmount ?? targetLease.rentAmount ?? 0;
  const lateFee = schedule?.lateFee ?? 0;
  const daysOverdue = schedule?.daysLate ?? 0;
  const lateFeePerDay = schedule?.lateFeePerDay ?? (targetLease.lateFeePerDay || 100);
  const status = schedule?.status || 'upcoming';
  const dueDate = schedule?.nextPaymentDueAt || targetLease.startDate;
  const paymentPeriodStart = schedule?.billingPeriodStart || targetLease.startDate;
  const paymentPeriodEnd = schedule?.billingPeriodEnd || null;

  // Base payable = Monthly Rent + Late Fee
  const basePayable = rentAmount + lateFee;
  const breakdown = await calculatePaymentBreakdown(basePayable);

  const platformFee = breakdown.platformFee;
  const platformFeePercentage = breakdown.platformFeePercentage || 1;
  const taxAmount = breakdown.taxAmount || 0;
  const totalDue = breakdown.totalPayable; // e.g. 15000 + 100 + 151 = 15251

  // Authoritative lease-specific AutoPay check
  const autoPayDoc = await AutoPay.findOne({
    tenant: { $in: tenantIds },
    lease: targetLease._id,
  });

  const isAutoPayActive = autoPayDoc ? autoPayDoc.status === 'active' : false;

  res.status(200).json({
    success: true,
    data: {
      leaseId: targetLease._id,
      leaseNumber: targetLease.leaseNumber,
      propertyId: targetProperty?._id || targetLease.property,
      propertyName: targetProperty?.name || 'TMS Residence',
      tenantId: targetLease.tenant?._id || targetLease.tenant,
      monthlyRent: rentAmount,
      lateFee,
      daysOverdue,
      lateFeePerDay,
      platformFee,
      platformFeePercentage,
      taxAmount,
      totalDue,
      currency: 'INR',
      status,
      dueDate,
      paymentPeriodStart,
      paymentPeriodEnd,
      isOverdue: schedule?.isOverdue ?? (status === 'overdue'),
      isDueToday: schedule?.isDueToday ?? (status === 'due'),
      isUpcoming: schedule?.isUpcoming ?? (status === 'upcoming'),
      isEstimate: schedule?.isEstimate ?? true,
      autoPay: {
        enabled: isAutoPayActive,
        status: autoPayDoc ? autoPayDoc.status : 'disabled'
      }
    }
  });
});

/**
 * POST /api/payments/create-order
 * Creates a server-authoritative Razorpay Order for rent payment.
 */
export const createRazorpayRentOrder = asyncHandler(async (req, res) => {
  const { leaseId, billId } = req.body;
  const actualUserId = req.user?.userId || req.user?._id || req.user?.id;
  const user = await User.findById(actualUserId);

  const tenantRecords = user ? await Tenant.find({ email: user.email }) : [];
  const tenantIds = [actualUserId, ...tenantRecords.map(t => t._id)];

  let targetLease = null;
  if (leaseId) {
    if (mongoose.Types.ObjectId.isValid(leaseId)) {
      targetLease = await Lease.findById(leaseId).populate('property tenant');
    }
    if (!targetLease) {
      targetLease = await Lease.findOne({ leaseNumber: leaseId }).populate('property tenant');
    }
  } else if (billId) {
    let bill = null;
    if (mongoose.Types.ObjectId.isValid(billId)) {
      bill = await Bill.findById(billId).populate('lease property tenant');
    }
    if (!bill) {
      bill = await Bill.findOne({ billNumber: billId }).populate('lease property tenant');
    }
    if (bill && bill.lease) {
      targetLease = await Lease.findById(bill.lease).populate('property tenant');
    }
  }

  if (!targetLease) {
    targetLease = await Lease.findOne({
      tenant: { $in: tenantIds },
      status: { $in: ['active', 'pending'] }
    }).populate('property tenant');
  }

  if (!targetLease) {
    targetLease = await Lease.findOne({
      tenant: { $in: tenantIds }
    }).sort({ createdAt: -1 }).populate('property tenant');
  }

  if (!targetLease) {
    throw new AppError('Lease not found for order creation', 404);
  }

  // Calculate authoritative total from server — never trust client amounts
  const leasePayments = await Payment.find({ lease: targetLease._id }).sort({ dueDate: -1, createdAt: -1 });
  const schedule = calculateNextPaymentDue(targetLease, leasePayments, new Date());

  const rentAmount = schedule?.rentAmount ?? targetLease.rentAmount ?? 0;
  const lateFee = schedule?.lateFee ?? 0;
  const daysOverdue = schedule?.daysLate ?? 0;
  const basePayable = rentAmount + lateFee;

  const breakdown = await calculatePaymentBreakdown(basePayable);
  const totalDue = breakdown.totalPayable;
  const amountInPaise = Math.round(totalDue * 100);

  const keyId = (process.env.RAZORPAY_KEY_ID || 'rzp_test_SUn7uPXz1VaEa1').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || 'J1XPHqYCTE8sSNhNtzarqYaQ').trim();

  let razorpayOrderId = null;

  try {
    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await rzp.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `rcpt_rent_${String(targetLease._id).slice(-8)}_${Date.now()}`,
      notes: {
        leaseId: String(targetLease._id),
        propertyId: String(targetLease.property?._id || targetLease.property),
        tenantId: String(targetLease.tenant?._id || targetLease.tenant),
        monthlyRent: String(rentAmount),
        lateFee: String(lateFee),
        daysOverdue: String(daysOverdue),
        platformFee: String(breakdown.platformFee),
        totalDue: String(totalDue)
      }
    });
    razorpayOrderId = order.id;
    logger.info(`[Razorpay Rent] Created order ${razorpayOrderId} for amount ${amountInPaise} paise`);
  } catch (rzpErr) {
    const errMsg = rzpErr.description || rzpErr.error?.description || rzpErr.message || JSON.stringify(rzpErr);
    logger.error(`[Razorpay Rent] API order creation failed: ${errMsg}`);
    throw new AppError(`Razorpay API order creation failed: ${errMsg}`, 400);
  }

  res.status(201).json({
    success: true,
    data: {
      orderId: razorpayOrderId,
      keyId: keyId,
      amount: amountInPaise,
      currency: 'INR',
      leaseId: targetLease._id,
      totalDue,
      breakdown: {
        monthlyRent: rentAmount,
        lateFee,
        daysOverdue,
        platformFee: breakdown.platformFee,
        taxAmount: breakdown.taxAmount || 0,
        totalDue
      }
    }
  });
});

/**
 * POST /api/payments/verify-razorpay
 * Cryptographically verifies Razorpay payment and marks lease payment as paid.
 */
export const verifyRazorpayRentPayment = asyncHandler(async (req, res) => {
  const { leaseId, billId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  const actualUserId = req.user?.userId || req.user?._id || req.user?.id;
  const user = await User.findById(actualUserId);

  const tenantRecords = user ? await Tenant.find({ email: user.email }) : [];
  const tenantIds = [actualUserId, ...tenantRecords.map(t => t._id)];

  let targetLease = null;
  if (leaseId) {
    if (mongoose.Types.ObjectId.isValid(leaseId)) {
      targetLease = await Lease.findById(leaseId).populate('property tenant');
    }
    if (!targetLease) {
      targetLease = await Lease.findOne({ leaseNumber: leaseId }).populate('property tenant');
    }
  } else if (billId) {
    let bill = null;
    if (mongoose.Types.ObjectId.isValid(billId)) {
      bill = await Bill.findById(billId).populate('lease property tenant');
    }
    if (!bill) {
      bill = await Bill.findOne({ billNumber: billId }).populate('lease property tenant');
    }
    if (bill && bill.lease) {
      targetLease = await Lease.findById(bill.lease).populate('property tenant');
    }
  }

  if (!targetLease) {
    targetLease = await Lease.findOne({
      tenant: { $in: tenantIds },
      status: { $in: ['active', 'pending'] }
    }).populate('property tenant');
  }

  if (!targetLease) {
    targetLease = await Lease.findOne({
      tenant: { $in: tenantIds }
    }).sort({ createdAt: -1 }).populate('property tenant');
  }

  if (!targetLease) {
    throw new AppError('Lease not found for payment verification', 404);
  }

  const keySecret = (process.env.RAZORPAY_KEY_SECRET || 'J1XPHqYCTE8sSNhNtzarqYaQ').trim();

  // Strict HMAC SHA-256 signature verification
  if (!razorpaySignature || !razorpayOrderId || !razorpayPaymentId) {
    throw new AppError('Missing Razorpay verification parameters (signature, orderId, paymentId)', 400);
  }

  const hmac = crypto.createHmac('sha256', keySecret);
  hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
  const generatedSignature = hmac.digest('hex');

  if (generatedSignature !== razorpaySignature) {
    logger.error(`[Razorpay Rent] Signature mismatch for order ${razorpayOrderId}. Expected ${generatedSignature}, got ${razorpaySignature}`);
    throw new AppError('Payment signature verification failed. Invalid transaction signature.', 400);
  }

  // Recalculate authoritative server amounts
  const leasePayments = await Payment.find({ lease: targetLease._id }).sort({ dueDate: -1, createdAt: -1 });
  const schedule = calculateNextPaymentDue(targetLease, leasePayments, new Date());

  const rentAmount = schedule?.rentAmount ?? targetLease.rentAmount ?? 0;
  const lateFee = schedule?.lateFee ?? 0;
  const daysOverdue = schedule?.daysLate ?? 0;
  const basePayable = rentAmount + lateFee;

  const breakdown = await calculatePaymentBreakdown(basePayable);
  const totalDue = breakdown.totalPayable;

  const BillModel = mongoose.model('Bill');
  const billNumber = `BILL-RENT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const breakdownItems = [{ label: 'Monthly Rent', amount: rentAmount }];
  if (lateFee > 0) {
    breakdownItems.push({ label: `Late Fee (${daysOverdue} days overdue)`, amount: lateFee });
  }
  if (breakdown.platformFee > 0) {
    breakdownItems.push({ label: 'TMS Platform Fee', amount: breakdown.platformFee });
  }

  const bill = await BillModel.create({
    billNumber,
    type: 'rent',
    lease: targetLease._id,
    tenant: targetLease.tenant?._id || targetLease.tenant,
    property: targetLease.property?._id || targetLease.property,
    status: 'paid',
    dueDate: schedule?.nextPaymentDueAt || new Date(),
    billingPeriodStart: schedule?.billingPeriodStart || targetLease.startDate,
    billingPeriodEnd: schedule?.billingPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    breakdown: breakdownItems,
    amountDue: totalDue,
    amountPaid: totalDue,
    lateFeeApplied: lateFee > 0,
    timeline: [
      { status: 'generated', note: 'Rent invoice generated automatically.' },
      { status: 'paid', note: `Paid ₹${totalDue} via Razorpay (Ref: ${razorpayPaymentId}).` }
    ]
  });

  // Find or create Payment record
  let payment = await Payment.findOne({
    lease: targetLease._id,
    status: { $in: ['pending', 'overdue', 'partially_paid', 'generated'] }
  });

  if (payment) {
    payment.status = 'paid';
    payment.amount = rentAmount;
    payment.amountPaid = totalDue;
    payment.rentAmount = rentAmount;
    payment.lateFee = lateFee;
    payment.lateFeeApplied = lateFee > 0;
    payment.daysLate = daysOverdue;
    payment.platformFee = breakdown.platformFee;
    payment.taxAmount = breakdown.taxAmount || 0;
    payment.totalAmount = totalDue;
    payment.totalDue = totalDue;
    payment.paidAt = new Date();
    payment.paymentDate = new Date();
    payment.paymentMethod = 'card';
    payment.razorpayOrderId = razorpayOrderId;
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature;
    payment.providerStatus = 'captured';
    payment.reference = razorpayPaymentId;
    if (!payment.bill) payment.bill = bill._id;
    await payment.save();
  } else {
    payment = await Payment.create({
      type: 'rent',
      lease: targetLease._id,
      tenant: targetLease.tenant?._id || targetLease.tenant,
      property: targetLease.property?._id || targetLease.property,
      amount: rentAmount,
      amountPaid: totalDue,
      rentAmount,
      lateFee,
      lateFeeApplied: lateFee > 0,
      daysLate: daysOverdue,
      platformFee: breakdown.platformFee,
      taxAmount: breakdown.taxAmount || 0,
      totalAmount: totalDue,
      totalDue,
      status: 'paid',
      paidAt: new Date(),
      paymentDate: new Date(),
      dueDate: schedule?.nextPaymentDueAt || new Date(),
      paymentMethod: 'card',
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      providerStatus: 'captured',
      reference: razorpayPaymentId,
      bill: bill._id
    });
  }

  bill.payment = payment._id;
  await bill.save();

  // Ledger entry
  try {
    const propertyObj = await Property.findById(targetLease.property?._id || targetLease.property);
    const managerId = targetLease.createdBy || propertyObj?.manager || propertyObj?.owner;
    await recordVerifiedRevenue({
      paymentId: payment._id,
      tenantId: targetLease.tenant?._id || targetLease.tenant,
      leaseId: targetLease._id,
      propertyId: targetLease.property?._id || targetLease.property,
      managerId,
      rentAmount,
      platformFee: breakdown.platformFee,
      platformFeePercentage: breakdown.platformFeePercentage,
      platformTax: breakdown.taxAmount,
      managerCommission: breakdown.managerCommission,
      managerGrossAmount: breakdown.managerGrossAmount,
      managerNetAmount: breakdown.managerNetAmount,
      platformRevenue: breakdown.platformRevenue,
      totalAmount: totalDue,
      currency: 'INR',
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    });
  } catch (revErr) {
    logger.warn(`[Razorpay Rent] Revenue recording warning: ${revErr.message}`);
  }

  // Trigger invoice generation and notifications
  processPostPayment(payment).catch(err => {
    logger.error(`[Razorpay Rent] Post-payment processing error: ${err.message}`);
  });

  logger.info(`[Razorpay Rent] Payment verified successfully: paymentId=${payment._id}, totalPaid=₹${totalDue}`);

  res.status(200).json({
    success: true,
    message: 'Payment verified and marked paid successfully',
    data: {
      payment: resolveInvoiceUrl(payment, req),
      totalPaid: totalDue,
      status: 'paid'
    }
  });
});

/**
 * POST /api/payments/webhook
 * Razorpay Webhook receiver for background payment event confirmation.
 */
export const handleRazorpayWebhook = asyncHandler(async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];

  if (webhookSecret && signature) {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (expectedSignature !== signature) {
      logger.warn('[Razorpay Webhook] Invalid webhook signature received');
      return res.status(400).json({ status: 'invalid_signature' });
    }
  }

  const event = req.body?.event;
  const payload = req.body?.payload;

  logger.info(`[Razorpay Webhook] Received event: ${event}`);

  if (event === 'payment.captured' || event === 'order.paid') {
    const paymentEntity = payload?.payment?.entity;
    const orderId = paymentEntity?.order_id || payload?.order?.entity?.id;
    const paymentId = paymentEntity?.id;

    if (orderId) {
      const existingPayment = await Payment.findOne({ razorpayOrderId: orderId });
      if (existingPayment && existingPayment.status !== 'paid') {
        existingPayment.status = 'paid';
        existingPayment.paidAt = new Date();
        existingPayment.paymentDate = new Date();
        existingPayment.razorpayPaymentId = paymentId;
        existingPayment.providerStatus = 'captured';
        await existingPayment.save();
        logger.info(`[Razorpay Webhook] Marked payment ${existingPayment._id} as paid via webhook.`);
      }
    }
  }

  res.status(200).json({ status: 'ok' });
});
