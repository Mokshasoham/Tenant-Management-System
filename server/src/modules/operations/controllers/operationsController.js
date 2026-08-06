/**
 * server/src/modules/operations/controllers/operationsController.js
 *
 * REST Controller for Admin Operations Command Center.
 */

import asyncHandler from 'express-async-handler';
import operationsService from '../services/OperationsService.js';

/**
 * Helper extracting IP and user agent metadata from request.
 */
function getRequestMeta(req) {
  return {
    ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'Unknown'
  };
}

/**
 * GET /api/v1/operations/version
 * Returns backend build version, git commit, and environment metadata.
 */
export const getVersionInfo = asyncHandler(async (req, res) => {
  const info = await operationsService.getVersionInfo();
  res.status(200).json(info);
});

/**
 * GET /api/v1/operations/status
 * Retrieves real-time operations status across workers, schedulers, queues, and providers.
 */
export const getSystemOperationsStatus = asyncHandler(async (req, res) => {
  const status = await operationsService.getSystemOperationsStatus();
  res.status(200).json(status);
});

/**
 * GET /api/v1/operations/history
 * Retrieves paginated operational audit history.
 */
export const getOperationHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '20', 10);

  const history = await operationsService.getOperationHistory(page, limit);
  res.status(200).json(history);
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
 * Bulk retries dead-letter items and logs audit history.
 */
export const bulkRetryDeadLetter = asyncHandler(async (req, res) => {
  const { ids = [] } = req.body;
  const userId = req.user?._id || req.user?.id;
  const reqMeta = getRequestMeta(req);

  const result = await operationsService.bulkRetryDeadLetter(ids, userId, reqMeta);
  res.status(200).json(result);
});

/**
 * POST /api/v1/operations/dead-letter/purge
 * Bulk purges (deletes) dead-letter items and logs audit history.
 */
export const bulkPurgeDeadLetter = asyncHandler(async (req, res) => {
  const { ids = [] } = req.body;
  const userId = req.user?._id || req.user?.id;
  const reqMeta = getRequestMeta(req);

  const result = await operationsService.bulkPurgeDeadLetter(ids, userId, reqMeta);
  res.status(200).json(result);
});

/**
 * POST /api/v1/operations/jobs/:id/cancel
 * Manually cancels a queued job and logs audit history.
 */
export const cancelJob = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const userId = req.user?._id || req.user?.id;
  const reqMeta = getRequestMeta(req);

  const result = await operationsService.cancelQueuedJob(id, reason, userId, reqMeta);
  res.status(200).json(result);
});

/**
 * POST /api/v1/operations/schedulers/:name/trigger
 * Manually triggers execution for a registered scheduler and logs audit history.
 */
export const triggerScheduler = asyncHandler(async (req, res) => {
  const { name } = req.params;
  const userId = req.user?._id || req.user?.id;
  const reqMeta = getRequestMeta(req);

  const result = await operationsService.triggerSchedulerScan(name, userId, reqMeta);
  res.status(200).json(result);
});

/**
 * POST /api/v1/operations/workers/:name/tune
 * Dynamically tunes worker runtime parameters and logs audit history.
 */
export const tuneWorker = asyncHandler(async (req, res) => {
  const { name } = req.params;
  const config = req.body;
  const userId = req.user?._id || req.user?.id;
  const reqMeta = getRequestMeta(req);

  const result = operationsService.tuneWorkerConfig(name, config, userId, reqMeta);
  res.status(200).json(result);
});

export default {
  getVersionInfo,
  getSystemOperationsStatus,
  getOperationHistory,
  getDeadLetterQueue,
  bulkRetryDeadLetter,
  bulkPurgeDeadLetter,
  cancelJob,
  triggerScheduler,
  tuneWorker
};
