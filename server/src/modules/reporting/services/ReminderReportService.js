/**
 * server/src/modules/reporting/services/ReminderReportService.js
 *
 * Dedicated Report Service for Outbox Reminder Dispatches & Queue Telemetry.
 */

import reminderMetricsService from '../../reminders/services/ReminderMetricsService.js';
import ReportResponseBuilder from '../builders/ReportResponseBuilder.js';

export class ReminderReportService {
  async generate(filters = {}) {
    const builder = new ReportResponseBuilder('reminder');
    const metrics = await reminderMetricsService.getMetrics();

    builder
      .setSummary(metrics)
      .addKPI('delivery_success_rate', 'Delivery Success Rate', metrics.deliverySuccessRate, '%', metrics.deliverySuccessRate >= 95 ? 'positive' : 'negative')
      .addKPI('queued_reminders', 'Queued Depth', metrics.queued, '', 'neutral')
      .addKPI('dead_letter_reminders', 'Dead-Letter Count', metrics.dead_letter, '', metrics.dead_letter > 0 ? 'negative' : 'positive')
      .addKPI('avg_latency_ms', 'Average Latency', metrics.averageLatencyMs, 'ms', 'neutral')
      .setMeta({ filters });

    return builder.build();
  }
}

const reminderReportServiceSingleton = new ReminderReportService();
export default reminderReportServiceSingleton;
