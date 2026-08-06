/**
 * server/src/repositories/dashboardLayoutRepository.js
 *
 * Repository pattern implementation for DashboardLayout persistence.
 * Enforces Mongoose __v Optimistic Concurrency Control (OCC) during updates.
 */

import DashboardLayout from '../models/DashboardLayout.js';

export class DashboardLayoutRepository {
  /**
   * Finds active layout profile for a user and role.
   */
  async findByUserAndRole(userId, dashboardRole, profileName = 'Default') {
    return DashboardLayout.findOne({ userId, dashboardRole, profileName }).lean();
  }

  /**
   * Upserts layout preferences enforcing __v Optimistic Concurrency Control.
   */
  async upsertLayout(userId, dashboardRole, profileName, widgets, expectedVersion = null) {
    const existing = await DashboardLayout.findOne({ userId, dashboardRole, profileName });

    if (existing) {
      // Check OCC version mismatch if expectedVersion is provided
      if (expectedVersion !== null && expectedVersion !== undefined && existing.__v !== expectedVersion) {
        const error = new Error('OCC_VERSION_CONFLICT: Dashboard layout has been modified in another session.');
        error.statusCode = 409;
        error.serverVersion = existing.__v;
        throw error;
      }

      // Save previous snapshot as backup before updating
      existing.lastKnownGoodLayout = existing.widgets;
      existing.widgets = widgets;
      existing.markModified('widgets');
      return existing.save();
    }

    return DashboardLayout.create({
      userId,
      dashboardRole,
      profileName,
      widgets
    });
  }

  /**
   * Resets user layout profile.
   */
  async resetLayout(userId, dashboardRole, profileName = 'Default') {
    return DashboardLayout.deleteOne({ userId, dashboardRole, profileName });
  }
}

const dashboardLayoutRepositorySingleton = new DashboardLayoutRepository();
export default dashboardLayoutRepositorySingleton;
