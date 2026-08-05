/**
 * server/src/modules/reminders/providers/ISmsProvider.js
 *
 * Abstract SMS Provider Interface & Standardized Delivery Result DTO.
 * All SMS driver implementations (Twilio, AWS SNS, MSG91, Simulated) MUST inherit or implement this contract.
 */

/**
 * Standardized Delivery Result DTO returned by all SMS Drivers.
 *
 * @param {object} params
 * @param {boolean} params.success
 * @param {string} params.provider - 'twilio' | 'aws_sns' | 'msg91' | 'simulated'
 * @param {string|null} [params.providerMessageId=null]
 * @param {number} [params.latencyMs=0]
 * @param {number} [params.segments=1]
 * @param {boolean} [params.isUnicode=false]
 * @param {object|null} [params.error=null]
 * @returns {object}
 */
export function createSmsDeliveryResult({
  success,
  provider,
  providerMessageId = null,
  latencyMs = 0,
  segments = 1,
  isUnicode = false,
  error = null
}) {
  return {
    success: Boolean(success),
    provider: provider || 'unknown',
    providerMessageId: providerMessageId ? String(providerMessageId) : null,
    latencyMs: Number(latencyMs) || 0,
    segments: Number(segments) || 1,
    isUnicode: Boolean(isUnicode),
    error: error
      ? {
          code: String(error.code || 'PROVIDER_ERROR'),
          message: String(error.message || 'Unknown SMS provider error')
        }
      : null
  };
}

/**
 * Base Abstract SMS Provider
 */
export class ISmsProvider {
  constructor(name = 'abstract_sms') {
    this.name = name;
  }

  /**
   * Dispatches an SMS message.
   *
   * @param {object} options
   * @param {string} options.to - Recipient phone number
   * @param {string} options.message - Text content
   * @param {object} [options.metadata] - { reminderId, entityId, correlationId, requestId }
   * @returns {Promise<SmsDeliveryResult>}
   */
  async send(options) {
    throw new Error(`Method 'send()' must be implemented by subclass ${this.constructor.name}`);
  }

  /**
   * Health check method verifying provider readiness and credentials.
   *
   * @returns {Promise<{ ready: boolean, provider: string, message: string }>}
   */
  async verify() {
    throw new Error(`Method 'verify()' must be implemented by subclass ${this.constructor.name}`);
  }
}

export default ISmsProvider;
