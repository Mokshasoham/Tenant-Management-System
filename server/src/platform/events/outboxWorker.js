/**
 * src/platform/events/outboxWorker.js
 *
 * Dedicated background Outbox Worker.
 * Reads pending/retryable OutboxEvents, publishes them to the EventBus,
 * and manages delivery lifecycle (pending -> processing -> published / failed -> dead_letter).
 */

import OutboxEvent from '../../models/OutboxEvent.js';
import eventBus from './eventBus.js';
import logger from '../logging/logger.js';

const MAX_ATTEMPTS = 5;

/**
 * Process a batch of pending/retryable outbox events.
 *
 * @param {number} [batchSize=20] - Max events to process in one batch
 * @returns {Promise<{ processed: number, published: number, failed: number }>}
 */
export const processOutboxBatch = async (batchSize = 20) => {
  const now = new Date();

  // Find candidate pending or failed events ready for retry
  const candidateEvents = await OutboxEvent.find({
    status: { $in: ['pending', 'failed'] },
    nextRetryAt: { $lte: now }
  })
    .sort({ createdAt: 1 })
    .limit(batchSize);

  if (candidateEvents.length === 0) {
    return { processed: 0, published: 0, failed: 0 };
  }

  let publishedCount = 0;
  let failedCount = 0;

  for (const doc of candidateEvents) {
    // Atomically transition status to processing
    const claimed = await OutboxEvent.findOneAndUpdate(
      { _id: doc._id, status: { $in: ['pending', 'failed'] } },
      { $set: { status: 'processing', lastAttemptAt: new Date() }, $inc: { attempts: 1 } },
      { new: true }
    );

    if (!claimed) continue; // Race condition — another worker claimed it

    try {
      // Publish event to platform EventBus
      await eventBus.publish(claimed.eventType, {
        eventId: claimed.eventId,
        eventVersion: claimed.eventVersion,
        occurredAt: claimed.createdAt,
        aggregateType: claimed.aggregateType,
        aggregateId: claimed.aggregateId,
        actor: claimed.actor,
        ...claimed.payload
      });

      // Mark as successfully published
      await OutboxEvent.updateOne(
        { _id: claimed._id },
        { $set: { status: 'published', publishedAt: new Date() } }
      );

      publishedCount++;
    } catch (err) {
      failedCount++;
      const currentAttempts = claimed.attempts;

      if (currentAttempts >= MAX_ATTEMPTS) {
        // Move to dead letter queue
        await OutboxEvent.updateOne(
          { _id: claimed._id },
          {
            $set: {
              status: 'dead_letter',
              deadLetterReason: `Max attempts (${MAX_ATTEMPTS}) reached: ${err.message}`
            }
          }
        );
        logger.error(`[OutboxWorker] Event ${claimed.eventId} (${claimed.eventType}) moved to DEAD_LETTER:`, err.message);
      } else {
        // Calculate exponential backoff retry time: 2^attempts * 5 seconds
        const delaySeconds = Math.pow(2, currentAttempts) * 5;
        const nextRetryAt = new Date(Date.now() + delaySeconds * 1000);

        await OutboxEvent.updateOne(
          { _id: claimed._id },
          {
            $set: {
              status: 'failed',
              error: err.message,
              nextRetryAt
            }
          }
        );
        logger.warn(`[OutboxWorker] Event ${claimed.eventId} delivery attempt ${currentAttempts} failed. Retrying in ${delaySeconds}s.`);
      }
    }
  }

  return {
    processed: candidateEvents.length,
    published: publishedCount,
    failed: failedCount
  };
};

/** OutboxWorker class for scheduled background processing */
export class OutboxWorker {
  constructor(options = {}) {
    this.intervalMs = options.intervalMs || 5000;
    this.batchSize = options.batchSize || 50;
    this.timerHandle = null;
    this.isRunning = false;
  }

  async processBatch(limit = this.batchSize) {
    return await processOutboxBatch(limit);
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Process pending outbox events immediately upon startup
    try {
      await this.processBatch();
    } catch (err) {
      logger.error('[OutboxWorker] Initial outbox batch processing error:', err.message);
    }

    this.timerHandle = setInterval(async () => {
      try {
        await this.processBatch();
      } catch (err) {
        logger.error('[OutboxWorker] Unhandled error during outbox batch processing:', err.message);
      }
    }, this.intervalMs);
    logger.info(`[OutboxWorker] Started background outbox worker (interval: ${this.intervalMs}ms).`);
  }

  stop() {
    if (!this.isRunning) return;
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
    this.isRunning = false;
    logger.info('[OutboxWorker] Stopped outbox worker.');
  }
}

const outboxWorkerSingleton = new OutboxWorker();
export default outboxWorkerSingleton;
