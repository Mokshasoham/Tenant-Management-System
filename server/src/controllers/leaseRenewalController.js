import mongoose from 'mongoose';
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
import NotificationModel from '../models/Notification.js';
import EventService from '../services/eventService.js';
import { executeRenewalApproval } from '../services/leaseRenewalHelper.js';
import { NotificationService } from '../services/NotificationService.js';
import { isManagerPropertyOwner, getManagerPropertyIds } from '../utils/managerHelper.js';

// Backward-compatible Event proxy
const Notification = {
    create: async (data) => {
        try {
            let category = 'lease';
            let event = 'update';
            let priority = 'medium';
            let severity = 'information';

            const titleLower = (data.title || '').toLowerCase();

            if (titleLower.includes('inspection')) {
                category = 'inspection';
                event = titleLower.includes('schedule') ? 'scheduled' : 'completed';
                priority = event === 'scheduled' ? 'medium' : 'high';
            } else if (titleLower.includes('renewal')) {
                category = 'renewal';
                event = titleLower.includes('request') ? 'requested' 
                      : titleLower.includes('approve') ? 'approved' 
                      : titleLower.includes('reject') ? 'rejected' 
                      : 'activated';
                priority = 'high';
                severity = event === 'rejected' ? 'warning' : 'success';
            } else if (titleLower.includes('move-out') || titleLower.includes('exit') || titleLower.includes('checkout')) {
                category = 'move-out';
                event = titleLower.includes('request') ? 'requested' : 'completed';
            } else if (titleLower.includes('refund') || titleLower.includes('deposit') || titleLower.includes('settlement')) {
                category = 'payments';
                event = 'refund_processed';
                severity = 'success';
                priority = 'high';
            }

            return await EventService.publish({
                recipient: data.recipient,
                category,
                event,
                title: data.title,
                description: data.message,
                sourceModule: category,
                entityType: data.relatedModel || 'Lease',
                entityId: data.relatedId,
                redirectUrl: data.link || '/lease',
                action: 'view',
                priority,
                severity,
                metadata: {
                    relatedId: data.relatedId
                }
            });
        } catch (err) {
            logger.error('[Notification Wrapper] Failed: ' + err.message);
            return await NotificationModel.create(data);
        }
    },
    find: (...args) => NotificationModel.find(...args),
    findOne: (...args) => NotificationModel.findOne(...args),
    findOneAndUpdate: (...args) => NotificationModel.findOneAndUpdate(...args),
    updateMany: (...args) => NotificationModel.updateMany(...args),
    countDocuments: (...args) => NotificationModel.countDocuments(...args),
    findOneAndDelete: (...args) => NotificationModel.findOneAndDelete(...args)
};
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

  // Enforce authoritative 7-day renewal decision window and deadline
  const endMs = new Date(lease.endDate).getTime();
  const daysRemaining = Math.ceil((endMs - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysRemaining > 7) {
    throw new AppError('Renewal requests can only be submitted within 7 days of lease expiry', 400);
  }
  if (daysRemaining <= 0) {
    throw new AppError('The renewal deadline has passed. Lease renewal is no longer available.', 400);
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

  const lease = await Lease.findById(leaseId).populate('property');
  if (!lease) throw new AppError('Lease not found', 404);

  const tenant = await Tenant.findById(lease.tenant);
  const tenantUser = await User.findOne({ email: tenant?.email });
  if (!tenantUser || tenantUser._id.toString() !== req.user.userId) {
    throw new AppError('Unauthorized access', 403);
  }

  // Allow both active and expired leases (expired leases must not be blocked from moving out)
  if (!['active', 'expired'].includes(lease.status)) {
    throw new AppError('Move-out notices can only be submitted for active or expired leases', 400);
  }

  lease.leaseDecision = 'moving_out';
  lease.moveOutStatus = 'requested';
  lease.moveOutNoticeDate = new Date();
  if (expectedMoveOutDate) {
    lease.expectedMoveOutDate = new Date(expectedMoveOutDate);
  }
  if (reason) {
    lease.moveOutReason = reason;
  }
  if (comments) {
    lease.moveOutComments = comments;
  }
  await lease.save();

  // Notify manager
  const targetManager = lease.property?.manager || lease.createdBy;
  if (targetManager) {
    try {
      await NotificationService.notify({
        recipient: targetManager,
        sender: tenantUser._id,
        title: 'Move-Out Notice Submitted',
        message: `Tenant ${tenantUser.firstName || ''} ${tenantUser.lastName || ''} submitted a move-out notice for lease ${lease.leaseNumber}. Reason: ${reason || 'Not specified'}`,
        category: 'move-out',
        priority: 'high',
        actionUrl: '/leases?tab=moveouts',
        link: '/leases?tab=moveouts',
        idempotencyKey: `moveout_notice_${lease._id}`,
        entityType: 'Lease',
        entityId: lease._id
      });
    } catch (notifErr) {
      console.error('[submitMoveOutNotice] Error sending manager notification:', notifErr.message);
    }
  }

  res.status(200).json({ success: true, message: 'Move-out notice submitted successfully', data: lease });
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

  if (!leaseId) throw new AppError('Lease ID is required', 400);
  if (!inspectionDate) throw new AppError('Inspection date is required', 400);

  const lease = await Lease.findById(leaseId);
  if (!lease) throw new AppError('Lease not found', 404);

  // Manager authorization check
  if (req.user?.role === 'manager') {
    const isOwner = await isManagerPropertyOwner(lease.property, req.user.userId);
    if (!isOwner) throw new AppError('Forbidden: Access denied to manage inspection for this property', 403);
  }

  const parsedDate = new Date(inspectionDate);
  if (isNaN(parsedDate.getTime())) {
    throw new AppError('Invalid inspection date provided', 400);
  }

  const tenant = await Tenant.findById(lease.tenant);
  const tenantUser = tenant ? await User.findOne({ email: tenant.email }) : null;

  // Idempotent inspection check: find existing uncompleted or scheduled inspection
  let inspection = await PropertyInspection.findOne({
    lease: leaseId,
    inspectionStatus: { $in: ['pending', 'scheduled'] },
    isArchived: false,
  }).sort({ createdAt: -1 });

  if (inspection) {
    inspection.inspectionDate = parsedDate;
    if (notes !== undefined) inspection.notes = notes;
    inspection.manager = req.user.userId;
    inspection.timeline.push({
      event: 'Rescheduled',
      note: `Inspection rescheduled for ${parsedDate.toLocaleDateString()}`
    });
    await inspection.save();
  } else {
    inspection = await PropertyInspection.create({
      lease: leaseId,
      property: lease.property,
      manager: req.user.userId,
      inspectionDate: parsedDate,
      inspectionStatus: 'scheduled',
      inspectionResult: 'none',
      notes,
      createdBy: req.user.userId,
      timeline: [{ event: 'Scheduled', note: `Inspection scheduled for ${parsedDate.toLocaleDateString()}` }]
    });
  }

  lease.moveOutStatus = 'inspection_scheduled';
  await lease.save();

  if (tenantUser) {
    try {
      await NotificationService.notify({
        recipient: tenantUser._id,
        sender: req.user.userId,
        title: 'Move-Out Inspection Scheduled',
        message: `Property management scheduled your move-out inspection for ${parsedDate.toLocaleDateString()}.`,
        category: 'inspection',
        priority: 'high',
        actionUrl: '/my-lease',
        link: '/my-lease',
        idempotencyKey: `inspection_sched_${inspection._id}`,
        entityType: 'PropertyInspection',
        entityId: inspection._id
      });
    } catch (notifErr) {
      console.error('[scheduleInspection] Notification error:', notifErr.message);
    }
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
    inspectionResult,
    leaseId
  } = req.body;

  let inspection = null;
  let targetLease = null;

  // Step 1: Attempt direct resolution by PropertyInspection ID
  if (mongoose.Types.ObjectId.isValid(id)) {
    inspection = await PropertyInspection.findById(id);

    // Step 2: Fallback - if not found by inspection._id, check if id was actually a Lease ID
    if (!inspection) {
      inspection = await PropertyInspection.findOne({
        lease: id,
        isArchived: false,
      }).sort({ createdAt: -1 });

      if (inspection) {
        targetLease = await Lease.findById(id);
      }
    }
  }

  // Step 3: Fallback - resolve via leaseId in body if provided
  if (!inspection && leaseId && mongoose.Types.ObjectId.isValid(leaseId)) {
    inspection = await PropertyInspection.findOne({
      lease: leaseId,
      isArchived: false,
    }).sort({ createdAt: -1 });

    if (inspection && !targetLease) {
      targetLease = await Lease.findById(leaseId);
    }
  }

  // Step 4: Self-healing reconciliation
  // If no inspection record exists at all, but the ID refers to a valid lease in move-out flow
  if (!inspection) {
    const candidateLeaseId = (leaseId && mongoose.Types.ObjectId.isValid(leaseId))
      ? leaseId
      : (mongoose.Types.ObjectId.isValid(id) ? id : null);

    if (candidateLeaseId) {
      const leaseCandidate = await Lease.findById(candidateLeaseId);
      if (
        leaseCandidate &&
        (['requested', 'inspection_scheduled', 'notice_submitted', 'moving_out'].includes(leaseCandidate.moveOutStatus) ||
          leaseCandidate.leaseDecision === 'moving_out')
      ) {
        // Manager authorization check before self-healing creation
        if (req.user?.role === 'manager') {
          const isOwner = await isManagerPropertyOwner(leaseCandidate.property, req.user.userId);
          if (!isOwner) throw new AppError('Forbidden: Access denied to manage inspection for this property', 403);
        }

        // Create the missing PropertyInspection document idempotently
        inspection = await PropertyInspection.findOne({ lease: leaseCandidate._id, isArchived: false });
        if (!inspection) {
          inspection = await PropertyInspection.create({
            lease: leaseCandidate._id,
            property: leaseCandidate.property,
            manager: req.user.userId,
            inspectionDate: new Date(),
            inspectionStatus: 'scheduled',
            inspectionResult: 'none',
            notes: notes || 'Auto-reconciled inspection record for scheduled move-out',
            createdBy: req.user.userId,
            timeline: [{ event: 'Reconciled', note: 'Auto-reconciled inspection record created prior to completion.' }]
          });
        }
        targetLease = leaseCandidate;
      }
    }
  }

  if (!inspection) throw new AppError('Inspection report not found', 404);

  // Manager authorization check
  if (req.user?.role === 'manager') {
    const isOwner = await isManagerPropertyOwner(inspection.property, req.user.userId);
    if (!isOwner) throw new AppError('Forbidden: Access denied to complete inspection for this property', 403);
  }

  if (checklist) inspection.checklist = checklist;
  if (beforePhotos) inspection.beforePhotos = beforePhotos;
  if (damagePhotos) inspection.damagePhotos = damagePhotos;
  if (afterRepairPhotos) inspection.afterRepairPhotos = afterRepairPhotos;
  if (notes !== undefined) inspection.notes = notes;
  inspection.estimatedRepairCost = Number(estimatedRepairCost) || 0;
  inspection.actualRepairCost = Number(actualRepairCost) || 0;
  inspection.refundAmount = Number(refundAmount) || 0;
  inspection.inspectionStatus = 'completed';
  inspection.inspectionResult = inspectionResult || 'passed';
  inspection.updatedBy = req.user.userId;
  inspection.timeline.push({ event: 'Completed', note: `Inspection completed with result: ${inspection.inspectionResult}` });
  await inspection.save();

  const lease = targetLease || await Lease.findById(inspection.lease);
  if (lease) {
    lease.moveOutStatus = 'inspection_completed';
    await lease.save();

    const tenant = await Tenant.findById(lease.tenant);
    const tenantUser = tenant ? await User.findOne({ email: tenant.email }) : null;
    if (tenantUser) {
      try {
        await NotificationService.notify({
          recipient: tenantUser._id,
          sender: req.user.userId,
          title: 'Move-Out Inspection Completed',
          message: `Move-out inspection for ${lease.leaseNumber} has been completed. Result: ${inspection.inspectionResult}`,
          category: 'inspection',
          priority: 'normal',
          actionUrl: '/my-lease',
          link: '/my-lease',
          idempotencyKey: `inspection_comp_${inspection._id}`,
          entityType: 'PropertyInspection',
          entityId: inspection._id
        });
      } catch (notifErr) {
        console.error('[completeInspection] Notification error:', notifErr.message);
      }
    }
  }

  res.status(200).json({ success: true, data: inspection });
});

