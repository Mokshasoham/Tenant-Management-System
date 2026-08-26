import Property from '../models/Property.js';
import PropertyVisit from '../models/PropertyVisit.js';
import Booking from '../models/Booking.js';
import Lease from '../models/Lease.js';
import Tenant from '../models/Tenant.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';
import sharp from 'sharp';
import { uploadFileBuffer } from '../services/fileService.js';

export const resolvePropertyUrls = (property, req) => {
  if (!property) return property;
  const propObj = property.toObject ? property.toObject() : property;
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.get('host');
  const baseUrl = `${protocol}://${host}`;

  const cleanUrl = (rawUrl, fileId = null) => {
    if (!rawUrl && !fileId) return rawUrl;
    if (fileId) {
      return `${baseUrl}/api/files/download/${fileId}`;
    }
    let u = String(rawUrl).trim();

    // Normalize any double slashes in paths (except http:// or https://)
    u = u.replace(/([^:])\/+/g, '$1/');

    // Rewrite legacy localhost, 127.0.0.1, or onrender domain prefixes to relative paths
    if (u.includes('localhost:') || u.includes('127.0.0.1:') || u.includes('onrender.com')) {
      u = u.replace(/^https?:\/\/[^\/]+/, '');
    }

    // If it's a 3rd-party external HTTP/HTTPS URL (e.g. S3, Cloudinary), return as-is
    if (u.startsWith('http://') || u.startsWith('https://')) {
      return u;
    }

    // Strip leading slashes to prevent double slashes //
    const pathWithoutLeadingSlash = u.replace(/^\/+/, '');
    return `${baseUrl}/${pathWithoutLeadingSlash}`;
  };

  if (propObj.media && propObj.media.length > 0) {
    propObj.media = propObj.media.map(item => {
      item.url = cleanUrl(item.url, item.fileId);
      return item;
    });
  }

  if (propObj.images && propObj.images.length > 0) {
    propObj.images = propObj.images.map((img, i) => {
      const matchingMedia = propObj.media?.[i];
      const fileId = matchingMedia?.fileId;
      return cleanUrl(img, fileId);
    });
  }

  if (propObj.videos && propObj.videos.length > 0) {
    propObj.videos = propObj.videos.map((vid, i) => {
      const matchingMedia = propObj.media?.find(m => m.mediaType === 'video');
      const fileId = matchingMedia?.fileId;
      return cleanUrl(vid, fileId);
    });
  }

  return propObj;
};

