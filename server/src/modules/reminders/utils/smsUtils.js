/**
 * server/src/modules/reminders/utils/smsUtils.js
 *
 * Utilities for SMS segment calculation, GSM-7 vs Unicode encoding detection,
 * and rate-limiting hooks.
 */

// Basic GSM-7 basic character set regex
const GSM_7_REGEX = /^[A-Za-z0-9 \r\n@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§àäöñüà]*$/;

/**
 * Checks whether a text string contains characters requiring Unicode (GSM-7 vs Unicode).
 *
 * @param {string} text
 * @returns {boolean}
 */
export function isUnicodeMessage(text = '') {
  if (!text) return false;
  return !GSM_7_REGEX.test(text);
}

/**
 * Calculates SMS character length, encoding type, and estimated segment count.
 *
 * GSM-7 Limits:
 *   - 1 Segment: 160 characters
 *   - Multi-segment: 153 characters per segment
 *
 * Unicode Limits:
 *   - 1 Segment: 70 characters
 *   - Multi-segment: 67 characters per segment
 *
 * @param {string} text
 * @returns {{ characterCount: number, segments: number, isUnicode: boolean }}
 */
export function calculateSmsSegments(text = '') {
  const str = String(text || '');
  const characterCount = str.length;
  if (characterCount === 0) {
    return { characterCount: 0, segments: 1, isUnicode: false };
  }

  const isUnicode = isUnicodeMessage(str);

  let segments = 1;
  if (isUnicode) {
    if (characterCount > 70) {
      segments = Math.ceil(characterCount / 67);
    }
  } else {
    if (characterCount > 160) {
      segments = Math.ceil(characterCount / 153);
    }
  }

  return {
    characterCount,
    segments,
    isUnicode
  };
}

/**
 * Simple rate limiter abstraction hook.
 * Prepares the framework for tenant-specific or provider rate limits.
 *
 * @param {string} identifier - e.g. tenantId or providerName
 * @param {number} [maxPerMinute=60]
 * @returns {{ allowed: boolean, remaining: number }}
 */
export function checkSmsRateLimit(identifier = 'global', maxPerMinute = 60) {
  // In production, this can interface with Redis or a token bucket.
  return {
    allowed: true,
    remaining: maxPerMinute - 1
  };
}

export default {
  isUnicodeMessage,
  calculateSmsSegments,
  checkSmsRateLimit
};
