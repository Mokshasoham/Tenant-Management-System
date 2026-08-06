/**
 * server/src/modules/reporting/services/ReportService.js
 *
 * Facade Report Service delegating report execution to specialized domain services
 * and recording execution audit logs.
 */

import ReportAudit from '../models/ReportAudit.js';
import revenueReportService from './RevenueReportService.js';
import occupancyReportService from './OccupancyReportService.js';
import leaseReportService from './LeaseReportService.js';
import paymentReportService from './PaymentReportService.js';
import maintenanceReportService from './MaintenanceReportService.js';
import notificationReportService from './NotificationReportService.js';
import reminderReportService from './ReminderReportService.js';
import managerPerformanceReportService from './ManagerPerformanceReportService.js';
import auditReportService from './AuditReportService.js';

export class ReportService {
  constructor() {
    this.services = {
      revenue: revenueReportService,
      occupancy: occupancyReportService,
      lease: leaseReportService,
      payment: paymentReportService,
      maintenance: maintenanceReportService,
      notification: notificationReportService,
      reminder: reminderReportService,
      manager_performance: managerPerformanceReportService,
      audit_log: auditReportService
    };
  }

  /**
   * Generates a report by delegating to the appropriate domain report service and logging audit execution.
   */
  async generateReport(reportType, filters = {}, userId = null, exportFormat = 'json') {
    const startTime = Date.now();
    const service = this.services[reportType];

    if (!service) {
      throw new Error(`UNSUPPORTED_REPORT_TYPE: Report type '${reportType}' is not supported.`);
    }

    try {
      const result = await service.generate(filters);
      const executionTimeMs = Date.now() - startTime;

      // Asynchronously record report audit if userId provided
      if (userId) {
        ReportAudit.create({
          reportType,
          filters,
          exportFormat,
          executionTimeMs,
          requestedBy: userId,
          recordCount: result.table?.rows?.length || 0,
          status: 'success'
        }).catch(() => {});
      }

      return result;
    } catch (err) {
      const executionTimeMs = Date.now() - startTime;
      if (userId) {
        ReportAudit.create({
          reportType,
          filters,
          exportFormat,
          executionTimeMs,
          requestedBy: userId,
          status: 'failed',
          errorMessage: err.message
        }).catch(() => {});
      }
      throw err;
    }
  }
}

const reportServiceSingleton = new ReportService();
export default reportServiceSingleton;
