import mongoose from 'mongoose';
import User from '../models/User.js';
import Property from '../models/Property.js';
import Maintenance from '../models/Maintenance.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import { hashPassword } from '../utils/password.js';
import logger from '../utils/logger.js';
import { uploadFileBuffer } from '../services/fileService.js';

const resolveUserUrls = (user, req) => {
  if (!user) return user;
  const userObj = user.toObject ? user.toObject() : user;
  const protocol = req?.headers?.['x-forwarded-proto'] || req?.protocol || 'http';
  const host = req?.get ? req.get('host') : (req?.headers?.host || 'localhost');
  
  if (userObj.avatar && typeof userObj.avatar === 'string') {
    let fullAvatar = userObj.avatar;
    if (!fullAvatar.startsWith('http')) {
      fullAvatar = `${protocol}://${host}${fullAvatar.startsWith('/') ? '' : '/'}${fullAvatar}`;
    }
    const versionParam = userObj.avatarVersion || 1;
    userObj.avatar = fullAvatar.includes('?')
      ? `${fullAvatar}&v=${versionParam}`
      : `${fullAvatar}?v=${versionParam}`;
  }

  if (userObj.kycFileIds && userObj.kycFileIds.length > 0) {
    userObj.kycDocuments = userObj.kycFileIds.map(fileId => `${protocol}://${host}/api/files/download/${fileId}`);
  } else if (userObj.kycDocuments && userObj.kycDocuments.length > 0) {
    userObj.kycDocuments = userObj.kycDocuments.map(doc => {
      if (doc && !doc.startsWith('http')) {
        return `${protocol}://${host}/${doc.startsWith('/') ? '' : '/'}${doc}`;
      }
      return doc;
    });
  }
  return userObj;
};

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
    data: users.map(u => resolveUserUrls(u, req)),
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
    data: resolveUserUrls(user, req),
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
    data: resolveUserUrls(user, req),
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
    data: resolveUserUrls(user, req),
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
      kycDocuments: resolveUserUrls(user, req).kycDocuments,
    }
  });
});

export const getPeopleSummary = asyncHandler(async (req, res) => {
  const [
    tenantTotal,
    tenantActive,
    managerTotal,
    managerActive,
    techTotal,
    techActive,
    techOnJob,
    propertyTotal,
    propertyActive,
    attentionTotal,
  ] = await Promise.all([
    User.countDocuments({ role: { $in: ['tenant', 'user'] } }),
    User.countDocuments({ role: { $in: ['tenant', 'user'] }, isActive: true }),
    User.countDocuments({ role: 'manager' }),
    User.countDocuments({ role: 'manager', isActive: true }),
    User.countDocuments({ role: 'technician' }),
    User.countDocuments({ role: 'technician', isActive: true }),
    User.countDocuments({ role: 'technician', 'technicianProfile.liveStatus': { $in: ['working', 'busy', 'emergency_call'] } }),
    Property.countDocuments({}),
    Property.countDocuments({ isAvailable: { $ne: false } }),
    Maintenance.countDocuments({ status: { $in: ['open', 'submitted', 'in_progress', 'pending'] } }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      tenants: { total: tenantTotal, active: tenantActive, inactive: Math.max(0, tenantTotal - tenantActive) },
      managers: { total: managerTotal, active: managerActive, inactive: Math.max(0, managerTotal - managerActive) },
      technicians: { total: techTotal, active: techActive, available: Math.max(0, techActive - techOnJob), onJob: techOnJob },
      properties: { total: propertyTotal, active: propertyActive },
      attention: { total: attentionTotal },
    },
  });
});

export const getPeopleMapData = asyncHandler(async (req, res) => {
  const properties = await Property.find({}).populate('manager', 'firstName lastName email phone').populate('owner', 'firstName lastName');
  const users = await User.find({}).select('-password');
  const maintenance = await Maintenance.find({ status: { $in: ['open', 'in_progress', 'submitted'] } }).populate('property');

  const markers = [];

  // Real Property Markers (Only if valid location exists)
  properties.forEach((p) => {
    if (p.location && typeof p.location.lat === 'number' && typeof p.location.lng === 'number') {
      markers.push({
        id: `prop-${p._id}`,
        type: 'property',
        name: p.name,
        lat: p.location.lat,
        lng: p.location.lng,
        city: p.city || 'Location N/A',
        address: p.address,
        raw: p,
      });
    }
  });

  // Real User Markers (Technicians with GPS coordinates or assigned property)
  users.forEach((u) => {
    if (u.role === 'technician' && u.technicianProfile?.currentLatitude && u.technicianProfile?.currentLongitude) {
      markers.push({
        id: `tech-${u._id}`,
        type: 'technician',
        name: `${u.firstName} ${u.lastName}`,
        lat: u.technicianProfile.currentLatitude,
        lng: u.technicianProfile.currentLongitude,
        specialty: u.technicianProfile?.skills?.[0]?.name || 'General Field Tech',
        raw: u,
      });
    }
  });

  // Real Risk Markers (Urgent Maintenance Tickets on Properties with Lat/Lng)
  maintenance.forEach((m) => {
    if (m.priority === 'emergency' || m.priority === 'urgent' || m.priority === 'high') {
      if (m.property && m.property.location && typeof m.property.location.lat === 'number' && typeof m.property.location.lng === 'number') {
        markers.push({
          id: `risk-${m._id}`,
          type: 'risk',
          name: `⚠️ ${m.title || 'High Priority Maintenance'}`,
          lat: m.property.location.lat,
          lng: m.property.location.lng,
          propertyName: m.property.name,
          raw: m,
        });
      }
    }
  });

  res.status(200).json({
    success: true,
    data: {
      markers,
      count: markers.length,
    },
  });
});

