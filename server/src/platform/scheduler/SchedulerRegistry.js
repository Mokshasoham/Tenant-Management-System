/**
 * src/platform/scheduler/SchedulerRegistry.js
 *
 * Central registry for all platform schedulers.
 * Provides group lifecycle management (startAll / stopAll) and
 * aggregated health reporting consumed by the /health endpoint and scheduler routes.
 *
 * Usage:
 *   import schedulerRegistry from './SchedulerRegistry.js';
 *   schedulerRegistry.register(new CampaignCreationScheduler());
 *   await schedulerRegistry.startAll();
 *   ...
 *   await schedulerRegistry.stopAll();
 */

import logger from '../logging/logger.js';

class SchedulerRegistry {
  constructor() {
    /** @type {Map<string, import('./Scheduler.js').Scheduler>} */
    this._schedulers = new Map();
  }

  /**
   * Register a scheduler. Throws if a scheduler with the same name is already registered.
   * @param {import('./Scheduler.js').Scheduler} scheduler
   */
  register(scheduler) {
    if (!scheduler || !scheduler.name) {
      throw new Error('SchedulerRegistry: scheduler must have a name property.');
    }
    if (this._schedulers.has(scheduler.name)) {
      throw new Error(`SchedulerRegistry: A scheduler named "${scheduler.name}" is already registered.`);
    }
    this._schedulers.set(scheduler.name, scheduler);
    logger.info(`[SchedulerRegistry] Registered scheduler: "${scheduler.name}"`);
  }

  /**
   * Start all registered schedulers.
   * Failures in one scheduler do not prevent others from starting.
   */
  async startAll() {
    logger.info(`[SchedulerRegistry] Starting ${this._schedulers.size} scheduler(s)...`);
    const starts = Array.from(this._schedulers.entries()).map(async ([name, scheduler]) => {
      try {
        await scheduler.start();
        logger.info(`[SchedulerRegistry] Started: "${name}"`);
      } catch (err) {
        logger.error(`[SchedulerRegistry] Failed to start "${name}": ${err.message}`);
      }
    });
    await Promise.allSettled(starts);
    logger.info('[SchedulerRegistry] All schedulers started.');
  }

  /**
   * Stop all registered schedulers gracefully (parallel, with Promise.allSettled).
   * Waits for each in-flight execution to complete.
   * @returns {Promise<void>}
   */
  async stopAll() {
    logger.info(`[SchedulerRegistry] Stopping ${this._schedulers.size} scheduler(s)...`);
    const stops = Array.from(this._schedulers.values()).map(s =>
      s.stop().catch(err =>
        logger.error(`[SchedulerRegistry] Error stopping "${s.name}": ${err.message}`)
      )
    );
    await Promise.allSettled(stops);
    logger.info('[SchedulerRegistry] All schedulers stopped.');
  }

  /**
   * Returns a scheduler by name, or null if not found.
   * @param {string} name
   * @returns {import('./Scheduler.js').Scheduler|null}
   */
  get(name) {
    return this._schedulers.get(name) || null;
  }

  /**
   * Returns all registered scheduler names.
   * @returns {string[]}
   */
  names() {
    return Array.from(this._schedulers.keys());
  }

  /**
   * Returns aggregate health for all registered schedulers.
   * Overall status is DEGRADED if any individual scheduler is DEGRADED or FAILED.
   *
   * @returns {Promise<{ status: string, schedulers: object[] }>}
   */
  async health() {
    const schedulerHealths = await Promise.all(
      Array.from(this._schedulers.values()).map(s => s.health())
    );

    const overallStatus = schedulerHealths.some(h => h.status !== 'UP') ? 'DEGRADED' : 'UP';

    return {
      status: overallStatus,
      count: this._schedulers.size,
      schedulers: schedulerHealths
    };
  }
}

// Export a singleton registry instance
const schedulerRegistry = new SchedulerRegistry();
export default schedulerRegistry;
export { SchedulerRegistry };
