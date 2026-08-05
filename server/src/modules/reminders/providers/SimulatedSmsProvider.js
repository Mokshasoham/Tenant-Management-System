/**
 * server/src/modules/reminders/providers/SimulatedSmsProvider.js
 *
 * Developer & Testing Simulation SMS Driver.
 * Logs structured dispatch metrics without sending actual SMS network requests.
 */

import { ISmsProvider, createSmsDeliveryResult } from './ISmsProvider.js';
import { calculateSmsSegments } from '../utils/smsUtils.js';
import logger from '../../../platform/logging/logger.js';

export class SimulatedSmsProvider extends ISmsProvider {
  constructor(options = {}) {
    super('simulated');
    this.delayMs = options.delayMs || 10;
  }

  async send(options = {}) {
    const startTime = Date.now();
    const { to, message = '', metadata = {} } = options;

    const { segments, isUnicode } = calculateSmsSegments(message);
    const recipientStr = String(to || '');

    logger.info(`[SimulatedSmsProvider] Dispatching simulated SMS to ${recipientStr}`, {
      messageLength: message.length,
      segments,
      isUnicode,
      correlationId: metadata.correlationId || metadata.reminderId || null
    });

    if (this.delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delayMs));
    }

    const latencyMs = Date.now() - startTime;
    const providerMessageId = `sim-sms-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    return createSmsDeliveryResult({
      success: true,
      provider: this.name,
      providerMessageId,
      latencyMs,
      segments,
      isUnicode,
      error: null
    });
  }

  async verify() {
    return {
      ready: true,
      provider: this.name,
      message: 'Simulated SMS Provider is active and ready (development/testing mode).'
    };
  }
}

export default SimulatedSmsProvider;
