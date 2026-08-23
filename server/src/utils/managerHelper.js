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
  const properties = await Property.find({
    $or: [{ owner: managerId }, { manager: managerId }]
  }).select('_id');
  return properties.map(p => p._id);
};

/**
 * Checks if a property belongs to the specified manager (as owner or manager)
 */
export const isManagerPropertyOwner = async (propertyId, managerId) => {
  if (!propertyId || !managerId) return false;
  const property = await Property.findOne({
    _id: propertyId,
    $or: [{ owner: managerId }, { manager: managerId }]
  }).select('_id');
  return !!property;
};
