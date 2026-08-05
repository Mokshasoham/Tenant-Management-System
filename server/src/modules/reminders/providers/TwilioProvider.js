/**
 * server/src/modules/reminders/providers/TwilioProvider.js
 *
 * Production SMS Driver using Twilio REST API with timeout guard and structured telemetry.
 */

import { ISmsProvider, createSmsDeliveryResult } from './ISmsProvider.js';
import { calculateSmsSegments } from '../utils/smsUtils.js';
import config from '../../../config/config.js';
import logger from '../../../platform/logging/logger.js';

const DEFAULT_TIMEOUT_MS = 15000; // 15s timeout for Twilio API

export class TwilioProvider extends ISmsProvider {
  constructor(options = {}) {
    super('twilio');
    this.accountSid = options.accountSid || process.env.TWILIO_ACCOUNT_SID || config.TWILIO_ACCOUNT_SID;
    this.authToken = options.authToken || process.env.TWILIO_AUTH_TOKEN || config.TWILIO_AUTH_TOKEN;
    this.fromNumber = options.fromNumber || process.env.TWILIO_PHONE_NUMBER || config.TWILIO_PHONE_NUMBER;
    this.timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  }

  async send(options = {}) {
    const startTime = Date.now();
    const { to, message = '', metadata = {} } = options;
    const { segments, isUnicode } = calculateSmsSegments(message);

    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      return createSmsDeliveryResult({
        success: false,
        provider: this.name,
        latencyMs: Date.now() - startTime,
        segments,
        isUnicode,
        error: {
          code: 'MISSING_CONFIG',
          message: 'Twilio configuration (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER) is missing.'
        }
      });
    }

    const recipientStr = String(to || '');
    logger.info(`[TwilioProvider] Sending SMS via Twilio to ${recipientStr}`, {
      segments,
      isUnicode,
      correlationId: metadata.correlationId || metadata.reminderId || null
    });

    let timeoutId;
    try {
      // Dynamic import to prevent fail-fast if twilio package is optional
      const twilioModule = await import('twilio').catch(() => null);
      if (!twilioModule) {
        throw new Error('Twilio SDK package is not installed in the system.');
      }

      const client = twilioModule.default(this.accountSid, this.authToken);

      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Twilio provider request timed out after ${this.timeoutMs}ms`));
        }, this.timeoutMs);
      });

      const response = await Promise.race([
        client.messages.create({
          body: message,
          from: this.fromNumber,
          to: recipientStr
        }),
        timeoutPromise
      ]);

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;
      const providerMessageId = response?.sid || `tw-${Date.now()}`;

      logger.info(`[TwilioProvider] Successfully sent SMS via Twilio. SID: ${providerMessageId} (${latencyMs}ms)`);

      return createSmsDeliveryResult({
        success: true,
        provider: this.name,
        providerMessageId,
        latencyMs,
        segments,
        isUnicode,
        error: null
      });
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;
      const isTimeout = err.message?.includes('timed out');
      logger.error(`[TwilioProvider] Twilio SMS delivery failed to ${recipientStr}:`, err.message);

      return createSmsDeliveryResult({
        success: false,
        provider: this.name,
        latencyMs,
        segments,
        isUnicode,
        error: {
          code: isTimeout ? 'PROVIDER_TIMEOUT' : 'TWILIO_DELIVERY_FAILED',
          message: err.message
        }
      });
    }
  }

  async verify() {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      return {
        ready: false,
        provider: this.name,
        message: 'Twilio configuration credentials (SID/Token/FromNumber) are missing.'
      };
    }
    return {
      ready: true,
      provider: this.name,
      message: 'Twilio credentials are configured.'
    };
  }
}

export default TwilioProvider;