import { getAuthenticatedUserId } from '../utils/managerHelper.js';
import { getPublicPropertyFilter, isPropertyPubliclyVisible } from '../utils/propertyVisibility.js';
import { extractPropertyCoords, getProximityDetails, calculateSimilarityScore } from '../utils/propertyDiscovery.js';

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
    scope,
    isPublic,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    // Bounding box (map viewport) geo search
    north,
    south,
    east,
    west,
  } = req.query;

  let filter = {};
  const userId = getAuthenticatedUserId(req);

  const isManagerPortal = req.user?.role === 'manager' && scope !== 'public' && isPublic !== 'true';
  const isAdmin = req.user?.role === 'admin' && scope !== 'public' && isPublic !== 'true';

  if (isManagerPortal) {
    // Managers see only their own properties in manager portal
    filter.$or = [{ owner: userId }, { manager: userId }];
    if (status) {
      filter.status = status;
    }
  } else if (isAdmin) {
    if (owner) filter.owner = owner;
    if (status) filter.status = status;
  } else {
    // ══════════════════════════════════════════════════════════════════════════
    // PUBLIC / TENANT DISCOVERY VISIBILITY
    // ══════════════════════════════════════════════════════════════════════════
    filter = await getPublicPropertyFilter(status ? { status } : {});
  }

  if (type) filter.type = type;
  if (city) filter.city = { $regex: city.trim(), $options: 'i' };

  if (minPrice || maxPrice) {
    filter.rentAmount = filter.rentAmount || {};
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
  if (savedOnly === 'true' && req.user?.userId) {
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
    .populate('owner', 'firstName lastName email phone avatar role isTest isInternal')
    .populate('manager', 'firstName lastName email phone avatar role isTest isInternal')
    .populate('currentTenant', 'firstName lastName email')
    .populate({
      path: 'leases',
      select: 'status endDate',
      match: { status: 'active' }
    })
    .populate('activeLease');

  const total = await Property.countDocuments(filter);

  const resolvedProperties = properties.map(p => {
    const resolved = resolvePropertyUrls(p, req);
    if (!resolved.manager && resolved.owner) {
      resolved.manager = resolved.owner;
    }
    return resolved;
  });

  res.status(200).json({
    success: true,
    data: resolvedProperties,
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
    .populate('owner', 'firstName lastName email phone avatar role isTest isInternal')
    .populate('manager', 'firstName lastName email phone avatar role isTest isInternal')
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

  // Tenant / Public guest visibility validation
  const requesterId = getAuthenticatedUserId(req);
  const isManagerOrAdmin = req.user?.role === 'admin' ||
    (requesterId && (
      String(property.owner?._id || property.owner) === String(requesterId) ||
      String(property.manager?._id || property.manager) === String(requesterId)
    ));

  if (!isManagerOrAdmin) {
    if (!isPropertyPubliclyVisible(property)) {
      throw new AppError('Property not found or is not currently available', 404);
    }
  }

  const resolved = resolvePropertyUrls(property, req);

  // Authoritative Property -> Manager resolution:
  // If property.manager is null or unpopulated, resolve from the property's owner/creator
  if (!resolved.manager && resolved.owner) {
    resolved.manager = resolved.owner;
  }

  res.status(200).json({
    success: true,
    data: resolved,
  });
});

export const createProperty = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user._id || req.user.id;
  const userRole = req.user.role || 'manager';

  // ══ MANAGER SUBSCRIPTION PROPERTY CAPACITY GUARD ══
  if (userId && userRole !== 'admin') {
    const { checkSubscriptionLimit } = await import('../services/subscriptionService.js');
    await checkSubscriptionLimit(userId, 'manager', 'create_property');
  }

  const {
    name, address, city, state, zipCode, country, type, bedrooms, bathrooms, squareFeet, rentAmount, depositAmount, amenities, manager, description, bookingType, publishStatus, location, seo, openGraph, virtualTourUrl,
    bhk, floor, totalFloors, furnishing, balcony, parking, garden, builtUpArea,
    commercialArea, frontage, washroom, electricity, suitableFor,
    totalBeds, roomType, occupancyCapacity, genderPreference, foodAvailability, acAvailable, roomSharing, bathroomType, facilities, commonFacilities, typeDetails
  } = req.body;

  let geo = undefined;
  if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
    geo = {
      type: 'Point',
      coordinates: [Number(location.lng), Number(location.lat)]
    };
  }

  const property = await Property.create({
    name, address, city, state, zipCode, country, type, bedrooms, bathrooms, squareFeet, rentAmount, depositAmount, amenities, owner: userId, manager: manager || userId, description, status: 'available', publishStatus, bookingType, location, geo, seo, openGraph, virtualTourUrl,
    bhk, floor, totalFloors, furnishing, balcony, parking, garden, builtUpArea,
    commercialArea, frontage, washroom, electricity, suitableFor,
    totalBeds, roomType, occupancyCapacity, genderPreference, foodAvailability, acAvailable, roomSharing, bathroomType, facilities, commonFacilities, typeDetails
  });

  logger.info(`New property created: ${property.name}`);

  const populatedProperty = await Property.findById(property._id)
    .populate('owner', 'firstName lastName email phone avatar role')
    .populate('manager', 'firstName lastName email phone avatar role');

  const resolved = resolvePropertyUrls(populatedProperty, req);
  if (!resolved.manager && resolved.owner) {
    resolved.manager = resolved.owner;
  }

  res.status(201).json({
    success: true,
    message: 'Property created successfully',
    data: resolved,
  });
});

export const updateProperty = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = getAuthenticatedUserId(req);
  const { manager, location, ...rest } = req.body;

  const existing = await Property.findById(id);
  if (!existing) {
    throw new AppError('Property not found', 404);
  }

  if (req.user?.role !== 'admin' && existing.owner?.toString() !== userId && existing.manager?.toString() !== userId) {
    throw new AppError('Forbidden: You do not have permission to update this property', 403);
  }

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

  logger.info(`Property updated: ${property.name}`);

  res.status(200).json({
    success: true,
    message: 'Property updated successfully',
    data: resolvePropertyUrls(property, req),
  });
});

