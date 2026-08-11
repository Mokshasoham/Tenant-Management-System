import { FacialVerificationProvider } from './facialVerificationProvider.js';
import logger from '../../platform/logging/logger.js';

export class FacialDevelopmentProvider extends FacialVerificationProvider {
  constructor() {
    super();
    this.providerName = 'development';
  }

  async verifyLivenessAndMatch(liveCaptureBuffer, referenceImageBuffer, metadata = {}) {
    logger.info(`[FacialDevelopmentProvider] Executing sandbox facial liveness & match evaluation`);

    const requestId = `FACIAL-DEV-${Date.now()}`;

    if (metadata.forceTimeout) {
      return {
        success: false,
        requestId,
        status: 'UNAVAILABLE',
        providerStatus: 'TIMEOUT',
        livenessResult: 'UNAVAILABLE',
        livenessConfidence: 0,
        faceMatchResult: 'UNKNOWN',
        faceMatchScore: 0,
        reason: 'Biometric provider request timed out',
      };
    }

    if (metadata.forceError) {
      return {
        success: false,
        requestId,
        status: 'UNAVAILABLE',
        providerStatus: 'SERVICE_ERROR',
        livenessResult: 'UNAVAILABLE',
        livenessConfidence: 0,
        faceMatchResult: 'UNKNOWN',
        faceMatchScore: 0,
        reason: 'Biometric provider service error',
      };
    }

    if (metadata.forceSpoof) {
      logger.warn(`[FacialDevelopmentProvider] Simulated photo spoofing detected!`);
      return {
        success: false,
        requestId,
        status: 'REJECTED',
        providerStatus: 'SPOOF_DETECTED',
        livenessResult: 'SPOOF_DETECTED',
        livenessConfidence: 30,
        faceMatchResult: 'MISMATCH',
        faceMatchScore: 35,
        reason: 'Liveness anti-spoofing check failed: Photo or screen replay detected',
      };
    }

    if (metadata.forceMismatch) {
      logger.warn(`[FacialDevelopmentProvider] Simulated face mismatch detected!`);
      return {
        success: false,
        requestId,
        status: 'REVIEW_REQUIRED',
        providerStatus: 'FACE_MISMATCH',
        livenessResult: 'LIVE',
        livenessConfidence: 94,
        faceMatchResult: 'MISMATCH',
        faceMatchScore: 42,
        reason: 'Live face capture does not match identity reference image',
      };
    }

    return {
      success: true,
      requestId,
      status: 'VERIFIED',
      providerStatus: 'COMPLETED',
      livenessResult: 'LIVE',
      livenessConfidence: 96,
      faceMatchResult: 'MATCH',
      faceMatchScore: 94,
      confidenceScore: 95,
      reason: 'Live face capture matched reference photo with high liveness confidence',
    };
  }

  async checkProviderHealth() {
    return { status: 'HEALTHY', provider: this.providerName };
  }
}

export default FacialDevelopmentProvider;
