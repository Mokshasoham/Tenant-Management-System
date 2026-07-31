import Lease from '../models/Lease.js';
import LeaseRenewal from '../models/LeaseRenewal.js';
import ExitFeedback from '../models/ExitFeedback.js';
import PropertyInspection from '../models/PropertyInspection.js';
import DepositSettlement from '../models/DepositSettlement.js';
import Property from '../models/Property.js';
import Tenant from '../models/Tenant.js';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import Maintenance from '../models/Maintenance.js';
import Notification from '../models/Notification.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';
import PDFDocument from 'pdfkit';

// 1. Tenant: Request Lease Renewal (POST /renewals/request)
export const requestRenewal = asyncHandler(async (req, res) => {
  const { leaseId, duration, message, requestedStartDate, requestedEndDate } = req.body;

  const lease = await Lease.findById(leaseId);
  if (!lease) throw new AppError('Lease not found', 404);

  // Validate that user is the tenant of the lease
  const tenantRecord = await Tenant.findById(lease.tenant);
  if (!tenantRecord) throw new AppError('Tenant record not found', 404);

  const tenantUser = await User.findOne({ email: tenantRecord.email });
  if (!tenantUser || tenantUser._id.toString() !== req.user.userId) {
    throw new AppError('You are not authorized to request renewal for this lease', 403);
  }

  // Current lease must be active
  if (lease.status !== 'active') {
    throw new AppError('Only active leases can be renewed', 400);
  }

  // Current lease must be pending decision
  if (lease.leaseDecision !== 'pending' && lease.leaseDecision !== 'offer_sent') {
    throw new AppError('A lease renewal decision has already been requested or processed', 400);
  }

  // Prevent multiple pending requests
  const existingPending = await LeaseRenewal.findOne({
    lease: leaseId,
    status: { $in: ['pending', 'offered'] },
    isArchived: false,
  });
  if (existingPending) {
    throw new AppError('There is already a pending renewal request or manager offer for this lease', 400);
  }

  // Validate overlapping pending or active future lease exists
  const overlapLease = await Lease.findOne({
    property: lease.property,
    status: { $in: ['pending', 'active'] },
    startDate: { $gte: lease.endDate },
    _id: { $ne: lease._id }
  });
  if (overlapLease) {
    throw new AppError('An overlapping pending or active future lease already exists for this property', 400);
  }

  // Check unpaid balances
  const unpaidPayments = await Payment.findOne({
    lease: leaseId,
    status: { $in: ['pending', 'partially_paid', 'overdue'] }
  });
  if (unpaidPayments) {
    throw new AppError('Renewal request blocked due to outstanding unpaid balances', 400);
  }

  // Check unresolved maintenance requests
  const openMaintenance = await Maintenance.findOne({
    property: lease.property,
    tenant: lease.tenant,
    status: { $in: ['open', 'in_progress'] }
  });
  if (openMaintenance) {
    throw new AppError('Renewal request blocked due to unresolved maintenance requests', 400);
  }

  // Create renewal request
  const renewal = await LeaseRenewal.create({
    lease: leaseId,
    tenant: lease.tenant,
    manager: lease.createdBy,
    property: lease.property,
    requestedStartDate: new Date(requestedStartDate),
    requestedEndDate: new Date(requestedEndDate),
    duration,
    message,
    proposedRent: lease.rentAmount,
    type: 'tenant_request',
    status: 'pending',
    createdBy: tenantUser._id,
    timeline: [{ event: 'Renewal Requested', note: 'Tenant submitted a lease renewal request.' }]
  });

  lease.leaseDecision = 'renewal_requested';
  await lease.save();

  // Notify Manager
  await Notification.create({
    recipient: lease.createdBy,
    sender: tenantUser._id,
    title: 'Renewal Request Received',
    message: `Tenant has requested a lease renewal for property ${lease.leaseNumber}.`,
    type: 'info',
    link: `/leases`
  });

  res.status(201).json({ success: true, data: renewal });
});