// 8. Manager: Preview Deposit Settlement (GET /deposit/preview/:leaseId)
export const getDepositSettlementPreview = asyncHandler(async (req, res) => {
  const { leaseId } = req.params;

  const lease = await Lease.findById(leaseId).populate('property tenant');
  if (!lease) throw new AppError('Lease not found', 404);

  // Manager authorization check
  if (req.user?.role === 'manager') {
    const isOwner = await isManagerPropertyOwner(lease.property._id || lease.property, req.user.userId);
    if (!isOwner) throw new AppError('Forbidden: Access denied to preview deposit for this property', 403);
  }

  // Find completed inspection
  const inspection = await PropertyInspection.findOne({
    lease: leaseId,
    inspectionStatus: 'completed',
    isArchived: false
  }).sort({ createdAt: -1 });

  // Calculate rent dues strictly from Payment records of type 'rent' and 'late_fee' (excluding security_deposit)
  const unpaidRentPayments = await Payment.find({
    lease: leaseId,
    type: { $in: ['rent', 'late_fee'] },
    status: { $in: ['pending', 'partially_paid', 'overdue'] }
  }).lean();

  const rentDue = unpaidRentPayments.reduce((sum, p) => {
    const remaining = (Number(p.amount) || 0) - (Number(p.amountPaid) || 0);
    return sum + Math.max(0, remaining);
  }, 0);

  // Authoritative repair cost: actualRepairCost != null ? actualRepairCost : (estimatedRepairCost || 0)
  const repairDeduction = inspection
    ? (inspection.actualRepairCost != null ? Number(inspection.actualRepairCost) : (Number(inspection.estimatedRepairCost) || 0))
    : 0;

  // Check if settlement already exists
  const existingSettlement = await DepositSettlement.findOne({ lease: leaseId, isArchived: false }).lean();
  const isSettled = existingSettlement?.status === 'Completed';

  const depositAmount = Number(lease.depositAmount) || 0;
  const standardDeductions = rentDue + repairDeduction;
  const suggestedRefund = Math.max(0, depositAmount - standardDeductions);
  const suggestedBalance = Math.max(0, standardDeductions - depositAmount);

  res.status(200).json({
    success: true,
    data: {
      leaseId: lease._id,
      leaseNumber: lease.leaseNumber,
      depositAmount,
      rentDue,
      repairDeduction,
      inspection: inspection ? {
        _id: inspection._id,
        inspectionStatus: inspection.inspectionStatus,
        inspectionResult: inspection.inspectionResult,
        actualRepairCost: inspection.actualRepairCost,
        estimatedRepairCost: inspection.estimatedRepairCost,
        notes: inspection.notes
      } : null,
      suggestedRefund,
      suggestedBalance,
      existingSettlement,
      isSettled,
      canSettle: !!inspection && !isSettled
    }
  });
});

