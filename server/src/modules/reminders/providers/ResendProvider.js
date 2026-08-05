/**
 * server/src/modules/reminders/providers/ResendProvider.js
 *
 * Production Email Driver using Resend API SDK with timeout guard and structured telemetry.
 */

import { Resend } from 'resend';
import { IEmailProvider, createDeliveryResult } from './IEmailProvider.js';
import config from '../../../config/config.js';
import logger from '../../../platform/logging/logger.js';

const DEFAULT_TIMEOUT_MS = 15000; // 15s timeout for Resend API calls

export class ResendProvider extends IEmailProvider {
  constructor(options = {}) {
    super('resend');
    this.apiKey = options.apiKey || config.RESEND_API_KEY;
    this.fromAddress = options.fromAddress || config.EMAIL_FROM || 'no-reply@tms-platform.com';
    this.replyToAddress = options.replyToAddress || config.EMAIL_REPLY_TO;
    this.timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

    this.client = this.apiKey ? new Resend(this.apiKey) : null;
  }

  async send(options = {}) {
    const startTime = Date.now();
    const { to, subject, html, text, attachments = [], metadata = {} } = options;

    if (!this.client || !this.apiKey) {
      return createDeliveryResult({
        success: false,
        provider: this.name,
        latencyMs: Date.now() - startTime,
        error: {
          code: 'MISSING_CONFIG',
          message: 'Resend API key is not configured in the environment.'
        }
      });
    }

    const recipientArr = Array.isArray(to) ? to : [to];

    const payload = {
      from: `TMS Platform <${this.fromAddress}>`,
      to: recipientArr,
      subject,
      ...(this.replyToAddress && { replyTo: this.replyToAddress }),
      ...(html && { html }),
      ...(text && { text }),
      ...(attachments.length > 0 && { attachments }),
      headers: {
        'X-Reminder-Id': metadata.reminderId || '',
        'X-Correlation-Id': metadata.correlationId || metadata.requestId || ''
      }
    };

    logger.info(`[ResendProvider] Sending email to ${recipientArr.join(', ')}`, {
      subject,
      attachmentCount: attachments.length,
      correlationId: metadata.correlationId || metadata.reminderId || null
    });

    let timeoutId;
    try {
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Resend provider request timed out after ${this.timeoutMs}ms`));
        }, this.timeoutMs);
      });

      const response = await Promise.race([
        this.client.emails.send(payload),
        timeoutPromise
      ]);

      clearTimeout(timeoutId);

      const latencyMs = Date.now() - startTime;

      if (response.error) {
        logger.error(`[ResendProvider] Resend API error sending to ${recipientArr.join(', ')}:`, response.error.message);
        return createDeliveryResult({
          success: false,
          provider: this.name,
          latencyMs,
          error: {
            code: response.error.name || 'RESEND_API_ERROR',
            message: response.error.message || 'Resend delivery failed'
          }
        });
      }

      const messageId = response.data?.id;
      logger.info(`[ResendProvider] Successfully sent email via Resend. ID: ${messageId} (${latencyMs}ms)`);

      return createDeliveryResult({
        success: true,
        provider: this.name,
        providerMessageId: messageId,
        latencyMs,
        error: null
      });
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;
      const isTimeout = err.message?.includes('timed out');
      logger.error(`[ResendProvider] Delivery failed to ${recipientArr.join(', ')}:`, err.message);

      return createDeliveryResult({
        success: false,
        provider: this.name,
        latencyMs,
        error: {
          code: isTimeout ? 'PROVIDER_TIMEOUT' : 'DELIVERY_FAILED',
          message: err.message
        }
      });
    }
  }

  async verify() {
    if (!this.apiKey) {
      return {
        ready: false,
        provider: this.name,
        message: 'RESEND_API_KEY configuration is missing.'
      };
    }
    return {
      ready: true,
      provider: this.name,
      message: 'Resend API key is configured.'
    };
  }
}

export default ResendProvider;
