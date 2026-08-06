/**
 * server/src/modules/operations/controllers/operationsController.js
 *
 * REST Controller for Admin Operations Command Center.
 */

import asyncHandler from 'express-async-handler';
import operationsService from '../services/OperationsService.js';

/**
 * GET /api/v1/operations/status
 * Retrieves real-time operations status across workers, schedulers, queues, and providers.
 */
export const getSystemOperationsStatus = asyncHandler(async (req, res) => {
  const status = await operationsService.getSystemOperationsStatus();
  res.status(200).json(status);
});

/**
 * GET /api/v1/operations/dead-letter
 * Retrieves paginated items from the Dead-Letter Queue.
 */
export const getDeadLetterQueue = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '20', 10);

  const result = await operationsService.getDeadLetterItems(page, limit);
  res.status(200).json(result);
});

/**
 * POST /api/v1/operations/dead-letter/retry
 * Bulk retries dead-letter items.
 */
export const bulkRetryDeadLetter = asyncHandler(async (req, res) => {
  const { ids = [] } = req.body;
  const result = await operationsService.bulkRetryDeadLetter(ids);
  res.status(200).json(result);
});

/**
 * POST /api/v1/operations/dead-letter/purge
 * Bulk purges (deletes) dead-letter items.
 */
export const bulkPurgeDeadLetter = asyncHandler(async (req, res) => {
  const { ids = [] } = req.body;
  const result = await operationsService.bulkPurgeDeadLetter(ids);
  res.status(200).json(result);
});

/**
 * POST /api/v1/operations/jobs/:id/cancel
 * Manually cancels a queued job.
 */
export const cancelJob = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const result = await operationsService.cancelQueuedJob(id, reason);
  res.status(200).json(result);
});

/**
 * POST /api/v1/operations/schedulers/:name/trigger
 * Manually triggers execution for a registered scheduler.
 */
export const triggerScheduler = asyncHandler(async (req, res) => {
  const { name } = req.params;
  const result = await operationsService.triggerSchedulerScan(name);
  res.status(200).json(result);
});

/**
 * POST /api/v1/operations/workers/:name/tune
 * Dynamically tunes worker runtime parameters.
 */
export const tuneWorker = asyncHandler(async (req, res) => {
  const { name } = req.params;
  const config = req.body;

  const result = operationsService.tuneWorkerConfig(name, config);
  res.status(200).json(result);
});

export default {
  getSystemOperationsStatus,
  getDeadLetterQueue,
  bulkRetryDeadLetter,
  bulkPurgeDeadLetter,
  cancelJob,
  triggerScheduler,
  tuneWorker
};
