/**
 * src/modules/lease-renewal/schedulers/index.js
 *
 * Scheduler registration entry point for the lease-renewal module.
 *
 * Instantiates all three schedulers and registers them with the
 * platform SchedulerRegistry singleton. Imported once during server
 * bootstrap (index.js) after the database connection is established.
 *
 * Import ordering: registry must be imported BEFORE schedulers to
 * avoid circular dependency issues.
 */

import schedulerRegistry from '../../../platform/scheduler/SchedulerRegistry.js';
import { CampaignCreationScheduler } from './CampaignCreationScheduler.js';
import { CampaignExpirationScheduler } from './CampaignExpirationScheduler.js';
import { EscalationScheduler } from './EscalationScheduler.js';
import logger from '../../../platform/logging/logger.js';

let registered = false;

/**
 * Register all lease-renewal schedulers with the platform registry.
 * Idempotent — safe to call multiple times (e.g. in tests).
 */
export const registerLeaseRenewalSchedulers = () => {
  if (registered) return;
  registered = true;

  try {
    schedulerRegistry.register(new CampaignCreationScheduler());
    schedulerRegistry.register(new CampaignExpirationScheduler());
    schedulerRegistry.register(new EscalationScheduler());
    logger.info('[LeaseRenewalSchedulers] All schedulers registered successfully.');
  } catch (err) {
    logger.error('[LeaseRenewalSchedulers] Failed to register schedulers:', err.message);
    throw err;
  }
};

export { schedulerRegistry };
