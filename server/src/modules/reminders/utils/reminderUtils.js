/**
 * server/src/modules/reminders/utils/reminderUtils.js
 *
 * Helper utilities for idempotency keys, quiet hour calculations, and formatting.
 */

import { DEFAULT_QUIET_HOURS } from '../constants/reminderConstants.js';

/**
 * Generates a deterministic idempotency key for a reminder instance.
 * Pattern: ${ruleId}_${entityType}_${entityId}_${dateStr}_${channel}
 *
 * @param {string} ruleId
 * @param {string} entityType
 * @param {string|object} entityId
 * @param {Date|string} targetDate
 * @param {string} channel
 * @returns {string}
 */
export function generateIdempotencyKey(ruleId, entityType, entityId, targetDate, channel) {
  const entityIdStr = entityId?.toString() || 'unknown';
  const dateObj = targetDate instanceof Date ? targetDate : new Date(targetDate);
  const dateStr = isNaN(dateObj.getTime()) ? 'nodate' : dateObj.toISOString().split('T')[0];
  return `${ruleId}_${entityType}_${entityIdStr}_${dateStr}_${channel}`.toLowerCase();
}

/**
 * Checks whether a given Date falls within specified quiet hours.
 *
 * @param {object} quietHoursConfig - { enabled: boolean, startHour: number, endHour: number }
 * @param {Date} [checkDate=new Date()]
 * @returns {boolean}
 */
export function isInQuietHours(quietHoursConfig = DEFAULT_QUIET_HOURS, checkDate = new Date()) {
  if (!quietHoursConfig || !quietHoursConfig.enabled) {
    return false;
  }

  const { startHour = 22, endHour = 7 } = quietHoursConfig;
  const currentHour = checkDate.getHours();

  if (startHour > endHour) {
    // Overnight quiet hours (e.g. 22:00 to 07:00)
    return currentHour >= startHour || currentHour < endHour;
  } else {
    // Daytime quiet hours (e.g. 13:00 to 15:00)
    return currentHour >= startHour && currentHour < endHour;
  }
}

/**
 * Calculates the next allowed send time if current date falls within quiet hours.
 *
 * @param {object} quietHoursConfig
 * @param {Date} [checkDate=new Date()]
 * @returns {Date}
 */
export function getNextAllowedSendTime(quietHoursConfig = DEFAULT_QUIET_HOURS, checkDate = new Date()) {
  const date = new Date(checkDate.getTime());
  if (!isInQuietHours(quietHoursConfig, date)) {
    return date;
  }

  const { endHour = 7 } = quietHoursConfig;
  // Move to endHour today or tomorrow
  if (date.getHours() >= (quietHoursConfig.startHour || 22)) {
    date.setDate(date.getDate() + 1);
  }
  date.setHours(endHour, 0, 0, 0);
  return date;
}

export default {
  generateIdempotencyKey,
  isInQuietHours,
  getNextAllowedSendTime
};
