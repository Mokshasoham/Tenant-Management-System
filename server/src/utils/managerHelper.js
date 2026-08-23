import mongoose from 'mongoose';
import Property from '../models/Property.js';

/**
 * Returns the authenticated user's ID from req.user
 * Handles req.user.userId, req.user._id, req.user.id
 */
export const getAuthenticatedUserId = (req) => {
  if (!req?.user) return null;
  return req.user.userId || req.user._id || req.user.id || null;
};

/**
 * Returns array of Property ObjectIds owned or managed by the manager
 */
export const getManagerPropertyIds = async (managerId) => {
  if (!managerId) return [];
  const isValidOid = mongoose.Types.ObjectId.isValid(String(managerId));
  const managerIds = [managerId, isValidOid ? new mongoose.Types.ObjectId(String(managerId)) : null].filter(Boolean);
  
  const properties = await Property.find({
    $or: [
      { owner: { $in: managerIds } },
      { manager: { $in: managerIds } },
      { createdBy: { $in: managerIds } }
    ]
  }).select('_id');
  
  return properties.map(p => p._id);
};

/**
 * Checks if a property belongs to the specified manager (as owner, manager, or creator)
 */
export const isManagerPropertyOwner = async (propertyId, managerId) => {
  if (!propertyId || !managerId) return false;
  const isValidOid = mongoose.Types.ObjectId.isValid(String(managerId));
  const managerIds = [managerId, isValidOid ? new mongoose.Types.ObjectId(String(managerId)) : null].filter(Boolean);
  
  const property = await Property.findOne({
    _id: propertyId,
    $or: [
      { owner: { $in: managerIds } },
      { manager: { $in: managerIds } },
      { createdBy: { $in: managerIds } }
    ]
  }).select('_id');
  
  return !!property;
};
