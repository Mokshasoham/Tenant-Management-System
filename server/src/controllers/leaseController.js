import mongoose from 'mongoose';
import Lease from '../models/Lease.js';
import Property from '../models/Property.js';
import Tenant from '../models/Tenant.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';
import { leaseLifecycleService } from '../modules/lease-engine/leaseLifecycleService.js';
import { calculateNextPaymentDue } from '../utils/paymentSchedule.js';
import { resolvePropertyUrls } from './propertyController.js';

export const resolveLeaseUrls = (lease, req) => {
  if (!lease) return lease;
  const leaseObj = lease.toObject ? lease.toObject() : lease;

  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  const baseUrl = `${protocol}://${host}`;

  if (leaseObj.fileId) {
    leaseObj.pdfUrl = `${baseUrl}/api/files/download/${leaseObj.fileId}`;
  }

  if (leaseObj.property && typeof leaseObj.property === 'object') {
    leaseObj.property = resolvePropertyUrls(leaseObj.property, req);
  }

  if (leaseObj.documents && leaseObj.documents.length > 0) {
    leaseObj.documents = leaseObj.documents.map(doc => {
      delete doc.legacyUrl;

      if (doc.fileId) {
        doc.url = `${baseUrl}/api/files/download/${doc.fileId}`;
      } else if (doc.url) {
        if (!doc.url.startsWith('http://') && !doc.url.startsWith('https://')) {
          doc.url = `${baseUrl}${doc.url.startsWith('/') ? '' : '/'}${doc.url}`;
        }
      }
      return doc;
    });
  }
  return leaseObj;
};


// Tenant-scoped: get the current user's own lease
export const getMyLease = asyncHandler(async (req, res) => {
  const actualUserId = req.user?.userId || req.user?._id || req.user?.id;
  const user = await User.findById(actualUserId).select('email');
  if (!user) return res.status(200).json({ success: true, data: null, activeLeases: [], pastLeases: [] });

  const cleanEmail = (user.email || '').trim();
  const emailRegex = new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  const tenants = await Tenant.find({ email: emailRegex });
  const allUsersWithEmail = await User.find({ email: emailRegex }).select('_id');
  const tenantIds = Array.from(new Set([
    actualUserId,
    user._id,
    ...tenants.map(t => t._id),
    ...allUsersWithEmail.map(u => u._id)
  ].filter(Boolean).map(id => id.toString())));

  // Collect lease IDs embedded in tenant documents
  const embeddedLeaseIds = [];
  for (const t of tenants) {
    if (Array.isArray(t.leases)) {
      embeddedLeaseIds.push(...t.leases);
    }
  }

  if (tenantIds.length === 0 && embeddedLeaseIds.length === 0) {
    return res.status(200).json({ success: true, data: null, activeLeases: [], pastLeases: [] });
  }

  const [activeLeases, pastLeases, tenantPayments] = await Promise.all([
    Lease.find({
      $or: [
        { tenant: { $in: tenantIds } },
        { _id: { $in: embeddedLeaseIds } },
        { user: { $in: tenantIds } }
      ],
      status: { $nin: ['terminated', 'expired', 'cancelled'] },
    })
      .sort({ createdAt: -1 })
      .populate({
        path: 'property',
        select: 'name address city state zipCode type bedrooms bathrooms floor totalFloors squareFeet furnishing rentAmount depositAmount amenities images videos media virtualTourUrl coverImage manager',
        populate: { path: 'manager', select: 'firstName lastName email' }
      })
      .populate('tenant', 'firstName lastName email phone'),

    Lease.find({
      $or: [
        { tenant: { $in: tenantIds } },
        { _id: { $in: embeddedLeaseIds } },
        { user: { $in: tenantIds } }
      ],
      status: { $in: ['terminated', 'expired', 'cancelled'] },
    })
      .sort({ createdAt: -1 })
      .populate({
        path: 'property',
        select: 'name address city state zipCode type bedrooms bathrooms floor totalFloors squareFeet furnishing rentAmount depositAmount amenities images videos media virtualTourUrl coverImage manager',
        populate: { path: 'manager', select: 'firstName lastName email' }
      })
      .populate('tenant', 'firstName lastName email phone'),

    Payment.find({ tenant: { $in: tenantIds } }).sort({ dueDate: -1 })
  ]);

  // Enrich each active lease with authoritative payment schedule derived from lease cycle and DB payments
  const enrichedActiveLeases = activeLeases.map(lease => {
    const resolved = resolveLeaseUrls(lease, req);
    const schedule = calculateNextPaymentDue(lease, tenantPayments);
    return {
      ...resolved,
      nextPaymentDueAt: schedule?.nextPaymentDueAt || null,
      nextPaymentAmount: schedule?.amount ?? lease.rentAmount,
      nextPaymentStatus: schedule?.status || 'scheduled',
      nextPaymentIsEstimate: schedule?.isEstimate ?? true,
      nextPaymentSchedule: schedule
    };
  });

  const primaryActiveLease = enrichedActiveLeases[0] || null;

  logger.info(`[MY LEASES] tenantUserId=${req.user.userId}, tenantCount=${tenantIds.length}, activeLeaseCount=${enrichedActiveLeases.length}, pastLeaseCount=${pastLeases.length}`);

  res.status(200).json({ 
    success: true, 
    data: primaryActiveLease, 
    activeLeases: enrichedActiveLeases, 
    pastLeases: pastLeases.map(l => resolveLeaseUrls(l, req)),
    monthlyRent: primaryActiveLease?.rentAmount || null,
    leaseStartDate: primaryActiveLease?.startDate || null,
    nextPaymentDueAt: primaryActiveLease?.nextPaymentDueAt || null,
    paymentFrequency: 'MONTHLY'
  });
});


