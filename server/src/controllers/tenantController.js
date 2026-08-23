import Tenant from '../models/Tenant.js';
import User from '../models/User.js';
import Lease from '../models/Lease.js';
import Booking from '../models/Booking.js';
import Property from '../models/Property.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';
import { resolveLeaseUrls } from './leaseController.js';
import { resolvePropertyUrls } from './propertyController.js';

import { getAuthenticatedUserId } from '../utils/managerHelper.js';

export const getAllTenants = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, status, managedBy } = req.query;
  const userId = getAuthenticatedUserId(req);

  const filter = {};
  
  // Scoping Logic: Managers only see their own managed tenants; Admin sees all (or filtered by managedBy)
  if (req.user?.role === 'manager') {
    filter.managedBy = userId;
  } else if (req.user?.role === 'admin') {
    if (managedBy) filter.managedBy = managedBy;
  } else {
    filter.managedBy = userId;
  }

  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const tenants = await Tenant.find(filter)
    .skip(skip)
    .limit(parseInt(limit))
    .populate('managedBy', 'firstName lastName email')
    .populate('leases');

  const total = await Tenant.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: tenants,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

export const getTenantById = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const tenant = await Tenant.findById(req.params.id)
    .populate('managedBy', 'firstName lastName email')
    .populate({
      path: 'leases',
      populate: { path: 'property', select: 'name address' },
    });

  if (!tenant) {
    throw new AppError('Tenant not found', 404);
  }

  if (req.user?.role === 'manager') {
    const tenantMgr = tenant.managedBy?._id ? tenant.managedBy._id.toString() : tenant.managedBy?.toString();
    if (tenantMgr !== userId) {
      throw new AppError('Forbidden: Access denied to this tenant', 403);
    }
  }

  res.status(200).json({
    success: true,
    data: tenant,
  });
});

export const createTenant = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const {
    firstName,
    lastName,
    email,
    phone,
    address,
    idNumber,
    occupationStatus,
    monthlyIncome,
    emergencyContact,
  } = req.body;

  // Check if tenant already exists
  const existingTenant = await Tenant.findOne({ email });
  if (existingTenant) {
    throw new AppError('Tenant with this email already exists', 400);
  }

  const tenant = await Tenant.create({
    firstName,
    lastName,
    email,
    phone,
    address,
    idNumber,
    occupationStatus,
    monthlyIncome,
    emergencyContact,
    managedBy: userId,
    status: 'active',
  });

  logger.info(`New tenant created: ${tenant.email}`);

  res.status(201).json({
    success: true,
    message: 'Tenant created successfully',
    data: tenant,
  });
});

export const updateTenant = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = getAuthenticatedUserId(req);
  const updateData = req.body;

  const existingTenant = await Tenant.findById(id);
  if (!existingTenant) {
    throw new AppError('Tenant not found', 404);
  }

  if (req.user?.role === 'manager') {
    const tenantMgr = existingTenant.managedBy?._id ? existingTenant.managedBy._id.toString() : existingTenant.managedBy?.toString();
    if (tenantMgr !== userId) {
      throw new AppError('Forbidden: Access denied to update this tenant', 403);
    }
  }

  const tenant = await Tenant.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  }).populate('managedBy', 'firstName lastName');

  logger.info(`Tenant updated: ${tenant.email}`);

  res.status(200).json({
    success: true,
    message: 'Tenant updated successfully',
    data: tenant,
  });
});

export const deleteTenant = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = getAuthenticatedUserId(req);

  const tenant = await Tenant.findById(id);

  if (!tenant) {
    throw new AppError('Tenant not found', 404);
  }

  if (req.user?.role === 'manager') {
    const tenantMgr = tenant.managedBy?._id ? tenant.managedBy._id.toString() : tenant.managedBy?.toString();
    if (tenantMgr !== userId) {
      throw new AppError('Forbidden: Access denied to delete this tenant', 403);
    }
  }

  await tenant.deleteOne();

  logger.info(`Tenant deleted: ${tenant.email}`);

  res.status(200).json({
    success: true,
    message: 'Tenant deleted successfully',
  });
});