// 8b. Manager: Process Deposit Refund (POST /deposit/refund)
export const processDepositRefund = asyncHandler(async (req, res) => {
  const { leaseId, discretionaryDeductions = [], notes, reason } = req.body;

  if (!leaseId) throw new AppError('Lease ID is required', 400);

  const lease = await Lease.findById(leaseId);
  if (!lease) throw new AppError('Lease not found', 404);

  // Manager authorization check
  if (req.user?.role === 'manager') {
    const isOwner = await isManagerPropertyOwner(lease.property, req.user.userId);
    if (!isOwner) throw new AppError('Forbidden: Access denied to process deposit for this property', 403);
  }

  // Idempotency safeguard: if settlement is already completed, return existing settlement
  const existingCompleted = await DepositSettlement.findOne({ lease: leaseId, status: 'Completed', isArchived: false });
  if (existingCompleted) {
    return res.status(200).json({
      success: true,
      data: existingCompleted,
      message: 'Deposit settlement is already completed'
    });
  }

  // Assert inspection is completed
  const inspection = await PropertyInspection.findOne({
    lease: leaseId,
    inspectionStatus: 'completed',
    isArchived: false
  }).sort({ createdAt: -1 });

  if (!inspection) {
    throw new AppError('Property inspection must be completed before settling deposit refund', 400);
  }

  // Authoritative calculations:
  // 1. Contracted security deposit
  const depositAmount = Number(lease.depositAmount) || 0;

  // 2. Authoritative rent dues strictly from Payment records on this lease (excluding security_deposit)
  const unpaidRentPayments = await Payment.find({
    lease: leaseId,
    type: { $in: ['rent', 'late_fee'] },
    status: { $in: ['pending', 'partially_paid', 'overdue'] }
  });
  const rentDue = unpaidRentPayments.reduce((sum, p) => {
    const remaining = (Number(p.amount) || 0) - (Number(p.amountPaid) || 0);
    return sum + Math.max(0, remaining);
  }, 0);

  // 3. Authoritative inspection repair cost (actualRepairCost != null ? actual : estimated)
  const repairDeduction = inspection.actualRepairCost != null
    ? Number(inspection.actualRepairCost)
    : (Number(inspection.estimatedRepairCost) || 0);

  // Build validated deductions list server-side
  const deductionsList = [];
  if (rentDue > 0) {
    deductionsList.push({
      category: 'rent',
      reason: 'Outstanding Rent & Fees',
      amount: Math.round(rentDue * 100) / 100
    });
  }
  if (repairDeduction > 0) {
    deductionsList.push({
      category: 'repair',
      reason: `Inspection Damage / Repairs (${inspection.inspectionResult || 'recorded'})`,
      amount: Math.round(repairDeduction * 100) / 100
    });
  }

  // Validate manager discretionary deductions (cleaning, utilities, other)
  const allowedCategories = ['cleaning', 'utilities', 'other'];
  if (Array.isArray(discretionaryDeductions)) {
    for (const item of discretionaryDeductions) {
      const amount = Number(item.amount);
      if (isNaN(amount) || amount < 0 || !isFinite(amount)) {
        throw new AppError('Deduction amounts must be non-negative finite numbers', 400);
      }
      if (amount > 0) {
        const itemReason = (item.reason || '').trim();
        if (!itemReason) {
          throw new AppError(`A reason is required for deduction under ${item.category || 'other'}`, 400);
        }
        deductionsList.push({
          category: allowedCategories.includes(item.category) ? item.category : 'other',
          reason: itemReason,
          amount: Math.round(amount * 100) / 100
        });
      }
    }
  }

  const totalDeduction = deductionsList.reduce((acc, curr) => acc + curr.amount, 0);
  const refundAmount = Math.max(0, depositAmount - totalDeduction);
  const outstandingBalance = Math.max(0, totalDeduction - depositAmount);

  // Concurrency-safe atomic upsert / update
  const settlement = await DepositSettlement.findOneAndUpdate(
    { lease: leaseId },
    {
      $set: {
        lease: leaseId,
        depositAmount,
        deductions: deductionsList,
        totalDeduction,
        refundAmount,
        outstandingBalance,
        status: 'Completed',
        refundStatus: refundAmount > 0 ? 'due' : 'none',
        refundDate: new Date(),
        reason: reason || notes || 'Move-out deposit settlement completed',
        updatedBy: req.user.userId,
      },
      $setOnInsert: {
        createdBy: req.user.userId,
      },
      $push: {
        timeline: {
          event: 'Settlement Completed',
          note: `Deposit settled. Total Deductions: ₹${totalDeduction}, Refund Due: ₹${refundAmount}${outstandingBalance > 0 ? `, Outstanding Balance: ₹${outstandingBalance}` : ''}`
        }
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  lease.moveOutStatus = 'refund_processing';
  await lease.save();

  // Notify tenant
  const tenant = await Tenant.findById(lease.tenant);
  const tenantUser = tenant ? await User.findOne({ email: tenant.email }) : null;
  if (tenantUser) {
    try {
      await NotificationService.notify({
        recipient: tenantUser._id,
        sender: req.user.userId,
        title: 'Deposit Settlement Completed',
        message: `Your deposit settlement for ${lease.leaseNumber} has been finalized. Refund Due: ₹${refundAmount}.`,
        category: 'payments',
        priority: 'high',
        actionUrl: '/my-lease',
        link: '/my-lease',
        idempotencyKey: `deposit_settle_${settlement._id}`,
        entityType: 'DepositSettlement',
        entityId: settlement._id
      });
    } catch (notifErr) {
      console.error('[processDepositRefund] Notification error:', notifErr.message);
    }
  }

  res.status(200).json({ success: true, data: settlement });
});

// 9. Manager: Approve Lease Renewal (PUT /renewals/:id/approve)
export const approveRenewal = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const renewal = await LeaseRenewal.findById(id);
  if (!renewal) throw new AppError('Renewal request not found', 404);

  // Manager authorization check
  if (req.user?.role === 'manager') {
    const isOwner = await isManagerPropertyOwner(renewal.property, req.user.userId);
    if (!isOwner) throw new AppError('Forbidden: Access denied to manage renewals for this property', 403);
  }

  const currentLease = await Lease.findById(renewal.lease);
  if (!currentLease) throw new AppError('Current lease not found', 404);

  // If already approved, return idempotent result
  if (renewal.status === 'approved') {
    const existingLease = await executeRenewalApproval({ renewal, currentLease, userId: req.user.userId });
    return res.status(200).json({ 
      success: true, 
      data: renewal, 
      lease: existingLease,
      message: 'Renewal request is already approved' 
    });
  }

  // Renewal eligibility check: cannot approve if lease deadline has passed
  const now = new Date();
  if (new Date(currentLease.endDate).getTime() < now.getTime()) {
    throw new AppError('The renewal deadline for this lease has passed. Renewal can no longer be approved.', 400);
  }

  if (!['requested', 'under_review', 'pending', 'accepted', 'counter_offer'].includes(renewal.status)) {
    throw new AppError('This renewal request is not in a reviewable state', 400);
  }

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

  // Execute idempotent renewal creation and lease linking
  const newLease = await executeRenewalApproval({ renewal, currentLease, userId: req.user.userId });

  // Notify tenant
  const tenantUser = await User.findOne({ email: tenant.email });
  if (tenantUser) {
    try {
      await NotificationService.notify({
        recipient: tenantUser._id,
        sender: req.user.userId,
        title: 'Lease Renewal Approved!',
        message: `Your lease renewal request for ${currentLease.leaseNumber} has been approved. New renewed lease ${newLease?.leaseNumber || ''} has been created.`,
        category: 'renewal',
        priority: 'high',
        actionUrl: '/my-lease',
        link: '/my-lease',
        idempotencyKey: `renewal_approved_${renewal._id}`,
        entityType: 'LeaseRenewal',
        entityId: renewal._id
      });
    } catch (notifErr) {
      console.error('[approveRenewal] Notification error:', notifErr.message);
    }
  }

  res.status(200).json({ success: true, data: renewal, lease: newLease });
});

// 10. Manager: Reject Lease Renewal (PUT /renewals/:id/reject)
export const rejectRenewal = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rejectionReason } = req.body;

  const renewal = await LeaseRenewal.findById(id);
  if (!renewal) throw new AppError('Renewal request not found', 404);

  // Manager authorization check
  if (req.user?.role === 'manager') {
    const isOwner = await isManagerPropertyOwner(renewal.property, req.user.userId);
    if (!isOwner) throw new AppError('Forbidden: Access denied to manage renewals for this property', 403);
  }

  if (!['requested', 'under_review', 'pending', 'offered', 'counter_offer'].includes(renewal.status)) {
    throw new AppError('This renewal request cannot be rejected in its current state', 400);
  }

  renewal.status = 'rejected';
  renewal.rejectionReason = rejectionReason || 'Manager declined renewal request.';
  renewal.timeline.push({ event: 'Rejected', note: `Renewal request rejected: ${renewal.rejectionReason}` });
  await renewal.save();

  const lease = await Lease.findById(renewal.lease);
  if (lease) {
    lease.leaseDecision = 'pending';
    await lease.save();
  }

  // Notify tenant
  const tenant = await Tenant.findById(renewal.tenant);
  const tenantUser = tenant ? await User.findOne({ email: tenant.email }) : null;
  if (tenantUser) {
    try {
      await NotificationService.notify({
        recipient: tenantUser._id,
        sender: req.user.userId,
        title: 'Renewal Request Rejected',
        message: `Your lease renewal request was rejected. Reason: ${renewal.rejectionReason}`,
        category: 'renewal',
        priority: 'high',
        actionUrl: '/my-lease',
        link: '/my-lease',
        idempotencyKey: `renewal_rejected_${renewal._id}`,
        entityType: 'LeaseRenewal',
        entityId: renewal._id
      });
    } catch (notifErr) {
      console.error('[rejectRenewal] Notification error:', notifErr.message);
    }
  }

  res.status(200).json({ success: true, data: renewal });
});

