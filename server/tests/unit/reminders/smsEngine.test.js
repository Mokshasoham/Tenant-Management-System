/**
 * server/tests/unit/reminders/smsEngine.test.js
 *
 * Comprehensive Unit Test Suite for Phase 2.3.3.6.3 - SMS Engine & Abstraction Layer.
 * Validates ISmsProvider, Segment Calculation, GSM-7 vs Unicode, Quiet Hours Deferral, and Drivers.
 */

import { jest } from '@jest/globals';
import { ISmsProvider, createSmsDeliveryResult } from '../../../src/modules/reminders/providers/ISmsProvider.js';
import SimulatedSmsProvider from '../../../src/modules/reminders/providers/SimulatedSmsProvider.js';
import TwilioProvider from '../../../src/modules/reminders/providers/TwilioProvider.js';
import AwsSnsProvider from '../../../src/modules/reminders/providers/AwsSnsProvider.js';
import Msg91Provider from '../../../src/modules/reminders/providers/Msg91Provider.js';
import { getSmsProvider, verifyActiveSmsProvider } from '../../../src/modules/reminders/providers/smsProviderFactory.js';
import { isUnicodeMessage, calculateSmsSegments, checkSmsRateLimit } from '../../../src/modules/reminders/utils/smsUtils.js';
import reminderSmsService from '../../../src/modules/reminders/services/reminderSmsService.js';

