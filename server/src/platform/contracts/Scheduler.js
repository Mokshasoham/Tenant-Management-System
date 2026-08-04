/**
 * src/platform/contracts/Scheduler.js
 *
 * Abstract contract for all Scheduler implementations.
 * Mirrors the JobDispatcher contract pattern used by the platform.
 *
 * Subclasses MUST implement:
 *   _process(metrics)  — the actual work performed on each tick
 *
 * Subclasses SHOULD NOT override:
 *   start / stop / _execute / health / runNow
 *   (these are managed by the Scheduler base class)
 */

export class SchedulerContract {
  /**
   * Start the cron schedule. Noop if already running.
   * @returns {void}
   */
  start() {
    throw new Error('start() not implemented.');
  }

  /**
   * Stop the cron schedule. Waits for any in-flight execution to complete.
   * @returns {Promise<void>}
   */
  async stop() {
    throw new Error('stop() not implemented.');
  }

  /**
   * Returns a structured health snapshot for this scheduler.
   * @returns {{ name, state, cronExpression, lastRun, nextRun, metrics, consecutiveFailures }}
   */
  async health() {
    throw new Error('health() not implemented.');
  }

  /**
   * Immediately triggers _execute() outside of the cron cadence.
   * Still acquires the execution lock.
   * @param {{ trigger, requestedBy, requestedAt }} [context]
   * @returns {Promise<object>} The execution result / metrics snapshot
   */
  async runNow(context = {}) {
    throw new Error('runNow() not implemented.');
  }

  /**
   * The actual work. Implemented by every concrete scheduler.
   * @param {{ processed, created, skipped, failed }} metrics  Mutable counters
   * @returns {Promise<void>}
   */
  async _process(metrics) {
    throw new Error('_process(metrics) not implemented.');
  }
}
