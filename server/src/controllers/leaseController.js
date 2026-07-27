import Lease from '../models/Lease.js';
import Property from '../models/Property.js';
import Tenant from '../models/Tenant.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';

// Tenant-scoped: get the current user's own lease
export const getMyLease = asyncHandler(async (req, res) => {
  // JWT only has userId + role — look up the User to get their email
  const user = await User.findById(req.user.userId).select('email');
  if (!user) return res.status(200).json({ success: true, data: null });

  const tenant = await Tenant.findOne({ email: user.email });
  if (!tenant) return res.status(200).json({ success: true, data: null });

  const lease = await Lease.findOne({
    tenant: tenant._id,
    status: { $in: ['active', 'pending'] },
  })
    .sort({ createdAt: -1 })
    .populate({
      path: 'property',
      select: 'name address type bedrooms bathrooms rentAmount amenities images manager',
      populate: { path: 'manager', select: 'firstName lastName email' }
    })
    .populate('tenant', 'firstName lastName email phone');

  res.status(200).json({ success: true, data: lease || null });
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
    data: leases,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

export const getLeaseById = asyncHandler(async (req, res) => {
  const lease = await Lease.findById(req.params.id)
    .populate('property')
    .populate('tenant')
    .populate('createdBy', 'firstName lastName email');

  if (!lease) {
    throw new AppError('Lease not found', 404);
  }

  res.status(200).json({
    success: true,
    data: lease,
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

  const lease = await Lease.create({
    property: propertyId,
    tenant: tenantId,
    startDate,
    endDate,
    rentAmount,
    depositAmount,
    utilities,
    terms,
    status: 'pending',
    createdBy: req.user.userId,
  });

  // Add lease to tenant's leases
  tenant.leases.push(lease._id);
  await tenant.save();

  // Add lease to property's leases
  property.leases.push(lease._id);
  property.currentTenant = tenantId;
  property.status = 'occupied';
  await property.save();

  logger.info(`New lease created: ${lease.leaseNumber}`);

  res.status(201).json({
    success: true,
    message: 'Lease created successfully',
    data: lease,
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
    data: lease,
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
    data: lease,
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
    data: lease,
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
  const user = await User.findById(req.user.userId).select('email');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const tenant = await Tenant.findOne({ email: user.email });
  if (!tenant || lease.tenant.toString() !== tenant._id.toString()) {
    throw new AppError('You are not authorized to sign this lease', 403);
  }

  if (lease.status !== 'pending') {
    throw new AppError('Lease is not pending signature or has already been signed', 400);
  }

  lease.signature = signature;
  lease.signatureType = signatureType;
  lease.signedBy = signedBy;
  lease.signedAt = new Date();
  lease.tenantSignatureIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
  lease.status = 'active';

  await lease.save();

  logger.info(`Lease ${lease.leaseNumber} digitally signed by ${signedBy}`);

  res.status(200).json({
    success: true,
    message: 'Lease signed and activated successfully',
    data: lease,
  });
});