// 11. Manager: Final Move-Out Completion (PUT /lease/:id/final-moveout)
export const finalizeMoveOut = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const lease = await Lease.findById(id);
  if (!lease) throw new AppError('Lease not found', 404);

  // Manager authorization check
  if (req.user?.role === 'manager') {
    const isOwner = await isManagerPropertyOwner(lease.property, req.user.userId);
    if (!isOwner) throw new AppError('Forbidden: Access denied to finalize move-out for this property', 403);
  }

  // Authoritative gate: settlement MUST exist in completed state
  const settlement = await DepositSettlement.findOne({
    lease: id,
    status: 'Completed',
    isArchived: false,
  });

  if (!settlement) {
    throw new AppError('Deposit settlement must be completed before finalizing move-out', 400);
  }

  settlement.timeline.push({ event: 'Move-Out Finalized', note: 'Move-out officially finalized and property cleared.' });
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
    try {
      await NotificationService.notify({
        recipient: tenantUser._id,
        sender: req.user.userId,
        title: 'Move-out Completed',
        message: `Your move-out from property ${property?.name || 'residence'} has been officially completed.`,
        category: 'move-out',
        priority: 'normal',
        actionUrl: '/my-lease',
        link: '/my-lease',
        idempotencyKey: `moveout_final_${lease._id}`,
        entityType: 'Lease',
        entityId: lease._id
      });
    } catch (notifErr) {
      console.error('[finalizeMoveOut] Tenant notification error:', notifErr.message);
    }
  }

  // Notify manager
  try {
    await NotificationService.notify({
      recipient: req.user.userId,
      sender: req.user.userId,
      title: 'Property Ready for Booking',
      message: `Property ${property?.name || 'residence'} is now available for new bookings.`,
      category: 'lease',
      priority: 'normal',
      actionUrl: '/properties',
      link: '/properties',
      idempotencyKey: `property_vacated_${property?._id || lease._id}`,
      entityType: 'Property',
      entityId: property?._id
    });
  } catch (notifErr) {
    console.error('[finalizeMoveOut] Manager notification error:', notifErr.message);
  }

  res.status(200).json({ success: true, message: 'Move-out finalized and property cleared successfully' });
});

