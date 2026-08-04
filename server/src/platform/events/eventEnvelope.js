/**
 * src/platform/events/eventEnvelope.js
 *
 * Formats standardized, versioned domain event envelopes (eventVersion: 1).
 */

import { randomUUID } from 'crypto';

/**
 * Creates a versioned domain event envelope.
 *
 * @param {object} params
 * @param {string} params.eventType     - Dot-notated event name (e.g. 'lease.renewal.campaign.created')
 * @param {string} params.aggregateType - Primary domain aggregate ('LeaseRenewalCampaign', 'Lease', etc.)
 * @param {string} params.aggregateId   - Aggregate ID
 * @param {object} [params.actor]       - Actor context (from SystemPrincipal or User)
 * @param {object} params.payload       - Event payload data
 * @param {number} [params.eventVersion]- Version number (default 1)
 * @returns {object} Formatted event envelope
 */
export const createEventEnvelope = ({
  eventType,
  aggregateType,
  aggregateId,
  actor = null,
  payload = {},
  eventVersion = 1
}) => ({
  eventId: randomUUID(),
  eventType,
  eventVersion,
  occurredAt: new Date().toISOString(),
  aggregateType,
  aggregateId: String(aggregateId),
  actor: actor ? {
    id: actor.id || actor.userId || 'system',
    type: actor.type || 'SYSTEM',
    source: actor.source || 'application',
    requestId: actor.requestId || null,
    correlationId: actor.correlationId || null
  } : null,
  payload
});
