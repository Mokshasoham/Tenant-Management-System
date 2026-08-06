/**
 * server/tests/unit/operations/operationsService.test.js
 *
 * Unit Test Suite for Phase 2.3.4.2 — Operations Command Center & Dead-Letter Management.
 */

import { jest } from '@jest/globals';
import operationsService from '../../../src/modules/operations/services/OperationsService.js';
import reminderRepository from '../../../src/modules/reminders/repositories/reminderRepository.js';
import reminderMetricsService from '../../../src/modules/reminders/services/ReminderMetricsService.js';
import reminderWorker from '../../../src/modules/reminders/workers/ReminderWorker.js';
import schedulerRegistry from '../../../src/platform/scheduler/SchedulerRegistry.js';
import Reminder from '../../../src/modules/reminders/models/Reminder.js';
import OperationHistory from '../../../src/modules/operations/models/OperationHistory.js';
import reminderDiagnosticsService from '../../../src/modules/reminders/services/ReminderDiagnosticsService.js';

describe('Phase 2.3.4.2 — Operations Command Center Unit Tests', () => {

  // ─────────────────────────────────────────────────────────────
  // 1. SYSTEM OPERATIONS TELEMETRY & VERSION
  // ─────────────────────────────────────────────────────────────
  describe('System Operations Status & Version', () => {
    test('getVersionInfo returns system build metadata', async () => {
      const version = await operationsService.getVersionInfo();
      expect(version.success).toBe(true);
      expect(version.backendVersion).toBe('1.0.0');
      expect(version.nodeVersion).toBeDefined();
      expect(version.mongoVersion).toBeDefined();
    });

    test('getSystemOperationsStatus aggregates workers, schedulers, queues, and providers', async () => {
      jest.spyOn(reminderMetricsService, 'getMetrics').mockResolvedValue({
        queued: 5,
        processing: 1,
        sent: 100,
        failed: 2,
        dead_letter: 1
      });
      jest.spyOn(reminderDiagnosticsService, 'getDiagnostics').mockResolvedValue({
        providers: { email: { ready: true }, sms: { ready: true } },
        database: { connected: true }
      });
      jest.spyOn(schedulerRegistry, 'health').mockResolvedValue({ status: 'UP', count: 1, schedulers: [] });

      const status = await operationsService.getSystemOperationsStatus();

      expect(status.success).toBe(true);
      expect(status.workers.reminderWorker).toBeDefined();
      expect(status.queueStats.queued).toBe(5);
      expect(status.providers.email.ready).toBe(true);

      reminderMetricsService.getMetrics.mockRestore();
      reminderDiagnosticsService.getDiagnostics.mockRestore();
      schedulerRegistry.health.mockRestore();
    });

    test('getOperationHistory returns paginated operational audit records', async () => {
      jest.spyOn(OperationHistory, 'find').mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ action: 'bulk_retry_dead_letter', target: 'DeadLetterQueue' }])
      });
      jest.spyOn(OperationHistory, 'countDocuments').mockResolvedValue(1);

      const res = await operationsService.getOperationHistory(1, 20);
      expect(res.success).toBe(true);
      expect(res.items).toHaveLength(1);

      OperationHistory.find.mockRestore();
      OperationHistory.countDocuments.mockRestore();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. DEAD-LETTER MANAGEMENT
  // ─────────────────────────────────────────────────────────────
  describe('Dead-Letter Management', () => {
    test('getDeadLetterItems returns paginated list of dead-letter reminders', async () => {
      jest.spyOn(Reminder, 'find').mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ _id: 'rem_1', status: 'dead_letter' }])
      });
      jest.spyOn(Reminder, 'countDocuments').mockResolvedValue(1);

      const res = await operationsService.getDeadLetterItems(1, 20);

      expect(res.success).toBe(true);
      expect(res.items).toHaveLength(1);
      expect(res.pagination.total).toBe(1);

      Reminder.find.mockRestore();
      Reminder.countDocuments.mockRestore();
    });

    test('bulkRetryDeadLetter resets items to queued state', async () => {
      jest.spyOn(Reminder, 'updateMany').mockResolvedValue({ modifiedCount: 3 });

      const res = await operationsService.bulkRetryDeadLetter(['rem_1', 'rem_2', 'rem_3']);

      expect(res.success).toBe(true);
      expect(res.retriedCount).toBe(3);

      Reminder.updateMany.mockRestore();
    });

    test('bulkPurgeDeadLetter deletes dead-letter items', async () => {
      jest.spyOn(Reminder, 'deleteMany').mockResolvedValue({ deletedCount: 2 });

      const res = await operationsService.bulkPurgeDeadLetter(['rem_1', 'rem_2']);

      expect(res.success).toBe(true);
      expect(res.purgedCount).toBe(2);

      Reminder.deleteMany.mockRestore();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. JOB CANCELLATION & SCHEDULER TRIGGERS
  // ─────────────────────────────────────────────────────────────
  describe('Job Control & Scheduler Triggers', () => {
    test('cancelQueuedJob cancels existing job and throws on invalid job', async () => {
      jest.spyOn(reminderRepository, 'updateStatus').mockResolvedValueOnce({ _id: 'job_1', status: 'cancelled' })
        .mockResolvedValueOnce(null);

      const res = await operationsService.cancelQueuedJob('job_1', 'Manual cancel');
      expect(res.success).toBe(true);
      expect(res.reminder.status).toBe('cancelled');

      await expect(operationsService.cancelQueuedJob('invalid_job')).rejects.toThrow('JOB_NOT_FOUND');

      reminderRepository.updateStatus.mockRestore();
    });

    test('triggerSchedulerScan runs scheduler or throws when not found', async () => {
      const mockRun = jest.fn().mockResolvedValue(true);
      jest.spyOn(schedulerRegistry, 'get').mockImplementation((name) => {
        if (name === 'ReminderScheduler') return { run: mockRun };
        return null;
      });

      const res = await operationsService.triggerSchedulerScan('ReminderScheduler');
      expect(res.success).toBe(true);
      expect(mockRun).toHaveBeenCalled();

      await expect(operationsService.triggerSchedulerScan('UnknownScheduler')).rejects.toThrow('SCHEDULER_NOT_FOUND');

      schedulerRegistry.get.mockRestore();
    });

    test('tuneWorkerConfig updates runtime configuration', () => {
      const res = operationsService.tuneWorkerConfig('reminderWorker', { batchSize: 50, pollIntervalMs: 2000 });
      expect(res.success).toBe(true);
      expect(reminderWorker.batchSize).toBe(50);
      expect(reminderWorker.intervalMs).toBe(2000);

      expect(() => operationsService.tuneWorkerConfig('unknownWorker')).toThrow('UNKNOWN_WORKER');
    });
  });

});