export const changeTenantStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = getAuthenticatedUserId(req);

  if (!['active', 'inactive', 'banned'].includes(status)) {
    throw new AppError('Invalid status', 400);
  }

  const tenant = await Tenant.findById(id);
  if (!tenant) {
    throw new AppError('Tenant not found', 404);
  }

  if (req.user?.role === 'manager') {
    const tenantMgr = tenant.managedBy?._id ? tenant.managedBy._id.toString() : tenant.managedBy?.toString();
    if (tenantMgr !== userId) {
      throw new AppError('Forbidden: Access denied to modify this tenant status', 403);
    }
  }

  tenant.status = status;
  await tenant.save();

  logger.info(`Tenant status changed: ${tenant.email} - ${status}`);

  res.status(200).json({
    success: true,
    message: 'Tenant status updated successfully',
    data: tenant,
  });
});

export const getTenantStats = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  let filter = {};
  if (req.user?.role !== 'admin') {
    filter.managedBy = userId;
  }

  const totalTenants = await Tenant.countDocuments(filter);
  const activeTenants = await Tenant.countDocuments({
    ...filter,
    status: 'active',
  });
  const inactiveTenants = await Tenant.countDocuments({
    ...filter,
    status: 'inactive',
  });
  const bannedTenants = await Tenant.countDocuments({
    ...filter,
    status: 'banned',
  });

  res.status(200).json({
    success: true,
    data: {
      totalTenants,
      activeTenants,
      inactiveTenants,
      bannedTenants,
    },
  });
});

