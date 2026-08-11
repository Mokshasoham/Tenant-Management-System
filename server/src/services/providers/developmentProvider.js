import { IdentityVerificationProvider } from './identityVerificationProvider.js';
import logger from '../../platform/logging/logger.js';

export class DevelopmentProvider extends IdentityVerificationProvider {
  constructor() {
    super();
    this.providerName = 'development';
  }

  async verifyIdentity(payload) {
    logger.info(`[DevelopmentProvider] Executing sandbox verification for document: ${payload.documentType}`);
    
    const requestId = `DEV-REQ-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const isMockFail = payload.forceFail || payload.documentNumber?.toLowerCase().includes('fail');
    const isMockPartial = payload.documentNumber?.toLowerCase().includes('partial');

    if (isMockFail) {
      return {
        success: false,
        requestId,
        status: 'FAILED',
        providerStatus: 'COMPLETED',
        confidenceScore: 30,
        reason: 'Document validation failed in sandbox environment',
        extractedData: {
          name: payload.name || 'Unknown',
          dob: payload.dob || null,
        },
      };
    }

    if (isMockPartial) {
      return {
        success: true,
        requestId,
        status: 'REVIEW_REQUIRED',
        providerStatus: 'COMPLETED',
        confidenceScore: 75,
        reason: 'Partial match on name/address in sandbox environment',
        extractedData: {
          name: payload.name ? `${payload.name} (Alias)` : 'John Tenant',
          dob: payload.dob || '1990-01-01',
          documentNumber: payload.documentNumber || 'DEV-12345',
        },
      };
    }

    return {
      success: true,
      requestId,
      status: 'VERIFIED',
      providerStatus: 'COMPLETED',
      confidenceScore: 95,
      reason: 'Sandbox identity verification verified successfully',
      extractedData: {
        name: payload.name || 'John Tenant',
        dob: payload.dob || '1990-01-01',
        gender: payload.gender || 'MALE',
        documentNumber: payload.documentNumber || 'DEV-12345',
        issuedDate: new Date().toISOString(),
      },
    };
  }

  async getVerificationStatus(requestId) {
    return {
      requestId,
      status: 'COMPLETED',
      verified: true,
      confidenceScore: 95,
      updatedAt: new Date().toISOString(),
    };
  }

  async cancelVerification(requestId) {
    return {
      requestId,
      cancelled: true,
    };
  }
}

export default DevelopmentProvider;
