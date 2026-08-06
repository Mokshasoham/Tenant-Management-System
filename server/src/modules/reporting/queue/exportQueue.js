/**
 * server/src/modules/reporting/queue/exportQueue.js
 *
 * Export Job Outbox Queue Facade.
 * Enqueues export tasks for background processing, re-using platform queue architecture.
 */

import ExportJob from '../models/ExportJob.js';

export class ExportQueue {
  /**
   * Enqueues a new background export job.
   */
  async createJob(userId, reportType, format, filters = {}) {
    const job = await ExportJob.create({
      userId,
      reportType,
      format,
      filters,
      status: 'pending',
      progress: 0
    });
    return job;
  }

  /**
   * Retrieves pending export jobs for worker processing.
   */
  async fetchPendingJobs(batchSize = 5) {
    return ExportJob.find({ status: 'pending' })
      .sort({ createdAt: 1 })
      .limit(batchSize);
  }

  /**
   * Updates job progress and status.
   */
  async updateProgress(jobId, progress, status = 'processing', extra = {}) {
    return ExportJob.findByIdAndUpdate(
      jobId,
      {
        $set: {
          progress,
          status,
          ...extra
        }
      },
      { new: true }
    );
  }

  /**
   * Retrieves job status for polling API.
   */
  async getJob(jobId, userId) {
    return ExportJob.findOne({ _id: jobId, userId }).lean();
  }
}

const exportQueueSingleton = new ExportQueue();
export default exportQueueSingleton;
