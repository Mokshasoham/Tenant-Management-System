import { IdentityVerificationProvider } from './identityVerificationProvider.js';
import { AppError } from '../../utils/errorHandling.js';
import logger from '../../platform/logging/logger.js';
import config from '../../config/config.js';

export class ProductionProvider extends IdentityVerificationProvider {
  constructor() {
    super();
    this.providerName = 'production';
    this.apiKey = process.env.IDENTITY_PROVIDER_API_KEY;
    this.apiEndpoint = process.env.IDENTITY_PROVIDER_URL || 'https://api.identity-provider.com/v1';
  }

  validateConfig() {
    if (!this.apiKey || !process.env.IDENTITY_PROVIDER_URL) {
      logger.error('[ProductionProvider] Missing production identity provider credentials');
      throw new AppError(
        'Production identity provider credentials are not configured. Set IDENTITY_PROVIDER_API_KEY and IDENTITY_PROVIDER_URL in environment.',
        500
      );
    }
  }

  async verifyIdentity(payload) {
    this.validateConfig();

    logger.info(`[ProductionProvider] Sending HTTPS verification request to ${this.apiEndpoint}/verify`);

    try {
      // Production HTTPS request payload normalization
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
          firstName: payload.firstName,
          lastName: payload.lastName,
          dob: payload.dob,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.warn(`[ProductionProvider] Provider HTTP Error ${response.status}: ${errorText}`);

        if (response.status === 429) {
          return {
            success: false,
            requestId: `PROD-ERR-${Date.now()}`,
            status: 'UNAVAILABLE',
            providerStatus: 'RATE_LIMITED',
            confidenceScore: 0,
            reason: 'Identity provider rate limit reached',
          };
        }

        return {
          success: false,
          requestId: `PROD-ERR-${Date.now()}`,
          status: 'UNAVAILABLE',
          providerStatus: 'SERVICE_ERROR',
          confidenceScore: 0,
          reason: `Identity provider HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        success: data.verified === true,
        requestId: data.requestId || `PROD-REQ-${Date.now()}`,
        status: data.verified ? 'VERIFIED' : (data.reviewRequired ? 'REVIEW_REQUIRED' : 'REJECTED'),
        providerStatus: data.status || 'COMPLETED',
        confidenceScore: data.confidenceScore || 0,
        extractedData: data.extractedData || {},
        reason: data.reason || 'Production provider verification completed',
      };
    } catch (err) {
      logger.error(`[ProductionProvider] Network or execution error: ${err.message}`);
      return {
        success: false,
        requestId: `PROD-NET-ERR-${Date.now()}`,
        status: 'UNAVAILABLE',
        providerStatus: 'NETWORK_FAILURE',
        confidenceScore: 0,
        reason: `Network error connecting to production provider: ${err.message}`,
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
        throw new AppError(`Failed to fetch provider status: ${response.statusText}`, response.status);
      }
      return await response.json();
    } catch (err) {
      throw new AppError(`Production provider status check failed: ${err.message}`, 500);
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
      throw new AppError(`Production provider cancellation failed: ${err.message}`, 500);
    }
  }
}

export default ProductionProvider;
