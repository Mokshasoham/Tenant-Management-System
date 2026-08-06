/**
 * server/src/modules/reporting/workers/ExportWorker.js
 *
 * Background Worker for Asynchronous Export Processing.
 * Reuses platform worker architecture, emits EventBus telemetry events,
 * calls ExportManager, and updates ExportJob progress.
 */

import exportQueue from '../queue/exportQueue.js';
import exportManager from '../exporters/ExportManager.js';
import reportService from '../services/ReportService.js';
import eventBus from '../../../platform/events/eventBus.js';
import logger from '../../../platform/logging/logger.js';

export class ExportWorker {
  constructor() {
    this.isRunning = false;
    this.batchSize = 5;
    this.pollIntervalMs = 5000;
    this.timer = null;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info('[ExportWorker] Background Export Worker started.');
    this._poll();
  }

  stop() {
    this.isRunning = false;
    if (this.timer) clearTimeout(this.timer);
    logger.info('[ExportWorker] Background Export Worker stopped.');
  }

  async _poll() {
    if (!this.isRunning) return;
    try {
      await this.processBatch();
    } catch (err) {
      logger.error('[ExportWorker] Processing error:', err);
    } finally {
      if (this.isRunning) {
        this.timer = setTimeout(() => this._poll(), this.pollIntervalMs);
      }
    }
  }

  async processBatch() {
    const jobs = await exportQueue.fetchPendingJobs(this.batchSize);
    if (!jobs || jobs.length === 0) return;

    logger.info(`[ExportWorker] Processing batch of ${jobs.length} export jobs...`);

    for (const job of jobs) {
      await this.processJob(job);
    }
  }

  async processJob(job) {
    const jobId = job._id.toString();
    try {
      // 1. Update status to processing (30% progress) & emit export.started
      await exportQueue.updateProgress(jobId, 30, 'processing', { attempts: job.attempts + 1 });
      await eventBus.publish('export.started', { jobId, userId: job.userId, reportType: job.reportType, format: job.format });

      // 2. Generate Report DTO via ReportService (50% progress)
      const reportDTO = await reportService.generateReport(job.reportType, job.filters, { user: { _id: job.userId } });
      await exportQueue.updateProgress(jobId, 50, 'processing');
      await eventBus.publish('export.progress', { jobId, progress: 50 });

      // 3. Export via ExportManager facade (80% progress)
      const result = await exportManager.export(job.format, reportDTO, {
        userId: job.userId,
        reportType: job.reportType,
        filters: job.filters
      });
      await exportQueue.updateProgress(jobId, 80, 'processing');
      await eventBus.publish('export.progress', { jobId, progress: 80 });

      // 4. Complete job (100% progress) & emit export.completed
      await exportQueue.updateProgress(jobId, 100, 'completed', {
        downloadUrl: result.downloadUrl,
        fileSizeBytes: result.fileSizeBytes,
        expiresAt: result.expiresAt
      });
      await eventBus.publish('export.completed', {
        jobId,
        userId: job.userId,
        downloadUrl: result.downloadUrl,
        fileSizeBytes: result.fileSizeBytes
      });

      logger.info(`[ExportWorker] Successfully completed ExportJob '${jobId}' (${result.format})`);
    } catch (err) {
      logger.error(`[ExportWorker] Job '${jobId}' failed:`, err.message);

      const isMaxAttempts = job.attempts + 1 >= job.maxAttempts;
      const nextStatus = isMaxAttempts ? 'failed' : 'pending';

      await exportQueue.updateProgress(jobId, job.progress, nextStatus, { error: err.message });
      await eventBus.publish('export.failed', { jobId, userId: job.userId, error: err.message, final: isMaxAttempts });
    }
  }
}

const exportWorkerSingleton = new ExportWorker();
export default exportWorkerSingleton;
