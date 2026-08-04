/**
 * src/platform/scheduler/SchedulerMetrics.js
 *
 * Execution metrics collector for a single scheduler.
 *
 * Extended counters:
 *   processed          - Records evaluated
 *   created            - Records created
 *   updated            - Records updated
 *   expired            - Campaigns expired
 *   escalated          - Campaigns escalated
 *   skipped            - Records skipped (idempotency)
 *   retryableFailures  - Transient failures (Mongo timeouts, lock contention)
 *   permanentFailures  - Logic failures (duplicates, validation errors)
 *   durationMs         - Total execution time in ms
 */

export class SchedulerMetrics {
  /**
   * @param {number} maxHistory - Rolling window size (default 20)
   */
  constructor(maxHistory = 20) {
    this.maxHistory = maxHistory;
    this.executions = [];

    // Derived KPIs
    this.consecutiveFailures = 0;
    this.lastSuccessAt = null;
    this.lastFailureAt = null;
    this.longestRunMs = 0;
  }

  /**
   * Record the result of a completed execution.
   * @param {object} entry
   */
  record(entry) {
    const formatted = {
      runId: entry.runId || entry.executionId,
      executionId: entry.executionId || entry.runId,
      batchId: entry.batchId || null,
      instanceId: entry.instanceId || null,
      schedulerName: entry.schedulerName || null,
      trigger: entry.trigger || 'cron',
      requestedBy: entry.requestedBy || null,
      requestedAt: entry.requestedAt || null,
      startedAt: entry.startedAt,
      finishedAt: entry.finishedAt,
      durationMs: entry.durationMs || 0,
      processed: entry.processed || 0,
      created: entry.created || 0,
      updated: entry.updated || 0,
      expired: entry.expired || 0,
      escalated: entry.escalated || 0,
      skipped: entry.skipped || 0,
      retryableFailures: entry.retryableFailures || 0,
      permanentFailures: entry.permanentFailures || entry.failed || 0,
      error: entry.error || null
    };

    this.executions.push(formatted);
    if (this.executions.length > this.maxHistory) {
      this.executions.shift();
    }

    if (formatted.error) {
      this.consecutiveFailures += 1;
      this.lastFailureAt = formatted.finishedAt;
    } else {
      this.consecutiveFailures = 0;
      this.lastSuccessAt = formatted.finishedAt;
    }

    if (formatted.durationMs > this.longestRunMs) {
      this.longestRunMs = formatted.durationMs;
    }
  }

  /**
   * Returns computed KPI summary.
   * @returns {object}
   */
  summary() {
    const total = this.executions.length;
    if (total === 0) {
      return {
        totalExecutions: 0,
        successRate: null,
        averageDurationMs: null,
        longestRunMs: this.longestRunMs,
        consecutiveFailures: this.consecutiveFailures,
        lastSuccessAt: this.lastSuccessAt,
        lastFailureAt: this.lastFailureAt,
        recentExecutions: []
      };
    }

    const successful = this.executions.filter(e => !e.error).length;
    const successRate = Math.round((successful / total) * 100);

    const successfulDurations = this.executions
      .filter(e => !e.error && typeof e.durationMs === 'number')
      .map(e => e.durationMs);

    const averageDurationMs = successfulDurations.length > 0
      ? Math.round(successfulDurations.reduce((a, b) => a + b, 0) / successfulDurations.length)
      : null;

    return {
      totalExecutions: total,
      successRate,
      averageDurationMs,
      longestRunMs: this.longestRunMs,
      consecutiveFailures: this.consecutiveFailures,
      lastSuccessAt: this.lastSuccessAt,
      lastFailureAt: this.lastFailureAt,
      recentExecutions: this.executions.slice(-5)
    };
  }

  /**
   * Returns the most recent execution entry.
   * @returns {object|null}
   */
  lastExecution() {
    return this.executions.length > 0
      ? this.executions[this.executions.length - 1]
      : null;
  }
}