export const getAllLeases = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, propertyId, tenantId } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (propertyId) filter.property = propertyId;
  if (tenantId) filter.tenant = tenantId;

  const skip = (page - 1) * limit;

  const leases = await Lease.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('property', 'name address rentAmount')
    .populate('tenant', 'firstName lastName email')
    .populate('createdBy', 'firstName lastName');

  const total = await Lease.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: leases.map(l => resolveLeaseUrls(l, req)),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

export const getLeaseById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let lease = null;

  if (mongoose.Types.ObjectId.isValid(id)) {
    lease = await Lease.findById(id)
      .populate('property')
      .populate('tenant')
      .populate('createdBy', 'firstName lastName email');
  }

  if (!lease) {
    lease = await Lease.findOne({ leaseNumber: id })
      .populate('property')
      .populate('tenant')
      .populate('createdBy', 'firstName lastName email');
  }

  if (!lease) {
    throw new AppError('Lease not found', 404);
  }

  // Tenant authorization: verify tenant ownership
  if (req.user.role === 'tenant') {
    const user = await User.findById(req.user.userId).select('email');
    const tenants = user ? await Tenant.find({ email: user.email }) : [];
    const tenantIds = [String(req.user.userId), ...tenants.map(t => String(t._id))];
    const leaseTenantId = lease.tenant?._id ? String(lease.tenant._id) : (lease.tenant ? String(lease.tenant) : '');

    if (leaseTenantId && !tenantIds.includes(leaseTenantId)) {
      throw new AppError('Access denied. You do not own this lease.', 403);
    }
  }

  const payments = await Payment.find({ lease: lease._id }).sort({ dueDate: -1 });
  const schedule = calculateNextPaymentDue(lease, payments);
  const resolved = resolveLeaseUrls(lease, req);

  res.status(200).json({
    success: true,
    data: {
      ...resolved,
      nextPaymentDueAt: schedule?.nextPaymentDueAt || null,
      nextPaymentAmount: schedule?.totalDue ?? schedule?.amount ?? lease.rentAmount,
      nextPaymentStatus: schedule?.status || 'scheduled',
      nextPaymentIsEstimate: schedule?.isEstimate ?? true,
      nextPaymentSchedule: schedule
    },
  });
});

export const createLease = asyncHandler(async (req, res) => {
  const {
    propertyId,
    tenantId,
    startDate,
    endDate,
    rentAmount,
    depositAmount,
    utilities,
    terms,
  } = req.body;

  // Validate dates
  if (new Date(startDate) >= new Date(endDate)) {
    throw new AppError('Start date must be before end date', 400);
  }

  // Verify property and tenant exist
  const property = await Property.findById(propertyId);
  if (!property) {
    throw new AppError('Property not found', 404);
  }

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    throw new AppError('Tenant not found', 404);
  }

  const now = new Date();
  const isFuture = new Date(startDate) > now;

  const lease = await Lease.create({
    property: propertyId,
    tenant: tenantId,
    startDate,
    endDate,
    rentAmount,
    depositAmount,
    utilities,
    terms,
    status: isFuture ? 'pending' : 'active',
    createdBy: req.user.userId,
  });

  // Add lease to tenant's leases
  tenant.leases.push(lease._id);
  await tenant.save();

  // Add lease to property's leases
  property.leases.push(lease._id);
  if (!isFuture) {
    property.currentTenant = tenantId;
    property.status = 'occupied';
  }
  await property.save();

  logger.info(`New lease created: ${lease.leaseNumber}`);

  res.status(201).json({
    success: true,
    message: 'Lease created successfully',
    data: resolveLeaseUrls(lease, req),
  });
});

