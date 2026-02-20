import Property from '../models/Property.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';

export const getAllProperties = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    type,
    status,
    owner,
    city,
    minPrice,
    maxPrice,
    bedrooms,
    bathrooms,
    furnishing,
    amenities,
    savedOnly,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    // Bounding box (map viewport) geo search
    north,
    south,
    east,
    west,
  } = req.query;


  const filter = {};

  // Visibility Logic
  if (req.user.role === 'manager') {
    // Managers see their own properties by default, unless searching available ones
    if (status === 'available') {
      filter.status = 'available';
    } else {
      filter.$or = [{ owner: req.user.userId }, { manager: req.user.userId }];
    }
  } else if (req.user.role === 'tenant' || req.user.role === 'user') {
    // Tenants/Users see only available properties in the marketplace
    filter.status = 'available';
  } else if (req.user.role === 'admin') {
    if (owner) filter.owner = owner;
    if (status) filter.status = status;
  }

  // Common Filters
  if (type) filter.type = type;
  if (city) filter.city = { $regex: city, $options: 'i' };

  if (minPrice || maxPrice) {
    filter.rentAmount = {};
    if (minPrice) filter.rentAmount.$gte = Number(minPrice);
    if (maxPrice) filter.rentAmount.$lte = Number(maxPrice);
  }

  if (bedrooms) filter.bedrooms = { $gte: Number(bedrooms) };
  if (bathrooms) filter.bathrooms = { $gte: Number(bathrooms) };
  if (furnishing) filter.furnishing = furnishing;
  if (amenities) {
    const amenArr = amenities.split(',').map(a => a.trim());
    filter.amenities = { $all: amenArr };
  }
  if (savedOnly === 'true') {
    filter.savedBy = req.user.userId;
  }

  // ── Geo bounding box filter (map viewport search) ──
  if (north && south && east && west) {
    filter['location.lat'] = { $gte: Number(south), $lte: Number(north) };
    filter['location.lng'] = { $gte: Number(west), $lte: Number(east) };
  }

  if (search) {
    const searchOrParts = [
      { name: { $regex: search, $options: 'i' } },
      { address: { $regex: search, $options: 'i' } },
      { city: { $regex: search, $options: 'i' } },
    ];
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: searchOrParts }];
      delete filter.$or;
    } else {
      filter.$or = searchOrParts;
    }
  }

  const sortObj = {};
  sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const skip = (page - 1) * limit;

  const properties = await Property.find(filter)
    .sort(sortObj)
    .skip(skip)
    .limit(parseInt(limit))
    .populate('owner', 'firstName lastName email')
    .populate('manager', 'firstName lastName email')
    .populate('currentTenant', 'firstName lastName email');

  const total = await Property.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: properties,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// POST /api/properties/:id/save — toggle save/unsave
export const saveProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);
  if (!property) throw new AppError('Property not found', 404);

  const userId = req.user.userId;
  const isSaved = property.savedBy.includes(userId);

  if (isSaved) {
    property.savedBy.pull(userId);
  } else {
    property.savedBy.push(userId);
  }
  await property.save();

  res.status(200).json({ success: true, saved: !isSaved });
});

// GET /api/properties/:id/availability
export const getAvailability = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id).select('bookedDates rentAmount');
  if (!property) throw new AppError('Property not found', 404);
  res.status(200).json({ success: true, data: property.bookedDates });
});

export const getPropertyById = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id)
    .populate('owner', 'firstName lastName email phone')
    .populate('manager', 'firstName lastName email')
    .populate('currentTenant')
    .populate({
      path: 'leases',
      populate: [
        { path: 'tenant', select: 'firstName lastName email' },
        { path: 'createdBy', select: 'firstName lastName' },
      ],
    });

  if (!property) {
    throw new AppError('Property not found', 404);
  }

  res.status(200).json({
    success: true,
    data: property,
  });
});

export const createProperty = asyncHandler(async (req, res) => {
  const {
    name,
    address,
    city,
    state,
    zipCode,
    country,
    type,
    bedrooms,
    bathrooms,
    squareFeet,
    rentAmount,
    depositAmount,
    amenities,
    images,
    manager,
    description,
    bookingType,
  } = req.body;

  const property = await Property.create({
    name,
    address,
    city,
    state,
    zipCode,
    country,
    type,
    bedrooms,
    bathrooms,
    squareFeet,
    rentAmount,
    depositAmount,
    amenities,
    images,
    owner: req.user.userId,
    manager,
    description,
    status: 'available',
    bookingType,
  });

  logger.info(`New property created: ${property.name}`);

  res.status(201).json({
    success: true,
    message: 'Property created successfully',
    data: property,
  });
});

export const updateProperty = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const property = await Property.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  })
    .populate('owner', 'firstName lastName')
    .populate('manager', 'firstName lastName');

  if (!property) {
    throw new AppError('Property not found', 404);
  }

  logger.info(`Property updated: ${property.name}`);

  res.status(200).json({
    success: true,
    message: 'Property updated successfully',
    data: property,
  });
});

export const deleteProperty = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const property = await Property.findByIdAndDelete(id);

  if (!property) {
    throw new AppError('Property not found', 404);
  }

  logger.info(`Property deleted: ${property.name}`);

  res.status(200).json({
    success: true,
    message: 'Property deleted successfully',
  });
});

export const changePropertyStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['available', 'occupied', 'maintenance', 'rented'].includes(status)) {
    throw new AppError('Invalid status', 400);
  }

  const property = await Property.findByIdAndUpdate(id, { status }, {
    new: true,
  });

  if (!property) {
    throw new AppError('Property not found', 404);
  }

  logger.info(`Property status changed: ${property.name} - ${status}`);

  res.status(200).json({
    success: true,
    message: 'Property status updated successfully',
    data: property,
  });
});

export const getPropertyStats = asyncHandler(async (req, res) => {
  let filter = {};
  if (req.user.role !== 'admin') {
    filter.owner = req.user.userId;
  }

  const totalProperties = await Property.countDocuments(filter);
  const availableProperties = await Property.countDocuments({
    ...filter,
    status: 'available',
  });
  const occupiedProperties = await Property.countDocuments({
    ...filter,
    status: 'occupied',
  });
  const maintenanceProperties = await Property.countDocuments({
    ...filter,
    status: 'maintenance',
  });

  const avgRent = await Property.aggregate([
    { $match: filter },
    { $group: { _id: null, avgRent: { $avg: '$rentAmount' } } },
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalProperties,
      availableProperties,
      occupiedProperties,
      maintenanceProperties,
      avgRent: avgRent[0]?.avgRent || 0,
    },
  });
});
