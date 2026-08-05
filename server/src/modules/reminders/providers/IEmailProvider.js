/**
 * server/src/modules/reminders/providers/IEmailProvider.js
 *
 * Abstract Email Provider Interface & Standardized Delivery Result DTO.
 * All email driver implementations (Resend, SMTP, Simulated) MUST inherit or implement this contract.
 */

/**
 * Standardized Delivery Result DTO returned by all Email Drivers.
 *
 * @param {object} params
 * @param {boolean} params.success
 * @param {string} params.provider - 'resend' | 'smtp' | 'simulated'
 * @param {string|null} [params.providerMessageId=null]
 * @param {number} [params.latencyMs=0]
 * @param {object|null} [params.error=null]
 * @returns {object}
 */
export function createDeliveryResult({
  success,
  provider,
  providerMessageId = null,
  latencyMs = 0,
  error = null
}) {
  return {
    success: Boolean(success),
    provider: provider || 'unknown',
    providerMessageId: providerMessageId ? String(providerMessageId) : null,
    latencyMs: Number(latencyMs) || 0,
    error: error
      ? {
          code: String(error.code || 'PROVIDER_ERROR'),
          message: String(error.message || 'Unknown provider error')
        }
      : null
  };
}

/**
 * Base Abstract Email Provider
 */
export class IEmailProvider {
  constructor(name = 'abstract') {
    this.name = name;
  }

  /**
   * Dispatches an email message.
   *
   * @param {object} options
   * @param {string|string[]} options.to
   * @param {string} options.subject
   * @param {string} [options.html]
   * @param {string} [options.text]
   * @param {Array<{filename: string, content?: any, contentType?: string, path?: string}>} [options.attachments=[]]
   * @param {object} [options.metadata] - { reminderId, campaignId, correlationId, requestId }
   * @returns {Promise<EmailDeliveryResult>}
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

export default IEmailProvider;
