/**
 * server/src/modules/operations/routes/v1OperationsRoutes.js
 *
 * Express V1 Router for Operations Command Center APIs.
 * Mounted at /api/v1/operations. Strictly restricted to Admin users.
 */

import express from 'express';
import { authenticate as protect } from '../../../middleware/auth.js';
import { authorizeReminderRole } from '../../../middleware/reminderAuthorization.js';
import {
  getVersionInfo,
  getSystemOperationsStatus,
  getOperationHistory,
  getDeadLetterQueue,
  bulkRetryDeadLetter,
  bulkPurgeDeadLetter,
  cancelJob,
  triggerScheduler,
  tuneWorker
} from '../controllers/operationsController.js';

const router = express.Router();

// Apply authentication and strict Admin RBAC guard
router.use(protect);
router.use(authorizeReminderRole(['admin']));

// System Version & Environment Info
router.get('/version', getVersionInfo);

// System Operations Telemetry & Permanent Audit History
router.get('/status', getSystemOperationsStatus);
router.get('/history', getOperationHistory);

// Dead-Letter Queue Operations
router.get('/dead-letter', getDeadLetterQueue);
router.post('/dead-letter/retry', bulkRetryDeadLetter);
router.post('/dead-letter/purge', bulkPurgeDeadLetter);

// Queue Job Cancellation
router.post('/jobs/:id/cancel', cancelJob);

// Scheduler & Worker Control
router.post('/schedulers/:name/trigger', triggerScheduler);
router.post('/workers/:name/tune', tuneWorker);

export default router;
