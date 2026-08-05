/**
 * server/tests/unit/reminders/reminderScheduler.test.js
 *
 * Unit Test Suite for Phase 2.3.3.6.4 - Reminder Rule Engine, Scheduler, Event Subscriber, and Metrics Service.
 */

import { jest } from '@jest/globals';
import { ReminderRuleEngine } from '../../../src/modules/reminders/rules/ReminderRuleEngine.js';
import { ReminderScheduler } from '../../../src/modules/reminders/scheduler/ReminderScheduler.js';
import { ReminderEventSubscriber } from '../../../src/modules/reminders/events/reminderEventSubscriber.js';
import { ReminderMetricsService } from '../../../src/modules/reminders/services/ReminderMetricsService.js';
import reminderQueue from '../../../src/modules/reminders/queue/reminderQueue.js';
import reminderPreferenceRepository from '../../../src/modules/reminders/repositories/reminderPreferenceRepository.js';
import eventBus from '../../../src/platform/events/eventBus.js';

describe('Phase 2.3.3.6.4 — Rule Engine, Scheduler & Event Subscriber Unit Tests', () => {

  // ─────────────────────────────────────────────────────────────
  // 1. REMINDER RULE ENGINE
  // ─────────────────────────────────────────────────────────────
  describe('ReminderRuleEngine', () => {
    let ruleEngine;

    beforeEach(() => {
      ruleEngine = new ReminderRuleEngine();
    });

    test('evaluateAndEnqueue returns RULE_DISABLED if rule is disabled', async () => {
      const res = await ruleEngine.evaluateAndEnqueue({
        rule: { isEnabled: false },
        entityType: 'Lease',
        entityId: '507f1f77bcf86cd799439011',
        recipientId: '507f1f77bcf86cd799439012',
        targetDate: new Date()
      });
      expect(res[0].success).toBe(false);
      expect(res[0].reason).toBe('RULE_DISABLED');
    });

    test('evaluateAndEnqueue enforces user channel opt-out preference', async () => {
      jest.spyOn(reminderPreferenceRepository, 'getByUser').mockResolvedValue({
        emailEnabled: false,
        smsEnabled: true,
        categoryPreferences: new Map([['renewal', true]])
      });

      const rule = {
        ruleId: 'RENEWAL_30D',
        isEnabled: true,
        category: 'renewal',
        channels: ['email', 'sms'],
        offsetDays: -30
      };

      jest.spyOn(reminderQueue, 'enqueueReminder').mockResolvedValue({
        success: true,
        reminder: { _id: 'rem_1' }
      });

      const res = await ruleEngine.evaluateAndEnqueue({
        rule,
        entityType: 'Lease',
        entityId: '507f1f77bcf86cd799439011',
        recipientId: '507f1f77bcf86cd799439012',
        targetDate: new Date('2026-10-01')
      });

      expect(res).toHaveLength(2);
      expect(res[0].reason).toBe('USER_OPTED_OUT_EMAIL');
      expect(res[1].success).toBe(true); // SMS enqueued

      reminderPreferenceRepository.getByUser.mockRestore();
      reminderQueue.enqueueReminder.mockRestore();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. REMINDER SCHEDULER (REUSING PLATFORM SCHEDULER)
  // ─────────────────────────────────────────────────────────────
  describe('ReminderScheduler Infrastructure Integration', () => {
    test('ReminderScheduler inherits platform Scheduler base class', () => {
      const scheduler = new ReminderScheduler({ tickMs: 1000 });
      expect(scheduler.name).toBe('reminder-scheduler');
      expect(typeof scheduler.start).toBe('function');
      expect(typeof scheduler.stop).toBe('function');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. EVENTBUS SUBSCRIBER & ENTITY COMPLETION CANCELLATION
  // ─────────────────────────────────────────────────────────────
  describe('ReminderEventSubscriber', () => {
    test('subscribes to EventBus and triggers entity cancellation on completion events', async () => {
      const subscriber = new ReminderEventSubscriber();
      jest.spyOn(reminderQueue, 'cancelRemindersForEntity').mockResolvedValue({ modifiedCount: 2 });

      subscriber.subscribe();

      // Use valid 24-char hex ObjectIds to avoid Mongoose CastErrors
      const validPaymentId = '507f1f77bcf86cd799439011';
      const validLeaseId = '507f1f77bcf86cd799439022';

      await eventBus.publish('payment.received', { paymentId: validPaymentId, leaseId: validLeaseId });

      expect(reminderQueue.cancelRemindersForEntity).toHaveBeenCalledWith('Payment', validPaymentId, expect.any(String));

      reminderQueue.cancelRemindersForEntity.mockRestore();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. REMINDER METRICS SERVICE
  // ─────────────────────────────────────────────────────────────
  describe('ReminderMetricsService Telemetry', () => {
    test('getMetrics calculates queue counts and delivery success rate', async () => {
      const metricsService = new ReminderMetricsService();

      jest.spyOn(metricsService, 'getMetrics').mockResolvedValue({
        queued: 10,
        processing: 2,
        sent: 45,
        failed: 3,
        cancelled: 5,
        dead_letter: 1,
        totalRetries: 4,
        averageLatencyMs: 150,
        deliverySuccessRate: 93.75
      });

      const metrics = await metricsService.getMetrics();
      expect(metrics.queued).toBe(10);
      expect(metrics.sent).toBe(45);
      expect(metrics.deliverySuccessRate).toBe(93.75);
    });
  });

});
