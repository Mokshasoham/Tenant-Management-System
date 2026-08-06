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

    const chartData = [
      { status: 'QUEUED', count: metrics.queued },
      { status: 'PROCESSING', count: metrics.processing },
      { status: 'SENT', count: metrics.sent },
      { status: 'FAILED', count: metrics.failed },
      { status: 'DEAD_LETTER', count: metrics.dead_letter }
    ];

    builder
      .setSummary(metrics)
      .addKPI('delivery_success_rate', 'Delivery Success Rate', metrics.deliverySuccessRate, '%', metrics.deliverySuccessRate >= 95 ? 'positive' : 'negative')
      .addKPI('queued_reminders', 'Queued Depth', metrics.queued, '', 'neutral')
      .addKPI('dead_letter_reminders', 'Dead-Letter Count', metrics.dead_letter, '', metrics.dead_letter > 0 ? 'negative' : 'positive')
      .addKPI('avg_latency_ms', 'Average Latency', metrics.averageLatencyMs, 'ms', 'neutral')
      .addChart('bar', 'Outbox Queue Status', chartData, { x: 'status', y: 'count' })
      .setTable(
        ['Metric Name', 'Count / Value'],
        [
          ['Queued Reminders', metrics.queued],
          ['Processing Queue', metrics.processing],
          ['Successfully Sent', metrics.sent],
          ['Delivery Failures', metrics.failed],
          ['Dead Letter Queue', metrics.dead_letter],
          ['Total Retry Attempts', metrics.totalRetries],
          ['Avg Delivery Latency', `${metrics.averageLatencyMs} ms`],
          ['Delivery Success Rate', `${metrics.deliverySuccessRate}%`]
        ]
      )
      .setMeta({ filters });

    return builder.build();
  }
}

const reminderReportServiceSingleton = new ReminderReportService();
export default reminderReportServiceSingleton;
