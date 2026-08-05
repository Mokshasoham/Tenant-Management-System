/**
 * server/src/modules/reminders/services/ReminderDiagnosticsService.js
 *
 * Read-only System Health and Diagnostics Service.
 * Aggregates live system status across database, Queue, Worker, Scheduler, EventBus,
 * Email Provider, and SMS Provider without executing write operations.
 */

import mongoose from 'mongoose';
import Reminder from '../models/Reminder.js';
import reminderWorker from '../workers/ReminderWorker.js';
import reminderScheduler from '../scheduler/ReminderScheduler.js';
import { verifyActiveProvider } from '../providers/emailProviderFactory.js';
import { verifyActiveSmsProvider } from '../providers/smsProviderFactory.js';
import reminderEventSubscriber from '../events/reminderEventSubscriber.js';
import { ReminderStatus } from '../constants/reminderConstants.js';

export class ReminderDiagnosticsService {
  /**
   * Performs read-only health checks across all subsystem layers.
   *
   * @returns {Promise<{
   *   healthy: boolean,
   *   database: { connected: boolean, state: string },
   *   queue: { queued: number, processing: number, failed: number, deadLetter: number },
   *   worker: { running: boolean, intervalMs: number },
   *   scheduler: { running: boolean },
   *   eventBus: { subscribed: boolean },
   *   emailProvider: { ready: boolean, provider: string, message: string },
   *   smsProvider: { ready: boolean, provider: string, message: string }
   * }>}
   */
  async getDiagnostics() {
    // 1. Database Connection Status
    const dbStateMap = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const dbState = mongoose.connection ? dbStateMap[mongoose.connection.readyState] || 'unknown' : 'disconnected';
    const isDbConnected = dbState === 'connected';

    // 2. Queue Depth Counts
    const statusCounts = await Reminder.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const queueCounts = {
      queued: 0,
      processing: 0,
      failed: 0,
      deadLetter: 0
    };

    statusCounts.forEach(item => {
      if (item._id === ReminderStatus.QUEUED) queueCounts.queued = item.count;
      if (item._id === ReminderStatus.PROCESSING) queueCounts.processing = item.count;
      if (item._id === ReminderStatus.FAILED) queueCounts.failed = item.count;
      if (item._id === ReminderStatus.DEAD_LETTER) queueCounts.deadLetter = item.count;
    });

    // 3. Provider Health Checks
    const emailHealth = await verifyActiveProvider();
    const smsHealth = await verifyActiveSmsProvider();

    // 4. Worker & Scheduler Status
    const workerStatus = {
      running: reminderWorker.isRunning || false,
      intervalMs: reminderWorker.intervalMs || 5000
    };

    const schedulerStatus = {
      running: reminderScheduler.isRunning || false
    };

    const eventBusStatus = {
      subscribed: reminderEventSubscriber.isSubscribed || false
    };

    const overallHealthy = isDbConnected && (queueCounts.deadLetter === 0);

    return {
      healthy: overallHealthy,
      database: {
        connected: isDbConnected,
        state: dbState
      },
      queue: queueCounts,
      worker: workerStatus,
      scheduler: schedulerStatus,
      eventBus: eventBusStatus,
      emailProvider: emailHealth,
      smsProvider: smsHealth
    };
  }
}

const reminderDiagnosticsServiceSingleton = new ReminderDiagnosticsService();
export default reminderDiagnosticsServiceSingleton;