// 2. Manager: Send Renewal Offer (POST /renewals/offer)
export const sendRenewalOffer = asyncHandler(async (req, res) => {
  const { leaseId, duration, proposedRent, requestedStartDate, requestedEndDate, message } = req.body;

  const lease = await Lease.findById(leaseId);
  if (!lease) throw new AppError('Lease not found', 404);

  if (lease.status !== 'active') {
    throw new AppError('Renewal offers can only be sent for active leases', 400);
  }

  const existingPending = await LeaseRenewal.findOne({
    lease: leaseId,
    status: { $in: ['pending', 'offered'] },
    isArchived: false,
  });
  if (existingPending) {
    throw new AppError('A pending renewal process already exists for this lease', 400);
  }

  // Validate overlapping future leases
  const overlapLease = await Lease.findOne({
    property: lease.property,
    status: { $in: ['pending', 'active'] },
    startDate: { $gte: lease.endDate },
    _id: { $ne: lease._id }
  });
  if (overlapLease) {
    throw new AppError('An overlapping future lease already exists', 400);
  }

  const tenant = await Tenant.findById(lease.tenant);
  const tenantUser = await User.findOne({ email: tenant?.email });

  const renewal = await LeaseRenewal.create({
    lease: leaseId,
    tenant: lease.tenant,
    manager: req.user.userId,
    property: lease.property,
    requestedStartDate: new Date(requestedStartDate),
    requestedEndDate: new Date(requestedEndDate),
    duration,
    message,
    proposedRent: Number(proposedRent) || lease.rentAmount,
    type: 'manager_offer',
    status: 'offered',
    createdBy: req.user.userId,
    timeline: [{ event: 'Renewal Offered', note: `Manager offered renewal. Proposed rent: ₹${proposedRent}` }]
  });

  lease.leaseDecision = 'offer_sent';
  await lease.save();

  if (tenantUser) {
    await Notification.create({
      recipient: tenantUser._id,
      sender: req.user.userId,
      title: 'Lease Renewal Offer',
      message: `Your manager has offered a lease renewal of ${duration} at ₹${proposedRent}/month.`,
      type: 'info',
      link: '/my-lease'
    });
  }

  res.status(201).json({ success: true, data: renewal });
});

// 3. Tenant: Respond to Offer (POST /renewals/:id/respond)
export const respondToOffer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'accept' or 'reject'

  const renewal = await LeaseRenewal.findById(id);
  if (!renewal) throw new AppError('Renewal record not found', 404);

  if (renewal.status !== 'offered') {
    throw new AppError('This renewal offer is no longer active', 400);
  }

  const lease = await Lease.findById(renewal.lease);
  if (!lease) throw new AppError('Associated lease not found', 404);

  const tenant = await Tenant.findById(renewal.tenant);
  const tenantUser = await User.findOne({ email: tenant?.email });
  if (!tenantUser || tenantUser._id.toString() !== req.user.userId) {
    throw new AppError('Unauthorized access', 403);
  }

  if (action === 'accept') {
    renewal.status = 'accepted';
    renewal.timeline.push({ event: 'Tenant Accepted', note: 'Tenant accepted the lease renewal offer.' });
    await renewal.save();

    lease.leaseDecision = 'renewal_requested';
    await lease.save();

    await Notification.create({
      recipient: renewal.manager,
      sender: req.user.userId,
      title: 'Renewal Offer Accepted',
      message: `Tenant has accepted your renewal offer for lease ${lease.leaseNumber}. Awaiting final approval.`,
      type: 'success',
      link: '/leases'
    });
  } else {
    renewal.status = 'rejected';
    renewal.timeline.push({ event: 'Tenant Rejected', note: 'Tenant rejected the lease renewal offer.' });
    await renewal.save();

    lease.leaseDecision = 'pending';
    await lease.save();

    await Notification.create({
      recipient: renewal.manager,
      sender: req.user.userId,
      title: 'Renewal Offer Rejected',
      message: `Tenant has rejected your renewal offer for lease ${lease.leaseNumber}.`,
      type: 'warning',
      link: '/leases'
    });
  }

  res.status(200).json({ success: true, data: renewal });
});

