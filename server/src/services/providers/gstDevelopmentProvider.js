import { GSTProvider } from './gstProvider.js';
import logger from '../../platform/logging/logger.js';
import { AppError } from '../../utils/errorHandling.js';

export class GSTDevelopmentProvider extends GSTProvider {
  constructor() {
    super();
    this.providerName = 'development';
  }

  async verifyGstin(payload = {}) {
    logger.info(`[GSTDevelopmentProvider] Executing sandbox verifyGstin for masked reference`);

    if (payload.forceTimeout) {
      const err = new Error('Provider request timed out');
      err.name = 'AbortError';
      throw err;
    }

    if (payload.forceError) {
      throw new AppError('External GSTIN verification provider service unavailable', 502);
    }

    const providerRequestId = `DEV-GST-REQ-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    if (payload.forceInactive) {
      return {
        success: true,
        providerRequestId,
        status: 'INACTIVE',
        businessDetails: {
          legalName: payload.legalName || 'ACME ENTERPRISES PRIVATE LIMITED',
          tradeName: payload.tradeName || 'ACME STORE',
          gstinStatus: 'CANCELLED',
          taxpayerType: 'REGULAR',
          registrationDate: new Date('2018-04-01'),
        },
        reason: 'GSTIN registration is currently cancelled or inactive',
        confidenceScore: payload.confidenceScore !== undefined ? payload.confidenceScore : null,
      };
    }

    if (payload.forceInvalid) {
      return {
        success: false,
        providerRequestId,
        status: 'FAILED',
        businessDetails: {},
        reason: 'Invalid or non-existent GSTIN registration',
        confidenceScore: payload.confidenceScore !== undefined ? payload.confidenceScore : null,
      };
    }

    return {
      success: true,
      providerRequestId,
      status: 'VERIFIED',
      businessDetails: {
        legalName: payload.legalName || 'ACME ENTERPRISES PRIVATE LIMITED',
        tradeName: payload.tradeName || 'ACME STORE',
        gstinStatus: 'ACTIVE',
        taxpayerType: 'REGULAR',
        registrationDate: new Date('2018-04-01'),
      },
      reason: 'GSTIN verification successful and active',
      confidenceScore: payload.confidenceScore !== undefined ? payload.confidenceScore : null,
    };
  }

  async checkProviderHealth() {
    return { status: 'UP', mode: 'SANDBOX' };
  }
}

export default GSTDevelopmentProvider;