// Unified Context for Authenticated Tenant
export const getMyTenantContext = asyncHandler(async (req, res) => {
  const actualUserId = req.user?.userId || req.user?._id || req.user?.id;
  const user = await User.findById(actualUserId).select('email phone firstName lastName avatar role');
  if (!user) {
    return res.status(200).json({
      success: true,
      data: {
        hasActiveLease: false,
        hasProperty: false,
        hasBooking: false,
        hasEndedLease: false,
        activeLease: null,
        activeLeases: [],
        endedLeases: [],
        property: null,
        manager: null,
        booking: null,
      },
    });
  }

  const cleanEmail = (user.email || '').trim();
  const emailRegex = cleanEmail ? new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') : null;
  const cleanPhone = (user.phone || '').trim();
  const phoneRegex = cleanPhone ? new RegExp(`^${cleanPhone.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') : null;

  const tenants = await Tenant.find({
    $or: [
      ...(emailRegex ? [{ email: emailRegex }] : []),
      { user: actualUserId },
      { userId: actualUserId },
      ...(phoneRegex ? [{ phone: phoneRegex }] : []),
      ...(user.firstName && user.lastName ? [{
        firstName: new RegExp(`^${user.firstName.trim()}$`, 'i'),
        lastName: new RegExp(`^${user.lastName.trim()}$`, 'i')
      }] : [])
    ]
  });

  const tenantIds = Array.from(new Set([
    actualUserId,
    user._id,
    ...tenants.map(t => t._id)
  ].filter(Boolean).map(id => id.toString())));

  // Collect lease IDs embedded in tenant documents
  const embeddedLeaseIds = [];
  for (const t of tenants) {
    if (Array.isArray(t.leases)) {
      embeddedLeaseIds.push(...t.leases.filter(Boolean));
    }
  }

  // Find bookings for this user
  const userBookings = await Booking.find({
    $or: [
      { user: { $in: tenantIds } },
      { tenant: { $in: tenantIds } },
      ...(emailRegex ? [{ email: emailRegex }] : [])
    ]
  })
    .sort({ createdAt: -1 })
    .populate({
      path: 'property',
      select: 'name address city state zipCode images coverImage manager rentAmount depositAmount',
      populate: { path: 'manager', select: 'firstName lastName email phone avatar' }
    })
    .populate('manager', 'firstName lastName email phone avatar');

  const bookingLeaseIds = userBookings.map(b => b.lease).filter(Boolean);
  const allTargetLeaseIds = Array.from(new Set([...embeddedLeaseIds, ...bookingLeaseIds].map(id => id.toString())));

  // Find active leases & past leases
  const [activeLeases, endedLeases] = await Promise.all([
    Lease.find({
      $or: [
        { tenant: { $in: tenantIds } },
        { user: { $in: tenantIds } },
        ...(allTargetLeaseIds.length > 0 ? [{ _id: { $in: allTargetLeaseIds } }] : [])
      ],
      status: { $nin: ['terminated', 'expired', 'cancelled', 'completed'] },
    })
      .sort({ createdAt: -1 })
      .populate({
        path: 'property',
        select: 'name address city state zipCode type bedrooms bathrooms floor squareFeet rentAmount depositAmount amenities images coverImage manager',
        populate: { path: 'manager', select: 'firstName lastName email phone avatar' }
      })
      .populate('tenant', 'firstName lastName email phone'),

    Lease.find({
      $or: [
        { tenant: { $in: tenantIds } },
        { user: { $in: tenantIds } },
        ...(allTargetLeaseIds.length > 0 ? [{ _id: { $in: allTargetLeaseIds } }] : [])
      ],
      status: { $in: ['terminated', 'expired', 'cancelled', 'completed'] },
    })
      .sort({ createdAt: -1 })
      .populate({
        path: 'property',
        select: 'name address city state zipCode images coverImage manager',
        populate: { path: 'manager', select: 'firstName lastName email phone avatar' }
      })
      .populate('tenant', 'firstName lastName email phone')
  ]);

  const resolvedActiveLeases = activeLeases.map(l => resolveLeaseUrls(l, req));
  const resolvedEndedLeases = endedLeases.map(l => resolveLeaseUrls(l, req));
  const primaryLease = resolvedActiveLeases[0] || null;

  const activeBookings = userBookings.filter(b => ['pending', 'approved', 'active'].includes(b.status));
  const primaryBooking = activeBookings[0] || userBookings[0] || null;

  const hasActiveLease = resolvedActiveLeases.length > 0;
  const hasEndedLease = resolvedEndedLeases.length > 0 && !hasActiveLease;
  const hasBooking = Boolean(primaryBooking);

  // Property derivation
  let property = null;
  if (primaryLease?.property) {
    property = typeof primaryLease.property === 'object' ? resolvePropertyUrls(primaryLease.property, req) : primaryLease.property;
  } else if (primaryBooking?.property) {
    property = typeof primaryBooking.property === 'object' ? resolvePropertyUrls(primaryBooking.property, req) : primaryBooking.property;
  }
  const hasProperty = Boolean(property);

  // Manager derivation (ONLY IF LEGITIMATE RELATIONSHIP)
  let manager = null;
  if (primaryLease?.property?.manager && typeof primaryLease.property.manager === 'object') {
    manager = primaryLease.property.manager;
  } else if (primaryBooking?.manager && typeof primaryBooking.manager === 'object') {
    manager = primaryBooking.manager;
  } else if (primaryBooking?.property?.manager && typeof primaryBooking.property.manager === 'object') {
    manager = primaryBooking.property.manager;
  }

  res.status(200).json({
    success: true,
    data: {
      hasActiveLease,
      hasProperty,
      hasBooking,
      hasEndedLease,
      activeLease: primaryLease,
      activeLeases: resolvedActiveLeases,
      endedLeases: resolvedEndedLeases,
      property,
      manager: manager ? {
        _id: manager._id,
        firstName: manager.firstName,
        lastName: manager.lastName,
        email: manager.email,
        phone: manager.phone || '',
        avatar: manager.avatar || null,
      } : null,
      booking: primaryBooking,
    },
  });
});

