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
   * Lists all saved profiles for a user and role.
   */
  async listUserProfiles(userId, dashboardRole) {
    return DashboardLayout.find({ userId, dashboardRole }).select('profileName isActive layoutVersion __v updatedAt').lean();
  }

  /**
   * Sets a profile as active and deactivates all other profiles for user & role.
   */
  async setActiveProfile(userId, dashboardRole, profileName) {
    await DashboardLayout.updateMany(
      { userId, dashboardRole },
      { $set: { isActive: false } }
    );

    return DashboardLayout.findOneAndUpdate(
      { userId, dashboardRole, profileName },
      { $set: { isActive: true } },
      { new: true }
    );
  }

  /**
   * Upserts layout preferences enforcing __v Optimistic Concurrency Control.
   */
  async upsertLayout(userId, dashboardRole, profileName, widgets, expectedVersion = null) {
    const existing = await DashboardLayout.findOne({ userId, dashboardRole, profileName });

    if (existing) {
      if (expectedVersion !== null && expectedVersion !== undefined && existing.__v !== expectedVersion) {
        const error = new Error('OCC_VERSION_CONFLICT: Dashboard layout has been modified in another session.');
        error.statusCode = 409;
        error.serverVersion = existing.__v;
        throw error;
      }

      existing.lastKnownGoodLayout = existing.widgets;
      existing.widgets = widgets;
      existing.isActive = true;
      existing.markModified('widgets');
      return existing.save();
    }

    // Set other profiles inactive before creating active profile
    await DashboardLayout.updateMany(
      { userId, dashboardRole },
      { $set: { isActive: false } }
    );

    return DashboardLayout.create({
      userId,
      dashboardRole,
      profileName,
      isActive: true,
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
