import Payment from '../models/Payment.js';
import Lease from '../models/Lease.js';
import Tenant from '../models/Tenant.js';
import User from '../models/User.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';

// Tenant-scoped: get the logged-in user's own payment history
export const getMyPayments = asyncHandler(async (req, res) => {
  // JWT has userId + role only — look up email via User model
  const user = await User.findById(req.user.userId).select('email');
  if (!user) return res.status(200).json({ success: true, data: [] });

  const tenant = await Tenant.findOne({ email: user.email });
  if (!tenant) return res.status(200).json({ success: true, data: [] });

  const payments = await Payment.find({ tenant: tenant._id })
    .sort({ dueDate: -1 })
    .limit(24)
    .populate('lease', 'leaseNumber rentAmount')
    .populate('property', 'name address');

  res.status(200).json({ success: true, data: payments });
});


export const getAllPayments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, leaseId, tenantId } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (leaseId) filter.lease = leaseId;
  if (tenantId) filter.tenant = tenantId;

  const skip = (page - 1) * limit;

  const payments = await Payment.find(filter)
    .skip(skip)
    .limit(parseInt(limit))
    .populate('lease', 'leaseNumber')
    .populate('tenant', 'firstName lastName email')
    .populate('property', 'name address');

  const total = await Payment.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: payments,
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
    data: payment,
  });
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
    data: payment,
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

  logger.info(`Payment recorded: ${payment._id}`);

  res.status(200).json({
    success: true,
    message: 'Payment recorded successfully',
    data: payment,
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

  logger.info(`Payment status updated: ${payment._id} - ${status}`);

  res.status(200).json({
    success: true,
    message: 'Payment status updated successfully',
    data: payment,
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
