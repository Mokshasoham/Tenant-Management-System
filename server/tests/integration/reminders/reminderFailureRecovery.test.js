/**
 * server/tests/integration/reminders/reminderFailureRecovery.test.js
 *
 * Integration Test Suite for Failure Recovery, Retries, Dead-Letter transitions, and Worker Lock Recovery.
 */

import { jest } from '@jest/globals';
import Reminder from '../../../src/modules/reminders/models/Reminder.js';
import ReminderHistory from '../../../src/modules/reminders/models/ReminderHistory.js';
import User from '../../../src/models/User.js';
import { ReminderWorker, calculateNextRetryDate } from '../../../src/modules/reminders/workers/ReminderWorker.js';
import reminderTemplateRepository from '../../../src/modules/reminders/repositories/reminderTemplateRepository.js';
import reminderEmailService from '../../../src/modules/reminders/services/reminderEmailService.js';
import eventBus from '../../../src/platform/events/eventBus.js';
import { ReminderStatus, ReminderChannel } from '../../../src/modules/reminders/constants/reminderConstants.js';

describe('Phase 2.3.3.6.6 — Failure Recovery & Retry Integration Suite', () => {
  let worker;

  beforeEach(() => {
    worker = new ReminderWorker({ batchSize: 5 });

    jest.spyOn(reminderTemplateRepository, 'findLatest').mockResolvedValue({
      templateId: 'RENEWAL_30D',
      version: 1,
      subject: 'Renewal Notice',
      htmlBody: '<p>Body</p>',
      textBody: 'Body'
    });
  });

  afterEach(() => {
    worker.stop();
    jest.restoreAllMocks();
  });

  test('Exponential Backoff: calculates ~5m for attempt 1, ~15m for attempt 2, ~60m for attempt 3', () => {
    const now = Date.now();
    const r1 = calculateNextRetryDate(1);
    const r2 = calculateNextRetryDate(2);
    const r3 = calculateNextRetryDate(3);

    expect(r1.getTime() - now).toBeGreaterThanOrEqual(4.9 * 60 * 1000);
    expect(r2.getTime() - now).toBeGreaterThanOrEqual(14.9 * 60 * 1000);
    expect(r3.getTime() - now).toBeGreaterThanOrEqual(59.9 * 60 * 1000);
  });

  test('Transient failure schedules retry and sets status back to FAILED', async () => {
    const validObjectId = '507f1f77bcf86cd799439011';
    const validUserId = '507f1f77bcf86cd799439012';

    const mockCandidate = {
      _id: validObjectId,
      idempotencyKey: 'key_fail_1',
      ruleId: 'RENEWAL_30D',
      entityType: 'Lease',
      entityId: validObjectId,
      recipient: validUserId,
      channel: ReminderChannel.EMAIL,
      scheduledFor: new Date(),
      status: ReminderStatus.QUEUED,
      attempts: 0
    };

    jest.spyOn(Reminder, 'find').mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue([mockCandidate])
      })
    });

    jest.spyOn(Reminder, 'findOneAndUpdate').mockResolvedValue({
      ...mockCandidate,
      status: ReminderStatus.PROCESSING,
      attempts: 1
    });

    jest.spyOn(User, 'findById').mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: validUserId,
        firstName: 'Bob',
        email: 'bob@example.com'
      })
    });

    // Simulates transient SMTP connection failure
    jest.spyOn(reminderEmailService, 'sendReminderEmail').mockResolvedValue({
      success: false,
      error: 'SMTP Connection Timeout'
    });

    jest.spyOn(Reminder, 'updateOne').mockResolvedValue({ modifiedCount: 1 });
    jest.spyOn(ReminderHistory, 'create').mockResolvedValue({ _id: 'hist_fail_transient' });

    const res = await worker.processBatch();

    expect(res.processed).toBe(1);
    expect(res.failed).toBe(1);
    expect(Reminder.updateOne).toHaveBeenCalledWith(
      { _id: validObjectId },
      {
        $set: {
          status: ReminderStatus.FAILED,
          nextRetryAt: expect.any(Date)
        }
      }
    );
  });

  test('Permanent failure or max retries exceeded transitions item to DEAD_LETTER', async () => {
    const validObjectId = '507f1f77bcf86cd799439011';
    const validUserId = '507f1f77bcf86cd799439012';

    const mockCandidate = {
      _id: validObjectId,
      idempotencyKey: 'key_dead_1',
      ruleId: 'RENEWAL_30D',
      entityType: 'Lease',
      entityId: validObjectId,
      recipient: validUserId,
      channel: ReminderChannel.EMAIL,
      scheduledFor: new Date(),
      status: ReminderStatus.QUEUED,
      attempts: 2
    };

    jest.spyOn(Reminder, 'find').mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue([mockCandidate])
      })
    });

    // Attempt 3 reached -> MAX_RETRIES_EXCEEDED
    jest.spyOn(Reminder, 'findOneAndUpdate').mockResolvedValue({
      ...mockCandidate,
      status: ReminderStatus.PROCESSING,
      attempts: 3
    });

    jest.spyOn(User, 'findById').mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: validUserId,
        firstName: 'Bob',
        email: 'bob@example.com'
      })
    });

    jest.spyOn(reminderEmailService, 'sendReminderEmail').mockResolvedValue({
      success: false,
      error: 'Persistent SMTP Server 550 Error'
    });

    jest.spyOn(Reminder, 'updateOne').mockResolvedValue({ modifiedCount: 1 });
    jest.spyOn(ReminderHistory, 'create').mockResolvedValue({ _id: 'hist_dead_1' });
    jest.spyOn(eventBus, 'publish').mockImplementation(() => {});

    const res = await worker.processBatch();

    expect(res.deadLetter).toBe(1);
    expect(Reminder.updateOne).toHaveBeenCalledWith(
      { _id: validObjectId },
      {
        $set: {
          status: ReminderStatus.DEAD_LETTER,
          cancelReason: expect.any(String)
        }
      }
    );
    expect(eventBus.publish).toHaveBeenCalledWith('reminder.dead_letter', expect.any(Object));
  });
});
