/**
 * server/src/services/DashboardTemplateService.js
 *
 * Business logic layer for Shared Dashboard Templates & Catalog Engine.
 * Supports catalog search, template publishing, immutable template application,
 * usage metrics tracking, soft deletion, and EventBus audit trail.
 */

import dashboardTemplateRepository from '../repositories/dashboardTemplateRepository.js';
import dashboardLayoutService from './DashboardLayoutService.js';
import eventBus from '../platform/events/eventBus.js';
import logger from '../platform/logging/logger.js';

export class DashboardTemplateService {
  /**
   * Search catalog templates matching scope, category, and role permissions.
   */
  async searchCatalog(queryParams = {}, userRole = 'admin') {
    const templates = await dashboardTemplateRepository.searchCatalog({
      ...queryParams,
      role: userRole
    });

    return {
      success: true,
      count: templates.length,
      templates
    };
  }

  /**
   * Creates and publishes a shared organizational template.
   */
  async createTemplate(userId, userRole, templateData) {
    if (!templateData.title || !Array.isArray(templateData.widgets) || templateData.widgets.length === 0) {
      throw new Error('TEMPLATE_VALIDATION_ERROR: Template requires a title and at least 1 widget.');
    }

    const created = await dashboardTemplateRepository.createTemplate({
      ...templateData,
      createdById: userId,
      ownerRole: userRole,
      status: 'ACTIVE'
    });

    logger.info(`[DashboardTemplateService] Published template '${created.title}' (ID: ${created._id}) by user ${userId}`);

    eventBus.publish('dashboard.template.created', {
      templateId: created._id.toString(),
      title: created.title,
      createdById: userId,
      ownerRole: userRole,
      scope: created.scope,
      category: created.category,
      updatedAt: new Date().toISOString()
    });

    return {
      success: true,
      message: `Template '${created.title}' published successfully.`,
      template: created
    };
  }

  /**
   * Applies an immutable template to create or update a user's layout profile.
   */
  async applyTemplateToUser(userId, userRole, templateId, profileName) {
    const template = await dashboardTemplateRepository.findById(templateId);

    if (!template || template.status === 'ARCHIVED') {
      const error = new Error('TEMPLATE_NOT_FOUND: Requested dashboard template does not exist or has been archived.');
      error.statusCode = 404;
      throw error;
    }

    const targetProfileName = profileName || `${template.title} (Copy)`;

    // Apply template widgets to user layout profile via DashboardLayoutService
    const result = await dashboardLayoutService.saveLayout(
      userId,
      userRole,
      targetProfileName,
      template.widgets,
      null
    );

    // Increment usage counter on template
    await dashboardTemplateRepository.incrementUsage(templateId);

    logger.info(`[DashboardTemplateService] Applied template '${template.title}' (ID: ${templateId}) for user ${userId}`);

    eventBus.publish('dashboard.template.applied', {
      templateId,
      templateTitle: template.title,
      userId,
      userRole,
      profileName: targetProfileName,
      updatedAt: new Date().toISOString()
    });

    return {
      success: true,
      message: `Successfully applied template '${template.title}'.`,
      profileName: targetProfileName,
      widgets: result.widgets
    };
  }

  /**
   * Soft archives a template (status: ARCHIVED).
   */
  async archiveTemplate(userId, userRole, templateId) {
    const template = await dashboardTemplateRepository.findById(templateId);

    if (!template) {
      const error = new Error('TEMPLATE_NOT_FOUND: Template not found.');
      error.statusCode = 404;
      throw error;
    }

    // Only template owner or Admin can archive
    if (userRole !== 'admin' && template.createdById.toString() !== userId.toString()) {
      const error = new Error('FORBIDDEN: You do not have permission to archive this template.');
      error.statusCode = 403;
      throw error;
    }

    const archived = await dashboardTemplateRepository.softDelete(templateId);
    logger.info(`[DashboardTemplateService] Archived template '${template.title}' (ID: ${templateId})`);

    eventBus.publish('dashboard.template.archived', {
      templateId,
      title: template.title,
      archivedById: userId,
      updatedAt: new Date().toISOString()
    });

    return {
      success: true,
      message: `Template '${template.title}' archived successfully.`,
      template: archived
    };
  }
}

const dashboardTemplateServiceSingleton = new DashboardTemplateService();
export default dashboardTemplateServiceSingleton;
