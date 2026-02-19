import Tenant from '../models/Tenant.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';

export const getAllTenants = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, status, managedBy } = req.query;

  const filter = {};
  
  // Admin can see all tenants, others see only their own
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    filter.managedBy = req.user.userId;
  } else if (managedBy) {
    filter.managedBy = managedBy;
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
  const tenant = await Tenant.findById(req.params.id)
    .populate('managedBy', 'firstName lastName email')
    .populate({
      path: 'leases',
      populate: { path: 'property', select: 'name address' },
    });

  if (!tenant) {
    throw new AppError('Tenant not found', 404);
  }

  res.status(200).json({
    success: true,
    data: tenant,
  });
});

export const createTenant = asyncHandler(async (req, res) => {
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
    managedBy: req.user.userId,
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
  const updateData = req.body;

  const tenant = await Tenant.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  }).populate('managedBy', 'firstName lastName');

  if (!tenant) {
    throw new AppError('Tenant not found', 404);
  }

  logger.info(`Tenant updated: ${tenant.email}`);

  res.status(200).json({
    success: true,
    message: 'Tenant updated successfully',
    data: tenant,
  });
});

export const deleteTenant = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const tenant = await Tenant.findByIdAndDelete(id);

  if (!tenant) {
    throw new AppError('Tenant not found', 404);
  }

  logger.info(`Tenant deleted: ${tenant.email}`);

  res.status(200).json({
    success: true,
    message: 'Tenant deleted successfully',
  });
});

export const changeTenantStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'inactive', 'banned'].includes(status)) {
    throw new AppError('Invalid status', 400);
  }

  const tenant = await Tenant.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  );

  if (!tenant) {
    throw new AppError('Tenant not found', 404);
  }

  logger.info(`Tenant status changed: ${tenant.email} - ${status}`);

  res.status(200).json({
    success: true,
    message: 'Tenant status updated successfully',
    data: tenant,
  });
});

export const getTenantStats = asyncHandler(async (req, res) => {
  let filter = {};
  if (req.user.role !== 'admin') {
    filter.managedBy = req.user.userId;
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