// 4. Tenant: Submit Move-Out Notice (POST /lease/moveout)
export const submitMoveOutNotice = asyncHandler(async (req, res) => {
  const { leaseId, expectedMoveOutDate, reason, comments } = req.body;

  const lease = await Lease.findById(leaseId);
  if (!lease) throw new AppError('Lease not found', 404);

  const tenant = await Tenant.findById(lease.tenant);
  const tenantUser = await User.findOne({ email: tenant?.email });
  if (!tenantUser || tenantUser._id.toString() !== req.user.userId) {
    throw new AppError('Unauthorized access', 403);
  }

  if (lease.status !== 'active') {
    throw new AppError('Move-out notices can only be submitted for active leases', 400);
  }

  lease.leaseDecision = 'moving_out';
  lease.moveOutStatus = 'requested';
  await lease.save();

  // Notify manager
  await Notification.create({
    recipient: lease.createdBy,
    sender: tenantUser._id,
    title: 'Move-out Notice Submitted',
    message: `Tenant under lease ${lease.leaseNumber} submitted a move-out notice. Reason: ${reason}`,
    type: 'warning',
    link: '/leases'
  });

  res.status(200).json({ success: true, message: 'Move-out notice submitted successfully' });
});

// 5. Tenant: Submit Exit Feedback (POST /feedback/exit)
export const submitExitFeedback = asyncHandler(async (req, res) => {
  const { leaseId, ratings, recommend, rentSatisfied, maintenanceSatisfied, comments, suggestions } = req.body;

  const lease = await Lease.findById(leaseId);
  if (!lease) throw new AppError('Lease not found', 404);

  const tenant = await Tenant.findById(lease.tenant);
  const tenantUser = await User.findOne({ email: tenant?.email });
  if (!tenantUser || tenantUser._id.toString() !== req.user.userId) {
    throw new AppError('Unauthorized access', 403);
  }

  // Create feedback record
  const feedback = await ExitFeedback.create({
    lease: leaseId,
    property: lease.property,
    tenant: lease.tenant,
    ratings,
    recommend,
    rentSatisfied,
    maintenanceSatisfied,
    comments,
    suggestions,
    createdBy: tenantUser._id,
    timeline: [{ event: 'Feedback Submitted', note: 'Tenant completed exit feedback form.' }]
  });

  lease.moveOutStatus = 'requested'; // Confirmed feedback submitted
  await lease.save();

  // Notify manager
  await Notification.create({
    recipient: lease.createdBy,
    sender: tenantUser._id,
    title: 'Exit Feedback Submitted',
    message: `Exit feedback has been submitted for lease ${lease.leaseNumber}.`,
    type: 'info',
    link: '/leases'
  });

  res.status(201).json({ success: true, data: feedback });
});

// 6. Manager: Schedule Inspection (POST /inspection)
export const scheduleInspection = asyncHandler(async (req, res) => {
  const { leaseId, inspectionDate, notes } = req.body;

  const lease = await Lease.findById(leaseId);
  if (!lease) throw new AppError('Lease not found', 404);

  // Assert that feedback has been submitted
  const feedbackExists = await ExitFeedback.findOne({ lease: leaseId });
  if (!feedbackExists) {
    throw new AppError('Tenant exit feedback is required before scheduling inspection', 400);
  }

  const tenant = await Tenant.findById(lease.tenant);
  const tenantUser = await User.findOne({ email: tenant?.email });

  const inspection = await PropertyInspection.create({
    lease: leaseId,
    property: lease.property,
    manager: req.user.userId,
    inspectionDate: new Date(inspectionDate),
    inspectionStatus: 'scheduled',
    inspectionResult: 'none',
    notes,
    createdBy: req.user.userId,
    timeline: [{ event: 'Scheduled', note: `Inspection scheduled for ${new Date(inspectionDate).toLocaleDateString()}` }]
  });

  lease.moveOutStatus = 'inspection_scheduled';
  await lease.save();

  if (tenantUser) {
    await Notification.create({
      recipient: tenantUser._id,
      sender: req.user.userId,
      title: 'Inspection Scheduled',
      message: `Manager scheduled your move-out property inspection for ${new Date(inspectionDate).toLocaleString()}`,
      type: 'info',
      link: '/my-lease'
    });
  }

  res.status(201).json({ success: true, data: inspection });
});

