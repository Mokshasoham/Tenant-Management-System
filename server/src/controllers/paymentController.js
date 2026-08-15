import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import Lease from '../models/Lease.js';
import Tenant from '../models/Tenant.js';
import User from '../models/User.js';
import Property from '../models/Property.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';
import { processPostPayment } from '../services/paymentAutomation.js';
import { generateInvoicePDF } from '../services/pdfService.js';
import { getSignedUrlForFile } from './fileController.js';

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

  const filter = { tenant: { $in: tenantIds } };
  if (req.query.bill === 'null') {
    filter.$or = [
      { bill: null },
      { bill: { $exists: false } }
    ];
  }

  const payments = await Payment.find(filter)
    .sort({ dueDate: -1 })
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
    payment.paymentDate = paymentDate;
  } else if (payment.amountPaid > 0) {
    payment.status = 'partially_paid';
  }

  await payment.save();

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
