import { PropertyVerificationProvider } from './propertyVerificationProvider.js';
import { AppError } from '../../utils/errorHandling.js';
import logger from '../../platform/logging/logger.js';
import config from '../../config/config.js';

export class PropertyProductionProvider extends PropertyVerificationProvider {
  constructor() {
    super();
    this.providerName = 'production';
    this.apiKey = process.env.PROPERTY_PROVIDER_API_KEY;
    this.apiEndpoint = process.env.PROPERTY_PROVIDER_URL || 'https://api.property-registry-provider.com/v1';
  }

  validateConfig() {
    if (!this.apiKey || !process.env.PROPERTY_PROVIDER_URL) {
      logger.error('[PropertyProductionProvider] Missing production property provider credentials');
      throw new AppError(
        'Production property provider credentials are not configured. Set PROPERTY_PROVIDER_API_KEY and PROPERTY_PROVIDER_URL in environment.',
        500
      );
    }
  }

  async verifyProperty(payload) {
    this.validateConfig();

    logger.info(`[PropertyProductionProvider] Sending HTTPS property verification request to ${this.apiEndpoint}/verify`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(`${this.apiEndpoint}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Client-Version': config.ENGINE_VERSION || 'prod-v1',
        },
        body: JSON.stringify({
          documentType: payload.documentType,
          documentReference: payload.documentReference,
          ownerName: payload.ownerName,
          propertyAddress: payload.address,
          surveyNumber: payload.surveyNumber,
          registrationNumber: payload.registrationNumber,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        logger.warn(`[PropertyProductionProvider] HTTP Error ${response.status}: ${errorText}`);

        if (response.status === 429) {
          return {
            success: false,
            requestId: `PROP-PROD-ERR-${Date.now()}`,
            status: 'UNAVAILABLE',
            providerStatus: 'RATE_LIMITED',
            confidenceScore: 0,
            reason: 'Property registry provider rate limit exceeded',
          };
        }

        return {
          success: false,
          requestId: `PROP-PROD-ERR-${Date.now()}`,
          status: 'UNAVAILABLE',
          providerStatus: 'SERVICE_ERROR',
          confidenceScore: 0,
          reason: `Property registry provider HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        success: data.verified === true,
        requestId: data.requestId || `PROP-PROD-REQ-${Date.now()}`,
        status: data.verified ? 'VERIFIED' : (data.reviewRequired ? 'REVIEW_REQUIRED' : 'REJECTED'),
        providerStatus: data.status || 'COMPLETED',
        confidenceScore: data.confidenceScore || 0,
        extractedData: data.extractedData || {},
        reason: data.reason || 'Production property verification completed',
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === 'AbortError';
      logger.error(`[PropertyProductionProvider] ${isTimeout ? 'Request timed out after 10s' : 'Network error'}: ${err.message}`);
      return {
        success: false,
        requestId: `PROP-PROD-NET-ERR-${Date.now()}`,
        status: 'UNAVAILABLE',
        providerStatus: isTimeout ? 'TIMEOUT' : 'NETWORK_FAILURE',
        confidenceScore: 0,
        reason: isTimeout ? 'Property provider connection timed out' : `Network error connecting to property provider: ${err.message}`,
      };
    }
  }

  async getVerificationStatus(requestId) {
    this.validateConfig();
    try {
      const response = await fetch(`${this.apiEndpoint}/status/${requestId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      if (!response.ok) {
        throw new AppError(`Failed to fetch property provider status: ${response.statusText}`, response.status);
      }
      return await response.json();
    } catch (err) {
      throw new AppError(`Production property provider status check failed: ${err.message}`, 500);
    }
  }

  async cancelVerification(requestId) {
    this.validateConfig();
    try {
      const response = await fetch(`${this.apiEndpoint}/cancel/${requestId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return await response.json();
    } catch (err) {
      throw new AppError(`Production property provider cancellation failed: ${err.message}`, 500);
    }
  }
}

export default PropertyProductionProvider;