// 7. Manager: Complete Inspection Report (PUT /inspection/:id)
export const completeInspection = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    checklist,
    beforePhotos,
    damagePhotos,
    afterRepairPhotos,
    notes,
    estimatedRepairCost,
    actualRepairCost,
    refundAmount,
    inspectionResult
  } = req.body;

  const inspection = await PropertyInspection.findById(id);
  if (!inspection) throw new AppError('Inspection report not found', 404);

  inspection.checklist = checklist || inspection.checklist;
  inspection.beforePhotos = beforePhotos || inspection.beforePhotos;
  inspection.damagePhotos = damagePhotos || inspection.damagePhotos;
  inspection.afterRepairPhotos = afterRepairPhotos || inspection.afterRepairPhotos;
  inspection.notes = notes || inspection.notes;
  inspection.estimatedRepairCost = Number(estimatedRepairCost) || 0;
  inspection.actualRepairCost = Number(actualRepairCost) || 0;
  inspection.refundAmount = Number(refundAmount) || 0;
  inspection.inspectionStatus = 'completed';
  inspection.inspectionResult = inspectionResult;
  inspection.updatedBy = req.user.userId;
  inspection.timeline.push({ event: 'Completed', note: `Inspection completed with result: ${inspectionResult}` });
  await inspection.save();

  const lease = await Lease.findById(inspection.lease);
  if (lease) {
    lease.moveOutStatus = 'inspection_completed';
    await lease.save();
  }

  res.status(200).json({ success: true, data: inspection });
});

// 8. Manager: Process Deposit Refund (POST /deposit/refund)
export const processDepositRefund = asyncHandler(async (req, res) => {
  const { leaseId, deductions, reason } = req.body;

  const lease = await Lease.findById(leaseId);
  if (!lease) throw new AppError('Lease not found', 404);

  // Assert inspection is completed
  const inspection = await PropertyInspection.findOne({ lease: leaseId, inspectionStatus: 'completed' });
  if (!inspection) {
    throw new AppError('Property inspection must be completed before settling deposit refund', 400);
  }

  const depositAmount = lease.depositAmount || 0;
  const deductionList = deductions || [];
  const totalDeduction = deductionList.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const refundAmount = Math.max(0, depositAmount - totalDeduction);

  const settlement = await DepositSettlement.create({
    lease: leaseId,
    depositAmount,
    deductions: deductionList,
    totalDeduction,
    refundAmount,
    status: 'Processing',
    reason,
    createdBy: req.user.userId,
    timeline: [{ event: 'Refund Initiated', note: `Deposit settlement processing. Total Deductions: ₹${totalDeduction}` }]
  });

  lease.moveOutStatus = 'refund_processing';
  await lease.save();

  // Notify tenant
  const tenant = await Tenant.findById(lease.tenant);
  const tenantUser = await User.findOne({ email: tenant?.email });
  if (tenantUser) {
    await Notification.create({
      recipient: tenantUser._id,
      sender: req.user.userId,
      title: 'Refund Processing',
      message: `Your deposit settlement of ₹${refundAmount} is currently processing.`,
      type: 'info',
      link: '/my-lease'
    });
  }

  res.status(201).json({ success: true, data: settlement });
});