export const updateLease = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rentAmount, depositAmount, utilities, terms, status } = req.body;

  const lease = await Lease.findByIdAndUpdate(
    id,
    { rentAmount, depositAmount, utilities, terms, status },
    { new: true, runValidators: true }
  )
    .populate('property', 'name')
    .populate('tenant', 'firstName lastName');

  if (!lease) {
    throw new AppError('Lease not found', 404);
  }

  logger.info(`Lease updated: ${lease.leaseNumber}`);

  res.status(200).json({
    success: true,
    message: 'Lease updated successfully',
    data: resolveLeaseUrls(lease, req),
  });
});

export const terminateLease = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const lease = await Lease.findById(id);
  if (!lease) {
    throw new AppError('Lease not found', 404);
  }

  lease.status = 'terminated';
  await lease.save();

  // Update property status
  const property = await Property.findById(lease.property);
  if (property) {
    property.currentTenant = null;
    property.status = 'available';
    await property.save();
  }

  logger.info(`Lease terminated: ${lease.leaseNumber}`);

  res.status(200).json({
    success: true,
    message: 'Lease terminated successfully',
    data: resolveLeaseUrls(lease, req),
  });
});

export const uploadLeaseDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, url } = req.body;

  if (!name || !url) {
    throw new AppError('Document name and URL are required', 400);
  }

  const lease = await Lease.findById(id);
  if (!lease) {
    throw new AppError('Lease not found', 404);
  }

  lease.documents.push({
    name,
    url,
    uploadedAt: new Date(),
  });

  await lease.save();

  logger.info(`Document uploaded to lease: ${lease.leaseNumber}`);

  res.status(200).json({
    success: true,
    message: 'Document uploaded successfully',
    data: resolveLeaseUrls(lease, req),
  });
});

export const getLeaseStats = asyncHandler(async (req, res) => {
  const totalLeases = await Lease.countDocuments();
  const activeLeases = await Lease.countDocuments({ status: 'active' });
  const pendingLeases = await Lease.countDocuments({ status: 'pending' });
  const terminatedLeases = await Lease.countDocuments({ status: 'terminated' });

  const avgRent = await Lease.aggregate([
    { $group: { _id: null, avgRent: { $avg: '$rentAmount' } } },
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalLeases,
      activeLeases,
      pendingLeases,
      terminatedLeases,
      avgRent: avgRent[0]?.avgRent || 0,
    },
  });
});

