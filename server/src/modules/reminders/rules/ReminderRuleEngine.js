/**
 * server/src/modules/reminders/rules/ReminderRuleEngine.js
 *
 * Reminder Rule Engine.
 * Evaluates ReminderRules against domain entities (Leases, Payments, Campaigns),
 * checks User Preferences & Quiet Hours, and enqueues tasks into ReminderQueue.
 *
 * IMPORTANT: The Rule Engine NEVER sends reminders directly. It only produces queue items.
 */

import reminderQueue from '../queue/reminderQueue.js';
import reminderPreferenceRepository from '../repositories/reminderPreferenceRepository.js';
import { generateIdempotencyKey, getNextAllowedSendTime, isInQuietHours } from '../utils/reminderUtils.js';
import { ReminderStatus, ReminderChannel } from '../constants/reminderConstants.js';
import logger from '../../../platform/logging/logger.js';

export class ReminderRuleEngine {
  /**
   * Evaluates a rule against a target entity and recipient, enqueuing a reminder task if eligible.
   *
   * @param {object} params
   * @param {object} params.rule - ReminderRule object
   * @param {string} params.entityType - 'Lease', 'Payment', 'Campaign', etc.
   * @param {object|string} params.entityId - Entity ObjectId
   * @param {object|string} params.recipientId - User ObjectId
   * @param {Date} params.targetDate - Milestone/Due date
   * @param {object} [params.payload={}] - Variable payload for template
   * @returns {Promise<Array<{ channel: string, success: boolean, reason?: string }>>}
   */
  async evaluateAndEnqueue({
    rule,
    entityType,
    entityId,
    recipientId,
    targetDate,
    payload = {}
  }) {
    if (!rule || !rule.isEnabled) {
      return [{ success: false, reason: 'RULE_DISABLED' }];
    }

    if (!entityType || !entityId || !recipientId || !targetDate) {
      return [{ success: false, reason: 'MISSING_REQUIRED_PARAMS' }];
    }

    // Fetch Recipient Preferences
    const prefs = await reminderPreferenceRepository.getByUser(recipientId);
    const results = [];

    const dateObj = targetDate instanceof Date ? targetDate : new Date(targetDate);

    for (const channel of rule.channels || []) {
      // 1. Channel Preference Opt-Out Check
      if (channel === ReminderChannel.EMAIL && !prefs.emailEnabled) {
        logger.info(`[ReminderRuleEngine] Recipient ${recipientId} opted out of Email. Skipping.`);
        results.push({ channel, success: false, reason: 'USER_OPTED_OUT_EMAIL' });
        continue;
      }
      if (channel === ReminderChannel.SMS && !prefs.smsEnabled) {
        logger.info(`[ReminderRuleEngine] Recipient ${recipientId} opted out of SMS. Skipping.`);
        results.push({ channel, success: false, reason: 'USER_OPTED_OUT_SMS' });
        continue;
      }

      // 2. Category Opt-Out Check
      if (rule.category && prefs.categoryPreferences?.get(rule.category) === false) {
        logger.info(`[ReminderRuleEngine] Recipient ${recipientId} opted out of category '${rule.category}'. Skipping.`);
        results.push({ channel, success: false, reason: 'USER_OPTED_OUT_CATEGORY' });
        continue;
      }

      // 3. Compute Scheduled Date (incorporating offsetDays & Quiet Hours)
      const offsetDays = rule.offsetDays || 0;
      let scheduledDate = new Date(dateObj.getTime() + offsetDays * 24 * 60 * 60 * 1000);

      // Adjust for Quiet Hours if applicable for SMS
      if (channel === ReminderChannel.SMS && prefs.quietHours && isInQuietHours(prefs.quietHours, scheduledDate)) {
        scheduledDate = getNextAllowedSendTime(prefs.quietHours, scheduledDate);
      }

      // 4. Generate Idempotency Key
      const idempotencyKey = generateIdempotencyKey(
        rule.ruleId,
        entityType,
        entityId,
        dateObj,
        channel
      );

      // 5. Enqueue Reminder Task
      const enqueueRes = await reminderQueue.enqueueReminder({
        idempotencyKey,
        ruleId: rule.ruleId,
        entityType,
        entityId,
        recipient: recipientId,
        channel,
        scheduledFor: scheduledDate,
        payload: {
          ...payload,
          templateId: rule.templateId
        }
      });

      results.push({ channel, ...enqueueRes });
    }

    return results;
  }
}

const reminderRuleEngineSingleton = new ReminderRuleEngine();
export default reminderRuleEngineSingleton;
