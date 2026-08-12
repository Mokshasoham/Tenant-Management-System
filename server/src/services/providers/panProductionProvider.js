import { PANProvider } from './panProvider.js';
import config from '../../config/config.js';
import { AppError } from '../../utils/errorHandling.js';
import logger from '../../platform/logging/logger.js';
import { CircuitBreakerRegistry } from '../../platform/security/circuitBreaker.js';

export class PANProductionProvider extends PANProvider {
  constructor() {
    super();
    this.providerName = 'production';
    this.apiKey = config.PAN_PROVIDER_API_KEY;
    this.apiUrl = config.PAN_PROVIDER_URL;
    this.timeoutMs = config.PAN_TIMEOUT_MS || 10000;
    this.circuitBreaker = CircuitBreakerRegistry.get('panProduction', {
      failureThreshold: 5,
      recoveryWindowMs: 60000,
      requestTimeoutMs: this.timeoutMs,
    });
  }

  validateConfig() {
    if (!this.apiKey || !this.apiUrl) {
      logger.error('[PANProductionProvider] Production PAN provider API configuration missing');
      throw new AppError(
        'Production PAN Provider configuration missing. Set PAN_PROVIDER_API_KEY and PAN_PROVIDER_URL in environment.',
        500
      );
    }
  }

  get circuitState() {
    return this.circuitBreaker.getState();
  }

  _recordFailure(err = new Error('Simulated failure')) {
    this.circuitBreaker.recordFailure(err);
  }

  async verifyPan(payload = {}) {
    this.validateConfig();

    return this.circuitBreaker.execute(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(`${this.apiUrl}/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            encryptedReference: payload.encryptedReference,
            maskedPan: payload.maskedPan,
            userProfile: payload.userProfile,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errText = await response.text();
          logger.error(`[PANProductionProvider] Verification failed HTTP ${response.status}: ${errText}`);
          throw new AppError(`PAN Provider HTTP ${response.status}: ${errText}`, response.status === 429 ? 429 : 502);
        }

        const data = await response.json();
        return {
          success: data.verified === true,
          providerRequestId: data.providerRequestId || data.requestId,
          status: data.status || (data.verified === true ? 'VERIFIED' : 'FAILED'),
          matchDetails: data.matchDetails || {
            nameMatched: data.nameMatched || false,
            dobMatched: data.dobMatched || false,
            panStatus: data.panStatus || 'VALID',
          },
          reason: data.reason || 'PAN verification completed',
          confidenceScore: data.confidenceScore !== undefined ? data.confidenceScore : null,
        };
      } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          logger.error('[PANProductionProvider] Verification request timed out');
          const timeoutErr = new Error('PAN provider request timed out');
          timeoutErr.name = 'AbortError';
          throw timeoutErr;
        }
        throw err;
      }
    });
  }

  async checkProviderHealth() {
    this.validateConfig();
    return { status: this.circuitState === 'OPEN' ? 'DOWN' : 'UP', mode: 'PRODUCTION', circuitState: this.circuitState };
  }
}

export default PANProductionProvider;
