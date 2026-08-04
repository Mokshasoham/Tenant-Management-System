/**
 * src/routes/schedulerRoutes.js
 *
 * REST API for scheduler management and health monitoring.
 *
 * Routes:
 *   GET  /api/v1/schedulers/health         — Full registry health (all schedulers)
 *   GET  /api/v1/schedulers/:name/health   — Single scheduler health
 *   POST /api/v1/schedulers/:name/run-now  — Trigger immediate execution (admin only)
 *
 * Authorization:
 *   Health endpoints: public (no auth required — consumed by load balancers and monitoring)
 *   run-now: authenticate → adminOnly (admin role required per user decision)
 */

import express from 'express';
import schedulerRegistry from '../platform/scheduler/SchedulerRegistry.js';
import { authenticate, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// ─── GET /api/v1/schedulers/health ──────────────────────────────────────────
// Returns aggregate health for all registered schedulers.
// Used by monitoring systems, /health endpoint, and ops dashboards.

router.get('/health', async (req, res) => {
  try {
    const health = await schedulerRegistry.health();
    const statusCode = health.status === 'UP' ? 200 : 503;
    res.status(statusCode).json({
      success: true,
      data: health,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ─── GET /api/v1/schedulers/:name/health ────────────────────────────────────
// Returns health for a single named scheduler.

router.get('/:name/health', async (req, res) => {
  const { name } = req.params;
  const scheduler = schedulerRegistry.get(name);

  if (!scheduler) {
    return res.status(404).json({
      success: false,
      error: `Scheduler "${name}" not found. Available: ${schedulerRegistry.names().join(', ')}`
    });
  }

  try {
    const health = await scheduler.health();
    const statusCode = health.status === 'UP' ? 200 : 503;
    res.status(statusCode).json({
      success: true,
      data: health,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ─── POST /api/v1/schedulers/:name/run-now ──────────────────────────────────
// Triggers an immediate out-of-band execution of the named scheduler.
// Requires: authenticate → adminOnly
// Body: { reason? } — optional explanation for audit trail
//
// Returns: the execution metrics record for the triggered run.

router.post('/:name/run-now', authenticate, adminOnly, async (req, res) => {
  const { name } = req.params;
  const scheduler = schedulerRegistry.get(name);

  if (!scheduler) {
    return res.status(404).json({
      success: false,
      error: `Scheduler "${name}" not found. Available: ${schedulerRegistry.names().join(', ')}`
    });
  }

  const context = {
    trigger: 'manual',
    requestedBy: req.user?.userId || 'unknown',
    requestedAt: new Date().toISOString(),
    reason: req.body?.reason || null
  };

  try {
    const result = await scheduler.runNow(context);
    res.status(200).json({
      success: true,
      message: `Scheduler "${name}" executed successfully.`,
      data: result,
      context,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      context,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
