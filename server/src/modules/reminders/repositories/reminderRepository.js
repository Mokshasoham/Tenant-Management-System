/**
 * server/src/modules/reminders/repositories/reminderRepository.js
 *
 * Repository layer for Outbox-style Reminder documents.
 * Encapsulates database operations, idempotency checks, entity cancellations, and batch claiming.
 */

import Reminder from '../models/Reminder.js';
import { ReminderStatus } from '../constants/reminderConstants.js';

export class ReminderRepository {
  /**
   * Creates a new reminder document.
   *
   * @param {object} data
   * @returns {Promise<object>}
   */
  async create(data) {
    const reminder = new Reminder(data);
    return await reminder.save();
  }

  /**
   * Finds a reminder by its unique idempotencyKey.
   *
   * @param {string} idempotencyKey
   * @returns {Promise<object|null>}
   */
  async findByIdempotencyKey(idempotencyKey) {
    return await Reminder.findOne({ idempotencyKey }).lean();
  }

  /**
   * Finds a reminder by ID.
   *
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    return await Reminder.findById(id);
  }

  /**
   * Checks if a reminder with the given idempotencyKey has already been successfully sent.
   *
   * @param {string} idempotencyKey
   * @returns {Promise<boolean>}
   */
  async isAlreadySent(idempotencyKey) {
    const existing = await Reminder.findOne({
      idempotencyKey,
      status: ReminderStatus.SENT
    }).select('_id').lean();
    return !!existing;
  }

  /**
   * Finds pending queued/failed reminders ready for execution.
   *
   * @param {number} [limit=20]
   * @param {Date} [now=new Date()]
   * @returns {Promise<Array>}
   */
  async findPendingBatch(limit = 20, now = new Date()) {
    return await Reminder.find({
      status: { $in: [ReminderStatus.QUEUED, ReminderStatus.FAILED] },
      scheduledFor: { $lte: now },
      $or: [
        { nextRetryAt: { $exists: false } },
        { nextRetryAt: null },
        { nextRetryAt: { $lte: now } }
      ]
    })
      .sort({ scheduledFor: 1 })
      .limit(limit);
  }

  /**
   * Cancels all pending/queued or processing reminders associated with a specific entity.
   * Used when a lease is renewed, payment clears, or maintenance is resolved.
   *
   * @param {string} entityType - 'Lease', 'Payment', 'Maintenance', etc.
   * @param {string|ObjectId} entityId
   * @param {string} [reason='Entity workflow completed']
   * @returns {Promise<{ modifiedCount: number }>}
   */
  async cancelByEntity(entityType, entityId, reason = 'Entity workflow completed') {
    const result = await Reminder.updateMany(
      {
        entityType,
        entityId,
        status: { $in: [ReminderStatus.QUEUED, ReminderStatus.PROCESSING, ReminderStatus.FAILED] }
      },
      {
        $set: {
          status: ReminderStatus.CANCELLED,
          cancelReason: reason
        }
      }
    );
    return { modifiedCount: result.modifiedCount };
  }

  /**
   * Updates reminder status and tracking metadata atomically.
   *
   * @param {string} id
   * @param {string} status
   * @param {object} [extra={}]
   * @returns {Promise<object|null>}
   */
  async updateStatus(id, status, extra = {}) {
    return await Reminder.findByIdAndUpdate(
      id,
      {
        $set: {
          status,
          ...extra
        }
      },
      { new: true }
    );
  }
}

const reminderRepositorySingleton = new ReminderRepository();
export default reminderRepositorySingleton;
