/**
 * server/src/modules/reminders/providers/SimulatedEmailProvider.js
 *
 * Developer & Testing Simulation Email Driver.
 * Logs structured dispatch metrics without sending actual external emails.
 */

import { IEmailProvider, createDeliveryResult } from './IEmailProvider.js';
import logger from '../../../platform/logging/logger.js';

export class SimulatedEmailProvider extends IEmailProvider {
  constructor(options = {}) {
    super('simulated');
    this.delayMs = options.delayMs || 10;
  }

  async send(options = {}) {
    const startTime = Date.now();
    const { to, subject, attachments = [], metadata = {} } = options;

    const recipientStr = Array.isArray(to) ? to.join(', ') : String(to || '');

    logger.info(`[SimulatedEmailProvider] Dispatching simulated email to ${recipientStr}`, {
      subject,
      attachmentCount: attachments.length,
      correlationId: metadata.correlationId || metadata.reminderId || null
    });

    if (this.delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delayMs));
    }

    const latencyMs = Date.now() - startTime;
    const providerMessageId = `sim-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    return createDeliveryResult({
      success: true,
      provider: this.name,
      providerMessageId,
      latencyMs,
      error: null
    });
  }

  async verify() {
    return {
      ready: true,
      provider: this.name,
      message: 'Simulated Email Provider is active and ready (development/testing mode).'
    };
  }
}

export default SimulatedEmailProvider;
