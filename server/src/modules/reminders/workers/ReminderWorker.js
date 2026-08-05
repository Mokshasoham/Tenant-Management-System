/**
 * server/src/modules/reminders/workers/ReminderWorker.js
 *
 * Dedicated Outbox Reminder Background Worker.
 * Reads queued & retryable failed reminders, claims them atomically (queued -> processing),
 * dispatches via Email & SMS Engines, manages exponential backoff retries & dead-letter queue,
 * creates immutable ReminderHistory audit records, and emits EventBus completion events.
 */

import Reminder from '../models/Reminder.js';
import ReminderHistory from '../models/ReminderHistory.js';
import User from '../../../models/User.js';
import reminderTemplateRepository from '../repositories/reminderTemplateRepository.js';
import reminderEmailService from '../services/reminderEmailService.js';
import reminderSmsService from '../services/reminderSmsService.js';
import eventBus from '../../../platform/events/eventBus.js';
import { ReminderStatus, ReminderChannel } from '../constants/reminderConstants.js';
import logger from '../../../platform/logging/logger.js';

const MAX_ATTEMPTS = 3;

/**
 * Calculates exponential backoff delay based on attempt count.
 * Attempt 1: 5 min, Attempt 2: 15 min, Attempt 3: 60 min
 *
 * @param {number} attempt
 * @returns {Date}
 */
export function calculateNextRetryDate(attempt) {
  let minutes = 5;
  if (attempt === 2) minutes = 15;
  if (attempt >= 3) minutes = 60;
  return new Date(Date.now() + minutes * 60 * 1000);
}

export class ReminderWorker {
  constructor(options = {}) {
    this.intervalMs = options.intervalMs || 5000;
    this.batchSize = options.batchSize || 20;
    this.timerHandle = null;
    this.isRunning = false;
  }

