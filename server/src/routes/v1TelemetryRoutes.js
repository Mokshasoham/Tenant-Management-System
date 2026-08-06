/**
 * server/src/routes/v1TelemetryRoutes.js
 *
 * Express V1 Router for Telemetry & System Observability APIs.
 * Mounted at /api/v1/telemetry. Protected by JWT auth and Admin RBAC guard.
 */

import express from 'express';
import asyncHandler from 'express-async-handler';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeReminderRole } from '../middleware/reminderAuthorization.js';
import telemetryService from '../platform/telemetry/telemetryService.js';

const router = express.Router();

router.use(protect);
router.use(authorizeReminderRole(['admin']));

/**
 * GET /api/v1/telemetry/metrics
 * Returns real-time system observability telemetry report (Memory, HTTP latency, EventBus, End-to-End Queue).
 */
router.get('/metrics', asyncHandler(async (req, res) => {
  const report = telemetryService.getTelemetryReport();
  res.status(200).json(report);
}));

export default router;
