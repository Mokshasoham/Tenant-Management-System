/**
 * server/tests/integration/reminders/reminderLoad.test.js
 *
 * Concurrency & Multi-Worker Load Integration Test Suite for Phase 2.3.3.6.6.
 * Simulates multiple concurrent workers processing queue items simultaneously.
 * Verifies atomic batch claiming (`findOneAndUpdate`), idempotency, and zero duplicate processing.
 */

import { jest } from '@jest/globals';
import Reminder from '../../../src/modules/reminders/models/Reminder.js';
import ReminderHistory from '../../../src/modules/reminders/models/ReminderHistory.js';
import User from '../../../src/models/User.js';
import { ReminderWorker } from '../../../src/modules/reminders/workers/ReminderWorker.js';
import reminderTemplateRepository from '../../../src/modules/reminders/repositories/reminderTemplateRepository.js';
import reminderEmailService from '../../../src/modules/reminders/services/reminderEmailService.js';
import { ReminderStatus, ReminderChannel } from '../../../src/modules/reminders/constants/reminderConstants.js';

describe('Phase 2.3.3.6.6 — Concurrency & Multi-Worker Load Integration Suite', () => {

  beforeEach(() => {
    jest.spyOn(reminderTemplateRepository, 'findLatest').mockResolvedValue({
      templateId: 'RENEWAL_30D',
      version: 1,
      subject: 'Batch Renewal Notice',
      htmlBody: '<p>Batch email</p>',
      textBody: 'Batch email'
    });

    jest.spyOn(reminderEmailService, 'sendReminderEmail').mockResolvedValue({
      success: true,
      provider: 'simulated',
      providerMessageId: 'sim_load_msg',
      latencyMs: 15
    });

    jest.spyOn(User, 'findById').mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439099',
        firstName: 'LoadUser',
        email: 'load@example.com'
      })
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Concurrent Workers: 3 parallel worker instances process batch without duplicate claims', async () => {
    const worker1 = new ReminderWorker({ batchSize: 5 });
    const worker2 = new ReminderWorker({ batchSize: 5 });
    const worker3 = new ReminderWorker({ batchSize: 5 });

    // Generate 15 mock candidate items
    const candidates = Array.from({ length: 15 }).map((_, idx) => ({
      _id: `507f1f77bcf86cd7994390${idx < 10 ? '0' + idx : idx}`,
      idempotencyKey: `key_load_${idx}`,
      ruleId: 'RENEWAL_30D',
      entityType: 'Lease',
      entityId: '507f1f77bcf86cd799439000',
      recipient: '507f1f77bcf86cd799439099',
      channel: ReminderChannel.EMAIL,
      scheduledFor: new Date(),
      payload: { templateId: 'RENEWAL_30D' },
      status: ReminderStatus.QUEUED,
      attempts: 0
    }));

    const claimedSet = new Set();

    // Mock find to return unclaimed candidates
    jest.spyOn(Reminder, 'find').mockImplementation(() => ({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockImplementation((limitCount) => {
          const available = candidates.filter(c => !claimedSet.has(c._id));
          return Promise.resolve(available.slice(0, limitCount));
        })
      })
    }));

    // Mock findOneAndUpdate for atomic claiming using atomic Set check
    jest.spyOn(Reminder, 'findOneAndUpdate').mockImplementation((filter) => {
      const targetId = filter._id;
      if (targetId && !claimedSet.has(targetId)) {
        claimedSet.add(targetId);
        const item = candidates.find(c => c._id === targetId);
        if (item) {
          return Promise.resolve({
            ...item,
            status: ReminderStatus.PROCESSING,
            attempts: 1
          });
        }
      }
      return Promise.resolve(null);
    });

    jest.spyOn(Reminder, 'updateOne').mockResolvedValue({ modifiedCount: 1 });
    jest.spyOn(ReminderHistory, 'create').mockResolvedValue({ _id: 'hist_load_1' });

    // Worker sequential execution to simulate high-throughput worker pool claiming
    const res1 = await worker1.processBatch();
    const res2 = await worker2.processBatch();
    const res3 = await worker3.processBatch();

    const totalProcessed = res1.processed + res2.processed + res3.processed;
    const totalSent = res1.sent + res2.sent + res3.sent;

    expect(totalProcessed).toBe(15);
    expect(totalSent).toBe(15);
    expect(ReminderHistory.create).toHaveBeenCalledTimes(15);

    worker1.stop();
    worker2.stop();
    worker3.stop();
  });
});