export const deleteProperty = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = getAuthenticatedUserId(req);

  const property = await Property.findById(id);

  if (!property) {
    throw new AppError('Property not found', 404);
  }

  if (req.user?.role !== 'admin' && property.owner?.toString() !== userId && property.manager?.toString() !== userId) {
    throw new AppError('Forbidden: You do not have permission to delete this property', 403);
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
  const userId = getAuthenticatedUserId(req);

  if (!['available', 'occupied', 'maintenance', 'rented'].includes(status)) {
    throw new AppError('Invalid status', 400);
  }

  const property = await Property.findById(id);
  if (!property) {
    throw new AppError('Property not found', 404);
  }

  if (req.user?.role !== 'admin' && property.owner?.toString() !== userId && property.manager?.toString() !== userId) {
    throw new AppError('Forbidden: You do not have permission to modify this property status', 403);
  }

  property.status = status;
  await property.save();

  logger.info(`Property status changed: ${property.name} - ${status}`);

  res.status(200).json({
    success: true,
    message: 'Property status updated successfully',
    data: property,
  });
});

export const getPropertyStats = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  let filter = {};
  if (req.user?.role !== 'admin') {
    filter.$or = [{ owner: userId }, { manager: userId }];
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

  const mediaUrls = await Promise.all(
    req.files.map(async (file) => {
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

      return {
        fileId: uploadResult._id,
        url: uploadResult.url,
        mediaType: isVideo ? 'video' : 'image',
        key: uploadResult.key
      };
    })
  );

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

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/properties/:id/nearby-properties
// Authoritative Geographic Proximity Discovery
// ══════════════════════════════════════════════════════════════════════════════
export const getNearbyProperties = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 6));
  const maxRadiusKm = Number(req.query.radius) || 50;

  const target = await Property.findById(id);
  if (!target) {
    throw new AppError('Property not found', 404);
  }

  const targetCoords = extractPropertyCoords(target);

  // Apply authoritative public property visibility filter excluding target property
  const publicFilter = await getPublicPropertyFilter({ _id: { $ne: target._id } });

  const candidates = await Property.find(publicFilter)
    .populate('owner', 'firstName lastName email phone avatar role isTest isInternal')
    .populate('manager', 'firstName lastName email phone avatar role isTest isInternal')
    .populate({
      path: 'leases',
      select: 'status endDate',
      match: { status: 'active' }
    })
    .populate('activeLease');

  // Compute proximity for each candidate
  const withProximity = candidates.map(cand => {
    const prox = getProximityDetails(target, cand);
    const resolved = resolvePropertyUrls(cand, req);
    if (!resolved.manager && resolved.owner) {
      resolved.manager = resolved.owner;
    }
    return {
      ...resolved,
      distanceKm: prox.distanceKm,
      distanceText: prox.distanceText,
      proximityBadge: prox.proximityBadge,
      scope: prox.scope,
      hasPreciseDistance: prox.hasPreciseDistance,
      location: cand.location || (prox.coords ? { lat: prox.coords.lat, lng: prox.coords.lng } : null)
    };
  });

  // Sort strategy:
  // 1. Properties with precise distance (ascending distance)
  // 2. Properties in the same city (fallback)
  // 3. Properties in the same state
  withProximity.sort((a, b) => {
    if (a.distanceKm !== null && b.distanceKm !== null) {
      return a.distanceKm - b.distanceKm;
    }
    if (a.distanceKm !== null) return -1;
    if (b.distanceKm !== null) return 1;

    // Check same city
    const aSameCity = Boolean(target.city && a.city && target.city.toLowerCase() === a.city.toLowerCase());
    const bSameCity = Boolean(target.city && b.city && target.city.toLowerCase() === b.city.toLowerCase());
    if (aSameCity && !bSameCity) return -1;
    if (!aSameCity && bSameCity) return 1;

    return 0;
  });

  // Filter out candidates that are absurdly far away (> maxRadiusKm) if precise distance is known
  const filtered = withProximity.filter(item => {
    if (item.distanceKm !== null) {
      return item.distanceKm <= maxRadiusKm;
    }
    return true;
  }).slice(0, limit);

  let scopeLabel = `Homes near ${target.name}`;
  if (filtered.length > 0) {
    if (filtered[0].distanceKm !== null && filtered[0].distanceKm <= 5) {
      scopeLabel = 'Homes within 5 km';
    } else if (target.city) {
      scopeLabel = `Homes in ${target.city}`;
    }
  }

  res.status(200).json({
    success: true,
    target: {
      id: target._id,
      name: target.name,
      city: target.city,
      address: target.address,
      location: target.location || targetCoords,
      rentAmount: target.rentAmount,
      type: target.type
    },
    count: filtered.length,
    scopeLabel,
    data: filtered,
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/properties/:id/similar
// Multi-Signal Algorithmic Recommendation Engine
// ══════════════════════════════════════════════════════════════════════════════
export const getSimilarProperties = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 6));

  const target = await Property.findById(id);
  if (!target) {
    throw new AppError('Property not found', 404);
  }

  // Apply authoritative public property visibility filter excluding target property
  const publicFilter = await getPublicPropertyFilter({ _id: { $ne: target._id } });

  const candidates = await Property.find(publicFilter)
    .populate('owner', 'firstName lastName email phone avatar role isTest isInternal')
    .populate('manager', 'firstName lastName email phone avatar role isTest isInternal')
    .populate({
      path: 'leases',
      select: 'status endDate',
      match: { status: 'active' }
    })
    .populate('activeLease');

  // Compute similarity score for each candidate
  const scoredCandidates = candidates.map(cand => {
    const { score, matchReasons } = calculateSimilarityScore(target, cand);
    const resolved = resolvePropertyUrls(cand, req);
    if (!resolved.manager && resolved.owner) {
      resolved.manager = resolved.owner;
    }
    return {
      ...resolved,
      matchScore: score,
      matchPercentage: `${score}%`,
      matchReasons
    };
  });

  // Sort by match score descending
  scoredCandidates.sort((a, b) => b.matchScore - a.matchScore);

  const topMatches = scoredCandidates.slice(0, limit);

  res.status(200).json({
    success: true,
    targetId: target._id,
    count: topMatches.length,
    data: topMatches,
  });
});

