import User from '../models/User.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import { hashPassword } from '../utils/password.js';
import logger from '../utils/logger.js';
import { uploadFileBuffer } from '../services/fileService.js';

export const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, role, search } = req.query;

  const filter = {};
  if (role) filter.role = role;
  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const users = await User.find(filter)
    .skip(skip)
    .limit(parseInt(limit))
    .select('-password');

  const total = await User.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).populate('properties');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

export const createUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, phone, role } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('User with this email already exists', 400);
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  const user = await User.create({
    firstName,
    lastName,
    email,
    password: hashedPassword,
    phone,
    role: role || 'user',
  });

  user.password = undefined;

  logger.info(`New user created by admin: ${user.email}`);

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: user,
  });
});

export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Don't allow direct password update through this endpoint
  delete updateData.password;

  const user = await User.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  }).select('-password');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  logger.info(`User updated: ${user.email}`);

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: user,
  });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  await user.deleteOne();

  logger.info(`User deleted: ${user.email}`);

  res.status(200).json({
    success: true,
    message: 'User deleted successfully',
  });
});

export const assignRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!['admin', 'manager', 'user'].includes(role)) {
    throw new AppError('Invalid role', 400);
  }

  const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select(
    '-password'
  );

  if (!user) {
    throw new AppError('User not found', 404);
  }

  logger.info(`Role changed for user ${user.email}: ${role}`);

  res.status(200).json({
    success: true,
    message: 'Role assigned successfully',
    data: user,
  });
});

export const toggleUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.isActive = !user.isActive;
  await user.save();

  logger.info(`User status toggled: ${user.email} - ${user.isActive ? 'Active' : 'Inactive'}`);

  res.status(200).json({
    success: true,
    message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
    data: user,
  });
});

export const getDashboardStats = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const adminCount = await User.countDocuments({ role: 'admin' });
  const managerCount = await User.countDocuments({ role: 'manager' });
  const userCount = await User.countDocuments({ role: 'user' });
  const activeUsers = await User.countDocuments({ isActive: true });

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      adminCount,
      managerCount,
      userCount,
      activeUsers,
    },
  });
});

export const uploadKycDocuments = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new AppError('No documents uploaded', 400);
  }

  const user = await User.findById(req.user.userId || req.user._id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const fileRecords = [];
  for (const file of req.files) {
    const record = await uploadFileBuffer({
      buffer: file.buffer,
      filename: file.originalname,
      mimeType: file.mimetype,
      category: 'kyc',
      uploaderId: req.user.userId || req.user._id,
      relatedEntityId: user._id,
      relatedModelName: 'User'
    });
    fileRecords.push(record);
  }

  const fileUrls = fileRecords.map(r => r.url);
  user.kycDocuments = [...user.kycDocuments, ...fileUrls];
  user.kycStatus = 'pending';
  await user.save();

  logger.info(`KYC documents uploaded for user: ${user.email}`);

  res.status(200).json({
    success: true,
    message: 'KYC documents uploaded successfully. They are pending review.',
    data: {
      kycStatus: user.kycStatus,
      kycDocuments: user.kycDocuments,
    }
  });
});

