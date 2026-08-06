/**
 * server/src/modules/operations/routes/v1OperationsRoutes.js
 *
 * Express V1 Router for Operations Command Center APIs.
 * Mounted at /api/v1/operations. Strictly restricted to Admin users.
 */

import express from 'express';
import { protect } from '../../../middleware/authMiddleware.js';
import { authorizeReminderRole } from '../../../middleware/reminderAuthorization.js';
import {
  getSystemOperationsStatus,
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

// System Operations Telemetry
router.get('/status', getSystemOperationsStatus);

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
