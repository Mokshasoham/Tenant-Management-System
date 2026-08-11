import { PropertyVerificationProvider } from './propertyVerificationProvider.js';
import logger from '../../platform/logging/logger.js';

export class PropertyDevelopmentProvider extends PropertyVerificationProvider {
  constructor() {
    super();
    this.providerName = 'development';
  }

  async verifyProperty(payload) {
    logger.info(`[PropertyDevelopmentProvider] Executing sandbox property verification for doc: ${payload.documentType}`);

    const requestId = `PROP-DEV-REQ-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const docRef = (payload.documentReference || payload.documentNumber || '').toLowerCase();
    const isMockFail = payload.forceFail || docRef.includes('fail') || docRef.includes('invalid');
    const isMockPartial = docRef.includes('partial') || docRef.includes('variation');
    const isMockUnavailable = docRef.includes('unavailable') || docRef.includes('down');

    if (isMockUnavailable) {
      return {
        success: false,
        requestId,
        status: 'UNAVAILABLE',
        providerStatus: 'SERVICE_DOWN',
        confidenceScore: 0,
        reason: 'Sandbox property registry provider is temporarily offline',
      };
    }

    if (isMockFail) {
      return {
        success: false,
        requestId,
        status: 'FAILED',
        providerStatus: 'COMPLETED',
        confidenceScore: 25,
        reason: 'Property title record not found in sandbox land registry database',
        extractedData: {
          ownerName: payload.ownerName || 'Unknown Owner',
          surveyNumber: payload.surveyNumber || 'N/A',
        },
      };
    }

    if (isMockPartial) {
      return {
        success: true,
        requestId,
        status: 'REVIEW_REQUIRED',
        providerStatus: 'COMPLETED',
        confidenceScore: 78,
        reason: 'Partial match on property address/survey number in sandbox environment',
        extractedData: {
          ownerName: payload.ownerName || 'John Property Owner',
          address: payload.address ? `${payload.address} (Phase 2 Ext)` : 'Plot 42, Green Heights',
          surveyNumber: payload.surveyNumber || 'SN-9988',
          registrationNumber: payload.registrationNumber || 'REG-4433',
          pincode: payload.pincode || '560001',
          area: payload.area || '1500 sq ft',
          propertyType: payload.propertyType || 'Residential Apartment',
        },
      };
    }

    return {
      success: true,
      requestId,
      status: 'VERIFIED',
      providerStatus: 'COMPLETED',
      confidenceScore: 96,
      reason: 'Sandbox property title & ownership verified successfully',
      extractedData: {
        ownerName: payload.ownerName || 'John Property Owner',
        address: payload.address || 'Plot 42, Green Heights',
        surveyNumber: payload.surveyNumber || 'SN-9988',
        registrationNumber: payload.registrationNumber || 'REG-4433',
        city: payload.city || 'Bangalore',
        state: payload.state || 'Karnataka',
        pincode: payload.pincode || '560001',
        area: payload.area || '1500 sq ft',
        propertyType: payload.propertyType || 'Residential Apartment',
        issueDate: new Date().toISOString(),
      },
    };
  }

  async getVerificationStatus(requestId) {
    return {
      requestId,
      status: 'COMPLETED',
      verified: true,
      confidenceScore: 96,
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

export default PropertyDevelopmentProvider;
