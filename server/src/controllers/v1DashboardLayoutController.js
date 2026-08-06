/**
 * server/src/controllers/v1DashboardLayoutController.js
 *
 * REST Controller for Dashboard Personalization & Profile Switching APIs.
 * Enforces authentication & role permissions.
 */

import dashboardLayoutService from '../services/DashboardLayoutService.js';

export class V1DashboardLayoutController {
  /**
   * GET /api/v1/dashboard-layouts/profiles
   * Lists all saved profiles for user & role.
   */
  async listProfiles(req, res, next) {
    try {
      const userId = req.user?._id || req.user?.id || req.user?.userId;
      const role = req.query.role || req.user?.role || 'admin';

      if (!userId) {
        return res.status(401).json({ success: false, message: 'UNAUTHORIZED: User authentication required.' });
      }

      const result = await dashboardLayoutService.listUserProfiles(userId, role);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/dashboard-layouts/profiles/switch
   * Switches active layout profile for current user.
   */
  async switchProfile(req, res, next) {
    try {
      const userId = req.user?._id || req.user?.id || req.user?.userId;
      const role = req.body.role || req.user?.role || 'admin';
      const { profileName } = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'UNAUTHORIZED: User authentication required.' });
      }
      if (!profileName) {
        return res.status(400).json({ success: false, message: 'BAD_REQUEST: profileName is required.' });
      }

      const result = await dashboardLayoutService.switchActiveProfile(userId, role, profileName);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/dashboard-layouts/profiles/clone
   * Clones a platform preset into a user custom layout profile (Copy-on-Edit).
   */
  async cloneProfile(req, res, next) {
    try {
      const userId = req.user?._id || req.user?.id || req.user?.userId;
      const role = req.body.role || req.user?.role || 'admin';
      const { presetId, customName, widgets } = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'UNAUTHORIZED: User authentication required.' });
      }
      if (!presetId || !Array.isArray(widgets)) {
        return res.status(400).json({ success: false, message: 'BAD_REQUEST: presetId and widgets array are required.' });
      }

      const result = await dashboardLayoutService.clonePresetToUserProfile(
        userId,
        role,
        presetId,
        customName,
        widgets
      );

      return res.status(201).json(result);
    } catch (err) {
      if (err.message?.startsWith('PROFILE_') || err.message?.startsWith('GRID_')) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  /**
   * GET /api/v1/dashboard-layouts
   * Retrieves active dashboard layout for current user and role.
   */
  async getMyLayout(req, res, next) {
    try {
      const userId = req.user?._id || req.user?.id || req.user?.userId;
      const role = req.query.role || req.user?.role || 'admin';
      const profileName = req.query.profileName || 'Default';

      if (!userId) {
        return res.status(401).json({ success: false, message: 'UNAUTHORIZED: User authentication required.' });
      }

      const result = await dashboardLayoutService.getLayout(userId, role, profileName);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/v1/dashboard-layouts
   * Saves user dashboard layout with OCC version check.
   */
  async saveMyLayout(req, res, next) {
    try {
      const userId = req.user?._id || req.user?.id || req.user?.userId;
      const role = req.body.role || req.user?.role || 'admin';
      const profileName = req.body.profileName || 'Default';
      const { widgets, expectedVersion } = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'UNAUTHORIZED: User authentication required.' });
      }

      if (!Array.isArray(widgets)) {
        return res.status(400).json({ success: false, message: 'BAD_REQUEST: widgets must be an array.' });
      }

      const result = await dashboardLayoutService.saveLayout(
        userId,
        role,
        profileName,
        widgets,
        expectedVersion
      );

      return res.status(200).json(result);
    } catch (err) {
      if (err.statusCode === 409) {
        return res.status(409).json({
          success: false,
          errorCode: 'OCC_VERSION_CONFLICT',
          message: err.message,
          serverVersion: err.serverVersion
        });
      }
      if (err.message?.startsWith('PROFILE_') || err.message?.startsWith('GRID_')) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  /**
   * DELETE /api/v1/dashboard-layouts
   * Resets layout profile back to default template.
   */
  async resetMyLayout(req, res, next) {
    try {
      const userId = req.user?._id || req.user?.id || req.user?.userId;
      const role = req.query.role || req.user?.role || 'admin';
      const profileName = req.query.profileName || 'Default';

      if (!userId) {
        return res.status(401).json({ success: false, message: 'UNAUTHORIZED: User authentication required.' });
      }

      const result = await dashboardLayoutService.resetLayout(userId, role, profileName);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/dashboard-layouts/widgets/:widgetId
   * Resets a single widget configuration within layout.
   */
  async resetWidget(req, res, next) {
    try {
      const userId = req.user?._id || req.user?.id || req.user?.userId;
      const role = req.query.role || req.user?.role || 'admin';
      const profileName = req.query.profileName || 'Default';
      const { widgetId } = req.params;
      const defaultWidgetConfig = req.body || {};

      if (!userId) {
        return res.status(401).json({ success: false, message: 'UNAUTHORIZED: User authentication required.' });
      }

      const result = await dashboardLayoutService.resetWidget(
        userId,
        role,
        profileName,
        widgetId,
        defaultWidgetConfig
      );

      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

const v1DashboardLayoutControllerSingleton = new V1DashboardLayoutController();
export default v1DashboardLayoutControllerSingleton;
