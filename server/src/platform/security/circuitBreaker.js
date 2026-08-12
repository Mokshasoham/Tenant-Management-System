import logger from '../logging/logger.js';
import productionAlertService, { ALERT_TYPES, ALERT_SEVERITY } from './productionAlertService.js';
import verificationMetrics from '../logging/verificationMetrics.js';

export const CIRCUIT_STATES = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
};

export class CircuitBreaker {
  /**
   * @param {string} name - Name of the protected service/provider
   * @param {Object} options
   * @param {number} [options.failureThreshold=5] - Consecutive failure threshold to OPEN
   * @param {number} [options.recoveryWindowMs=30000] - Window before HALF_OPEN test
   * @param {number} [options.requestTimeoutMs=10000] - Timeout for wrapped call
   */
  constructor(name, options = {}) {
    this.name = name || 'default-circuit';
    this.failureThreshold = options.failureThreshold || 5;
    this.recoveryWindowMs = options.recoveryWindowMs || 30000;
    this.requestTimeoutMs = options.requestTimeoutMs || 10000;

    this.state = CIRCUIT_STATES.CLOSED;
    this.consecutiveFailures = 0;
    this.lastFailureTime = null;
    this.halfOpenTrialCount = 0;
    this.maxHalfOpenTrials = options.maxHalfOpenTrials || 1;
  }

  /**
   * Returns current operational state, evaluating timeout recovery.
   */
  getState() {
    if (this.state === CIRCUIT_STATES.OPEN) {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.recoveryWindowMs) {
        this._transitionTo(CIRCUIT_STATES.HALF_OPEN);
      }
    }
    return this.state;
  }

  recordFailure(err = new Error('Manual or simulated failure registered')) {
    this._onFailure(err);
  }

  /**
   * Execute protected async action.
   * @param {Function} asyncFn - Provider call () => Promise<T>
   * @param {Function} [isBusinessFailure] - Optional predicate (err) => boolean returning true if error is a business mismatch (not infra failure)
   */
  async execute(asyncFn, isBusinessFailure = null) {
    const currentState = this.getState();

    if (currentState === CIRCUIT_STATES.OPEN) {
      const err = new Error(`Circuit breaker for ${this.name} is OPEN. Call short-circuited.`);
      err.isCircuitBreakerOpen = true;
      err.code = 'CIRCUIT_BREAKER_OPEN';
      throw err;
    }

    if (currentState === CIRCUIT_STATES.HALF_OPEN) {
      this.halfOpenTrialCount++;
    }

    let timeoutId = null;
    try {
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          const timeoutErr = new Error(`Provider ${this.name} request timed out after ${this.requestTimeoutMs}ms`);
          timeoutErr.name = 'TimeoutError';
          timeoutErr.isTimeout = true;
          reject(timeoutErr);
        }, this.requestTimeoutMs);
      });

      const startTime = Date.now();
      const result = await Promise.race([asyncFn(), timeoutPromise]);
      if (timeoutId) clearTimeout(timeoutId);

      const durationMs = Date.now() - startTime;
      verificationMetrics.recordProviderCall(this.name, durationMs, true, false);

      this._onSuccess();
      return result;
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);

      const isTimeout = err.name === 'TimeoutError' || err.isTimeout === true;
      verificationMetrics.recordProviderCall(this.name, 0, false, isTimeout);

      // Determine if error is a business logic failure (e.g. document rejected) vs infra failure (5xx/timeout/network)
      const isBusiness = isBusinessFailure ? isBusinessFailure(err) : this._defaultIsBusinessFailure(err);

      if (isBusiness) {
        // Business failures do NOT trigger circuit breaker infrastructure failures
        logger.debug(`[CircuitBreaker:${this.name}] Business-level response received, ignoring for circuit breaker threshold.`);
      } else {
        this._onFailure(err);
      }

      throw err;
    }
  }

  _defaultIsBusinessFailure(err) {
    if (!err) return false;
    // Explicit business failure flags or 4xx status codes (except 429/408)
    if (err.isBusinessError || err.isMismatch || err.isRejected) return true;
    if (err.status >= 400 && err.status < 500 && err.status !== 408 && err.status !== 429) {
      return true;
    }
    return false;
  }

  _onSuccess() {
    if (this.state === CIRCUIT_STATES.HALF_OPEN) {
      logger.info(`[CircuitBreaker:${this.name}] HALF_OPEN trial succeeded. Resetting circuit to CLOSED.`);
      this.consecutiveFailures = 0;
      this._transitionTo(CIRCUIT_STATES.CLOSED);
    } else if (this.state === CIRCUIT_STATES.CLOSED) {
      this.consecutiveFailures = 0;
    }
  }

  _onFailure(err) {
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();

    logger.warn(
      `[CircuitBreaker:${this.name}] Infrastructure failure registered (${this.consecutiveFailures}/${this.failureThreshold}). Error: ${err.message}`
    );

    if (this.state === CIRCUIT_STATES.HALF_OPEN || this.consecutiveFailures >= this.failureThreshold) {
      this._transitionTo(CIRCUIT_STATES.OPEN);
    }
  }

  _transitionTo(newState) {
    const oldState = this.state;
    if (oldState !== newState) {
      this.state = newState;
      if (newState === CIRCUIT_STATES.HALF_OPEN) {
        this.halfOpenTrialCount = 0;
      }
      logger.warn(`[CircuitBreaker:${this.name}] Transitioned state from ${oldState} -> ${newState}`);
      verificationMetrics.recordCircuitBreakerTransition(this.name, oldState, newState);

      if (newState === CIRCUIT_STATES.OPEN) {
        productionAlertService.dispatchAlert({
          type: ALERT_TYPES.CIRCUIT_BREAKER_TRIPPED,
          severity: ALERT_SEVERITY.HIGH,
          message: `Circuit breaker for provider ${this.name} TRIPPED to OPEN after ${this.consecutiveFailures} consecutive failures.`,
          details: {
            providerName: this.name,
            consecutiveFailures: this.consecutiveFailures,
            recoveryWindowMs: this.recoveryWindowMs,
          },
        }).catch((err) => logger.error(`[CircuitBreaker:${this.name}] Alert dispatch error: ${err.message}`));
      }
    }
  }

  /**
   * Reset circuit manually (e.g., admin action).
   */
  reset() {
    this.state = CIRCUIT_STATES.CLOSED;
    this.consecutiveFailures = 0;
    this.lastFailureTime = null;
    this.halfOpenTrialCount = 0;
    logger.info(`[CircuitBreaker:${this.name}] Circuit manually reset to CLOSED.`);
  }
}

/**
 * Singleton Registry for Application Circuit Breakers
 */
class CircuitBreakerRegistryClass {
  constructor() {
    this.breakers = new Map();
  }

  get(name, options = {}) {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, options));
    }
    return this.breakers.get(name);
  }

  getAllStates() {
    const result = {};
    for (const [name, breaker] of this.breakers.entries()) {
      result[name] = {
        state: breaker.getState(),
        consecutiveFailures: breaker.consecutiveFailures,
        lastFailureTime: breaker.lastFailureTime,
      };
    }
    return result;
  }
}

export const CircuitBreakerRegistry = new CircuitBreakerRegistryClass();
export default CircuitBreaker;
