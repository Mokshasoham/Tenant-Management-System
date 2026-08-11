import { VideoKYCProvider } from './videoKycProvider.js';
import { AppError } from '../../utils/errorHandling.js';
import logger from '../../platform/logging/logger.js';
import config from '../../config/config.js';

export class VideoKYCProductionProvider extends VideoKYCProvider {
  constructor() {
    super();
    this.providerName = 'production';
    this.apiKey = config.VIDEO_KYC_PROVIDER_API_KEY;
    this.apiSecret = config.VIDEO_KYC_PROVIDER_SECRET;
    this.apiEndpoint = config.VIDEO_KYC_PROVIDER_URL;
    this.timeoutMs = config.VIDEO_KYC_TIMEOUT_MS || 10000;
  }

  validateConfig() {
    if (!this.apiKey || !this.apiEndpoint) {
      logger.error('[VideoKYCProductionProvider] Missing required production Video KYC credentials');
      throw new AppError(
        'Production Video KYC credentials are not configured. Set VIDEO_KYC_PROVIDER_API_KEY and VIDEO_KYC_PROVIDER_URL in environment.',
        500
      );
    }
  }

  async createSession(verificationId, metadata = {}) {
    this.validateConfig();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.apiEndpoint}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ verificationId, metadata }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.warn(`[VideoKYCProductionProvider] HTTP Error ${response.status} creating session`);
        if (response.status === 429) {
          throw new AppError('Video KYC provider rate limit exceeded', 429);
        }
        throw new AppError(`Video KYC provider service error (HTTP ${response.status})`, 502);
      }

      const data = await response.json();
      return {
        success: true,
        sessionId: data.sessionId,
        roomUrl: data.roomUrl,
        providerStatus: data.status || 'WAITING_FOR_AGENT',
      };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof AppError) throw err;
      const isTimeout = err.name === 'AbortError';
      logger.error(`[VideoKYCProductionProvider] Session creation failed: ${err.message}`);
      throw new AppError(
        isTimeout ? 'Video KYC provider connection timed out' : `Provider failure: ${err.message}`,
        isTimeout ? 504 : 502
      );
    }
  }

  async generateRoomToken(sessionId, userId, role) {
    this.validateConfig();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.apiEndpoint}/sessions/${sessionId}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ userId, role }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new AppError(`Failed to generate room token (HTTP ${response.status})`, 502);
      }

      const data = await response.json();
      return {
        token: data.token,
        expiresAt: new Date(data.expiresAt || (Date.now() + 15 * 60 * 1000)),
      };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof AppError) throw err;
      throw new AppError(`Token generation failed: ${err.message}`, 502);
    }
  }

  async evaluateSession(sessionId, agentInput = {}) {
    this.validateConfig();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.apiEndpoint}/sessions/${sessionId}/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(agentInput),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const status = response.status;
        logger.warn(`[VideoKYCProductionProvider] Evaluation HTTP Error ${status}`);

        if (status === 429) {
          return {
            success: false,
            sessionId,
            status: 'UNAVAILABLE',
            providerStatus: 'RATE_LIMITED',
            livenessCheckResult: 'UNAVAILABLE',
            documentMatchResult: 'NONE',
            reason: 'Provider rate limit exceeded',
          };
        }

        return {
          success: false,
          sessionId,
          status: 'UNAVAILABLE',
          providerStatus: 'SERVICE_ERROR',
          livenessCheckResult: 'UNAVAILABLE',
          documentMatchResult: 'NONE',
          reason: `Provider HTTP ${status}`,
        };
      }

      const data = await response.json();
      return {
        success: data.verified === true,
        sessionId: data.sessionId || sessionId,
        status: data.verified ? 'VERIFIED' : (data.reviewRequired ? 'REVIEW_REQUIRED' : 'REJECTED'),
        providerStatus: data.status || 'COMPLETED',
        livenessCheckResult: data.livenessCheckResult || 'PASSED',
        documentMatchResult: data.documentMatchResult || 'MATCH',
        confidenceScore: data.confidenceScore || 0,
        reason: data.reason || 'Production Video KYC evaluation completed',
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === 'AbortError';
      logger.error(`[VideoKYCProductionProvider] ${isTimeout ? 'Evaluation timed out' : 'Network failure'}: ${err.message}`);
      return {
        success: false,
        sessionId,
        status: 'UNAVAILABLE',
        providerStatus: isTimeout ? 'TIMEOUT' : 'NETWORK_FAILURE',
        livenessCheckResult: 'UNAVAILABLE',
        documentMatchResult: 'NONE',
        reason: isTimeout ? 'Provider connection timed out' : `Network error: ${err.message}`,
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

export default VideoKYCProductionProvider;