// 9. Manager: Approve Lease Renewal (PUT /renewals/:id/approve)
export const approveRenewal = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const renewal = await LeaseRenewal.findById(id);
  if (!renewal) throw new AppError('Renewal request not found', 404);

  if (renewal.status !== 'pending' && renewal.status !== 'accepted') {
    throw new AppError('This renewal request is not in a reviewable state', 400);
  }

  const currentLease = await Lease.findById(renewal.lease);
  if (!currentLease) throw new AppError('Current lease not found', 404);

  const property = await Property.findById(renewal.property);
  if (!property) throw new AppError('Property not found', 404);

  const tenant = await Tenant.findById(renewal.tenant);
  if (!tenant) throw new AppError('Tenant not found', 404);

  // Validate overlapping future active or pending leases
  const overlapLease = await Lease.findOne({
    property: currentLease.property,
    status: { $in: ['pending', 'active'] },
    startDate: { $gte: currentLease.endDate },
    _id: { $ne: currentLease._id }
  });
  if (overlapLease) {
    throw new AppError('An overlapping active or pending future lease already exists', 400);
  }

  // Validate unpaid balances
  const unpaidPayments = await Payment.findOne({
    lease: currentLease._id,
    status: { $in: ['pending', 'partially_paid', 'overdue'] }
  });
  if (unpaidPayments) {
    throw new AppError('Cannot approve renewal due to outstanding unpaid payments', 400);
  }

  // Validate maintenance tickets
  const openMaintenance = await Maintenance.findOne({
    property: currentLease.property,
    tenant: currentLease.tenant,
    status: { $in: ['open', 'in_progress'] }
  });
  if (openMaintenance) {
    throw new AppError('Cannot approve renewal due to open maintenance tickets', 400);
  }

  // Set renewal approved
  renewal.status = 'approved';
  renewal.approvedBy = req.user.userId;
  renewal.approvalDate = new Date();
  renewal.timeline.push({ event: 'Approved', note: 'Lease renewal request approved by manager.' });
  await renewal.save();

  // Create new pending future lease
  const count = await Lease.countDocuments();
  const leaseNumber = `LEASE-${Date.now()}-${count + 1}`;

  const newLease = await Lease.create({
    leaseNumber,
    property: currentLease.property,
    tenant: currentLease.tenant,
    startDate: renewal.requestedStartDate,
    endDate: renewal.requestedEndDate,
    rentAmount: renewal.proposedRent || currentLease.rentAmount,
    depositAmount: currentLease.depositAmount,
    utilities: currentLease.utilities,
    terms: currentLease.terms,
    status: 'pending', // Starts as pending until cron activation roll
    leaseDecision: 'pending',
    createdBy: req.user.userId,
    leaseVersion: currentLease.leaseVersion + 1,
    parentLease: currentLease.parentLease || currentLease._id,
    renewedFrom: currentLease._id
  });

  currentLease.renewedTo = newLease._id;
  currentLease.leaseDecision = 'renewed';
  await currentLease.save();

  // Notify tenant
  const tenantUser = await User.findOne({ email: tenant.email });
  if (tenantUser) {
    await Notification.create({
      recipient: tenantUser._id,
      sender: req.user.userId,
      title: 'Renewal Approved!',
      message: `Your lease renewal request has been approved. Future lease ${leaseNumber} has been created.`,
      type: 'success',
      link: '/my-lease'
    });
  }

  res.status(200).json({ success: true, data: renewal });
});

// 10. Manager: Reject Lease Renewal (PUT /renewals/:id/reject)
export const rejectRenewal = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rejectionReason } = req.body;

  const renewal = await LeaseRenewal.findById(id);
  if (!renewal) throw new AppError('Renewal request not found', 404);

  if (renewal.status !== 'pending' && renewal.status !== 'offered') {
    throw new AppError('This renewal request cannot be rejected', 400);
  }

  renewal.status = 'rejected';
  renewal.rejectionReason = rejectionReason;
  renewal.timeline.push({ event: 'Rejected', note: `Renewal request rejected: ${rejectionReason}` });
  await renewal.save();

  const lease = await Lease.findById(renewal.lease);
  if (lease) {
    lease.leaseDecision = 'pending';
    await lease.save();
  }

  // Notify tenant
  const tenant = await Tenant.findById(renewal.tenant);
  const tenantUser = await User.findOne({ email: tenant?.email });
  if (tenantUser) {
    await Notification.create({
      recipient: tenantUser._id,
      sender: req.user.userId,
      title: 'Renewal Rejected',
      message: `Your lease renewal request was rejected. Reason: ${rejectionReason}`,
      type: 'danger',
      link: '/my-lease'
    });
  }

  res.status(200).json({ success: true, data: renewal });
});

