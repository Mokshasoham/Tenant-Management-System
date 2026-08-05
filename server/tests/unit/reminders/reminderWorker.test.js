/**
 * server/tests/unit/reminders/reminderWorker.test.js
 *
 * Unit Test Suite for Phase 2.3.3.6.4 - Reminder Worker, Atomic Batch Claiming, Retries & Dead Letter Queue.
 */

import { jest } from '@jest/globals';
import { ReminderWorker, calculateNextRetryDate } from '../../../src/modules/reminders/workers/ReminderWorker.js';
import Reminder from '../../../src/modules/reminders/models/Reminder.js';
import ReminderHistory from '../../../src/modules/reminders/models/ReminderHistory.js';
import User from '../../../src/models/User.js';
import reminderTemplateRepository from '../../../src/modules/reminders/repositories/reminderTemplateRepository.js';
import reminderEmailService from '../../../src/modules/reminders/services/reminderEmailService.js';
import reminderSmsService from '../../../src/modules/reminders/services/reminderSmsService.js';
import eventBus from '../../../src/platform/events/eventBus.js';
import { ReminderStatus, ReminderChannel } from '../../../src/modules/reminders/constants/reminderConstants.js';

describe('Phase 2.3.3.6.4 — ReminderWorker & Exponential Backoff Unit Tests', () => {

  // ─────────────────────────────────────────────────────────────
  // 1. EXPONENTIAL BACKOFF CALCULATOR
  // ─────────────────────────────────────────────────────────────
  describe('Exponential Backoff Calculator', () => {
    test('calculateNextRetryDate increases delay for attempts 1, 2, and 3+', () => {
      const now = Date.now();
      const retry1 = calculateNextRetryDate(1);
      const retry2 = calculateNextRetryDate(2);
      const retry3 = calculateNextRetryDate(3);

      expect(retry1.getTime() - now).toBeGreaterThanOrEqual(4.9 * 60 * 1000); // ~5 min
      expect(retry2.getTime() - now).toBeGreaterThanOrEqual(14.9 * 60 * 1000); // ~15 min
      expect(retry3.getTime() - now).toBeGreaterThanOrEqual(59.9 * 60 * 1000); // ~60 min
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. REMINDER WORKER LIFECYCLE & DISPATCH
  // ─────────────────────────────────────────────────────────────
  describe('ReminderWorker Outbox Processing', () => {
    let worker;

    beforeEach(() => {
      worker = new ReminderWorker({ batchSize: 5 });
      // Mock reminderTemplateRepository to avoid Mongoose query buffering timeouts
      jest.spyOn(reminderTemplateRepository, 'findLatest').mockResolvedValue({
        templateId: 'RENEWAL_30D',
        version: 1,
        subject: 'Renewal Notice',
        htmlBody: '<p>Hello {{tenantName}}</p>',
        textBody: 'Hello {{tenantName}}'
      });
    });

    afterEach(() => {
      worker.stop();
      jest.restoreAllMocks();
    });

    test('processBatch returns zero counters when no candidates found', async () => {
      jest.spyOn(Reminder, 'find').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([])
        })
      });

      const res = await worker.processBatch();
      expect(res.processed).toBe(0);
      expect(res.sent).toBe(0);
      expect(res.failed).toBe(0);
    });

    test('processBatch dispatches email, sets status SENT, and creates ReminderHistory', async () => {
      const validObjectId = '507f1f77bcf86cd799439011';
      const validUserId = '507f1f77bcf86cd799439012';

      const mockCandidate = {
        _id: validObjectId,
        idempotencyKey: 'key_email_1',
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
          firstName: 'John',
          email: 'john@example.com'
        })
      });

      jest.spyOn(reminderEmailService, 'sendReminderEmail').mockResolvedValue({
        success: true,
        provider: 'simulated',
        providerMessageId: 'sim_123',
        latencyMs: 50
      });

      jest.spyOn(Reminder, 'updateOne').mockResolvedValue({ modifiedCount: 1 });
      jest.spyOn(ReminderHistory, 'create').mockResolvedValue({ _id: 'hist_1' });
      jest.spyOn(eventBus, 'publish').mockImplementation(() => {});

      const res = await worker.processBatch();

      expect(res.processed).toBe(1);
      expect(res.sent).toBe(1);
      expect(Reminder.updateOne).toHaveBeenCalledWith(
        { _id: validObjectId },
        { $set: { status: ReminderStatus.SENT, sentAt: expect.any(Date) } }
      );
      expect(ReminderHistory.create).toHaveBeenCalledWith(expect.objectContaining({
        reminderId: validObjectId,
        status: 'delivered'
      }));
      expect(eventBus.publish).toHaveBeenCalledWith('reminder.sent', expect.any(Object));
    });

    test('processBatch moves item to DEAD_LETTER on permanent error or max retries', async () => {
      const validObjectId = '507f1f77bcf86cd799439011';
      const validUserId = '507f1f77bcf86cd799439012';

      const mockCandidate = {
        _id: validObjectId,
        idempotencyKey: 'key_perm_1',
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
        attempts: 3 // Max attempts reached
      });

      jest.spyOn(User, 'findById').mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: validUserId,
          firstName: 'John'
          // Missing email address -> PERMANENT_ERROR
        })
      });

      jest.spyOn(Reminder, 'updateOne').mockResolvedValue({ modifiedCount: 1 });
      jest.spyOn(ReminderHistory, 'create').mockResolvedValue({ _id: 'hist_fail_1' });
      jest.spyOn(eventBus, 'publish').mockImplementation(() => {});

      const res = await worker.processBatch();

      expect(res.deadLetter).toBe(1);
      expect(Reminder.updateOne).toHaveBeenCalledWith(
        { _id: validObjectId },
        { $set: { status: ReminderStatus.DEAD_LETTER, cancelReason: expect.any(String) } }
      );
      expect(eventBus.publish).toHaveBeenCalledWith('reminder.dead_letter', expect.any(Object));
    });
  });

});
