import mongoose from 'mongoose';

/**
 * Constructs a reusable MongoDB $match query object for campaign analytics pipelines.
 * 
 * Supports:
 * - Role-based isolation (managers only see their campaigns, admins see all or filter by manager)
 * - Organization isolation
 * - Property filtering
 * - Status filtering (single or comma-separated)
 * - Risk band filtering ('critical', 'high', 'medium', 'low')
 * - Date range filtering ('startDate', 'endDate')
 * 
 * @param {object} query - Express request query object
 * @param {object} user - Authenticated user context
 * @returns {object} MongoDB $match object
 */
export const buildAnalyticsFilters = (query = {}, user = {}) => {
  const match = { isDeleted: false };

  // Organization Scoping
  const orgId = query.organizationId || user.organizationId;
  if (orgId && mongoose.Types.ObjectId.isValid(orgId)) {
    match.organizationId = new mongoose.Types.ObjectId(orgId);
  }

  // RBAC & Manager Scoping
  const userRole = (user.role || '').toLowerCase();
  const userId = user.userId || user.id || user._id;

  if (userRole === 'manager' && userId && mongoose.Types.ObjectId.isValid(userId)) {
    match.manager = new mongoose.Types.ObjectId(userId);
  } else if (query.managerId && mongoose.Types.ObjectId.isValid(query.managerId)) {
    match.manager = new mongoose.Types.ObjectId(query.managerId);
  }

  // Property Scoping
  if (query.propertyId && mongoose.Types.ObjectId.isValid(query.propertyId)) {
    match.property = new mongoose.Types.ObjectId(query.propertyId);
  }

  // Status Scoping
  if (query.status) {
    const statuses = String(query.status).split(',').map(s => s.trim()).filter(Boolean);
    if (statuses.length === 1) {
      match.status = statuses[0];
    } else if (statuses.length > 1) {
      match.status = { $in: statuses };
    }
  }

  // Risk Band Scoping
  if (query.riskBand) {
    const band = String(query.riskBand).toLowerCase();
    if (band === 'critical') match.riskScore = { $gte: 0, $lte: 30 };
    else if (band === 'high') match.riskScore = { $gt: 30, $lte: 50 };
    else if (band === 'medium') match.riskScore = { $gt: 50, $lte: 75 };
    else if (band === 'low') match.riskScore = { $gt: 75, $lte: 100 };
  }

  // Date Range Scoping (createdAt)
  if (query.startDate || query.endDate) {
    match.createdAt = {};
    if (query.startDate) {
      match.createdAt.$gte = new Date(query.startDate);
    }
    if (query.endDate) {
      match.createdAt.$lte = new Date(query.endDate);
    }
  }

  return match;
};
