/**
 * src/platform/scheduler/Scheduler.js
 *
 * Abstract base class for all platform schedulers.
 * Implements the SchedulerContract interface.
 *
 * Lifecycle:
 *   IDLE     → start()    → RUNNING
 *   RUNNING  → stop()     → STOPPING → STOPPED
 *   RUNNING  → _execute() → RUNNING   (re-entrant guard via lock)
 *   any      → 5+ failures → state = FAILED, health = DEGRADED
 *
 * Subclasses override only _process(metrics).
 * All scheduling, locking, metrics, and logging are handled here.
 *
 * Usage:
 *   // Production (cron expression)
 *   new MyConcrete({ name: 'my-job', cron: '0 6 * * *' });
 *
 *   // Tests (tickMs override — use with jest.useFakeTimers())
 *   new MyConcrete({ name: 'my-job', tickMs: 100 });
 */

import { randomUUID } from 'crypto';
import { SchedulerContract } from '../contracts/Scheduler.js';
import { SchedulerLock } from './SchedulerLock.js';
import { SchedulerMetrics } from './SchedulerMetrics.js';
import logger from '../logging/logger.js';
// node-cron is loaded lazily inside start() so test environments (tickMs mode)
// never trigger the ESM parse of the node-cron bundle.

// Scheduler lifecycle states
export const SchedulerState = {
  IDLE:     'IDLE',      // constructed, not yet started
  RUNNING:  'RUNNING',  // cron is active; between executions
  STOPPING: 'STOPPING', // stop() called; waiting for in-flight execution
  STOPPED:  'STOPPED',  // cleanly stopped
  FAILED:   'FAILED'    // exceeded consecutive failure threshold
};

// Number of consecutive failures before state transitions to FAILED
const FAILURE_THRESHOLD = 5;

