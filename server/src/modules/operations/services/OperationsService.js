/**
 * server/src/modules/operations/services/OperationsService.js
 *
 * Operations Command Center Service.
 * Provides administrative control and telemetry across SchedulerRegistry,
 * ReminderWorker, outboxWorker, ReminderQueue, and Dead-Letter Queue.
 */

import schedulerRegistry from '../../../platform/scheduler/SchedulerRegistry.js';
import outboxWorker from '../../../platform/events/outboxWorker.js';
import reminderWorker from '../../reminders/workers/ReminderWorker.js';
import reminderRepository from '../../reminders/repositories/reminderRepository.js';
import reminderMetricsService from '../../reminders/services/ReminderMetricsService.js';
import Reminder from '../../reminders/models/Reminder.js';
import reminderDiagnosticsService from '../../reminders/services/ReminderDiagnosticsService.js';
import logger from '../../../platform/logging/logger.js';

export class OperationsService {
  /**
   * Aggregates full system operational status across Schedulers, Workers, Queue Depths, and Providers.
   */
  async getSystemOperationsStatus() {
    const [queueStats, diagnostics, schedulers] = await Promise.all([
      reminderMetricsService.getMetrics(),
      reminderDiagnosticsService.getDiagnostics(),
      schedulerRegistry.health()
    ]);
    const reminderWorkerStatus = {
      isRunning: reminderWorker.isRunning,
      batchSize: reminderWorker.batchSize,
      intervalMs: reminderWorker.intervalMs
    };
    const outboxWorkerStatus = { active: true };

    return {
      success: true,
      timestamp: new Date().toISOString(),
      workers: {
        reminderWorker: reminderWorkerStatus,
        outboxWorker: outboxWorkerStatus
      },
      schedulers,
      queueStats,
      providers: diagnostics.providers,
      database: diagnostics.database
    };
  }

  /**
   * Retrieves items currently in the Dead-Letter Queue with pagination.
   */
  async getDeadLetterItems(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Reminder.find({ status: 'dead_letter' })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Reminder.countDocuments({ status: 'dead_letter' })
    ]);

    return {
      success: true,
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  /**
   * Bulk retries dead-letter reminders by resetting status to 'queued',
   * clearing error details, and resetting attempt counters.
   */
  async bulkRetryDeadLetter(reminderIds = []) {
    const query = { status: 'dead_letter' };
    if (reminderIds.length > 0) {
      query._id = { $in: reminderIds };
    }

    const result = await Reminder.updateMany(query, {
      $set: {
        status: 'queued',
        attempts: 0,
        lastError: null,
        scheduledFor: new Date()
      }
    });

    logger.info(`[OperationsService] Bulk retried ${result.modifiedCount} dead-letter items.`);

    return {
      success: true,
      retriedCount: result.modifiedCount
    };
  }

  /**
   * Bulk purges (permanently deletes) dead-letter reminders.
   */
  async bulkPurgeDeadLetter(reminderIds = []) {
    const query = { status: 'dead_letter' };
    if (reminderIds.length > 0) {
      query._id = { $in: reminderIds };
    }

    const result = await Reminder.deleteMany(query);

    logger.info(`[OperationsService] Bulk purged ${result.deletedCount} dead-letter items.`);

    return {
      success: true,
      purgedCount: result.deletedCount
    };
  }

  /**
   * Manually cancels a queued or processing job.
   */
  async cancelQueuedJob(reminderId, reason = 'Administrative cancellation') {
    const reminder = await reminderRepository.updateStatus(reminderId, 'cancelled', { cancelReason: reason });
    if (!reminder) {
      throw new Error(`JOB_NOT_FOUND: Reminder job '${reminderId}' not found or cannot be cancelled.`);
    }

    logger.info(`[OperationsService] Cancelled job ${reminderId}. Reason: ${reason}`);

    return {
      success: true,
      message: 'Job cancelled successfully.',
      reminder
    };
  }

  /**
   * Triggers an immediate execution scan for a registered scheduler.
   */
  async triggerSchedulerScan(schedulerName) {
    const scheduler = schedulerRegistry.get(schedulerName);
    if (!scheduler) {
      throw new Error(`SCHEDULER_NOT_FOUND: Scheduler '${schedulerName}' is not registered.`);
    }

    logger.info(`[OperationsService] Manually triggering scan for scheduler '${schedulerName}'`);
    await scheduler.run();

    return {
      success: true,
      message: `Scheduler '${schedulerName}' executed successfully.`
    };
  }

  /**
   * Tunes worker configuration dynamically at runtime.
   */
  tuneWorkerConfig(workerName, config = {}) {
    if (workerName === 'reminderWorker') {
      if (config.batchSize) reminderWorker.batchSize = parseInt(config.batchSize, 10);
      if (config.pollIntervalMs) reminderWorker.intervalMs = parseInt(config.pollIntervalMs, 10);
      return {
        success: true,
        worker: 'reminderWorker',
        status: {
          isRunning: reminderWorker.isRunning,
          batchSize: reminderWorker.batchSize,
          intervalMs: reminderWorker.intervalMs
        }
      };
    }

    throw new Error(`UNKNOWN_WORKER: Worker '${workerName}' is not manageable.`);
  }
}

const operationsServiceSingleton = new OperationsService();
export default operationsServiceSingleton;
