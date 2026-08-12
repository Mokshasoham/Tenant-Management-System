import { PANProvider } from './panProvider.js';
import logger from '../../platform/logging/logger.js';
import { AppError } from '../../utils/errorHandling.js';

export class PANDevelopmentProvider extends PANProvider {
  constructor() {
    super();
    this.providerName = 'development';
  }

  async verifyPan(payload = {}) {
    logger.info(`[PANDevelopmentProvider] Executing sandbox verifyPan for reference`);

    if (payload.forceTimeout) {
      const err = new Error('Provider request timed out');
      err.name = 'AbortError';
      throw err;
    }

    if (payload.forceError) {
      throw new AppError('External PAN verification provider service unavailable', 502);
    }

    const providerRequestId = `DEV-PAN-REQ-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    if (payload.forceMismatch) {
      return {
        success: true,
        providerRequestId,
        status: 'MISMATCH',
        matchDetails: {
          nameMatched: false,
          dobMatched: false,
          panStatus: 'VALID',
        },
        reason: 'PAN details do not match submitted user profile',
        confidenceScore: payload.confidenceScore !== undefined ? payload.confidenceScore : null,
      };
    }

    if (payload.forceInvalid) {
      return {
        success: false,
        providerRequestId,
        status: 'FAILED',
        matchDetails: {
          nameMatched: false,
          dobMatched: false,
          panStatus: 'INVALID',
        },
        reason: 'Invalid or non-existent PAN card number',
        confidenceScore: payload.confidenceScore !== undefined ? payload.confidenceScore : null,
      };
    }

    return {
      success: true,
      providerRequestId,
      status: 'VERIFIED',
      matchDetails: {
        nameMatched: true,
        dobMatched: true,
        panStatus: 'VALID',
      },
      reason: 'PAN verification and profile match successful',
      confidenceScore: payload.confidenceScore !== undefined ? payload.confidenceScore : null,
    };
  }

  async checkProviderHealth() {
    return { status: 'UP', mode: 'SANDBOX' };
  }
}

export default PANDevelopmentProvider;