export class Scheduler extends SchedulerContract {
  /**
   * @param {object} options
   * @param {string}  options.name           - Unique scheduler identifier
   * @param {string}  [options.cron]         - Standard 5-field cron expression
   * @param {number}  [options.tickMs]       - Interval in ms (overrides cron; for tests)
   * @param {object}  [options.logger]       - Injectable logger (defaults to platform logger)
   * @param {object}  [options.lock]         - Injectable SchedulerLock (defaults to new instance)
   * @param {object}  [options.metrics]      - Injectable SchedulerMetrics (defaults to new instance)
   * @param {number}  [options.lockTtl]      - Lock TTL in seconds (default 120)
   */
  constructor({ name, cron: cronExpr, tickMs, logger: _logger, lock, metrics, lockTtl = 120 } = {}) {
    super();

    if (!name) throw new Error('Scheduler requires a name.');
    if (!cronExpr && !tickMs) throw new Error(`Scheduler "${name}" requires either cron or tickMs.`);

    this.name = name;
    this.cronExpression = cronExpr || null;
    this.tickMs = tickMs || null;

    this._logger = _logger || logger;
    this._lock = lock || new SchedulerLock(name, lockTtl);
    this._metrics = metrics || new SchedulerMetrics();

    this._state = SchedulerState.IDLE;
    this._cronTask = null;        // node-cron task handle
    this._intervalHandle = null;  // setInterval handle (tickMs mode)
    this._inflightExecution = null; // Promise of in-progress _execute() call
    this._startedAt = null;
    this._nextRunAt = null;
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Start the cron schedule.
   * Noop if already RUNNING or STOPPING.
   */
  async start() {
    if (this._state === SchedulerState.RUNNING || this._state === SchedulerState.STOPPING) {
      this._logger.warn(`[Scheduler:${this.name}] start() called but already in state ${this._state}. Ignoring.`);
      return;
    }

    this._state = SchedulerState.RUNNING;
    this._startedAt = new Date().toISOString();

    if (this.tickMs) {
      // Test mode: setInterval
      this._intervalHandle = setInterval(() => this._execute('cron'), this.tickMs);
      this._logger.info(`[Scheduler:${this.name}] Started in test mode (tickMs=${this.tickMs}).`);
    } else {
      // Production mode: node-cron (lazy import to keep test environments clean)
      const { default: cron } = await import('node-cron');
      if (!cron.validate(this.cronExpression)) {
        throw new Error(`[Scheduler:${this.name}] Invalid cron expression: "${this.cronExpression}"`);
      }
      this._cronTask = cron.schedule(this.cronExpression, () => this._execute('cron'), {
        scheduled: true,
        timezone: process.env.SCHEDULER_TIMEZONE || 'UTC'
      });
      this._logger.info(`[Scheduler:${this.name}] Started. Cron: "${this.cronExpression}"`);
    }
  }

  /**
   * Stop the scheduler gracefully.
   * Waits for any in-flight execution to finish before resolving.
   * @returns {Promise<void>}
   */
  async stop() {
    if (this._state === SchedulerState.STOPPED || this._state === SchedulerState.IDLE) {
      return;
    }

    this._state = SchedulerState.STOPPING;
    this._logger.info(`[Scheduler:${this.name}] Stopping...`);

    // Stop accepting new ticks immediately
    if (this._cronTask) {
      this._cronTask.stop();
      this._cronTask = null;
    }
    if (this._intervalHandle) {
      clearInterval(this._intervalHandle);
      this._intervalHandle = null;
    }

    // Wait for any in-flight execution
    if (this._inflightExecution) {
      this._logger.info(`[Scheduler:${this.name}] Waiting for in-flight execution to complete...`);
      try {
        await this._inflightExecution;
      } catch {
        // Already logged inside _execute; we just need to await it
      }
    }

    this._state = SchedulerState.STOPPED;
    this._logger.info(`[Scheduler:${this.name}] Stopped cleanly.`);
  }

  /**
   * Trigger an immediate execution outside the cron cadence.
   * Still acquires the lock — does not bypass idempotency.
   *
   * @param {{ trigger?, requestedBy?, requestedAt? }} [context]
   * @returns {Promise<object>} Execution metrics snapshot
   */
  async runNow(context = {}) {
    const manualContext = {
      trigger: 'manual',
      requestedBy: context.requestedBy || 'system',
      requestedAt: context.requestedAt || new Date().toISOString(),
      ...context
    };

    this._logger.info(`[Scheduler:${this.name}] runNow() triggered.`, manualContext);
    await this._execute('manual', manualContext);
    return this._metrics.lastExecution();
  }

  /**
   * Returns a structured health snapshot.
   * State transitions to FAILED if consecutive failures exceed threshold.
   */
  async health() {
    const metricsSummary = this._metrics.summary();

    // Promote to FAILED state if threshold exceeded (and currently RUNNING)
    if (
      this._state === SchedulerState.RUNNING &&
      metricsSummary.consecutiveFailures >= FAILURE_THRESHOLD
    ) {
      this._state = SchedulerState.FAILED;
      this._logger.error(
        `[Scheduler:${this.name}] Marked FAILED after ${metricsSummary.consecutiveFailures} consecutive failures.`
      );
    }

    const healthStatus = this._state === SchedulerState.FAILED ? 'DEGRADED' : 'UP';
    const lockOwner = await this._lock.getOwner();

    let queueDepth = 0;
    try {
      const { getPendingOutboxCount } = await import('../events/outboxService.js');
      queueDepth = await getPendingOutboxCount();
    } catch {}

    const uptimeSec = this._startedAt ? Math.round((Date.now() - new Date(this._startedAt).getTime()) / 1000) : 0;

    return {
      name: this.name,
      state: this._state,
      status: healthStatus,
      running: this._state === SchedulerState.RUNNING,
      cronExpression: this.cronExpression,
      startedAt: this._startedAt,
      uptimeSec,
      queueDepth,
      currentExecutionId: this._lock.isHeld() ? this._lock._currentExecutionId : null,
      lockOwner,
      lastRun: this._metrics.lastExecution(),
      lastSuccess: metricsSummary.lastSuccessAt,
      lastFailure: metricsSummary.lastFailureAt,
      successRate: metricsSummary.successRate,
      averageDurationMs: metricsSummary.averageDurationMs,
      consecutiveFailures: metricsSummary.consecutiveFailures,
      metrics: metricsSummary
    };
  }

  // ─── Internal Execution Engine ─────────────────────────────────────────────

  /**
   * Core execution wrapper. Called by cron tick or runNow().
   * Manages lock, metrics recording, error handling, and logging.
   *
   * @param {string} trigger       - 'cron' | 'manual'
   * @param {object} [manualCtx]   - Manual execution context (requestedBy, etc.)
   */
  async _execute(trigger = 'cron', manualCtx = {}) {
    const executionId = randomUUID();
    const batchId = randomUUID();

    // Track as in-flight
    let resolveFlight;
    this._inflightExecution = new Promise(res => { resolveFlight = res; });

    // Attempt lock acquisition
    const acquired = await this._lock.acquire(executionId);
    if (!acquired) {
      this._logger.warn(`[Scheduler:${this.name}] Skipping execution ${executionId} — lock already held.`);
      resolveFlight();
      this._inflightExecution = null;
      return;
    }

    // Start periodic heartbeat to maintain lock during long tasks
    this._lock.startHeartbeat(15000);

    const counters = {
      processed: 0,
      created: 0,
      updated: 0,
      expired: 0,
      escalated: 0,
      skipped: 0,
      retryableFailures: 0,
      permanentFailures: 0
    };

    const startedAt = new Date();
    let executionError = null;

    const tracingCtx = {
      executionId,
      batchId,
      schedulerName: this.name,
      trigger,
      ...(trigger === 'manual' ? manualCtx : {})
    };

    this._logger.info(`[Scheduler:${this.name}] Execution started.`, tracingCtx);

    try {
      await this._process(counters, tracingCtx);
    } catch (err) {
      executionError = err.message;
      this._logger.error(`[Scheduler:${this.name}] Execution ${executionId} failed.`, {
        executionId,
        batchId,
        error: err.message
      });
    } finally {
      await this._lock.release();
      resolveFlight();
      this._inflightExecution = null;
    }

    const finishedAt = new Date();
    const durationMs = finishedAt - startedAt;

    const entry = {
      runId: executionId,
      executionId,
      batchId,
      schedulerName: this.name,
      trigger,
      ...(trigger === 'manual' ? { requestedBy: manualCtx.requestedBy, requestedAt: manualCtx.requestedAt } : {}),
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs,
      ...counters,
      error: executionError
    };

    this._metrics.record(entry);

    this._logger.info(`[Scheduler:${this.name}] Execution complete.`, {
      scheduler: this.constructor.name,
      schedulerName: this.name,
      executionId,
      batchId,
      trigger,
      durationMs,
      ...counters,
      error: executionError || undefined
    });
  }

  /**
   * Abstract — subclasses implement the actual work here.
   * @param {{ processed, created, skipped, failed }} metrics  Mutable counters
   */
  async _process(metrics) { // eslint-disable-line no-unused-vars
    throw new Error(`[Scheduler:${this.name}] _process() not implemented.`);
  }
}
