import { SanctionProvider } from './sanctionProvider.js';
import config from '../../config/config.js';
import { AppError } from '../../utils/errorHandling.js';
import logger from '../../platform/logging/logger.js';

export class SanctionProductionProvider extends SanctionProvider {
  constructor() {
    super();
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.circuitState = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.circuitOpenUntil = null;
  }

  _checkCircuitBreaker() {
    if (this.circuitState === 'OPEN') {
      if (Date.now() > this.circuitOpenUntil) {
        this.circuitState = 'HALF_OPEN';
        logger.info('[SanctionProductionProvider] Circuit breaker entering HALF_OPEN state');
      } else {
        logger.warn('[SanctionProductionProvider] Circuit breaker is OPEN. Fast-failing request.');
        const err = new Error('Provider circuit breaker is OPEN');
        err.isCircuitBreakerOpen = true;
        throw err;
      }
    }
  }

  _recordSuccess() {
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.circuitState = 'CLOSED';
    this.circuitOpenUntil = null;
  }

  _recordFailure() {
    this.failureCount += 1;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= 5) {
      this.circuitState = 'OPEN';
      this.circuitOpenUntil = Date.now() + 60000; // 60s cooldown
      logger.error('[SanctionProductionProvider] Circuit breaker TRIPPED to OPEN for 60 seconds after 5 failures');
    }
  }

  async screenEntity(verificationId, entityData = {}, metadata = {}) {
    if (config.REAL_SANCTION_SCREENING) {
      if (!config.SANCTION_PROVIDER_API_KEY || !config.SANCTION_PROVIDER_URL) {
        logger.error('[SanctionProductionProvider] REAL_SANCTION_SCREENING=true but missing provider API key or URL');
        throw new AppError('Production Sanctions Screening provider configuration missing', 500);
      }
    }

    this._checkCircuitBreaker();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.SANCTION_TIMEOUT_MS);

    try {
      logger.info(`[SanctionProductionProvider] Executing production screening for ${verificationId}`);

      const response = await fetch(config.SANCTION_PROVIDER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.SANCTION_PROVIDER_API_KEY}`,
          'X-Provider-Secret': config.SANCTION_PROVIDER_SECRET || '',
        },
        body: JSON.stringify({
          verificationId,
          entityData,
          metadata,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        this._recordFailure();
        logger.warn(`[SanctionProductionProvider] Provider responded with HTTP status ${response.status}`);
        const err = new Error(`Provider HTTP Error: ${response.status}`);
        err.httpStatus = response.status;
        throw err;
      }

      const data = await response.json();
      this._recordSuccess();

      return {
        success: true,
        provider: 'production',
        scanId: data.scanId || `SNC-PROD-${Date.now()}`,
        searchCorrelationId: data.searchCorrelationId || `CORR-${Date.now()}`,
        matches: Array.isArray(data.matches) ? data.matches : [],
        rawResponse: {
          status: response.status,
          scanId: data.scanId,
        },
      };
    } catch (err) {
      clearTimeout(timeoutId);
      if (!err.isCircuitBreakerOpen) {
        this._recordFailure();
      }

      if (err.name === 'AbortError') {
        logger.error(`[SanctionProductionProvider] Provider request timed out after ${config.SANCTION_TIMEOUT_MS}ms`);
      } else {
        logger.error(`[SanctionProductionProvider] Provider evaluation failed: ${err.message}`);
      }
      throw err;
    }
  }

  async checkProviderHealth() {
    return { status: this.circuitState === 'OPEN' ? 'DOWN' : 'UP', mode: 'PRODUCTION', circuitState: this.circuitState };
  }
}
