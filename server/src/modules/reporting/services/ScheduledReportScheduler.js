/**
 * server/src/modules/reporting/services/ScheduledReportScheduler.js
 *
 * Scheduled Report Execution Engine.
 * Registered with SchedulerRegistry to automatically generate scheduled reports,
 * export them via ExportManager, and deliver via ReminderEmailService.
 */

import { Scheduler } from '../../../platform/scheduler/Scheduler.js';
import reportService from './ReportService.js';
import exportManager from '../exporters/ExportManager.js';
import reminderEmailService from '../../reminders/services/ReminderEmailService.js';
import SavedReport from '../models/SavedReport.js';
import logger from '../../../platform/logging/logger.js';

export class ScheduledReportScheduler extends Scheduler {
  constructor() {
    super({
      name: 'ScheduledReportScheduler',
      tickMs: 3600000 // 1 hour scan
    });
  }

  /**
   * Executes scheduled report delivery scan.
   */
  async run() {
    logger.info('[ScheduledReportScheduler] Scanning for scheduled report executions...');

    // Find saved reports configured for scheduled email delivery
    const scheduledReports = await SavedReport.find({
      'schedule.enabled': true
    }).populate('createdBy', 'email firstName lastName').lean();

    if (!scheduledReports || scheduledReports.length === 0) return;

    for (const reportConfig of scheduledReports) {
      try {
        const reportDTO = await reportService.generateReport(
          reportConfig.reportType,
          reportConfig.filters || {},
          { user: reportConfig.createdBy }
        );

        const format = reportConfig.schedule?.format || 'pdf';
        const exportResult = await exportManager.export(format, reportDTO, {
          userId: reportConfig.createdBy?._id,
          reportType: reportConfig.reportType
        });

        if (reportConfig.createdBy?.email) {
          await reminderEmailService.sendEmail({
            to: reportConfig.createdBy.email,
            subject: `[Scheduled Report] ${reportConfig.name}`,
            body: `<p>Hello ${reportConfig.createdBy.firstName || 'User'},</p><p>Your scheduled report <strong>${reportConfig.name}</strong> is attached and ready for download.</p><p><a href="${exportResult.downloadUrl}">Download ${format.toUpperCase()} Report</a></p>`,
            templateId: 'scheduled_report'
          });

          logger.info(`[ScheduledReportScheduler] Delivered scheduled report '${reportConfig.name}' to ${reportConfig.createdBy.email}`);
        }
      } catch (err) {
        logger.error(`[ScheduledReportScheduler] Error running scheduled report '${reportConfig._id}':`, err);
      }
    }
  }
}

const scheduledReportSchedulerSingleton = new ScheduledReportScheduler();
export default scheduledReportSchedulerSingleton;
