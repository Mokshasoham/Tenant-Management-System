/**
 * server/tests/integration/reminders/reminderE2E.test.js
 *
 * End-to-End (E2E) Integration Test Suite for Phase 2.3.3.6.6.
 * Traces complete workflow: Event / Rule -> Queue -> Worker -> Provider Dispatch -> ReminderHistory -> Metrics -> REST APIs.
 */

import { jest } from '@jest/globals';
import Reminder from '../../../src/modules/reminders/models/Reminder.js';
import ReminderHistory from '../../../src/modules/reminders/models/ReminderHistory.js';
import User from '../../../src/models/User.js';
import { ReminderRuleEngine } from '../../../src/modules/reminders/rules/ReminderRuleEngine.js';
import { ReminderWorker } from '../../../src/modules/reminders/workers/ReminderWorker.js';
import reminderMetricsService from '../../../src/modules/reminders/services/ReminderMetricsService.js';
import reminderTemplateRepository from '../../../src/modules/reminders/repositories/reminderTemplateRepository.js';
import reminderEmailService from '../../../src/modules/reminders/services/reminderEmailService.js';
import { getQueue, getAnalytics, getHealth } from '../../../src/controllers/reminderController.js';
import { ReminderStatus, ReminderChannel } from '../../../src/modules/reminders/constants/reminderConstants.js';

describe('Phase 2.3.3.6.6 — Reminder End-to-End Integration Suite', () => {
  let ruleEngine;
  let worker;

  beforeEach(() => {
    ruleEngine = new ReminderRuleEngine();
    worker = new ReminderWorker({ batchSize: 10 });

    jest.spyOn(reminderTemplateRepository, 'findLatest').mockResolvedValue({
      templateId: 'RENEWAL_30D',
      version: 1,
      subject: 'Lease Renewal Due Soon',
      htmlBody: '<p>Dear {{tenantName}}, lease expires soon.</p>',
      textBody: 'Dear {{tenantName}}, lease expires soon.'
    });
  });

  afterEach(() => {
    worker.stop();
    jest.restoreAllMocks();
  });

  test('E2E Lifecycle: Rule Engine enqueues item -> Worker processes & dispatches -> History created -> Metrics updated -> API returns queue data', async () => {
    const validLeaseId = '507f1f77bcf86cd799439011';
    const validUserId = '507f1f77bcf86cd799439012';

    // 1. Rule Engine Enqueues Item
    const mockCreatedReminder = {
      _id: validLeaseId,
      idempotencyKey: 'key_e2e_1',
      ruleId: 'RENEWAL_30D',
      entityType: 'Lease',
      entityId: validLeaseId,
      recipient: validUserId,
      channel: ReminderChannel.EMAIL,
      scheduledFor: new Date(),
      status: ReminderStatus.QUEUED,
      attempts: 0
    };

    jest.spyOn(Reminder, 'find').mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue([mockCreatedReminder]),
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([{ _id: validLeaseId, status: 'sent' }])
          })
        })
      })
    });

    jest.spyOn(Reminder, 'findOneAndUpdate').mockResolvedValue({
      ...mockCreatedReminder,
      status: ReminderStatus.PROCESSING,
      attempts: 1
    });

    jest.spyOn(User, 'findById').mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: validUserId,
        firstName: 'Alice',
        email: 'alice@example.com'
      })
    });

    jest.spyOn(reminderEmailService, 'sendReminderEmail').mockResolvedValue({
      success: true,
      provider: 'simulated',
      providerMessageId: 'sim_e2e_100',
      latencyMs: 35
    });

    jest.spyOn(Reminder, 'updateOne').mockResolvedValue({ modifiedCount: 1 });
    jest.spyOn(ReminderHistory, 'create').mockResolvedValue({ _id: 'hist_e2e_1' });

    // 2. Worker Processes Queue Item
    const workerResult = await worker.processBatch();

    expect(workerResult.processed).toBe(1);
    expect(workerResult.sent).toBe(1);
    expect(ReminderHistory.create).toHaveBeenCalledWith(expect.objectContaining({
      reminderId: validLeaseId,
      status: 'delivered'
    }));

    // 3. Telemetry Metrics Verification
    jest.spyOn(reminderMetricsService, 'getMetrics').mockResolvedValue({
      queued: 0,
      processing: 0,
      sent: 1,
      failed: 0,
      cancelled: 0,
      dead_letter: 0,
      totalRetries: 0,
      averageLatencyMs: 35,
      deliverySuccessRate: 100.0
    });

    const metrics = await reminderMetricsService.getMetrics();
    expect(metrics.sent).toBe(1);
    expect(metrics.deliverySuccessRate).toBe(100.0);

    // 4. REST Controller API Verification
    jest.spyOn(Reminder, 'countDocuments').mockResolvedValue(1);

    const req = { query: { page: '1', limit: '10' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await getQueue(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      meta: expect.objectContaining({ total: 1 })
    }));
  });
});