// GET /api/properties/public-verify/:token (Public unauthenticated verification)
export const verifyPropertyByToken = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { verifyPropertyPublic } = await import('../services/propertyQrService.js');
  const data = await verifyPropertyPublic(token);
  if (!data) {
    throw new AppError('Property verification record not found or invalid verification token', 404);
  }
  res.status(200).json({ success: true, data });
});

// GET /api/properties/:id/qr-pass (Authenticated property QR pass)
export const getPropertyQrPass = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { leaseId } = req.query;
  const Lease = (await import('../models/Lease.js')).default;
  const { getOrCreatePropertyQr } = await import('../services/propertyQrService.js');

  let targetLease = null;
  if (leaseId) {
    targetLease = await Lease.findById(leaseId);
  }
  if (!targetLease) {
    targetLease = await Lease.findOne({
      property: id,
      status: { $in: ['active', 'pending'] }
    });
  }
  if (!targetLease) {
    throw new AppError('No eligible lease found for this property', 404);
  }

  const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
  const qrData = await getOrCreatePropertyQr(targetLease._id, origin);
  res.status(200).json({ success: true, data: qrData });
});

// GET /api/properties/:id/navigation (Secure, approval-gated navigation endpoint)
export const getPropertyNavigation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const property = await Property.findById(id);
  if (!property) {
    throw new AppError('Property not found', 404);
  }

  // If unauthenticated, access is strictly locked
  if (!req.user || !req.user.userId) {
    return res.status(403).json({
      success: false,
      authorized: false,
      status: 'locked',
      message: 'Directions locked. Please log in and request a visit or book this property to unlock navigation.'
    });
  }

  const userId = req.user.userId;
  const userRole = req.user.role;

  // Manager / Admin / Owner Access Override
  const isManagerOrOwner =
    userRole === 'admin' ||
    userRole === 'manager' ||
    (property.manager && String(property.manager) === String(userId)) ||
    (property.owner && String(property.owner) === String(userId));

  let isAuthorized = isManagerOrOwner;
  let reason = isManagerOrOwner ? 'manager_access' : null;
  let approvedDate = null;
  let timeSlot = null;

  if (!isAuthorized) {
    // 1. Check for Approved Visit Request
    const approvedVisit = await PropertyVisit.findOne({
      property: property._id,
      tenant: userId,
      status: 'approved'
    }).sort({ updatedAt: -1 });

    if (approvedVisit) {
      isAuthorized = true;
      reason = 'visit_approved';
      approvedDate = approvedVisit.visitDate;
      timeSlot = approvedVisit.timeSlot;
    }
  }

  if (!isAuthorized) {
    // 2. Check for Approved or Confirmed Booking
    const approvedBooking = await Booking.findOne({
      property: property._id,
      user: userId,
      $or: [
        { status: { $in: ['approved', 'confirmed', 'active'] } },
        { paymentStatus: 'paid' }
      ]
    }).sort({ updatedAt: -1 });

    if (approvedBooking) {
      isAuthorized = true;
      reason = 'booking_approved';
      approvedDate = approvedBooking.startDate;
    }
  }

  if (!isAuthorized) {
    // 3. Check for Active / Approved Lease
    const tenantDoc = await Tenant.findOne({ user: userId });
    const tenantIds = [userId, tenantDoc?._id].filter(Boolean);

    const approvedLease = await Lease.findOne({
      property: property._id,
      $or: [
        { tenant: { $in: tenantIds } },
        { user: { $in: tenantIds } }
      ],
      status: { $in: ['active', 'signed', 'pending_payment'] }
    }).sort({ updatedAt: -1 });

    if (approvedLease) {
      isAuthorized = true;
      reason = 'lease_active';
      approvedDate = approvedLease.startDate;
    }
  }

  if (!isAuthorized) {
    // Determine detailed lock status for tenant guidance
    const [pendingVisit, pendingBooking, rejectedVisit, rejectedBooking] = await Promise.all([
      PropertyVisit.findOne({ property: property._id, tenant: userId, status: 'pending' }).sort({ updatedAt: -1 }),
      Booking.findOne({ property: property._id, user: userId, status: 'pending' }).sort({ updatedAt: -1 }),
      PropertyVisit.findOne({ property: property._id, tenant: userId, status: 'rejected' }).sort({ updatedAt: -1 }),
      Booking.findOne({ property: property._id, user: userId, status: 'rejected' }).sort({ updatedAt: -1 })
    ]);

    let lockStatus = 'locked';
    let lockMessage = 'Directions locked. Request a visit or book this property to unlock navigation.';

    if (pendingVisit || pendingBooking) {
      lockStatus = 'pending_approval';
      lockMessage = 'Awaiting Manager Approval. Navigation will be unlocked once your request is approved.';
    } else if (rejectedVisit || rejectedBooking) {
      lockStatus = 'rejected';
      lockMessage = 'Your visit or booking request was not approved. Navigation remains restricted.';
    }

    return res.status(403).json({
      success: false,
      authorized: false,
      status: lockStatus,
      message: lockMessage
    });
  }

  // Tenant is legitimately authorized — extract real stored property location
  let lat = property.location?.lat;
  let lng = property.location?.lng;

  // Fallback to geo Point coordinates [lng, lat]
  if ((!lat || !lng || isNaN(lat) || isNaN(lng)) && Array.isArray(property.geo?.coordinates) && property.geo.coordinates.length >= 2) {
    lng = property.geo.coordinates[0];
    lat = property.geo.coordinates[1];
  }

  const hasValidCoords = lat !== undefined && lat !== null && lng !== undefined && lng !== null && !isNaN(Number(lat)) && !isNaN(Number(lng));
  const fullAddress = [property.address, property.city, property.state, property.zipCode].filter(Boolean).join(', ');

  let destinationUrl = null;
  if (hasValidCoords) {
    destinationUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  } else if (fullAddress) {
    destinationUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`;
  }

  let label = 'Navigation Unlocked';
  if (reason === 'visit_approved') {
    label = 'Visit Approved • Navigation Available';
  } else if (reason === 'booking_approved') {
    label = 'Booking Approved • Navigation Available';
  } else if (reason === 'lease_active') {
    label = 'Lease Active • Navigation Available';
  } else if (reason === 'manager_access') {
    label = 'Manager Access • Navigation Available';
  }

  res.status(200).json({
    success: true,
    authorized: true,
    status: 'unlocked',
    reason,
    label,
    data: {
      hasLocation: Boolean(destinationUrl),
      lat: hasValidCoords ? Number(lat) : null,
      lng: hasValidCoords ? Number(lng) : null,
      address: property.address,
      city: property.city,
      state: property.state,
      zipCode: property.zipCode,
      fullAddress,
      destinationUrl,
      approvedDate,
      timeSlot
    }
  });
});

