import Property from '../models/Property.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';
import sharp from 'sharp';
import { uploadFileBuffer } from '../services/fileService.js';

const resolvePropertyUrls = (property, req) => {
  if (!property) return property;
  const propObj = property.toObject ? property.toObject() : property;
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  
  if (propObj.media && propObj.media.length > 0) {
    propObj.media = propObj.media.map(item => {
      if (item.fileId) {
        item.url = `${protocol}://${host}/api/files/download/${item.fileId}`;
      } else if (item.url && !item.url.startsWith('http')) {
        item.url = `${protocol}://${host}/${item.url.startsWith('/') ? '' : '/'}${item.url}`;
      }
      return item;
    });
  }
  
  if (propObj.images && propObj.images.length > 0) {
    propObj.images = propObj.images.map(img => {
      if (img && !img.startsWith('http')) {
        return `${protocol}://${host}/${img.startsWith('/') ? '' : '/'}${img}`;
      }
      return img;
    });
  }
  
  if (propObj.videos && propObj.videos.length > 0) {
    propObj.videos = propObj.videos.map(vid => {
      if (vid && !vid.startsWith('http')) {
        return `${protocol}://${host}/${vid.startsWith('/') ? '' : '/'}${vid}`;
      }
      return vid;
    });
  }
  
  return propObj;
};

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
    // Tenants/Users see available, occupied, or rented properties (so they see Sold Out & Available From)
    filter.status = { $in: ['available', 'occupied', 'rented'] };
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
    .populate('currentTenant', 'firstName lastName email')
    .populate({
      path: 'leases',
      select: 'status endDate',
      match: { status: 'active' }
    })
    .populate('activeLease');

  const total = await Property.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: properties.map(p => resolvePropertyUrls(p, req)),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// POST / DELETE /api/properties/:id/save — toggle or set save/unsave
export const saveProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);
  if (!property) throw new AppError('Property not found', 404);

  const userId = req.user.userId;
  const isSaved = property.savedBy.some(id => String(id) === String(userId));

  if (req.method === 'DELETE' || req.body?.action === 'unsave') {
    if (isSaved) {
      property.savedBy.pull(userId);
      await property.save();
    }
    return res.status(200).json({ success: true, saved: false, propertyId: property._id });
  }

  if (req.body?.action === 'save') {
    if (!isSaved) {
      property.savedBy.push(userId);
      await property.save();
    }
    return res.status(200).json({ success: true, saved: true, propertyId: property._id });
  }

  // Toggle behavior
  if (isSaved) {
    property.savedBy.pull(userId);
  } else {
    property.savedBy.push(userId);
  }
  await property.save();

  const finalSaved = property.savedBy.some(id => String(id) === String(userId));
  res.status(200).json({ success: true, saved: finalSaved, propertyId: property._id });
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
    })
    .populate('activeLease');

  if (!property) {
    throw new AppError('Property not found', 404);
  }

  res.status(200).json({
    success: true,
    data: resolvePropertyUrls(property, req),
  });
});

export const createProperty = asyncHandler(async (req, res) => {
  const {
    name, address, city, state, zipCode, country, type, bedrooms, bathrooms, squareFeet, rentAmount, depositAmount, amenities, manager, description, bookingType, publishStatus, location, seo, openGraph, virtualTourUrl
  } = req.body;

  let geo = undefined;
  if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
    geo = {
      type: 'Point',
      coordinates: [Number(location.lng), Number(location.lat)]
    };
  }

  const property = await Property.create({
    name, address, city, state, zipCode, country, type, bedrooms, bathrooms, squareFeet, rentAmount, depositAmount, amenities, owner: req.user.userId, manager: manager || undefined, description, status: 'available', publishStatus, bookingType, location, geo, seo, openGraph, virtualTourUrl
  });

  logger.info(`New property created: ${property.name}`);

  res.status(201).json({
    success: true,
    message: 'Property created successfully',
    data: resolvePropertyUrls(property, req),
  });
});

