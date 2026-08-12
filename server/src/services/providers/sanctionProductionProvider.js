import { SanctionProvider } from './sanctionProvider.js';
import config from '../../config/config.js';
import { AppError } from '../../utils/errorHandling.js';
import logger from '../../platform/logging/logger.js';
import { CircuitBreakerRegistry } from '../../platform/security/circuitBreaker.js';

export class SanctionProductionProvider extends SanctionProvider {
  constructor() {
    super();
    this.circuitBreaker = CircuitBreakerRegistry.get('sanctionProduction', {
      failureThreshold: 5,
      recoveryWindowMs: 60000,
      requestTimeoutMs: config.SANCTION_TIMEOUT_MS || 10000,
    });
  }

  async screenEntity(verificationId, entityData = {}, metadata = {}) {
    if (config.REAL_SANCTION_SCREENING) {
      if (!config.SANCTION_PROVIDER_API_KEY || !config.SANCTION_PROVIDER_URL) {
        logger.error('[SanctionProductionProvider] REAL_SANCTION_SCREENING=true but missing provider API key or URL');
        throw new AppError('Production Sanctions Screening provider configuration missing', 500);
      }
    }

    return this.circuitBreaker.execute(async () => {
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
      });

      if (!response.ok) {
        logger.warn(`[SanctionProductionProvider] Provider responded with HTTP status ${response.status}`);
        const err = new Error(`Provider HTTP Error: ${response.status}`);
        err.httpStatus = response.status;
        err.status = response.status;
        throw err;
      }

      const data = await response.json();

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
    });
  }

  async checkProviderHealth() {
    if (config.REAL_SANCTION_SCREENING) {
      if (!config.SANCTION_PROVIDER_API_KEY || !config.SANCTION_PROVIDER_URL) {
        throw new AppError('Production Sanctions Screening provider configuration missing', 500);
      }
    }
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
