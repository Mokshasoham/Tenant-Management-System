import { VideoKYCProvider } from './videoKycProvider.js';
import logger from '../../platform/logging/logger.js';

export class VideoKYCDevelopmentProvider extends VideoKYCProvider {
  constructor() {
    super();
    this.providerName = 'development';
  }

  async createSession(verificationId, metadata = {}) {
    logger.info(`[VideoKYCDevelopmentProvider] Creating sandbox WebRTC Video KYC session for verification ${verificationId}`);
    const sessionId = `VKYC-DEV-${Date.now()}`;
    const roomUrl = `https://sandbox.videokyc.local/room/${sessionId}`;

    return {
      success: true,
      sessionId,
      roomUrl,
      providerStatus: 'WAITING_FOR_AGENT',
    };
  }

  async generateRoomToken(sessionId, userId, role) {
    const token = `DEV-TOKEN-${sessionId}-${userId}-${role}-${Date.now()}`;
    return {
      token,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes TTL
    };
  }

  async evaluateSession(sessionId, agentInput = {}) {
    logger.info(`[VideoKYCDevelopmentProvider] Evaluating sandbox Video KYC session ${sessionId}`);

    if (agentInput.forceTimeout) {
      return {
        success: false,
        sessionId,
        status: 'UNAVAILABLE',
        providerStatus: 'TIMEOUT',
        livenessCheckResult: 'UNAVAILABLE',
        documentMatchResult: 'NONE',
        reason: 'Video KYC session request timed out',
      };
    }

    if (agentInput.forceError) {
      return {
        success: false,
        sessionId,
        status: 'UNAVAILABLE',
        providerStatus: 'SERVICE_ERROR',
        livenessCheckResult: 'UNAVAILABLE',
        documentMatchResult: 'NONE',
        reason: 'Video KYC provider service error',
      };
    }

    if (agentInput.forceSpoof) {
      logger.warn(`[VideoKYCDevelopmentProvider] Simulated video spoofing / deepfake flag raised!`);
      return {
        success: false,
        sessionId,
        status: 'REJECTED',
        providerStatus: 'FLAGGED_SPOOF',
        livenessCheckResult: 'FLAGGED_SPOOF',
        documentMatchResult: 'MISMATCH',
        confidenceScore: 30,
        reason: 'Live video anti-spoofing check failed: Video replay or screen inject detected',
      };
    }

    if (agentInput.forceMismatch) {
      logger.warn(`[VideoKYCDevelopmentProvider] Simulated document mismatch flagged!`);
      return {
        success: false,
        sessionId,
        status: 'REVIEW_REQUIRED',
        providerStatus: 'DOC_MISMATCH',
        livenessCheckResult: 'PASSED',
        documentMatchResult: 'MISMATCH',
        confidenceScore: 50,
        reason: 'Physical document presented on live video does not match reference ID record',
      };
    }

    return {
      success: true,
      sessionId,
      status: 'VERIFIED',
      providerStatus: 'COMPLETED',
      livenessCheckResult: 'PASSED',
      documentMatchResult: 'MATCH',
      confidenceScore: 95,
      reason: 'Live Video KYC call completed with passed liveness and document match',
    };
  }

  async checkProviderHealth() {
    return { status: 'HEALTHY', provider: this.providerName };
  }
}

export default VideoKYCDevelopmentProvider;
