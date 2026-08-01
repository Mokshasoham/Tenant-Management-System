import mongoose from 'mongoose';
import Bill from '../models/Bill.js';
import Payment from '../models/Payment.js';
import Lease from '../models/Lease.js';
import Tenant from '../models/Tenant.js';
import Property from '../models/Property.js';
import User from '../models/User.js';
import Counter from '../models/Counter.js';
import EventService from '../services/eventService.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';
import { generateInvoicePDF, buildInvoiceViewModel } from '../services/pdfService.js';
import { syncPaymentToBill } from '../services/billSyncService.js';
import { getSignedUrlForFile } from './fileController.js';

// Helper: Atomic counter sequence generator for bill numbers
const generateBillNumber = async (type) => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  
  const counter = await Counter.findOneAndUpdate(
    { _id: `BILL-${type.toUpperCase()}-${dateStr}` },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  
  const seqStr = String(counter.seq).padStart(4, '0');
  return `BILL-${type.substring(0, 4).toUpperCase()}-${dateStr}-${seqStr}`;
};

// GET /api/bills (Paginated & Filtered, Manager/Admin only)
export const getAllBills = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, type, leaseId, tenantId, propertyId } = req.query;
  const skip = (page - 1) * limit;

  const filter = {};
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (leaseId) filter.lease = leaseId;
  if (tenantId) filter.tenant = tenantId;
  if (propertyId) filter.property = propertyId;

  const bills = await Bill.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('lease', 'leaseNumber')
    .populate('tenant', 'firstName lastName email tenantCode')
    .populate('property', 'name address');

  const total = await Bill.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: bills,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// GET /api/bills/my-bills (Tenant scope)
export const getMyBills = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId).select('email');
  if (!user) {
    return res.status(200).json({ success: true, data: [] });
  }

  const tenant = await Tenant.findOne({ email: user.email });
  if (!tenant) {
    return res.status(200).json({ success: true, data: [] });
  }

  const bills = await Bill.find({ tenant: tenant._id })
    .sort({ dueDate: -1 })
    .populate('lease', 'leaseNumber')
    .populate('property', 'name address');

  res.status(200).json({ success: true, data: bills });
});

// GET /api/bills/:id (View details - checks ownership)
export const getBillById = asyncHandler(async (req, res) => {
  const bill = await Bill.findById(req.params.id)
    .populate('lease')
    .populate('tenant')
    .populate('property');

  if (!bill) {
    throw new AppError('Bill not found', 404);
  }

  // Tenant-specific ownership validation
  if (req.user.role === 'tenant') {
    const user = await User.findById(req.user.userId).select('email');
    const tenant = await Tenant.findOne({ email: user.email });
    if (!tenant || bill.tenant._id.toString() !== tenant._id.toString()) {
      throw new AppError('Forbidden: Access denied to this bill record', 403);
    }
  }

  res.status(200).json({ success: true, data: bill });
});

