/**
 * src/platform/events/outboxService.js
 *
 * Transactional Outbox Service.
 * Writes event envelopes inside MongoDB session transactions.
 */

import OutboxEvent from '../../models/OutboxEvent.js';
import { createEventEnvelope } from './eventEnvelope.js';
import logger from '../logging/logger.js';

/**
 * Write a domain event envelope into the Outbox collection.
 * Must be executed within a MongoDB session transaction when part of a unit of work.
 *
 * @param {object} params               - Envelope parameters
 * @param {object} [options]
 * @param {import('mongoose').ClientSession} [options.session] - MongoDB Session
 * @returns {Promise<object>} Created OutboxEvent document
 */
export const writeOutboxEvent = async (params, options = {}) => {
  const envelope = createEventEnvelope(params);

  const docs = await OutboxEvent.create([envelope], { session: options.session });
  const doc = docs[0];

  logger.debug(`[OutboxService] Outbox event written: ${envelope.eventType} (${envelope.eventId})`);
  return doc;
};

/**
 * Query the count of pending outbox events (queue depth metric).
 * @returns {Promise<number>}
 */
export const getPendingOutboxCount = async () => {
  try {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      return 0;
    }
    return await OutboxEvent.countDocuments({ status: { $in: ['pending', 'failed'] } });
  } catch {
    return 0;
  }
};
