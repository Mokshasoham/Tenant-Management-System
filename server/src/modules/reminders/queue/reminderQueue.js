/**
 * server/src/modules/reminders/queue/reminderQueue.js
 *
 * Outbox-style Reminder Queue Abstraction.
 * Enforces strict multi-layer idempotency (idempotencyKey + SENT state verification),
 * handles queued/processing status transitions, and provides entity-level cancellation logic.
 */

import reminderRepository from '../repositories/reminderRepository.js';
import { validateReminderInput } from '../validators/reminderValidator.js';
import { ReminderStatus } from '../constants/reminderConstants.js';
import logger from '../../../platform/logging/logger.js';

export class ReminderQueue {
  /**
   * Idempotently enqueues a new Outbox Reminder task.
   *
   * Deduplication layers:
   *  1. Checks if a reminder with the same idempotencyKey was already SENT.
   *  2. Checks if a reminder with the same idempotencyKey is currently QUEUED or PROCESSING.
   *  3. Enforces unique database index on idempotencyKey (catches race conditions).
   *
   * @param {object} reminderData
   * @returns {Promise<{ success: boolean, reason?: string, reminder?: object, error?: string }>}
   */
  async enqueueReminder(reminderData) {
    const { isValid, errors } = validateReminderInput(reminderData);
    if (!isValid) {
      return { success: false, reason: 'INVALID_INPUT', error: errors.join('; ') };
    }

    const { idempotencyKey } = reminderData;

    try {
      // 1. Check if already successfully SENT
      const isSent = await reminderRepository.isAlreadySent(idempotencyKey);
      if (isSent) {
        logger.info(`[ReminderQueue] Reminder ${idempotencyKey} already SENT. Skipping enqueue.`);
        const existing = await reminderRepository.findByIdempotencyKey(idempotencyKey);
        return { success: false, reason: 'ALREADY_SENT', reminder: existing };
      }

      // 2. Check if already QUEUED or PROCESSING
      const existing = await reminderRepository.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        if (existing.status === ReminderStatus.QUEUED || existing.status === ReminderStatus.PROCESSING) {
          logger.info(`[ReminderQueue] Reminder ${idempotencyKey} already ${existing.status}. Skipping duplicate.`);
          return { success: false, reason: 'ALREADY_QUEUED', reminder: existing };
        }
        if (existing.status === ReminderStatus.CANCELLED) {
          logger.info(`[ReminderQueue] Reminder ${idempotencyKey} was CANCELLED.`);
          return { success: false, reason: 'ALREADY_CANCELLED', reminder: existing };
        }
      }

      // 3. Create outbox reminder document
      const created = await reminderRepository.create({
        ...reminderData,
        status: ReminderStatus.QUEUED,
        attempts: 0
      });

      logger.info(`[ReminderQueue] Enqueued reminder ${created._id} (key: ${idempotencyKey})`);
      return { success: true, reminder: created };
    } catch (err) {
      // Handle MongoDB duplicate key race condition (E11000)
      if (err.code === 11000 || err.message?.includes('E11000')) {
        logger.warn(`[ReminderQueue] Duplicate key race condition caught for ${idempotencyKey}`);
        const existing = await reminderRepository.findByIdempotencyKey(idempotencyKey);
        return { success: false, reason: 'DUPLICATE_KEY_RACE', reminder: existing };
      }
      logger.error(`[ReminderQueue] Error enqueuing reminder ${idempotencyKey}:`, err.message);
      throw err;
    }
  }

  /**
   * Cancels all pending (queued/processing/failed) reminders for a specified entity.
   * Executed when an underlying workflow completes (e.g. lease renewed, rent paid).
   *
   * @param {string} entityType - e.g. 'Lease', 'Payment', 'Maintenance'
   * @param {string|ObjectId} entityId
   * @param {string} [reason='Entity workflow completed']
   * @returns {Promise<{ modifiedCount: number }>}
   */
  async cancelRemindersForEntity(entityType, entityId, reason = 'Entity workflow completed') {
    if (!entityType || !entityId) {
      throw new Error('entityType and entityId are required to cancel reminders');
    }
    const result = await reminderRepository.cancelByEntity(entityType, entityId, reason);
    logger.info(`[ReminderQueue] Cancelled ${result.modifiedCount} pending reminder(s) for ${entityType}:${entityId}. Reason: ${reason}`);
    return result;
  }

  /**
   * Fetches pending reminders ready for background worker execution.
   *
   * @param {number} [limit=20]
   * @param {Date} [now=new Date()]
   * @returns {Promise<Array>}
   */
  async getPendingBatch(limit = 20, now = new Date()) {
    return await reminderRepository.findPendingBatch(limit, now);
  }
}

const reminderQueueSingleton = new ReminderQueue();
export default reminderQueueSingleton;