  /**
   * Process a single batch of queued or retryable failed reminders.
   *
   * @param {number} [limit=20]
   * @returns {Promise<{ processed: number, sent: number, failed: number, deadLetter: number }>}
   */
  async processBatch(limit = this.batchSize) {
    const now = new Date();

    // 1. Find candidate reminders ready for processing
    const candidates = await Reminder.find({
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

    if (candidates.length === 0) {
      return { processed: 0, sent: 0, failed: 0, deadLetter: 0 };
    }

    let sentCount = 0;
    let failedCount = 0;
    let deadLetterCount = 0;

    for (const doc of candidates) {
      // 2. Atomically transition status to processing (prevents multi-worker races)
      const claimed = await Reminder.findOneAndUpdate(
        { _id: doc._id, status: { $in: [ReminderStatus.QUEUED, ReminderStatus.FAILED] } },
        {
          $set: { status: ReminderStatus.PROCESSING, lastAttemptAt: new Date() },
          $inc: { attempts: 1 }
        },
        { new: true }
      );

      if (!claimed) continue; // Race condition — another worker claimed it

      const startTime = Date.now();

      try {
        // Fetch Recipient User details
        const recipientUser = await User.findById(claimed.recipient).lean();
        if (!recipientUser) {
          throw new Error(`PERMANENT_ERROR: Recipient user ${claimed.recipient} not found in system.`);
        }

        // Fetch Template Document
        const templateId = claimed.payload?.templateId || 'DEFAULT_TEMPLATE';
        let template = await reminderTemplateRepository.findLatest(templateId);
        if (!template) {
          // Fallback template definition for system resiliency
          template = {
            templateId: 'DEFAULT_FALLBACK',
            version: 1,
            subject: 'Reminder Notification - {{entityType}}',
            htmlBody: '<p>You have a notification regarding {{entityType}} #{{entityId}}.</p>',
            textBody: 'You have a notification regarding {{entityType}} #{{entityId}}.'
          };
        }

        const templateVersion = template.version || 1;
        const payloadData = {
          ...claimed.payload,
          entityType: claimed.entityType,
          entityId: claimed.entityId?.toString(),
          tenantName: recipientUser.firstName || recipientUser.name || 'Valued Resident',
          userEmail: recipientUser.email,
          userPhone: recipientUser.phone
        };

        let dispatchResult;

        // 3. Channel Routing
        if (claimed.channel === ReminderChannel.EMAIL) {
          if (!recipientUser.email) {
            throw new Error(`PERMANENT_ERROR: Recipient user ${recipientUser._id} has no email address.`);
          }
          dispatchResult = await reminderEmailService.sendReminderEmail({
            template,
            payload: payloadData,
            recipientEmail: recipientUser.email,
            metadata: {
              reminderId: claimed._id.toString(),
              entityId: claimed.entityId.toString(),
              correlationId: claimed.idempotencyKey
            }
          });
        } else if (claimed.channel === ReminderChannel.SMS) {
          const phone = recipientUser.phone || claimed.payload?.phone;
          if (!phone) {
            throw new Error(`PERMANENT_ERROR: Recipient user ${recipientUser._id} has no phone number.`);
          }
          const smsText = template.textBody || `Reminder for ${claimed.entityType}`;
          dispatchResult = await reminderSmsService.sendReminderSms({
            recipientPhone: phone,
            textMessage: smsText,
            metadata: {
              reminderId: claimed._id.toString(),
              entityId: claimed.entityId.toString(),
              correlationId: claimed.idempotencyKey
            }
          });
        } else {
          throw new Error(`PERMANENT_ERROR: Unsupported channel '${claimed.channel}'`);
        }

        const executionTimeMs = Date.now() - startTime;

        // 4. Handle Dispatch Outcome
        if (dispatchResult.success) {
          // Update Reminder -> SENT
          await Reminder.updateOne(
            { _id: claimed._id },
            {
              $set: {
                status: ReminderStatus.SENT,
                sentAt: new Date()
              }
            }
          );

          // Create Immutable ReminderHistory Audit Entry
          await ReminderHistory.create({
            reminderId: claimed._id,
            recipient: claimed.recipient,
            channel: claimed.channel,
            provider: dispatchResult.provider || 'unknown',
            providerMessageId: dispatchResult.providerMessageId,
            templateVersion,
            status: 'delivered',
            sentAt: new Date(),
            executionTimeMs
          });

          // Publish Completion Event to EventBus
          eventBus.publish('reminder.sent', {
            reminderId: claimed._id,
            recipient: claimed.recipient,
            channel: claimed.channel,
            idempotencyKey: claimed.idempotencyKey
          });

          sentCount++;
        } else if (dispatchResult.deferred) {
          // Quiet hours deferral -> update scheduledFor & revert status to QUEUED
          await Reminder.updateOne(
            { _id: claimed._id },
            {
              $set: {
                status: ReminderStatus.QUEUED,
                scheduledFor: dispatchResult.deferredUntil
              }
            }
          );
        } else {
          throw new Error(dispatchResult.error?.message || 'Dispatch failed');
        }
      } catch (err) {
        const executionTimeMs = Date.now() - startTime;
        const isPermanent = err.message?.startsWith('PERMANENT_ERROR:');
        const attempts = claimed.attempts;

        if (isPermanent || attempts >= MAX_ATTEMPTS) {
          // Dead-Letter Queue
          await Reminder.updateOne(
            { _id: claimed._id },
            {
              $set: {
                status: ReminderStatus.DEAD_LETTER,
                cancelReason: err.message
              }
            }
          );

          await ReminderHistory.create({
            reminderId: claimed._id,
            recipient: claimed.recipient,
            channel: claimed.channel,
            provider: 'failed',
            templateVersion: 1,
            status: 'failed',
            sentAt: new Date(),
            executionTimeMs,
            error: { code: isPermanent ? 'PERMANENT_FAILURE' : 'MAX_RETRIES_EXCEEDED', message: err.message }
          });

          eventBus.publish('reminder.dead_letter', {
            reminderId: claimed._id,
            recipient: claimed.recipient,
            reason: err.message
          });

          deadLetterCount++;
          logger.error(`[ReminderWorker] Reminder ${claimed._id} moved to DEAD_LETTER:`, err.message);
        } else {
          // Transient failure -> Exponential Backoff retry
          const nextRetryAt = calculateNextRetryDate(attempts);
          await Reminder.updateOne(
            { _id: claimed._id },
            {
              $set: {
                status: ReminderStatus.FAILED,
                nextRetryAt
              }
            }
          );

          failedCount++;
          logger.warn(`[ReminderWorker] Reminder ${claimed._id} attempt ${attempts} failed (${err.message}). Retrying at ${nextRetryAt.toISOString()}`);
        }
      }
    }

    return {
      processed: candidates.length,
      sent: sentCount,
      failed: failedCount,
      deadLetter: deadLetterCount
    };
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      await this.processBatch();
    } catch (err) {
      logger.error('[ReminderWorker] Error in initial batch execution:', err.message);
    }

    this.timerHandle = setInterval(async () => {
      try {
        await this.processBatch();
      } catch (err) {
        logger.error('[ReminderWorker] Error during batch processing:', err.message);
      }
    }, this.intervalMs);

    logger.info(`[ReminderWorker] Started background worker loop (interval: ${this.intervalMs}ms).`);
  }

  stop() {
    if (!this.isRunning) return;
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
    this.isRunning = false;
    logger.info('[ReminderWorker] Stopped background worker loop.');
  }
}

const reminderWorkerSingleton = new ReminderWorker();
export default reminderWorkerSingleton;
