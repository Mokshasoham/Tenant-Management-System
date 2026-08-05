/**
 * server/tests/unit/reminders/reminderDiagnostics.test.js
 *
 * Unit Test Suite for Phase 2.3.3.6.5 - Reminder Diagnostics Service & Health Endpoint.
 */

import { jest } from '@jest/globals';
import { ReminderDiagnosticsService } from '../../../src/modules/reminders/services/ReminderDiagnosticsService.js';
import reminderDiagnosticsService from '../../../src/modules/reminders/services/ReminderDiagnosticsService.js';
import { getHealth } from '../../../src/controllers/reminderController.js';
import Reminder from '../../../src/modules/reminders/models/Reminder.js';

describe('Phase 2.3.3.6.5 — Reminder Diagnostics Service & Health Endpoint Unit Tests', () => {

  const originalEmailProvider = process.env.EMAIL_PROVIDER;

  beforeAll(() => {
    process.env.EMAIL_PROVIDER = 'simulated';
    process.env.SMS_PROVIDER = 'simulated';
  });

  afterAll(() => {
    if (originalEmailProvider) {
      process.env.EMAIL_PROVIDER = originalEmailProvider;
    } else {
      delete process.env.EMAIL_PROVIDER;
    }
  });

  describe('ReminderDiagnosticsService Read-Only System Diagnostics', () => {
    test('getDiagnostics aggregates database, queue depth, worker, scheduler, and provider readiness', async () => {
      const service = new ReminderDiagnosticsService();

      jest.spyOn(Reminder, 'aggregate').mockResolvedValue([
        { _id: 'queued', count: 4 },
        { _id: 'processing', count: 1 },
        { _id: 'failed', count: 0 },
        { _id: 'dead_letter', count: 0 }
      ]);

      const diag = await service.getDiagnostics();

      expect(diag).toBeDefined();
      expect(diag.queue.queued).toBe(4);
      expect(diag.queue.deadLetter).toBe(0);
      expect(diag.emailProvider.ready).toBe(true);
      expect(diag.emailProvider.provider).toBe('simulated');
      expect(diag.smsProvider.ready).toBe(true);
      expect(diag.smsProvider.provider).toBe('simulated');

      Reminder.aggregate.mockRestore();
    });
  });

  describe('Health Endpoint Controller', () => {
    test('getHealth returns 200 with diagnostics data', async () => {
      jest.spyOn(reminderDiagnosticsService, 'getDiagnostics').mockResolvedValue({
        healthy: true,
        database: { connected: true, state: 'connected' },
        queue: { queued: 2, processing: 0, failed: 0, deadLetter: 0 },
        worker: { running: true, intervalMs: 5000 },
        scheduler: { running: true },
        eventBus: { subscribed: true },
        emailProvider: { ready: true, provider: 'simulated', message: 'Email ready' },
        smsProvider: { ready: true, provider: 'simulated', message: 'SMS ready' }
      });

      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getHealth(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'System health diagnostics retrieved.',
        data: expect.any(Object)
      }));

      reminderDiagnosticsService.getDiagnostics.mockRestore();
    });
  });

});