describe('Phase 2.3.3.6.3 — SMS Engine & Abstraction Layer Unit Tests', () => {

  // ─────────────────────────────────────────────────────────────
  // 1. DELIVERY RESULT DTO & ABSTRACT INTERFACE
  // ─────────────────────────────────────────────────────────────
  describe('ISmsProvider & Delivery Result DTO', () => {
    test('createSmsDeliveryResult builds standardized success payload', () => {
      const res = createSmsDeliveryResult({
        success: true,
        provider: 'twilio',
        providerMessageId: 'SM12345678',
        latencyMs: 140,
        segments: 2,
        isUnicode: true
      });

      expect(res.success).toBe(true);
      expect(res.provider).toBe('twilio');
      expect(res.providerMessageId).toBe('SM12345678');
      expect(res.segments).toBe(2);
      expect(res.isUnicode).toBe(true);
      expect(res.error).toBeNull();
    });

    test('Abstract ISmsProvider throws if methods called directly', async () => {
      const base = new ISmsProvider('abstract_test');
      await expect(base.send({})).rejects.toThrow();
      await expect(base.verify()).rejects.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. SMS UTILS (GSM-7, UNICODE, SEGMENT CALCULATION)
  // ─────────────────────────────────────────────────────────────
  describe('SMS Segment & Encoding Calculator', () => {
    test('isUnicodeMessage detects standard GSM-7 vs Unicode non-GSM-7 characters', () => {
      expect(isUnicodeMessage('Hello, your rent is due on 1st Sept.')).toBe(false);
      expect(isUnicodeMessage('Hello, your rent is due 🏢')).toBe(true);
      expect(isUnicodeMessage('हिंदी संदेश')).toBe(true);
    });

    test('calculateSmsSegments calculates single and multi-segment counts accurately', () => {
      // 1 GSM-7 segment (< 160 chars)
      const shortGsm = calculateSmsSegments('Rent due tomorrow.');
      expect(shortGsm.segments).toBe(1);
      expect(shortGsm.isUnicode).toBe(false);

      // Multi GSM-7 segment (> 160 chars)
      const longGsmText = 'A'.repeat(200);
      const longGsm = calculateSmsSegments(longGsmText);
      expect(longGsm.segments).toBe(2); // 200 / 153 = 2 segments

      // 1 Unicode segment (< 70 chars)
      const shortUnicode = calculateSmsSegments('Rent due 🏢');
      expect(shortUnicode.segments).toBe(1);
      expect(shortUnicode.isUnicode).toBe(true);

      // Multi Unicode segment (> 70 chars)
      const longUnicodeText = '🏢'.repeat(40); // 80 chars
      const longUnicode = calculateSmsSegments(longUnicodeText);
      expect(longUnicode.segments).toBe(2); // 80 / 67 = 2 segments
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. SIMULATED SMS PROVIDER
  // ─────────────────────────────────────────────────────────────
  describe('SimulatedSmsProvider Driver', () => {
    test('send() returns successful delivery result in dev/test mode', async () => {
      const driver = new SimulatedSmsProvider({ delayMs: 5 });
      const result = await driver.send({
        to: '+1234567890',
        message: 'Your payment of $1200 has cleared.',
        metadata: { reminderId: 'rem_sms_1', correlationId: 'corr_sms_1' }
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('simulated');
      expect(result.providerMessageId).toMatch(/^sim-sms-/);
      expect(result.segments).toBe(1);
      expect(result.isUnicode).toBe(false);
    });

    test('verify() returns ready status', async () => {
      const driver = new SimulatedSmsProvider();
      const health = await driver.verify();
      expect(health.ready).toBe(true);
      expect(health.provider).toBe('simulated');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. PRODUCTION SMS DRIVERS MISSING CONFIG SAFEGUARDS
  // ─────────────────────────────────────────────────────────────
  describe('Production Drivers (Twilio, AWS SNS, MSG91) Missing Config Safeguards', () => {
    test('TwilioProvider fails gracefully when credentials are missing', async () => {
      const driver = new TwilioProvider({ accountSid: '', authToken: '', fromNumber: '' });
      const health = await driver.verify();
      expect(health.ready).toBe(false);

      const res = await driver.send({ to: '+1234567890', message: 'Test' });
      expect(res.success).toBe(false);
      expect(res.error.code).toBe('MISSING_CONFIG');
    });

    test('AwsSnsProvider fails gracefully when credentials are missing', async () => {
      const driver = new AwsSnsProvider({ region: '', accessKeyId: '', secretAccessKey: '' });
      const health = await driver.verify();
      expect(health.ready).toBe(false);

      const res = await driver.send({ to: '+1234567890', message: 'Test' });
      expect(res.success).toBe(false);
      expect(res.error.code).toBe('MISSING_CONFIG');
    });

    test('Msg91Provider fails gracefully when authKey is missing', async () => {
      const driver = new Msg91Provider({ authKey: '' });
      const health = await driver.verify();
      expect(health.ready).toBe(false);

      const res = await driver.send({ to: '+1234567890', message: 'Test' });
      expect(res.success).toBe(false);
      expect(res.error.code).toBe('MISSING_CONFIG');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. PROVIDER FACTORY
  // ─────────────────────────────────────────────────────────────
  describe('SMS Provider Factory', () => {
    test('getSmsProvider returns SimulatedSmsProvider when requested or missing config', () => {
      const driver = getSmsProvider('simulated');
      expect(driver.name).toBe('simulated');
    });

    test('verifyActiveSmsProvider returns health check result', async () => {
      const health = await verifyActiveSmsProvider('simulated');
      expect(health.ready).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. HIGH-LEVEL REMINDER SMS SERVICE & QUIET HOURS DEFERRAL
  // ─────────────────────────────────────────────────────────────
  describe('ReminderSmsService & Quiet Hours Deferral', () => {
    test('sendReminderSms defers delivery if date falls inside quiet hours', async () => {
      const quietHours = { enabled: true, startHour: 22, endHour: 7 };

      // Spy on system Date or pass night timestamp logic
      const nightResult = await reminderSmsService.sendReminderSms({
        recipientPhone: '+19876543210',
        textMessage: 'Quiet hour test message',
        quietHours: { enabled: true, startHour: 0, endHour: 23.99 }, // Forces quiet hours active
        overrideQuietHours: false,
        providerName: 'simulated'
      });

      expect(nightResult.success).toBe(false);
      expect(nightResult.deferred).toBe(true);
      expect(nightResult.error.code).toBe('QUIET_HOURS_DEFERRED');
      expect(nightResult.deferredUntil).toBeDefined();
    });

    test('sendReminderSms dispatches immediately if overrideQuietHours is true', async () => {
      const result = await reminderSmsService.sendReminderSms({
        recipientPhone: '+19876543210',
        textMessage: 'Urgent SLA alert message',
        quietHours: { enabled: true, startHour: 0, endHour: 23.99 },
        overrideQuietHours: true, // Urgent bypass
        providerName: 'simulated'
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('simulated');
    });

    test('sendTestSms dispatches diagnostic test SMS', async () => {
      const result = await reminderSmsService.sendTestSms('simulated', '+19876543210');
      expect(result.success).toBe(true);
      expect(result.provider).toBe('simulated');
    });
  });

});
