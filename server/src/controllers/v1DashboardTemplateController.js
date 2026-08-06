/**
 * server/src/controllers/v1DashboardTemplateController.js
 *
 * REST Controller for Shared Organizational Dashboard Templates & Catalog Engine.
 */

import dashboardTemplateService from '../services/DashboardTemplateService.js';

export class V1DashboardTemplateController {
  /**
   * GET /api/v1/dashboard-templates
   * Lists catalog templates with optional filters (category, scope, search).
   */
  async listCatalog(req, res, next) {
    try {
      const userRole = req.user?.role || 'admin';
      const result = await dashboardTemplateService.searchCatalog(req.query, userRole);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/dashboard-templates
   * Publishes a new shared dashboard template.
   */
  async createTemplate(req, res, next) {
    try {
      const userId = req.user?._id || req.user?.id || req.user?.userId;
      const userRole = req.user?.role || 'admin';

      if (!userId) {
        return res.status(401).json({ success: false, message: 'UNAUTHORIZED: User authentication required.' });
      }

      const result = await dashboardTemplateService.createTemplate(userId, userRole, req.body);
      return res.status(201).json(result);
    } catch (err) {
      if (err.message?.startsWith('TEMPLATE_VALIDATION_')) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  /**
   * POST /api/v1/dashboard-templates/:id/apply
   * Applies an immutable template to user layout profile.
   */
  async applyTemplate(req, res, next) {
    try {
      const userId = req.user?._id || req.user?.id || req.user?.userId;
      const userRole = req.user?.role || 'admin';
      const templateId = req.params.id;
      const { profileName } = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'UNAUTHORIZED: User authentication required.' });
      }

      const result = await dashboardTemplateService.applyTemplateToUser(userId, userRole, templateId, profileName);
      return res.status(200).json(result);
    } catch (err) {
      if (err.statusCode === 404) {
        return res.status(404).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  /**
   * DELETE /api/v1/dashboard-templates/:id
   * Soft archives a template.
   */
  async archiveTemplate(req, res, next) {
    try {
      const userId = req.user?._id || req.user?.id || req.user?.userId;
      const userRole = req.user?.role || 'admin';
      const templateId = req.params.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'UNAUTHORIZED: User authentication required.' });
      }

      const result = await dashboardTemplateService.archiveTemplate(userId, userRole, templateId);
      return res.status(200).json(result);
    } catch (err) {
      if (err.statusCode === 403) {
        return res.status(403).json({ success: false, message: err.message });
      }
      if (err.statusCode === 404) {
        return res.status(404).json({ success: false, message: err.message });
      }
      next(err);
    }
  }
}

const v1DashboardTemplateControllerSingleton = new V1DashboardTemplateController();
export default v1DashboardTemplateControllerSingleton;