// 11. Manager: Final Move-Out Completion (PUT /lease/:id/final-moveout)
export const finalizeMoveOut = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const lease = await Lease.findById(id);
  if (!lease) throw new AppError('Lease not found', 404);

  const settlement = await DepositSettlement.findOne({ lease: id });
  if (!settlement) {
    throw new AppError('Deposit settlement must be processed before finalizing move-out', 400);
  }

  // Complete settlement
  settlement.status = 'Completed';
  settlement.refundDate = new Date();
  settlement.updatedBy = req.user.userId;
  settlement.timeline.push({ event: 'Refund Completed', note: 'Deposit refund completed and finalized.' });
  await settlement.save();

  // Finalize lease details
  lease.status = 'expired';
  lease.leaseDecision = 'expired';
  lease.moveOutStatus = 'completed';
  await lease.save();

  // Cleanup property occupant settings
  const property = await Property.findById(lease.property);
  if (property) {
    property.currentTenant = null;
    property.status = 'available';
    property.leases = property.leases.filter(l => l.toString() !== id.toString());
    await property.save();
  }

  // Notify tenant
  const tenant = await Tenant.findById(lease.tenant);
  const tenantUser = await User.findOne({ email: tenant?.email });
  if (tenantUser) {
    await Notification.create({
      recipient: tenantUser._id,
      sender: req.user.userId,
      title: 'Move-out Completed',
      message: `Your move-out from property ${property?.name || 'residence'} has been officially completed.`,
      type: 'success',
      link: '/my-lease'
    });
  }

  // Notify manager
  await Notification.create({
    recipient: req.user.userId,
    sender: req.user.userId,
    title: 'Property Ready for Booking',
    message: `Property ${property?.name || 'residence'} is now available for new bookings.`,
    type: 'success',
    link: '/properties'
  });

  res.status(200).json({ success: true, message: 'Move-out finalized and property cleared successfully' });
});

// --- Common GET endpoints ---

export const getUpcomingExpiringLeases = asyncHandler(async (req, res) => {
  const now = new Date();
  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const leases = await Lease.find({
    status: 'active',
    endDate: { $gte: now, $lte: thirtyDaysOut }
  }).populate('property tenant');

  res.status(200).json({ success: true, data: leases });
});

export const getInspectionById = asyncHandler(async (req, res) => {
  const inspection = await PropertyInspection.findById(req.params.id).populate('lease property');
  if (!inspection) throw new AppError('Inspection report not found', 404);
  res.status(200).json({ success: true, data: inspection });
});

export const getFeedbackByLeaseId = asyncHandler(async (req, res) => {
  const feedback = await ExitFeedback.findOne({ lease: req.params.leaseId });
  if (!feedback) throw new AppError('Feedback not found', 404);
  res.status(200).json({ success: true, data: feedback });
});

export const getDepositByLeaseId = asyncHandler(async (req, res) => {
  const deposit = await DepositSettlement.findOne({ lease: req.params.leaseId });
  if (!deposit) throw new AppError('Deposit settlement not found', 404);
  res.status(200).json({ success: true, data: deposit });
});

export const getRenewals = asyncHandler(async (req, res) => {
  const renewals = await LeaseRenewal.find({ isArchived: false })
    .populate('lease tenant property')
    .sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: renewals });
});

// Tenant-scoped: returns only the logged-in tenant's own renewals
export const getMyRenewals = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId).select('email');
  if (!user) throw new AppError('User not found', 404);

  const tenantRecord = await Tenant.findOne({ email: user.email });
  if (!tenantRecord) {
    // Not a tenant role — return empty list gracefully
    return res.status(200).json({ success: true, data: [] });
  }

  const renewals = await LeaseRenewal.find({
    tenant: tenantRecord._id,
    isArchived: false,
  })
    .populate('lease property')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: renewals });
});

// --- PDF generation streams ---