export const updateProperty = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { manager, location, ...rest } = req.body;

  // Use the spread payload but sanitize manager ID & sync geo coordinates
  const updateData = { ...rest };
  if (manager) updateData.manager = manager;
  if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
    updateData.location = location;
    updateData.geo = {
      type: 'Point',
      coordinates: [Number(location.lng), Number(location.lat)]
    };
  }

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
    data: resolvePropertyUrls(property, req),
  });
});

export const deleteProperty = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const property = await Property.findById(id);

  if (!property) {
    throw new AppError('Property not found', 404);
  }

  await property.deleteOne();

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

export const uploadPropertyMedia = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const property = await Property.findById(id);

  if (!property) {
    throw new AppError('Property not found', 404);
  }

  if (req.user.role !== 'admin' && property.owner.toString() !== req.user.userId && property.manager?.toString() !== req.user.userId) {
    throw new AppError('Unauthorized to upload media for this property', 403);
  }

  if (!req.files || req.files.length === 0) {
    throw new AppError('No files uploaded', 400);
  }

  const mediaUrls = [];

  for (const file of req.files) {
    let processedBuffer = file.buffer;
    let mimeType = file.mimetype;
    let filename = `property-${id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    let isVideo = file.mimetype.startsWith('video/');

    if (!isVideo) {
      processedBuffer = await sharp(file.buffer)
        .resize({ width: 1920, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      mimeType = 'image/webp';
      filename += '.webp';
    } else {
      const ext = file.originalname.split('.').pop();
      filename += `.${ext}`;
    }

    const uploadResult = await uploadFileBuffer({
      buffer: processedBuffer,
      filename,
      mimeType,
      category: 'properties',
      relatedEntityId: property._id,
      relatedModelName: 'Property'
    });
    
    mediaUrls.push({
      fileId: uploadResult._id,
      url: uploadResult.url,
      mediaType: isVideo ? 'video' : 'image',
      key: uploadResult.key
    });
  }

  property.media = [...(property.media || []), ...mediaUrls];
  
  // Synchronize legacy images and videos arrays
  const imageUrls = property.media.filter(m => m.mediaType === 'image').map(m => m.url);
  const videoUrls = property.media.filter(m => m.mediaType === 'video').map(m => m.url);
  if (imageUrls.length > 0) property.images = imageUrls;
  if (videoUrls.length > 0) property.videos = videoUrls;

  await property.save();

  logger.info(`Property media uploaded for: ${property.name}`);

  res.status(200).json({
    success: true,
    message: 'Media uploaded successfully',
    data: resolvePropertyUrls(property, req).media,
  });
});

export const getSimilarProperties = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const property = await Property.findById(id);

  if (!property) {
    throw new AppError('Property not found', 404);
  }

  const minPrice = property.rentAmount * 0.85;
  const maxPrice = property.rentAmount * 1.15;

  let geoFilter = {};
  if (property.geo && property.geo.coordinates && property.geo.coordinates.length === 2) {
      geoFilter = {
        geo: {
            $near: {
                $geometry: { type: "Point", coordinates: property.geo.coordinates },
                $maxDistance: 16093.4 // 10 miles in meters
            }
        }
      };
  } else {
      // Fallback if geo coordinates aren't seeded properly
      geoFilter = { city: property.city };
  }

  const similarProps = await Property.find({
    _id: { $ne: property._id },
    type: property.type,
    status: 'available',
    rentAmount: { $gte: minPrice, $lte: maxPrice },
    ...geoFilter
  })
  .limit(4)
  .populate('manager', 'firstName lastName')
  .populate({
    path: 'leases',
    select: 'status endDate',
    match: { status: 'active' }
  })
  .populate('activeLease');

  res.status(200).json({
    success: true,
    data: similarProps.map(p => resolvePropertyUrls(p, req)),
  });
});
