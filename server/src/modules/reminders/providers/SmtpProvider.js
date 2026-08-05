/**
 * server/src/modules/reminders/providers/SmtpProvider.js
 *
 * SMTP Production Driver using Nodemailer with 30s timeout guard and verify() health check.
 */

import nodemailer from 'nodemailer';
import { IEmailProvider, createDeliveryResult } from './IEmailProvider.js';
import config from '../../../config/config.js';
import logger from '../../../platform/logging/logger.js';

const DEFAULT_TIMEOUT_MS = 30000; // 30s timeout for SMTP operations

export class SmtpProvider extends IEmailProvider {
  constructor(options = {}) {
    super('smtp');
    this.host = options.host || process.env.SMTP_HOST || config.SMTP_HOST;
    this.port = parseInt(options.port || process.env.SMTP_PORT || config.SMTP_PORT || '587', 10);
    this.user = options.user || process.env.SMTP_USER || config.SMTP_USER;
    this.pass = options.pass || process.env.SMTP_PASS || config.SMTP_PASS;
    this.fromAddress = options.fromAddress || config.EMAIL_FROM || 'no-reply@tms-platform.com';
    this.timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

    if (this.host && this.user) {
      this.transporter = nodemailer.createTransport({
        host: this.host,
        port: this.port,
        secure: this.port === 465,
        auth: {
          user: this.user,
          pass: this.pass
        },
        connectionTimeout: this.timeoutMs
      });
    } else {
      this.transporter = null;
    }
  }

  async send(options = {}) {
    const startTime = Date.now();
    const { to, subject, html, text, attachments = [], metadata = {} } = options;

    if (!this.transporter) {
      return createDeliveryResult({
        success: false,
        provider: this.name,
        latencyMs: Date.now() - startTime,
        error: {
          code: 'MISSING_CONFIG',
          message: 'SMTP configuration (SMTP_HOST / SMTP_USER) is missing.'
        }
      });
    }

    const recipientStr = Array.isArray(to) ? to.join(', ') : String(to || '');

    const mailOptions = {
      from: `TMS Platform <${this.fromAddress}>`,
      to: recipientStr,
      subject,
      ...(html && { html }),
      ...(text && { text }),
      ...(attachments.length > 0 && { attachments }),
      headers: {
        'X-Reminder-Id': metadata.reminderId || '',
        'X-Correlation-Id': metadata.correlationId || metadata.requestId || ''
      }
    };

    logger.info(`[SmtpProvider] Sending SMTP email to ${recipientStr}`, {
      subject,
      attachmentCount: attachments.length,
      correlationId: metadata.correlationId || metadata.reminderId || null
    });

    let timeoutId;
    try {
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`SMTP provider request timed out after ${this.timeoutMs}ms`));
        }, this.timeoutMs);
      });

      const info = await Promise.race([
        this.transporter.sendMail(mailOptions),
        timeoutPromise
      ]);

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;
      const messageId = info?.messageId || `smtp-${Date.now()}`;

      logger.info(`[SmtpProvider] Successfully sent SMTP email to ${recipientStr}. Message ID: ${messageId} (${latencyMs}ms)`);

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
      logger.error(`[SmtpProvider] SMTP delivery failed to ${recipientStr}:`, err.message);

      return createDeliveryResult({
        success: false,
        provider: this.name,
        latencyMs,
        error: {
          code: isTimeout ? 'PROVIDER_TIMEOUT' : 'SMTP_DELIVERY_FAILED',
          message: err.message
        }
      });
    }
  }

  async verify() {
    if (!this.transporter) {
      return {
        ready: false,
        provider: this.name,
        message: 'SMTP credentials/host configuration is missing.'
      };
    }
    try {
      await this.transporter.verify();
      return {
        ready: true,
        provider: this.name,
        message: 'SMTP connection verified successfully.'
      };
    } catch (err) {
      return {
        ready: false,
        provider: this.name,
        message: `SMTP connection verification failed: ${err.message}`
      };
    }
  }
}

export default SmtpProvider;