// --- Common GET endpoints ---

export const getUpcomingExpiringLeases = asyncHandler(async (req, res) => {
  const now = new Date();
  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const query = {
    status: 'active',
    endDate: { $gte: now, $lte: thirtyDaysOut }
  };
  if (req.user?.role === 'manager') {
    const propIds = await getManagerPropertyIds(req.user.userId);
    query.property = { $in: propIds };
  }

  const leases = await Lease.find(query).populate('property tenant');

  res.status(200).json({ success: true, data: leases });
});

export const getInspectionById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let inspection = null;

  if (mongoose.Types.ObjectId.isValid(id)) {
    inspection = await PropertyInspection.findById(id).populate('lease property');
    if (!inspection) {
      inspection = await PropertyInspection.findOne({ lease: id, isArchived: false })
        .sort({ createdAt: -1 })
        .populate('lease property');
    }
  }

  if (!inspection) throw new AppError('Inspection report not found', 404);

  // Manager authorization check
  if (req.user?.role === 'manager') {
    const propId = inspection.property?._id ? inspection.property._id.toString() : inspection.property?.toString();
    const isOwner = await isManagerPropertyOwner(propId, req.user.userId);
    if (!isOwner) throw new AppError('Forbidden: Access denied to view this inspection report', 403);
  }

  res.status(200).json({ success: true, data: inspection });
});

export const getFeedbackByLeaseId = asyncHandler(async (req, res) => {
  const feedback = await ExitFeedback.findOne({ lease: req.params.leaseId });
  if (!feedback) throw new AppError('Feedback not found', 404);
  res.status(200).json({ success: true, data: feedback });
});

export const getDepositByLeaseId = asyncHandler(async (req, res) => {
  const deposit = await DepositSettlement.findOne({ lease: req.params.leaseId, isArchived: false })
    .populate('createdBy', 'firstName lastName email')
    .populate({
      path: 'lease',
      populate: [
        { path: 'property', select: 'name address' },
        { path: 'tenant', select: 'firstName lastName email' }
      ]
    });
  if (!deposit) throw new AppError('Deposit settlement not found', 404);
  res.status(200).json({ success: true, data: deposit });
});

export const getRenewals = asyncHandler(async (req, res) => {
  const query = { isArchived: false };
  if (req.user?.role === 'manager') {
    const propIds = await getManagerPropertyIds(req.user.userId);
    query.$or = [
      { manager: req.user.userId },
      { property: { $in: propIds } }
    ];
  }
  const renewals = await LeaseRenewal.find(query)
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