export const signLease = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { signature, signatureType, signedBy } = req.body;

  if (!signature || !signatureType || !signedBy) {
    throw new AppError('Signature, signature type, and printed legal name are required', 400);
  }

  const lease = await Lease.findById(id);
  if (!lease) {
    throw new AppError('Lease not found', 404);
  }

  // Verify user is the tenant associated with the lease
  const user = await User.findById(req.user.userId).select('email kycDocuments firstName lastName phone');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const tenants = await Tenant.find({ email: user.email });
  const tenantIds = tenants.map(t => t._id.toString());
  if (!tenantIds.includes(lease.tenant.toString())) {
    throw new AppError('You are not authorized to sign this lease', 403);
  }

  if (lease.status !== 'pending') {
    throw new AppError('Lease is not pending signature or has already been signed', 400);
  }

  // ── Guard 1: Security deposit must be paid before signing ──
  const relatedBooking = await Booking.findOne({
    property: lease.property,
    status: { $in: ['approved', 'active', 'completed'] },
  }).sort({ createdAt: -1 });

  if (!relatedBooking || relatedBooking.paymentStatus !== 'paid') {
    throw new AppError(
      'Security deposit payment must be completed before signing the lease agreement.',
      400
    );
  }

  // ── Guard 2: Tenant profile must be complete ──
  if (!user.firstName || !user.lastName || !user.phone) {
    throw new AppError(
      'Please complete your profile (first name, last name, and phone number) before signing.',
      400
    );
  }

  // ── Guard 3: At least one KYC document must be uploaded ──
  if (!user.kycDocuments || user.kycDocuments.length === 0) {
    throw new AppError(
      'Please upload at least one identity document (KYC) before signing the lease.',
      400
    );
  }

  const now = new Date();
  const isFuture = new Date(lease.startDate) > now;

  lease.signature = signature;
  lease.signatureType = signatureType;
  lease.signedBy = signedBy;
  lease.signedAt = now;
  lease.tenantSignatureIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

  // ── Keep 'pending' if start date is in the future; activate immediately otherwise ──
  if (!isFuture) {
    lease.status = 'active';
    // Mark property occupied
    await Property.findByIdAndUpdate(lease.property, {
      $set: { status: 'occupied', currentTenant: lease.tenant },
    });

    try {
        const tenantModel = mongoose.model('Tenant');
        const userModel = mongoose.model('User');
        const bookingModel = mongoose.model('Booking');

        const tenant = await tenantModel.findById(lease.tenant);
        if (tenant) {
            const user = await userModel.findOne({ email: tenant.email });
            if (user) {
                const booking = await bookingModel.findOne({
                    property: lease.property,
                    user: user._id,
                    status: 'approved'
                }).sort({ createdAt: -1 });

                if (booking) {
                    booking.status = 'completed';
                    booking.completedDate = new Date();
                    booking.timeline.push({
                        event: 'completed',
                        timestamp: new Date(),
                        note: 'Lease signed & activated immediately. Booking formally marked completed.'
                    });
                    await booking.save();
                    logger.info(`Booking ${booking._id} set to completed upon immediate lease signature activation.`);

                    // Send Booking Completed notification
                    try {
                        const notificationModel = mongoose.model('Notification');
                        await notificationModel.create({
                            recipient: booking.user,
                            sender: lease.createdBy,
                            title: 'Booking Completed',
                            message: `Your booking for property under lease ${lease.leaseNumber} has been successfully completed.`,
                            type: 'success',
                            link: `/bookings/${booking._id}`
                        });
                    } catch (notifErr) {
                        logger.error(`Failed to send Booking Completed notification during lease signature: ${notifErr.message}`);
                    }
                }
            }
        }
    } catch (bookingErr) {
        logger.error(`Failed to transition booking to completed during lease activation: ${bookingErr.message}`);
    }
  }
  // If isFuture: status remains 'pending'; cron job will activate on start date

  await lease.save();

  // If lease became active, dispatch LEASE_ACTIVATED lifecycle event (non-blocking for response)
  if (lease.status === 'active') {
    leaseLifecycleService.dispatch('LEASE_ACTIVATED', {
      leaseId: lease._id,
      user: req.user,
    }).catch(err => logger.error(`[signLease] Lifecycle dispatch error: ${err.message}`));
  }

  logger.info(`Lease ${lease.leaseNumber} digitally signed by ${signedBy}${isFuture ? ' (activation deferred to start date)' : ' (activated immediately)'}`);

  res.status(200).json({
    success: true,
    message: isFuture
      ? 'Lease signed successfully. It will activate automatically on your start date.'
      : 'Lease signed and activated successfully.',
    data: resolveLeaseUrls(lease, req),
  });
});

export const generateLeasePDF = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { forceRegenerate = true } = req.body;

  const lease = await Lease.findById(id);
  if (!lease) throw new AppError('Lease not found', 404);

  const pdfResult = await leaseLifecycleService.dispatch('LEASE_REGENERATION_REQUESTED', {
    leaseId: lease._id,
    user: req.user,
    forceRegenerate,
  });

  const updatedLease = await Lease.findById(id);

  res.status(200).json({
    success: true,
    message: 'Lease PDF generated successfully',
    data: {
      pdf: pdfResult,
      lease: resolveLeaseUrls(updatedLease, req),
    },
  });
});

