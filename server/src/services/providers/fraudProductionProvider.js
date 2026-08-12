import { FraudProvider } from './fraudProvider.js';
import config from '../../config/config.js';
import { AppError } from '../../utils/errorHandling.js';
import logger from '../../platform/logging/logger.js';
import { CircuitBreakerRegistry } from '../../platform/security/circuitBreaker.js';

export class FraudProductionProvider extends FraudProvider {
  constructor() {
    super();
    this.circuitBreaker = CircuitBreakerRegistry.get('fraudProduction', {
      failureThreshold: 5,
      recoveryWindowMs: 60000,
      requestTimeoutMs: config.FRAUD_TIMEOUT_MS || 10000,
    });
  }

  async evaluateFraudRisk(verificationId, signals = [], metadata = {}) {
    if (config.REAL_FRAUD_DETECTION) {
      if (!config.FRAUD_PROVIDER_API_KEY || !config.FRAUD_PROVIDER_URL) {
        logger.error('[FraudProductionProvider] REAL_FRAUD_DETECTION=true but missing provider API key or URL');
        throw new AppError('Production Fraud Detection provider configuration missing', 500);
      }
    }

    return this.circuitBreaker.execute(async () => {
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
      });

      if (!response.ok) {
        logger.warn(`[FraudProductionProvider] Provider responded with HTTP status ${response.status}`);
        const err = new Error(`Provider HTTP Error: ${response.status}`);
        err.httpStatus = response.status;
        err.status = response.status;
        throw err;
      }

      const data = await response.json();

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
    });
  }

  async checkProviderHealth() {
    return { status: this.circuitState === 'OPEN' ? 'DOWN' : 'UP', mode: 'PRODUCTION', circuitState: this.circuitState };
  }

  get circuitState() {
    return this.circuitBreaker.getState();
  }

  _recordFailure(err = new Error('Simulated failure')) {
    this.circuitBreaker.recordFailure(err);
  }

  _checkCircuitBreaker() {
    if (this.circuitState === 'OPEN') {
      throw new Error('Provider circuit breaker is OPEN');
    }
  }
}
