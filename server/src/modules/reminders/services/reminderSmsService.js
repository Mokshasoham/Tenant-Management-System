/**
 * server/src/modules/reminders/services/reminderSmsService.js
 *
 * High-level Reminder SMS Service coordinating Quiet Hours evaluation,
 * segment calculation, and SMS Provider Drivers.
 */

import { getSmsProvider, verifyActiveSmsProvider } from '../providers/smsProviderFactory.js';
import { isInQuietHours, getNextAllowedSendTime } from '../utils/reminderUtils.js';
import { calculateSmsSegments } from '../utils/smsUtils.js';
import logger from '../../../platform/logging/logger.js';

export class ReminderSmsService {
  /**
   * Dispatches an SMS reminder. Evaluates quiet hours and defers if inside quiet window.
   *
   * @param {object} params
   * @param {string} params.recipientPhone - Destination phone number
   * @param {string} params.textMessage - SMS message text
   * @param {object} [params.quietHours] - User quiet hours config { enabled, startHour, endHour }
   * @param {boolean} [params.overrideQuietHours=false] - Urgent SLA alerts can bypass quiet hours
   * @param {object} [params.metadata={}] - { reminderId, entityId, correlationId }
   * @param {string} [params.providerName] - Optional provider override ('twilio', 'aws_sns', 'msg91', 'simulated')
   * @returns {Promise<SmsDeliveryResult>}
   */
  async sendReminderSms({
    recipientPhone,
    textMessage,
    quietHours,
    overrideQuietHours = false,
    metadata = {},
    providerName
  }) {
    if (!recipientPhone) {
      throw new Error('[ReminderSmsService] recipientPhone is required');
    }
    if (!textMessage) {
      throw new Error('[ReminderSmsService] textMessage is required');
    }

    const now = new Date();

    // 1. Quiet Hours Evaluation
    if (!overrideQuietHours && quietHours && isInQuietHours(quietHours, now)) {
      const deferredUntil = getNextAllowedSendTime(quietHours, now);
      logger.info(`[ReminderSmsService] Quiet hours active for ${recipientPhone}. Deferring delivery until ${deferredUntil.toISOString()}`);

      return {
        success: false,
        deferred: true,
        deferredUntil,
        provider: 'quiet_hours_deferral',
        providerMessageId: null,
        latencyMs: 0,
        ...calculateSmsSegments(textMessage),
        error: {
          code: 'QUIET_HOURS_DEFERRED',
          message: `Delivery deferred to ${deferredUntil.toISOString()} due to quiet hours policy.`
        }
      };
    }

    // 2. Resolve SMS Driver
    const driver = getSmsProvider(providerName);

    // 3. Dispatch SMS
    const result = await driver.send({
      to: recipientPhone,
      message: textMessage,
      metadata
    });

    logger.info(`[ReminderSmsService] SMS dispatch result via provider '${result.provider}': success=${result.success}, segments=${result.segments}, latency=${result.latencyMs}ms, msgId=${result.providerMessageId}`);
    return result;
  }

  /**
   * Health check for SMS configuration and provider readiness.
   *
   * @param {string} [providerName]
   * @returns {Promise<{ ready: boolean, provider: string, message: string }>}
   */
  async verifyHealth(providerName) {
    return await verifyActiveSmsProvider(providerName);
  }

  /**
   * Dispatches a diagnostic test SMS to verify configuration.
   *
   * @param {string} [providerName]
   * @param {string} recipientPhone
   * @returns {Promise<SmsDeliveryResult>}
   */
  async sendTestSms(providerName, recipientPhone) {
    const testMessage = 'TMS Platform Diagnostic Test SMS: Your SMS provider driver is working correctly!';
    return await this.sendReminderSms({
      recipientPhone,
      textMessage: testMessage,
      overrideQuietHours: true,
      providerName,
      metadata: { reminderId: 'test-sms-id', correlationId: `test-sms-${Date.now()}` }
    });
  }
}

const reminderSmsServiceSingleton = new ReminderSmsService();
export default reminderSmsServiceSingleton;
