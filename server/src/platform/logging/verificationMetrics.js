import logger from './logger.js';

class VerificationMetricsCollector {
  constructor() {
    this.metrics = {
      requestCount: 0,
      rateLimitRejections: 0,
      providerRequests: 0,
      providerSuccesses: 0,
      providerFailures: 0,
      providerTimeouts: 0,
      circuitBreakerOpenTransitions: 0,
      circuitBreakerRecoveries: 0,
      lockoutsCount: 0,
      providerLatencySumMs: 0,
    };
  }

  recordRequest() {
    this.metrics.requestCount++;
  }

  recordRateLimitRejection(key, path) {
    this.metrics.rateLimitRejections++;
    logger.warn(`[VerificationMetrics] Rate limit rejected request for key=${key} path=${path}`);
  }

  recordProviderCall(providerName, durationMs, success = true, isTimeout = false) {
    this.metrics.providerRequests++;
    this.metrics.providerLatencySumMs += durationMs;
    if (success) {
      this.metrics.providerSuccesses++;
    } else {
      this.metrics.providerFailures++;
      if (isTimeout) {
        this.metrics.providerTimeouts++;
      }
    }
  }

  recordCircuitBreakerTransition(providerName, fromState, toState) {
    if (toState === 'OPEN') {
      this.metrics.circuitBreakerOpenTransitions++;
    } else if (toState === 'CLOSED' && fromState === 'HALF_OPEN') {
      this.metrics.circuitBreakerRecoveries++;
    }
    logger.info(`[VerificationMetrics] CircuitBreaker transition for ${providerName}: ${fromState} -> ${toState}`);
  }

  recordLockout(verificationId, type) {
    this.metrics.lockoutsCount++;
    logger.warn(`[VerificationMetrics] Lockout triggered for verificationId=${verificationId} type=${type}`);
  }

  getMetricsSummary() {
    const avgLatency = this.metrics.providerRequests > 0
      ? Math.round(this.metrics.providerLatencySumMs / this.metrics.providerRequests)
      : 0;

    return {
      ...this.metrics,
      averageProviderLatencyMs: avgLatency,
      timestamp: new Date().toISOString(),
    };
  }

  reset() {
    this.metrics = {
      requestCount: 0,
      rateLimitRejections: 0,
      providerRequests: 0,
      providerSuccesses: 0,
      providerFailures: 0,
      providerTimeouts: 0,
      circuitBreakerOpenTransitions: 0,
      circuitBreakerRecoveries: 0,
      lockoutsCount: 0,
      providerLatencySumMs: 0,
    };
  }
}

export const verificationMetrics = new VerificationMetricsCollector();
export default verificationMetrics;
