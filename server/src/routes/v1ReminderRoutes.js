/**
 * server/src/routes/v1ReminderRoutes.js
 *
 * Express V1 Router for Reminder Management APIs.
 * Mounted at /api/v1/reminders.
 * Applies authentication and RBAC authorization guards.
 */

import express from 'express';
import { authenticate as protect } from '../middleware/auth.js';
import { authorizeReminderRole } from '../middleware/reminderAuthorization.js';
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
} from '../controllers/reminderController.js';

const router = express.Router();

// Apply authentication middleware to all reminder routes
router.use(protect);

// 1. Read & Diagnostic Endpoints (Accessible to Admin & Manager)
router.get('/queue', authorizeReminderRole(['admin', 'manager']), getQueue);
router.get('/history', authorizeReminderRole(['admin', 'manager']), getHistory);
router.get('/analytics', authorizeReminderRole(['admin', 'manager']), getAnalytics);
router.get('/health', authorizeReminderRole(['admin', 'manager']), getHealth);
router.post('/preview', authorizeReminderRole(['admin', 'manager']), previewTemplate);

// 2. Administrative & Mutation Endpoints (Admin Only)
router.post('/test-email', authorizeReminderRole(['admin']), testEmail);
router.post('/test-sms', authorizeReminderRole(['admin']), testSms);
router.post('/retry/:id', authorizeReminderRole(['admin']), retryReminder);
router.post('/cancel/:id', authorizeReminderRole(['admin']), cancelReminder);

export default router;
