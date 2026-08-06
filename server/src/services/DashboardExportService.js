/**
 * server/src/services/DashboardExportService.js
 *
 * Enterprise Import / Export Engine for Dashboard Layouts & Templates.
 * Supports portable JSON packages with schemaVersion: 1, non-destructive ImportSummary DTO previews,
 * partial success validation, duplicate resolution strategies (REPLACE | CREATE_COPY | SKIP),
 * and EventBus audit logging.
 */

import dashboardLayoutRepository from '../repositories/dashboardLayoutRepository.js';
import dashboardLayoutService from './DashboardLayoutService.js';
import eventBus from '../platform/events/eventBus.js';
import logger from '../platform/logging/logger.js';

export class DashboardExportService {
  /**
   * Packages user layout profile into portable JSON package with schemaVersion: 1.
   */
  async exportLayoutJSON(userId, dashboardRole, profileName = 'Default') {
    const layout = await dashboardLayoutRepository.findByUserAndRole(userId, dashboardRole, profileName);

    if (!layout || !Array.isArray(layout.widgets) || layout.widgets.length === 0) {
      const error = new Error('EXPORT_FAILED: No active layout profile found to export.');
      error.statusCode = 404;
      throw error;
    }

    const packageDTO = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      profileName: layout.profileName,
      dashboardRole: layout.dashboardRole,
      widgets: layout.widgets.map((w) => ({
        widgetId: w.widgetId,
        enabled: w.enabled !== false,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
        refreshIntervalMs: w.refreshIntervalMs || 60000,
        settings: w.settings || {}
      }))
    };

    logger.info(`[DashboardExportService] Exported layout profile '${profileName}' for user ${userId}`);

    eventBus.publish('dashboard.layout.exported', {
      userId,
      dashboardRole,
      profileName,
      widgetCount: packageDTO.widgets.length,
      exportedAt: packageDTO.exportedAt
    });

    return packageDTO;
  }

  /**
   * Non-destructively previews and validates an uploaded layout JSON package.
   */
  async previewImportJSON(userId, dashboardRole, jsonPackage) {
    if (!jsonPackage || typeof jsonPackage !== 'object') {
      throw new Error('IMPORT_VALIDATION_ERROR: Invalid JSON file structure.');
    }
    if (jsonPackage.schemaVersion !== 1) {
      throw new Error(`IMPORT_VALIDATION_ERROR: Unsupported layout schemaVersion '${jsonPackage.schemaVersion}'. Expected version 1.`);
    }
    if (!Array.isArray(jsonPackage.widgets) || jsonPackage.widgets.length === 0) {
      throw new Error('IMPORT_VALIDATION_ERROR: Layout package contains no widgets.');
    }

    const totalWidgets = jsonPackage.widgets.length;
    const validWidgets = jsonPackage.widgets.filter((w) => w && w.widgetId && typeof w.x === 'number' && typeof w.w === 'number');
    const skippedWidgets = totalWidgets - validWidgets.length;

    // Check duplicate profile status
    const existing = await dashboardLayoutRepository.findByUserAndRole(
      userId,
      dashboardRole,
      jsonPackage.profileName || 'Imported Profile'
    );

    const duplicateStatus = existing ? 'EXACT_MATCH' : 'UNIQUE';

    return {
      success: true,
      profileName: jsonPackage.profileName || 'Imported Profile',
      schemaVersion: jsonPackage.schemaVersion,
      exportedAt: jsonPackage.exportedAt,
      totalWidgets,
      validWidgets: validWidgets.length,
      skippedWidgets,
      duplicateStatus,
      widgets: validWidgets
    };
  }

  /**
   * Executes layout import applying selected duplicate resolution strategy.
   */
  async executeImportJSON(userId, dashboardRole, jsonPackage, strategy = 'REPLACE') {
    const preview = await this.previewImportJSON(userId, dashboardRole, jsonPackage);

    if (strategy === 'SKIP' && preview.duplicateStatus === 'EXACT_MATCH') {
      return {
        success: true,
        message: 'Import skipped as duplicate profile exists and SKIP strategy was chosen.',
        profileName: preview.profileName,
        imported: false
      };
    }

    let targetProfileName = preview.profileName;
    if (strategy === 'CREATE_COPY' || (strategy === 'SKIP' && preview.duplicateStatus === 'UNIQUE')) {
      targetProfileName = `${preview.profileName} (Imported)`;
    }

    const result = await dashboardLayoutService.saveLayout(
      userId,
      dashboardRole,
      targetProfileName,
      preview.widgets,
      null
    );

    logger.info(`[DashboardExportService] Executed layout import '${targetProfileName}' for user ${userId}`);

    eventBus.publish('dashboard.layout.imported', {
      userId,
      dashboardRole,
      profileName: targetProfileName,
      strategy,
      importedWidgets: preview.validWidgets,
      updatedAt: new Date().toISOString()
    });

    return {
      success: true,
      message: `Successfully imported layout into profile '${targetProfileName}'.`,
      profileName: targetProfileName,
      importedWidgets: preview.validWidgets,
      widgets: result.widgets
    };
  }
}

const dashboardExportServiceSingleton = new DashboardExportService();
export default dashboardExportServiceSingleton;
