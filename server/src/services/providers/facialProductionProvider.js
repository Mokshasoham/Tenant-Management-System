import { FacialVerificationProvider } from './facialVerificationProvider.js';
import { AppError } from '../../utils/errorHandling.js';
import logger from '../../platform/logging/logger.js';
import config from '../../config/config.js';
import { CircuitBreakerRegistry } from '../../platform/security/circuitBreaker.js';

export class FacialProductionProvider extends FacialVerificationProvider {
  constructor() {
    super();
    this.providerName = 'production';
    this.apiKey = config.FACIAL_PROVIDER_API_KEY;
    this.apiSecret = config.FACIAL_PROVIDER_SECRET;
    this.apiEndpoint = config.FACIAL_PROVIDER_URL;
    this.timeoutMs = config.FACIAL_VERIFICATION_TIMEOUT_MS || 10000;
    this.circuitBreaker = CircuitBreakerRegistry.get('facialProduction', {
      failureThreshold: 5,
      recoveryWindowMs: 60000,
      requestTimeoutMs: this.timeoutMs,
    });
  }

  validateConfig() {
    if (!this.apiKey || !this.apiEndpoint) {
      logger.error('[FacialProductionProvider] Missing required production facial biometric credentials');
      throw new AppError(
        'Production facial verification credentials are not configured. Set FACIAL_PROVIDER_API_KEY and FACIAL_PROVIDER_URL in environment.',
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

  async verifyLivenessAndMatch(liveCaptureBuffer, referenceImageBuffer, metadata = {}) {
    this.validateConfig();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const formData = new FormData();
      formData.append('liveCapture', new Blob([liveCaptureBuffer]), 'live_capture.jpg');
      if (referenceImageBuffer) {
        formData.append('referenceImage', new Blob([referenceImageBuffer]), 'reference.jpg');
      }

      const response = await fetch(`${this.apiEndpoint}/verify-liveness-match`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Client-Version': config.ENGINE_VERSION || 'prod-v1',
        },
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        logger.warn(`[FacialProductionProvider] HTTP Error ${response.status}: ${errorText}`);

        if (response.status === 429) {
          return {
            success: false,
            requestId: `FACIAL-PROD-ERR-${Date.now()}`,
            status: 'UNAVAILABLE',
            providerStatus: 'RATE_LIMITED',
            livenessResult: 'UNAVAILABLE',
            livenessConfidence: 0,
            faceMatchResult: 'UNKNOWN',
            faceMatchScore: 0,
            reason: 'Biometric provider rate limit exceeded',
          };
        }

        return {
          success: false,
          requestId: `FACIAL-PROD-ERR-${Date.now()}`,
          status: 'UNAVAILABLE',
          providerStatus: 'SERVICE_ERROR',
          livenessResult: 'UNAVAILABLE',
          livenessConfidence: 0,
          faceMatchResult: 'UNKNOWN',
          faceMatchScore: 0,
          reason: `Biometric provider HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        success: data.verified === true,
        requestId: data.requestId || `FACIAL-PROD-REQ-${Date.now()}`,
        status: data.verified ? 'VERIFIED' : (data.reviewRequired ? 'REVIEW_REQUIRED' : 'REJECTED'),
        providerStatus: data.status || 'COMPLETED',
        livenessResult: data.livenessResult || (data.isLive ? 'LIVE' : 'SPOOF_DETECTED'),
        livenessConfidence: data.livenessConfidence || 0,
        faceMatchResult: data.faceMatchResult || (data.isMatch ? 'MATCH' : 'MISMATCH'),
        faceMatchScore: data.faceMatchScore || 0,
        confidenceScore: data.confidenceScore || 0,
        reason: data.reason || 'Production facial verification completed',
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === 'AbortError';
      logger.error(`[FacialProductionProvider] ${isTimeout ? 'Request timed out after 10s' : 'Network error'}: ${err.message}`);
      return {
        success: false,
        requestId: `FACIAL-PROD-NET-ERR-${Date.now()}`,
        status: 'UNAVAILABLE',
        providerStatus: isTimeout ? 'TIMEOUT' : 'NETWORK_FAILURE',
        livenessResult: 'UNAVAILABLE',
        livenessConfidence: 0,
        faceMatchResult: 'UNKNOWN',
        faceMatchScore: 0,
        reason: isTimeout ? 'Biometric provider connection timed out' : `Network error: ${err.message}`,
      };
    }
  }

  async checkProviderHealth() {
    this.validateConfig();
    try {
      const res = await fetch(`${this.apiEndpoint}/health`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });
      return { status: res.ok ? 'HEALTHY' : 'DEGRADED', provider: this.providerName };
    } catch (e) {
      return { status: 'UNAVAILABLE', provider: this.providerName, error: e.message };
    }
  }
}

export default FacialProductionProvider;
