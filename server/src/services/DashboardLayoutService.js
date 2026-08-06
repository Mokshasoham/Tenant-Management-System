/**
 * server/src/services/DashboardLayoutService.js
 *
 * Business logic layer for Dashboard Personalization & Layout Profiles.
 * Performs grid boundary and collision validation, OCC version checks,
 * profile switching, preset cloning (Copy-on-Edit), and emits domain events on EventBus.
 */

import dashboardLayoutRepository from '../repositories/dashboardLayoutRepository.js';
import eventBus from '../platform/events/eventBus.js';
import logger from '../platform/logging/logger.js';

export class DashboardLayoutService {
  /**
   * Validates 2D grid boundaries and checks for widget overlaps.
   */
  validateGridCoordinates(widgets = []) {
    const activeWidgets = widgets.filter((w) => w.enabled !== false);

    if (activeWidgets.length === 0) {
      throw new Error('PROFILE_VALIDATION_ERROR: Cannot save an empty dashboard layout (0 widgets).');
    }

    for (const w of activeWidgets) {
      if (w.x < 0 || w.y < 0) {
        throw new Error(`GRID_VALIDATION_ERROR: Widget '${w.widgetId}' coordinates must be non-negative.`);
      }
      if (w.w < 1 || w.w > 4) {
        throw new Error(`GRID_VALIDATION_ERROR: Widget '${w.widgetId}' width must be between 1 and 4 grid columns.`);
      }
      if (w.x + w.w > 4) {
        throw new Error(`GRID_VALIDATION_ERROR: Widget '${w.widgetId}' exceeds 4-column grid width boundary.`);
      }
    }

    // Collision check: verify no two 2D boxes overlap
    for (let i = 0; i < activeWidgets.length; i++) {
      for (let j = i + 1; j < activeWidgets.length; j++) {
        const a = activeWidgets[i];
        const b = activeWidgets[j];

        const overlapX = a.x < b.x + b.w && a.x + a.w > b.x;
        const overlapY = a.y < b.y + b.h && a.y + a.h > b.y;

        if (overlapX && overlapY) {
          throw new Error(`GRID_COLLISION_ERROR: Widget '${a.widgetId}' overlaps with Widget '${b.widgetId}'.`);
        }
      }
    }
  }

  /**
   * Lists all saved profiles for a user & role.
   */
  async listUserProfiles(userId, dashboardRole) {
    const userProfiles = await dashboardLayoutRepository.listUserProfiles(userId, dashboardRole);
    return {
      success: true,
      dashboardRole,
      profiles: userProfiles
    };
  }

  /**
   * Switches active profile for a user and role.
   */
  async switchActiveProfile(userId, dashboardRole, profileName) {
    const updated = await dashboardLayoutRepository.setActiveProfile(userId, dashboardRole, profileName);
    logger.info(`[DashboardLayoutService] User ${userId} switched active profile to '${profileName}'`);

    eventBus.publish('dashboard.profile.changed', {
      userId,
      dashboardRole,
      profileName,
      updatedAt: new Date().toISOString()
    });

    return {
      success: true,
      profileName,
      activeProfile: updated
    };
  }

  /**
   * Clones a platform preset into a user custom layout profile (Copy-on-Edit).
   */
  async clonePresetToUserProfile(userId, dashboardRole, presetId, customName, widgets) {
    const profileName = customName || `${presetId} (Custom)`;
    this.validateGridCoordinates(widgets);

    const saved = await dashboardLayoutRepository.upsertLayout(
      userId,
      dashboardRole,
      profileName,
      widgets,
      null
    );

    logger.info(`[DashboardLayoutService] Cloned preset '${presetId}' into custom profile '${profileName}' for user ${userId}`);

    eventBus.publish('dashboard.profile.cloned', {
      userId,
      dashboardRole,
      presetId,
      profileName,
      updatedAt: new Date().toISOString()
    });

    return {
      success: true,
      message: `Created custom profile '${profileName}' from preset '${presetId}'.`,
      profileName,
      widgets: saved.widgets,
      version: saved.__v
    };
  }

  /**
   * Retrieves active dashboard layout for a user.
   */
  async getLayout(userId, dashboardRole, profileName = 'Default') {
    const layout = await dashboardLayoutRepository.findByUserAndRole(userId, dashboardRole, profileName);

    if (!layout) {
      return {
        success: true,
        profileName,
        dashboardRole,
        version: 0,
        layoutVersion: 1,
        isCustom: false,
        widgets: []
      };
    }

    return {
      success: true,
      profileName: layout.profileName,
      dashboardRole: layout.dashboardRole,
      version: layout.__v,
      layoutVersion: layout.layoutVersion,
      isCustom: true,
      widgets: layout.widgets
    };
  }

  /**
   * Saves layout preferences after validation, checking OCC version.
   */
  async saveLayout(userId, dashboardRole, profileName, widgets, expectedVersion = null) {
    this.validateGridCoordinates(widgets);

    const saved = await dashboardLayoutRepository.upsertLayout(
      userId,
      dashboardRole,
      profileName,
      widgets,
      expectedVersion
    );

    logger.info(`[DashboardLayoutService] Saved layout profile '${profileName}' for user ${userId}`);

    eventBus.publish('dashboard.layout.updated', {
      userId,
      dashboardRole,
      profileName,
      widgetCount: widgets.length,
      version: saved.__v,
      updatedAt: new Date().toISOString()
    });

    return {
      success: true,
      message: 'Dashboard layout saved successfully.',
      version: saved.__v,
      widgets: saved.widgets
    };
  }

  /**
   * Resets entire layout profile back to default.
   */
  async resetLayout(userId, dashboardRole, profileName = 'Default') {
    await dashboardLayoutRepository.resetLayout(userId, dashboardRole, profileName);
    logger.info(`[DashboardLayoutService] Reset layout profile '${profileName}' for user ${userId}`);

    eventBus.publish('dashboard.layout.updated', {
      userId,
      dashboardRole,
      profileName,
      action: 'reset_default',
      updatedAt: new Date().toISOString()
    });

    return {
      success: true,
      message: 'Dashboard layout reset to default.'
    };
  }

  /**
   * Resets individual widget settings or dimensions within a layout.
   */
  async resetWidget(userId, dashboardRole, profileName, widgetId, defaultWidgetConfig) {
    const layout = await dashboardLayoutRepository.findByUserAndRole(userId, dashboardRole, profileName);
    if (!layout) {
      return { success: true, message: 'No custom layout to reset.' };
    }

    const updatedWidgets = layout.widgets.map((w) => {
      if (w.widgetId === widgetId) {
        return {
          ...w,
          w: defaultWidgetConfig.w || 2,
          h: defaultWidgetConfig.h || 1,
          settings: defaultWidgetConfig.settings || {}
        };
      }
      return w;
    });

    return this.saveLayout(userId, dashboardRole, profileName, updatedWidgets, layout.__v);
  }
}

const dashboardLayoutServiceSingleton = new DashboardLayoutService();
export default dashboardLayoutServiceSingleton;
