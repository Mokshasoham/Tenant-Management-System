/**
 * server/src/modules/reminders/providers/smsProviderFactory.js
 *
 * Factory resolving the active SMS Driver based on environment settings and availability.
 */

import TwilioProvider from './TwilioProvider.js';
import AwsSnsProvider from './AwsSnsProvider.js';
import Msg91Provider from './Msg91Provider.js';
import SimulatedSmsProvider from './SimulatedSmsProvider.js';
import logger from '../../../platform/logging/logger.js';

/**
 * Returns an instance of the configured or specified SMS Provider.
 *
 * Selection Logic:
 *   1. Explicit requested provider if supplied ('twilio', 'aws_sns', 'msg91', 'simulated').
 *   2. `process.env.SMS_PROVIDER` if set.
 *   3. If `TWILIO_ACCOUNT_SID` present -> `TwilioProvider`.
 *   4. If `AWS_ACCESS_KEY_ID` present -> `AwsSnsProvider`.
 *   5. If `MSG91_AUTH_KEY` present -> `Msg91Provider`.
 *   6. Fallback -> `SimulatedSmsProvider`.
 *
 * @param {string} [requestedProvider]
 * @param {object} [options={}]
 * @returns {ISmsProvider}
 */
export function getSmsProvider(requestedProvider, options = {}) {
  const providerName = (requestedProvider || process.env.SMS_PROVIDER || '').toLowerCase();

  if (providerName === 'twilio') {
    return new TwilioProvider(options);
  }
  if (providerName === 'aws_sns' || providerName === 'sns') {
    return new AwsSnsProvider(options);
  }
  if (providerName === 'msg91') {
    return new Msg91Provider(options);
  }
  if (providerName === 'simulated' || providerName === 'simulation') {
    return new SimulatedSmsProvider(options);
  }

  // Automatic detection
  if (process.env.TWILIO_ACCOUNT_SID) {
    return new TwilioProvider(options);
  }
  if (process.env.MSG91_AUTH_KEY) {
    return new Msg91Provider(options);
  }
  if (process.env.AWS_ACCESS_KEY_ID) {
    return new AwsSnsProvider(options);
  }

  // Fallback to simulation driver in development/test
  return new SimulatedSmsProvider(options);
}

/**
 * Verifies health and readiness of the active SMS provider.
 *
 * @param {string} [requestedProvider]
 * @returns {Promise<{ ready: boolean, provider: string, message: string }>}
 */
export async function verifyActiveSmsProvider(requestedProvider) {
  const provider = getSmsProvider(requestedProvider);
  const health = await provider.verify();
  logger.info(`[smsProviderFactory] Active SMS Provider: ${health.provider} (Ready: ${health.ready})`);
  return health;
}

export default {
  getSmsProvider,
  verifyActiveSmsProvider
};