// ── Pre-Lease Checklist Endpoint (tenant-accessible) ──
export const getLeaseChecklist = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const lease = await Lease.findById(id).populate('property');
  if (!lease) throw new AppError('Lease not found', 404);

  const user = await User.findById(req.user.userId).select('firstName lastName phone kycDocuments email');
  if (!user) throw new AppError('User not found', 404);

  const tenants = await Tenant.find({ email: user.email });
  const tenantIds = tenants.map(t => t._id.toString());
  if (!tenantIds.includes(lease.tenant.toString())) {
    throw new AppError('You are not authorized to view this checklist', 403);
  }

  // Item 1: Profile completeness
  const profileComplete = !!(user.firstName && user.lastName && user.phone);

  // Item 2: KYC/Identity document uploaded
  const kycComplete = !!(user.kycDocuments && user.kycDocuments.length > 0);

  // Item 3: Security deposit paid
  const relatedBooking = await Booking.findOne({
    property: lease.property._id,
    status: { $in: ['approved', 'active', 'completed'] },
  }).sort({ createdAt: -1 });

  const depositPaid = !!(relatedBooking && relatedBooking.paymentStatus === 'paid');
  const depositAmount = relatedBooking?.depositAmount || (lease.property?.rentAmount * 2) || 0;

  // Item 4: Lease signed
  const leaseSigned = !!(lease.signature && lease.signedAt);

  const allComplete = profileComplete && kycComplete && depositPaid && leaseSigned;

  res.status(200).json({
    success: true,
    data: {
      allComplete,
      leaseStatus: lease.status,
      startDate: lease.startDate,
      items: {
        profileComplete,
        kycComplete,
        depositPaid,
        leaseSigned,
      },
      meta: {
        depositAmount,
        bookingId: relatedBooking?._id || null,
        kycDocCount: user.kycDocuments?.length || 0,
        signedAt: lease.signedAt || null,
      },
    },
  });
});

export const managerSignLease = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { signature, signatureType, signedBy } = req.body;

  const lease = await Lease.findById(id);
  if (!lease) throw new AppError('Lease not found', 404);

  // Authorization check: Manager must manage this property (or be Admin)
  const property = await Property.findById(lease.property);
  if (req.user.role === 'manager' && property && property.manager && property.manager.toString() !== req.user.userId) {
    throw new AppError('You are not authorized to counter-sign leases for this property', 403);
  }

  // Manager counter-signature requires tenant signature first
  if (!lease.signature || !lease.signedBy || !lease.signedAt) {
    throw new AppError('Tenant must sign the lease agreement before manager counter-signature.', 400);
  }

  const now = new Date();
  const managerName = signedBy || (req.user.firstName ? `${req.user.firstName} ${req.user.lastName || ''}`.trim() : (req.user.name || 'Property Manager'));
  lease.managerSignature = signature || 'system-signed';
  lease.managerSignatureType = signatureType || 'draw';
  lease.managerSignedBy = managerName;
  lease.managerSignedAt = now;
  lease.managerSignatureIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

  // Both tenant and manager have signed: activate lease if not future
  const isFuture = new Date(lease.startDate) > now;
  if (!isFuture) {
    lease.status = 'active';
    await Property.findByIdAndUpdate(lease.property, {
      $set: { status: 'occupied', currentTenant: lease.tenant },
    });
  }

  try {
    const Tenant = mongoose.model('Tenant');
    const User = mongoose.model('User');
    const Booking = mongoose.model('Booking');

    const tenant = await Tenant.findById(lease.tenant);
    if (tenant) {
      const user = await User.findOne({ email: tenant.email });
      if (user) {
        const booking = await Booking.findOne({
          property: lease.property,
          user: user._id,
          status: { $in: ['approved', 'active', 'pending'] }
        }).sort({ createdAt: -1 });

        if (booking) {
          if (!isFuture) {
            booking.status = 'completed';
            booking.completedDate = now;
          }
          booking.timeline.push({
            event: !isFuture ? 'completed' : 'approved',
            timestamp: now,
            note: `Manager counter-signed lease agreement (${lease.leaseNumber}).`
          });
          await booking.save();
        }

        // Notify tenant of counter-signature
        try {
          const Notification = mongoose.model('Notification');
          await Notification.create({
            recipient: user._id,
            sender: req.user.userId,
            title: 'Lease Agreement Counter-Signed',
            message: `Property management has counter-signed your lease agreement for ${lease.leaseNumber}.`,
            type: 'lease',
            link: '/my-lease'
          });
        } catch (notifErr) {
          logger.error(`[managerSignLease] Error sending notification: ${notifErr.message}`);
        }
      }
    }
  } catch (bookingErr) {
    logger.error(`[managerSignLease] Error updating booking status: ${bookingErr.message}`);
  }

  await lease.save();

  if (lease.status === 'active') {
    leaseLifecycleService.dispatch('LEASE_ACTIVATED', {
      leaseId: lease._id,
      user: req.user,
    }).catch(err => logger.error(`[managerSignLease] Lifecycle dispatch error: ${err.message}`));
  }

  logger.info(`Lease ${lease.leaseNumber} counter-signed by Manager ${lease.managerSignedBy}`);

  res.status(200).json({
    success: true,
    message: 'Lease counter-signed successfully',
    data: resolveLeaseUrls(lease, req),
  });
});

