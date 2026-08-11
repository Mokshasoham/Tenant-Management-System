import { FraudProvider } from './fraudProvider.js';
import config from '../../config/config.js';
import { AppError } from '../../utils/errorHandling.js';
import logger from '../../platform/logging/logger.js';

export class FraudProductionProvider extends FraudProvider {
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
        logger.info('[FraudProductionProvider] Circuit breaker entering HALF_OPEN state');
      } else {
        logger.warn('[FraudProductionProvider] Circuit breaker is OPEN. Fast-failing request.');
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
      logger.error('[FraudProductionProvider] Circuit breaker TRIPPED to OPEN for 60 seconds after 5 failures');
    }
  }

  async evaluateFraudRisk(verificationId, signals = [], metadata = {}) {
    if (config.REAL_FRAUD_DETECTION) {
      if (!config.FRAUD_PROVIDER_API_KEY || !config.FRAUD_PROVIDER_URL) {
        logger.error('[FraudProductionProvider] REAL_FRAUD_DETECTION=true but missing provider API key or URL');
        throw new AppError('Production Fraud Detection provider configuration missing', 500);
      }
    }

    this._checkCircuitBreaker();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.FRAUD_TIMEOUT_MS);

    try {
      logger.info(`[FraudProductionProvider] Executing production fraud risk evaluation for ${verificationId}`);

      const response = await fetch(config.FRAUD_PROVIDER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.FRAUD_PROVIDER_API_KEY}`,
          'X-Provider-Secret': config.FRAUD_PROVIDER_SECRET || '',
        },
        body: JSON.stringify({
          verificationId,
          signals,
          metadata,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        this._recordFailure();
        logger.warn(`[FraudProductionProvider] Provider responded with HTTP status ${response.status}`);
        const err = new Error(`Provider HTTP Error: ${response.status}`);
        err.httpStatus = response.status;
        throw err;
      }

      const data = await response.json();
      this._recordSuccess();

      return {
        success: true,
        provider: 'production',
        providerScanId: data.scanId || `FRD-PROD-${Date.now()}`,
        providerRiskScore: data.riskScore ?? 0,
        providerStatus: data.status || 'SUCCESS',
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
        logger.error(`[FraudProductionProvider] Provider request timed out after ${config.FRAUD_TIMEOUT_MS}ms`);
      } else {
        logger.error(`[FraudProductionProvider] Provider evaluation failed: ${err.message}`);
      }
      throw err;
    }
  }

  async checkProviderHealth() {
    return { status: this.circuitState === 'OPEN' ? 'DOWN' : 'UP', mode: 'PRODUCTION', circuitState: this.circuitState };
  }
}