export const getPeople = asyncHandler(async (req, res) => {
  const { role, search, status, city, page = 1, limit = 25, sort = '-createdAt' } = req.query;

  const filter = {};
  if (role) {
    const roleLower = String(role).toLowerCase();
    if (roleLower === 'tenant' || roleLower === 'user') {
      filter.role = { $in: ['tenant', 'user', 'Tenant', 'User'] };
    } else if (roleLower === 'manager') {
      filter.role = { $in: ['manager', 'Manager'] };
    } else if (roleLower === 'technician') {
      filter.role = { $in: ['technician', 'Technician'] };
    } else {
      filter.role = role;
    }
  }

  if (status === 'active') filter.isActive = true;
  if (status === 'inactive') filter.isActive = false;

  if (search) {
    const searchRegex = { $regex: search, $options: 'i' };
    filter.$or = [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { email: searchRegex },
    ];
  }

  const p = Math.max(1, parseInt(page) || 1);
  const l = Math.max(1, parseInt(limit) || 25);
  const skip = (p - 1) * l;

  const users = await User.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(l)
    .select('-password');

  const total = await User.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: users.map((u) => resolveUserUrls(u, req)),
    pagination: {
      page: p,
      limit: l,
      total,
      totalPages: Math.ceil(total / l) || 1,
    },
  });
});

export const getAvailableTechnicians = asyncHandler(async (req, res) => {
  const query = {
    role: { $in: ['technician', 'Technician'] },
    isActive: { $ne: false }
  };

  if (req.user && req.user.role === 'manager') {
    const managerId = req.user.userId || req.user._id || req.user.id;
    let managerOid = null;
    if (mongoose.Types.ObjectId.isValid(String(managerId))) {
      managerOid = new mongoose.Types.ObjectId(String(managerId));
    }
    const managerIds = [managerId, managerOid].filter(Boolean);
    query.$or = [
      { 'technicianProfile.managerId': { $in: managerIds } },
      { 'technicianProfile.createdBy': { $in: managerIds } },
      { createdBy: { $in: managerIds } }
    ];
  }

  const technicians = await User.find(query).select('-password');

  const techIds = technicians.map(t => t._id);

  const activeStatuses = [
    'assigned',
    'technician_assigned',
    'visit_scheduled',
    'technician_en_route',
    'work_started',
    'in_progress',
    'waiting_parts'
  ];

  const activeJobsCounts = await Maintenance.aggregate([
    {
      $match: {
        assignedTo: { $in: techIds },
        status: { $in: activeStatuses }
      }
    },
    {
      $group: {
        _id: '$assignedTo',
        activeCount: { $sum: 1 }
      }
    }
  ]);

  const jobsMap = {};
  activeJobsCounts.forEach(item => {
    jobsMap[String(item._id)] = item.activeCount;
  });

  const formattedTechnicians = technicians.map(t => {
    const userObj = resolveUserUrls(t, req);
    const activeJobs = jobsMap[String(t._id)] || 0;
    const specialty = t.technicianProfile?.skills?.[0]?.name || 'Field Technician';
    const isWorking = t.technicianProfile?.liveStatus === 'working' || t.technicianProfile?.liveStatus === 'busy';

    return {
      _id: t._id,
      id: t._id,
      firstName: t.firstName,
      lastName: t.lastName,
      name: `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Technician',
      email: t.email,
      phone: t.phone || 'Not available',
      role: t.role || 'technician',
      specialty: specialty,
      status: activeJobs > 0 || isWorking ? 'busy' : 'available',
      availabilityLabel: activeJobs > 0 ? 'On Job' : 'Available',
      activeJobs: activeJobs,
      avatar: userObj.avatar || null
    };
  });

  res.status(200).json({
    success: true,
    data: formattedTechnicians
  });
});