// POST /api/bills (Create manual invoice, Manager/Admin only)
export const createBill = asyncHandler(async (req, res) => {
  const {
    type,
    leaseId,
    dueDate,
    billingPeriodStart,
    billingPeriodEnd,
    meterReading,
    breakdown
  } = req.body;

  const lease = await Lease.findById(leaseId).populate('tenant property');
  if (!lease) throw new AppError('Lease not found', 404);

  const billNumber = await generateBillNumber(type);

  // Meter readings calculations
  let finalBreakdown = breakdown || [];
  if (['electricity', 'water'].includes(type) && meterReading) {
    const { previous, current, rate } = meterReading;
    if (current < previous) {
      throw new AppError('Current meter reading cannot be less than previous reading', 400);
    }
    const consumption = current - previous;
    const computedAmount = consumption * rate;

    // Push meter charge dynamically to breakdown
    finalBreakdown.push({
      label: `${type.toUpperCase()} Consumption (${consumption} units @ ₹${rate})`,
      amount: computedAmount
    });
  }

  const bill = await Bill.create({
    billNumber,
    type,
    lease: leaseId,
    tenant: lease.tenant._id,
    property: lease.property._id,
    status: 'generated',
    dueDate,
    billingPeriodStart,
    billingPeriodEnd,
    meterReading,
    breakdown: finalBreakdown,
    timeline: [
      { status: 'draft', note: 'Bill drafted by manager', actor: req.user.userId },
      { status: 'generated', note: 'Invoice finalized and generated', actor: req.user.userId }
    ]
  });

  // Create a shadow Payment for legacy API integrations and gateways
  const payment = await Payment.create({
    type: type === 'rent' ? 'rent' : type === 'security_deposit' ? 'security_deposit' : type === 'late_fee' ? 'late_fee' : 'rent',
    lease: leaseId,
    tenant: lease.tenant._id,
    property: lease.property._id,
    amount: bill.amountDue,
    dueDate,
    status: 'pending',
    notes: `${type.toUpperCase()} Bill - Ref: ${billNumber}`,
    bill: bill._id
  });

  bill.payment = payment._id;
  await bill.save();

  // Generate & upload invoice PDF PDF
  const viewModel = buildInvoiceViewModel(bill, payment);
  const pdfData = await generateInvoicePDF(viewModel, lease.tenant, lease.property, lease);

  bill.invoiceUrl = pdfData.Location;
  bill.fileId = pdfData.fileId;
  await bill.save();

  payment.invoiceUrl = pdfData.Location;
  payment.fileId = pdfData.fileId;
  await payment.save();

  // Dispatches notification
  const tenantUser = await User.findOne({ email: lease.tenant.email });
  if (tenantUser) {
    await EventService.publish({
      recipient: tenantUser._id,
      category: 'billing',
      event: 'generated',
      title: '📄 New Bill Generated',
      description: `A new ${type} invoice for ₹${bill.amountDue} has been generated. Due date: ${new Date(dueDate).toLocaleDateString()}.`,
      sourceModule: 'billing',
      entityType: 'Bill',
      entityId: bill._id,
      redirectUrl: '/bills',
      action: 'view',
      priority: 'high',
      severity: 'information',
      createdBy: req.user.userId,
      metadata: {
        invoiceNumber: bill.billNumber,
        amount: bill.amountDue
      }
    });
  }

  res.status(201).json({ success: true, message: 'Bill created successfully', data: bill });
});

// POST /api/bills/:id/record-payment (Manual Cash/Check recording)
export const recordBillPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amountPaid, paymentDate, paymentMethod, reference } = req.body;

  const bill = await Bill.findById(id);
  if (!bill) throw new AppError('Bill not found', 404);

  if (bill.status === 'paid') {
    throw new AppError('Bill is already paid in full', 400);
  }

  // Create a Payment transaction representing this manual receipt
  const payment = await Payment.create({
    type: bill.type === 'rent' ? 'rent' : bill.type === 'security_deposit' ? 'security_deposit' : 'rent',
    lease: bill.lease,
    tenant: bill.tenant,
    property: bill.property,
    amount: bill.amountDue,
    amountPaid: amountPaid,
    paymentDate: paymentDate || new Date(),
    status: 'paid', // Success transaction
    paymentMethod: paymentMethod || 'cash',
    reference: reference || `MANUAL-${Date.now()}`,
    bill: bill._id,
    receipts: [
      {
        amount: amountPaid,
        date: paymentDate || new Date(),
        method: paymentMethod || 'cash',
        reference: reference
      }
    ]
  });

  // Re-sync using coordinator
  await syncPaymentToBill(payment._id);

  const updatedBill = await Bill.findById(id).populate('lease tenant property');

  res.status(200).json({
    success: true,
    message: 'Payment recorded and synced successfully',
    data: updatedBill
  });
});

