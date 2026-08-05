/**
 * server/tests/unit/reminders/reminderApi.test.js
 *
 * Unit Test Suite for Phase 2.3.3.6.5 - Reminder Controller, API Validators, RBAC Authorization, and Mutations.
 */

import { jest } from '@jest/globals';
import { authorizeReminderRole } from '../../../src/middleware/reminderAuthorization.js';
import {
  validateQueueQuery,
  validateHistoryQuery,
  validatePreviewInput,
  validateTestEmailInput,
  validateTestSmsInput,
  validateIdParam
} from '../../../src/modules/reminders/validators/reminderApiValidator.js';
import {
  getQueue,
  getHistory,
  getAnalytics,
  previewTemplate,
  testEmail,
  testSms,
  retryReminder,
  cancelReminder,
  getHealth
} from '../../../src/controllers/reminderController.js';
import Reminder from '../../../src/modules/reminders/models/Reminder.js';
import ReminderHistory from '../../../src/modules/reminders/models/ReminderHistory.js';
import reminderMetricsService from '../../../src/modules/reminders/services/ReminderMetricsService.js';
import reminderEmailService from '../../../src/modules/reminders/services/reminderEmailService.js';
import reminderSmsService from '../../../src/modules/reminders/services/reminderSmsService.js';
import { ReminderStatus } from '../../../src/modules/reminders/constants/reminderConstants.js';

describe('Phase 2.3.3.6.5 — Reminder REST APIs, Controller Layer & RBAC Unit Tests', () => {

  // ─────────────────────────────────────────────────────────────
  // 1. API VALIDATORS
  // ─────────────────────────────────────────────────────────────
  describe('Reminder API Validators', () => {
    test('validateQueueQuery parses valid pagination and status filters', () => {
      const val = validateQueueQuery({ page: '2', limit: '10', status: ReminderStatus.QUEUED });
      expect(val.isValid).toBe(true);
      expect(val.page).toBe(2);
      expect(val.limit).toBe(10);
    });

    test('validateQueueQuery rejects invalid status or invalid page number', () => {
      const val = validateQueueQuery({ page: '-1', status: 'INVALID_STATUS' });
      expect(val.isValid).toBe(false);
      expect(val.errors.length).toBeGreaterThan(0);
    });

    test('validateIdParam rejects non-ObjectId string', () => {
      const invalid = validateIdParam('not-an-objectid');
      expect(invalid.isValid).toBe(false);

      const valid = validateIdParam('507f1f77bcf86cd799439011');
      expect(valid.isValid).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. RBAC AUTHORIZATION MIDDLEWARE
  // ─────────────────────────────────────────────────────────────
  describe('Reminder Authorization Middleware (RBAC)', () => {
    test('allows user with authorized role', () => {
      const middleware = authorizeReminderRole(['admin', 'manager']);
      const req = { user: { role: 'admin' } };
      const res = {};
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    test('blocks tenant user with 403 Forbidden', () => {
      const middleware = authorizeReminderRole(['admin', 'manager']);
      const req = { user: { role: 'tenant' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'FORBIDDEN' })
      }));
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. CONTROLLER ENDPOINTS
  // ─────────────────────────────────────────────────────────────
  describe('Reminder Controller Handlers', () => {

    test('getQueue fetches paginated items and total count', async () => {
      jest.spyOn(Reminder, 'find').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([{ _id: 'rem_1', status: 'queued' }])
            })
          })
        })
      });
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
        meta: expect.objectContaining({ total: 1, page: 1, limit: 10 })
      }));

      Reminder.find.mockRestore();
      Reminder.countDocuments.mockRestore();
    });

    test('getAnalytics delegates to ReminderMetricsService', async () => {
      jest.spyOn(reminderMetricsService, 'getMetrics').mockResolvedValue({
        queued: 5,
        sent: 20,
        deliverySuccessRate: 100.0
      });

      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ queued: 5, sent: 20 })
      }));

      reminderMetricsService.getMetrics.mockRestore();
    });

    test('retryReminder resets failed reminder status to queued', async () => {
      const validId = '507f1f77bcf86cd799439011';
      const mockDoc = {
        _id: validId,
        status: ReminderStatus.FAILED,
        attempts: 2,
        save: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(Reminder, 'findById').mockResolvedValue(mockDoc);

      const req = { params: { id: validId } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await retryReminder(req, res);

      expect(mockDoc.status).toBe(ReminderStatus.QUEUED);
      expect(mockDoc.attempts).toBe(0);
      expect(mockDoc.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);

      Reminder.findById.mockRestore();
    });

    test('cancelReminder cancels queued reminder and records reason', async () => {
      const validId = '507f1f77bcf86cd799439022';
      const mockDoc = {
        _id: validId,
        status: ReminderStatus.QUEUED,
        save: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(Reminder, 'findById').mockResolvedValue(mockDoc);

      const req = { params: { id: validId }, body: { reason: 'User requested cancellation' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await cancelReminder(req, res);

      expect(mockDoc.status).toBe(ReminderStatus.CANCELLED);
      expect(mockDoc.cancelReason).toBe('User requested cancellation');
      expect(mockDoc.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);

      Reminder.findById.mockRestore();
    });
  });

});
