/**
 * server/src/modules/reminders/providers/emailProviderFactory.js
 *
 * Factory resolving the active Email Driver based on environment settings and availability.
 */

import config from '../../../config/config.js';
import ResendProvider from './ResendProvider.js';
import SmtpProvider from './SmtpProvider.js';
import SimulatedEmailProvider from './SimulatedEmailProvider.js';
import logger from '../../../platform/logging/logger.js';

let activeProviderInstance = null;

/**
 * Returns an instance of the configured or specified Email Provider.
 *
 * Priority / Selection Logic:
 *   1. Explicit override if provided.
 *   2. `config.EMAIL_PROVIDER` if set ('resend', 'smtp', 'simulated').
 *   3. If `RESEND_API_KEY` present -> `ResendProvider`.
 *   4. If `SMTP_HOST` present -> `SmtpProvider`.
 *   5. Fallback -> `SimulatedEmailProvider`.
 *
 * @param {string} [requestedProvider]
 * @param {object} [options={}]
 * @returns {IEmailProvider}
 */
export function getEmailProvider(requestedProvider, options = {}) {
  const providerName = (requestedProvider || process.env.EMAIL_PROVIDER || config.EMAIL_PROVIDER || '').toLowerCase();

  if (providerName === 'resend') {
    return new ResendProvider(options);
  }
  if (providerName === 'smtp') {
    return new SmtpProvider(options);
  }
  if (providerName === 'simulated' || providerName === 'simulation') {
    return new SimulatedEmailProvider(options);
  }

  // Automatic detection if no explicit provider specified
  if (config.RESEND_API_KEY || process.env.RESEND_API_KEY) {
    return new ResendProvider(options);
  }
  if (process.env.SMTP_HOST || config.SMTP_HOST) {
    return new SmtpProvider(options);
  }

  // Fallback to simulation driver in development/test
  return new SimulatedEmailProvider(options);
}

/**
 * Verifies health and readiness of the active email provider.
 *
 * @param {string} [requestedProvider]
 * @returns {Promise<{ ready: boolean, provider: string, message: string }>}
 */
export async function verifyActiveProvider(requestedProvider) {
  const provider = getEmailProvider(requestedProvider);
  const health = await provider.verify();
  logger.info(`[emailProviderFactory] Active Email Provider: ${health.provider} (Ready: ${health.ready})`);
  return health;
}

export default {
  getEmailProvider,
  verifyActiveProvider
};
