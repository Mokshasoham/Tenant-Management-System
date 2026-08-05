/**
 * server/src/modules/reminders/services/ReminderMetricsService.js
 *
 * Telemetry Service querying reminder queue and delivery audit history.
 * Exposes real-time queue counts, retry metrics, average latencies, and delivery success rates.
 */

import Reminder from '../models/Reminder.js';
import ReminderHistory from '../models/ReminderHistory.js';
import { ReminderStatus } from '../constants/reminderConstants.js';

export class ReminderMetricsService {
  /**
   * Retrieves aggregated queue counts, delivery success rates, and latency statistics.
   *
   * @returns {Promise<{
   *   queued: number,
   *   processing: number,
   *   sent: number,
   *   failed: number,
   *   cancelled: number,
   *   dead_letter: number,
   *   totalRetries: number,
   *   averageLatencyMs: number,
   *   deliverySuccessRate: number
   * }>}
   */
  async getMetrics() {
    // 1. Query Outbox Queue Status Counts
    const statusCounts = await Reminder.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAttempts: { $sum: '$attempts' }
        }
      }
    ]);

    const counts = {
      queued: 0,
      processing: 0,
      sent: 0,
      failed: 0,
      cancelled: 0,
      dead_letter: 0,
      totalRetries: 0
    };

    statusCounts.forEach(item => {
      if (counts[item._id] !== undefined) {
        counts[item._id] = item.count;
      }
      counts.totalRetries += Math.max(0, (item.totalAttempts || 0) - item.count);
    });

    // 2. Query History Performance Metrics (sent vs failed & average latency)
    const historyStats = await ReminderHistory.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          deliveredCount: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          avgLatency: { $avg: '$executionTimeMs' }
        }
      }
    ]);

    const historyData = historyStats[0] || { total: 0, deliveredCount: 0, avgLatency: 0 };

    const totalDelivered = historyData.deliveredCount;
    const totalAttempted = historyData.total;
    const deliverySuccessRate = totalAttempted > 0
      ? Number(((totalDelivered / totalAttempted) * 100).toFixed(2))
      : 100.0;

    return {
      queued: counts.queued,
      processing: counts.processing,
      sent: counts.sent,
      failed: counts.failed,
      cancelled: counts.cancelled,
      dead_letter: counts.dead_letter,
      totalRetries: counts.totalRetries,
      averageLatencyMs: Math.round(historyData.avgLatency || 0),
      deliverySuccessRate
    };
  }
}

const reminderMetricsServiceSingleton = new ReminderMetricsService();
export default reminderMetricsServiceSingleton;
