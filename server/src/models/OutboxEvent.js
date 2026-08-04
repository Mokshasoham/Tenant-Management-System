/**
 * src/models/OutboxEvent.js
 *
 * Transactional Outbox Pattern Schema.
 * Guarantees zero lost events by persisting domain events inside MongoDB session transactions.
 */

import mongoose from 'mongoose';
import { addBaseFields } from '../platform/models/BaseSchema.js';

const outboxEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, unique: true, required: true },
    eventType: { type: String, required: true, index: true },
    eventVersion: { type: Number, default: 1 },
    aggregateType: { type: String, required: true, index: true },
    aggregateId: { type: String, required: true, index: true },
    actor: {
      id: String,
      type: { type: String, default: 'SYSTEM' },
      source: String,
      requestId: String,
      correlationId: String
    },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'published', 'failed', 'dead_letter'],
      default: 'pending',
      index: true
    },
    attempts: { type: Number, default: 0 },
    lastAttemptAt: Date,
    nextRetryAt: { type: Date, default: Date.now, index: true },
    publishedAt: Date,
    deadLetterReason: String
  },
  {
    timestamps: true
  }
);

addBaseFields(outboxEventSchema);

// Compound index for OutboxWorker polling
outboxEventSchema.index({ status: 1, nextRetryAt: 1, createdAt: 1 });

export default mongoose.model('OutboxEvent', outboxEventSchema);