// POST /api/bills/:id/void (Void bill, Manager/Admin only)
export const voidBill = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const bill = await Bill.findById(id);
  if (!bill) throw new AppError('Bill not found', 404);

  if (['paid', 'cancelled', 'voided'].includes(bill.status)) {
    throw new AppError(`Cannot void a bill with status: ${bill.status}`, 400);
  }

  bill.status = 'voided';
  bill.voidReason = reason || 'No reason provided';
  bill.timeline.push({
    status: 'voided',
    note: `Bill voided. Reason: ${reason}`,
    actor: req.user.userId
  });

  await bill.save();

  // Cancel/Void shadow payments
  if (bill.payment) {
    const payment = await Payment.findById(bill.payment);
    if (payment) {
      payment.status = 'cancelled';
      await payment.save();
    }
  }

  logger.info(`Bill ${bill.billNumber} voided by ${req.user.userId}`);
  res.status(200).json({ success: true, message: 'Bill voided successfully', data: bill });
});

// GET /api/bills/:id/download (Generate short-lived signed download link)
export const getBillDownload = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const bill = await Bill.findById(id);
  if (!bill) throw new AppError('Bill not found', 404);

  // Authenticate ownership
  if (req.user.role === 'tenant') {
    const user = await User.findById(req.user.userId).select('email');
    const tenant = await Tenant.findOne({ email: user.email });
    if (!tenant || bill.tenant.toString() !== tenant._id.toString()) {
      throw new AppError('Forbidden: Access denied', 403);
    }
  }

  if (!bill.fileId) {
    throw new AppError('Invoice file metadata not generated yet', 404);
  }

  req.params.fileId = bill.fileId.toString();
  return getSignedUrlForFile(req, res);
});

// GET /api/bills/analytics (Revenue metrics, Manager/Admin only)
export const getBillAnalytics = asyncHandler(async (req, res) => {
  const totalInvoiced = await Bill.aggregate([
    { $match: { status: { $ne: 'voided' } } },
    { $group: { _id: null, total: { $sum: '$amountDue' } } }
  ]);

  const totalCollected = await Bill.aggregate([
    { $match: { status: { $ne: 'voided' } } },
    { $group: { _id: null, total: { $sum: '$amountPaid' } } }
  ]);

  const collectionsByType = await Bill.aggregate([
    { $match: { status: { $ne: 'voided' } } },
    { $group: { _id: '$type', totalDue: { $sum: '$amountDue' }, totalPaid: { $sum: '$amountPaid' } } }
  ]);

  const statusCounts = await Bill.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalInvoiced: totalInvoiced[0]?.total || 0,
      totalCollected: totalCollected[0]?.total || 0,
      outstandingAmount: (totalInvoiced[0]?.total || 0) - (totalCollected[0]?.total || 0),
      collectionsByType,
      statusCounts
    }
  });
});

// GET /api/bills/export (Export CSV data, Manager/Admin only)
export const exportBillsCSV = asyncHandler(async (req, res) => {
  const { status, type } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (type) filter.type = type;

  const bills = await Bill.find(filter)
    .populate('tenant', 'firstName lastName email')
    .populate('property', 'name')
    .sort({ createdAt: -1 });

  let csvContent = 'Bill Number,Type,Property,Tenant,Due Date,Amount Due,Amount Paid,Balance,Status\n';
  for (const b of bills) {
    const tenantName = b.tenant ? `"${b.tenant.firstName} ${b.tenant.lastName}"` : 'N/A';
    const propertyName = b.property ? `"${b.property.name}"` : 'N/A';
    const balance = b.amountDue - b.amountPaid;
    csvContent += `${b.billNumber},${b.type},${propertyName},${tenantName},${b.dueDate.toISOString().split('T')[0]},${b.amountDue},${b.amountPaid},${balance},${b.status}\n`;
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=billing_report_${Date.now()}.csv`);
  res.status(200).send(csvContent);
});