export const getExitReportPDF = asyncHandler(async (req, res) => {
  const { id } = req.params; // lease ID
  const lease = await Lease.findById(id).populate('property');
  if (!lease) throw new AppError('Lease not found', 404);

  // Permission Check
  const User = mongoose.model('User');
  const Tenant = mongoose.model('Tenant');

  const currentUserRecord = await User.findById(req.user.userId).select('email role');
  if (!currentUserRecord) throw new AppError('User not found', 404);

  const tenantRecord = await Tenant.findOne({ email: currentUserRecord.email });

  let hasAccess = false;
  if (req.user.role === 'admin') {
    hasAccess = true;
  } else if (tenantRecord && lease.tenant.toString() === tenantRecord._id.toString()) {
    hasAccess = true;
  } else if (req.user.role === 'manager') {
    if (lease.createdBy?.toString() === req.user.userId) {
      hasAccess = true;
    } else {
      const Property = mongoose.model('Property');
      const property = await Property.findById(lease.property);
      if (property && (property.manager?.toString() === req.user.userId || property.owner?.toString() === req.user.userId)) {
        hasAccess = true;
      }
    }
  }

  if (!hasAccess) {
    throw new AppError('Forbidden: Access denied to this report resource', 403);
  }

  const tenant = await Tenant.findById(lease.tenant);
  const feedback = await ExitFeedback.findOne({ lease: id });
  const inspection = await PropertyInspection.findOne({ lease: id });
  const settlement = await DepositSettlement.findOne({ lease: id });

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=exit_report_${lease.leaseNumber}.pdf`);
  doc.pipe(res);

  doc.fontSize(22).font('Helvetica-Bold').text('LEASE EXIT & SETTLEMENT REPORT', { align: 'center' });
  doc.moveDown(1.5);

  doc.fontSize(12).font('Helvetica-Bold').text('1. TENANT & PROPERTY DETAILS');
  doc.font('Helvetica').text(`Tenant Name: ${tenant?.firstName || ''} ${tenant?.lastName || ''}`);
  doc.text(`Tenant Email: ${tenant?.email || ''}`);
  doc.text(`Property Name: ${lease.property?.name || ''}`);
  doc.text(`Property Address: ${lease.property?.address || ''}`);
  doc.moveDown();

  doc.fontSize(12).font('Helvetica-Bold').text('2. LEASE EXPIRE & EXIT TIMINGS');
  doc.font('Helvetica').text(`Lease Start Date: ${new Date(lease.startDate).toLocaleDateString()}`);
  doc.text(`Lease End Date: ${new Date(lease.endDate).toLocaleDateString()}`);
  doc.text(`Move-Out Notice Status: ${lease.moveOutStatus}`);
  doc.moveDown();

  if (feedback) {
    doc.fontSize(12).font('Helvetica-Bold').text('3. TENANT EXIT FEEDBACK SURVEY');
    doc.font('Helvetica').text(`Property Condition: ${feedback.ratings?.propertyCondition || 0}/5`);
    doc.text(`Cleanliness Rating: ${feedback.ratings?.cleanliness || 0}/5`);
    doc.text(`Manager Support: ${feedback.ratings?.managerSupport || 0}/5`);
    doc.text(`Maintenance Speed: ${feedback.ratings?.maintenanceService || 0}/5`);
    doc.text(`Overall Experience: ${feedback.ratings?.overallExperience || 0}/5`);
    doc.text(`Recommend Property: ${feedback.recommend ? 'Yes' : 'No'}`);
    doc.text(`Suggestions: ${feedback.suggestions || 'None'}`);
    doc.moveDown();
  }

  if (inspection) {
    doc.fontSize(12).font('Helvetica-Bold').text('4. CHECKOUT PROPERTY INSPECTION');
    doc.font('Helvetica').text(`Inspection Date: ${new Date(inspection.inspectionDate).toLocaleDateString()}`);
    doc.text(`Inspection Result: ${inspection.inspectionResult}`);
    doc.text(`Damage Repairs Estimated: INR ${inspection.estimatedRepairCost}`);
    doc.text(`Actual Repairs Charged: INR ${inspection.actualRepairCost}`);
    doc.text(`Inspector Notes: ${inspection.notes || 'None'}`);
    doc.moveDown();
  }

  if (settlement) {
    doc.fontSize(12).font('Helvetica-Bold').text('5. SECURITY DEPOSIT SETTLEMENT SHEET');
    doc.font('Helvetica').text(`Escrow Deposit Amount: INR ${settlement.depositAmount}`);
    doc.text(`Total Deduction Applied: INR ${settlement.totalDeduction}`);
    doc.text(`Deductions Reasons List:`);
    settlement.deductions.forEach(item => {
      doc.text(` - ${item.reason}: INR ${item.amount}`);
    });
    doc.text(`Net Refund Paid: INR ${settlement.refundAmount}`);
    doc.moveDown();
  }

  doc.fontSize(8).text(`Exit report generated automatically on ${new Date().toLocaleDateString()}. Code verified via TMS Escrow System.`, { align: 'center', color: 'gray' });
  doc.end();
});

export const getRenewalReportPDF = asyncHandler(async (req, res) => {
  const { id } = req.params; // lease renewal ID
  const renewal = await LeaseRenewal.findById(id).populate('lease property tenant');
  if (!renewal) throw new AppError('Renewal record not found', 404);

  // Permission Check
  const User = mongoose.model('User');
  const Tenant = mongoose.model('Tenant');

  const currentUserRecord = await User.findById(req.user.userId).select('email role');
  if (!currentUserRecord) throw new AppError('User not found', 404);

  const tenantRecord = await Tenant.findOne({ email: currentUserRecord.email });

  let hasAccess = false;
  if (req.user.role === 'admin') {
    hasAccess = true;
  } else if (tenantRecord && renewal.tenant?._id.toString() === tenantRecord._id.toString()) {
    hasAccess = true;
  } else if (req.user.role === 'manager') {
    const Property = mongoose.model('Property');
    const property = await Property.findById(renewal.property);
    if (property && (property.manager?.toString() === req.user.userId || property.owner?.toString() === req.user.userId)) {
      hasAccess = true;
    }
  }

  if (!hasAccess) {
    throw new AppError('Forbidden: Access denied to this report resource', 403);
  }

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=renewal_report_${renewal._id}.pdf`);
  doc.pipe(res);

  doc.fontSize(22).font('Helvetica-Bold').text('LEASE RENEWAL AUDIT SHEET', { align: 'center' });
  doc.moveDown(1.5);

  doc.fontSize(12).font('Helvetica-Bold').text('1. TENANT & PROPERTY SCHEDULING');
  doc.font('Helvetica').text(`Tenant Name: ${renewal.tenant?.firstName || ''} ${renewal.tenant?.lastName || ''}`);
  doc.text(`Property: ${renewal.property?.name || ''}`);
  doc.text(`Property Address: ${renewal.property?.address || ''}`);
  doc.moveDown();

  doc.fontSize(12).font('Helvetica-Bold').text('2. COMPARATIVE LEASE TERMS');
  doc.font('Helvetica').text(`Previous Lease End Date: ${new Date(renewal.lease?.endDate).toLocaleDateString()}`);
  doc.text(`New Renewed Start Date: ${new Date(renewal.requestedStartDate).toLocaleDateString()}`);
  doc.text(`New Renewed End Date: ${new Date(renewal.requestedEndDate).toLocaleDateString()}`);
  doc.text(`Renewal Term Duration: ${renewal.duration}`);
  doc.text(`Previous Lease Rent: INR ${renewal.lease?.rentAmount || 0}`);
  doc.text(`New Updated Monthly Rent: INR ${renewal.proposedRent}`);
  doc.moveDown();

  doc.fontSize(12).font('Helvetica-Bold').text('3. RENEWAL TIMELINE & APPROVAL AUDIT');
  doc.font('Helvetica').text(`Approval Date: ${new Date(renewal.approvalDate).toLocaleDateString()}`);
  doc.text(`Approved By Manager ID: ${renewal.approvedBy}`);
  doc.text(`Tenant Message Note: ${renewal.message || 'None'}`);
  doc.text(`Renewal Request Status: ${renewal.status}`);
  doc.moveDown();

  doc.fontSize(8).text(`Lease renewal report generated automatically on ${new Date().toLocaleDateString()}. Code verified via TMS Escrow System.`, { align: 'center', color: 'gray' });
  doc.end();
});
