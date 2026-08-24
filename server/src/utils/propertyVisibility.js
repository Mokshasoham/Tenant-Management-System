import mongoose from 'mongoose';
import User from '../models/User.js';

/**
 * Returns a MongoDB query filter for publicly discoverable properties.
 * Excludes:
 * - isTest === true
 * - isInternal === true
 * - isArchived === true
 * - isDeleted === true
 * - publishStatus !== 'published'
 * - status not in ['available', 'occupied', 'rented']
 * - properties created by or assigned to test accounts (@test.com, isTest: true)
 */
export const getPublicPropertyFilter = async (customFilter = {}) => {
  const filter = { ...customFilter };

  // Explicit status & publication constraints
  filter.isTest = { $ne: true };
  filter.isInternal = { $ne: true };
  filter.isArchived = { $ne: true };
  filter.isDeleted = { $ne: true };
  filter.publishStatus = 'published';

  // Unless a specific valid status is requested, only show available, occupied, or rented
  if (filter.status) {
    if (typeof filter.status === 'string' && !['available', 'occupied', 'rented'].includes(filter.status)) {
      // Force non-discovery status to return nothing
      filter.status = '__DISCOVERY_HIDDEN__';
    }
  } else {
    filter.status = { $in: ['available', 'occupied', 'rented'] };
  }

  // Find all test/internal manager/owner IDs
  try {
    const testUsers = await User.find({
      $or: [
        { isTest: true },
        { isInternal: true },
        { email: { $regex: '@test\\.com$', $options: 'i' } },
        { email: { $regex: '^manager_\\d+@test\\.com$', $options: 'i' } },
        { email: { $regex: '^tenant_\\d+@test\\.com$', $options: 'i' } },
      ]
    }).select('_id').lean();

    if (testUsers && testUsers.length > 0) {
      const testUserIds = testUsers.map(u => u._id);
      
      if (filter.owner) {
        if (testUserIds.some(id => String(id) === String(filter.owner))) {
          filter.owner = new mongoose.Types.ObjectId(); // Cannot match
        }
      } else {
        filter.owner = { $nin: testUserIds };
      }

      if (filter.manager) {
        if (testUserIds.some(id => String(id) === String(filter.manager))) {
          filter.manager = new mongoose.Types.ObjectId(); // Cannot match
        }
      } else {
        filter.manager = { $nin: testUserIds };
      }
    }
  } catch (err) {
    console.error('[propertyVisibility] Error finding test users:', err);
  }

  return filter;
};

/**
 * Validates whether a single populated or raw property is eligible for public/tenant discovery.
 */
export const isPropertyPubliclyVisible = (property) => {
  if (!property) return false;

  // Check boolean flags
  if (property.isTest === true || property.isInternal === true || property.isArchived === true || property.isDeleted === true) {
    return false;
  }

  // Check publication status
  if (property.publishStatus && property.publishStatus !== 'published') {
    return false;
  }

  // Check lifecycle status
  if (property.status && !['available', 'occupied', 'rented'].includes(property.status)) {
    return false;
  }

  // Check owner & manager validity
  const owner = property.owner;
  const manager = property.manager;

  if (owner) {
    if (owner.isTest === true || owner.isInternal === true) return false;
    const ownerEmail = typeof owner === 'object' ? owner.email : '';
    if (ownerEmail && (ownerEmail.endsWith('@test.com') || ownerEmail.includes('_test_'))) return false;
  }

  if (manager) {
    if (manager.isTest === true || manager.isInternal === true) return false;
    const managerEmail = typeof manager === 'object' ? manager.email : '';
    if (managerEmail && (managerEmail.endsWith('@test.com') || managerEmail.includes('_test_'))) return false;
  }

  return true;
};
